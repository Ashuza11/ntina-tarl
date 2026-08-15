#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DATASET = path.join(ROOT, "data/recordings/dataset-v0")
const OUTPUT = path.join(ROOT, "benchmark/results")
const PROVIDERS = ["groq", "deepgram", "assemblyai", "sahara"]

function loadEnv(file) {
  const env = {}
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match) env[match[1]] = match[2].trim()
  }
  return env
}

function parseCsv(text) {
  text = text.replace(/^\uFEFF/, "")
  const rows = []
  let row = [], cell = "", quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted && c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
    else if (c === '"') quoted = !quoted
    else if (c === "," && !quoted) { row.push(cell); cell = "" }
    else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = ""
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const headers = rows.shift()
  return rows.map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""])))
}

function selectBalanced(rows, limit) {
  if (!limit || limit >= rows.length) return rows
  const groups = new Map()
  for (const row of rows) {
    const key = [row.language, row.speaker_id, row.set, row.content_type].join("|")
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  for (const group of groups.values()) group.sort((a, b) => a.recording_id.localeCompare(b.recording_id))
  const selected = []
  const keys = [...groups.keys()].sort()
  for (let round = 0; selected.length < limit; round++) {
    let added = false
    for (const key of keys) {
      const row = groups.get(key)[round]
      if (row && selected.length < limit) { selected.push(row); added = true }
    }
    if (!added) break
  }
  return selected
}

async function jsonResponse(res) {
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = { raw_text: text } }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`)
  return body
}

async function fetchWithRetry(url, options, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url, options)
    if (res.status !== 429 && res.status < 500) return res
    if (attempt === retries - 1) return res
    const retryAfter = Number(res.headers.get("retry-after")) || (attempt + 1) * 2
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
  }
}

async function groq(row, audio, env) {
  const form = new FormData()
  form.set("file", new Blob([audio], { type: "audio/wav" }), path.basename(row.file_name))
  form.set("model", "whisper-large-v3")
  form.set("response_format", "verbose_json")
  form.set("temperature", "0")
  form.set("language", row.language.startsWith("sw") ? "sw" : "yo")
  const body = await jsonResponse(await fetchWithRetry("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` }, body: form,
  }))
  return { transcript: body.text ?? "", model: "whisper-large-v3", raw: body }
}

async function deepgram(row, audio, env) {
  const url = "https://api.deepgram.com/v1/listen?model=nova-3&language=multi&smart_format=false"
  const body = await jsonResponse(await fetch(url, {
    method: "POST", headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}`, "Content-Type": "audio/wav" }, body: audio,
  }))
  return { transcript: body.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "", model: "nova-3/multi", raw: body }
}

async function assemblyai(row, audio, env) {
  const auth = { Authorization: env.ASSEMBLYAI_API_KEY }
  const uploaded = await jsonResponse(await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST", headers: { ...auth, "Content-Type": "application/octet-stream" }, body: audio,
  }))
  const lang = row.language.startsWith("sw") ? "sw" : "yo"
  const request = {
    audio_url: uploaded.upload_url,
    speech_models: ["universal-3-5-pro", "universal-2"],
    language_code: lang,
    format_text: false,
    punctuate: false,
  }
  const submitted = await jsonResponse(await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(request),
  }))
  for (let attempt = 0; attempt < 120; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const body = await jsonResponse(await fetch(`https://api.assemblyai.com/v2/transcript/${submitted.id}`, { headers: auth }))
    if (body.status === "completed") return { transcript: body.text ?? "", model: body.speech_model_used ?? "universal-2", raw: body }
    if (body.status === "error") throw new Error(body.error || "AssemblyAI transcription failed")
  }
  throw new Error("AssemblyAI timed out after 240 seconds")
}

async function sahara(row, audio, env) {
  const form = new FormData()
  form.set("audio_file_name", path.basename(row.file_name))
  form.set("audio_file_blob", new Blob([audio], { type: "audio/wav" }), path.basename(row.file_name))
  form.set("use_language_asr_input", row.language.startsWith("sw") ? "sw" : "yo")
  const submitted = await jsonResponse(await fetchWithRetry("https://infer.voice.intron.io/file/v1/upload", {
    method: "POST", headers: { Authorization: `Bearer ${env.SAHARA_API_KEY}` }, body: form,
  }))
  const id = submitted.data?.file_id
  if (!id) throw new Error(`Sahara returned no file_id: ${JSON.stringify(submitted)}`)
  await new Promise((resolve) => setTimeout(resolve, 1500))
  const body = await jsonResponse(await fetchWithRetry(`https://infer.voice.intron.io/file/v1/status/${id}`, {
    headers: { Authorization: `Bearer ${env.SAHARA_API_KEY}` },
  }))
  const status = body.data?.processing_status
  if (status === "FILE_TRANSCRIBED") return { transcript: body.data.audio_transcript ?? "", model: "sahara-file-v1", raw: body }
  if (status === "FILE_PROCESSING_FAILED") throw new Error(`Sahara processing failed: ${JSON.stringify(body)}`)
  return { transcript: "", model: "sahara-file-v1", status: "pending", raw: { file_id: id, status_response: body } }
}

const clients = { groq, deepgram, assemblyai, sahara }

async function main() {
  const args = process.argv.slice(2)
  const limit = Number(args.find((x) => x.startsWith("--limit="))?.split("=")[1] ?? 24)
  const requested = args.find((x) => x.startsWith("--providers="))?.split("=")[1]?.split(",") ?? PROVIDERS
  const shardArg = args.find((x) => x.startsWith("--shard="))?.split("=")[1]
  const [shardIndex, shardCount] = shardArg ? shardArg.split("/").map(Number) : [0, 1]
  const env = { ...loadEnv(path.join(ROOT, "server/.env")), ...process.env }
  const rows = parseCsv(fs.readFileSync(path.join(DATASET, "metadata.csv"), "utf8"))
  const sample = selectBalanced(rows, limit).filter((_, index) => index % shardCount === shardIndex)
  fs.mkdirSync(OUTPUT, { recursive: true })
  fs.writeFileSync(path.join(OUTPUT, "sample.csv"), [
    "recording_id,file_name,speaker_id,language,set,content_type,reference",
    ...sample.map((r) => [r.recording_id, r.file_name, r.speaker_id, r.language, r.set, r.content_type, JSON.stringify(r.transcription)].join(",")),
  ].join("\n") + "\n")
  const resultFile = path.join(OUTPUT, "raw-results.jsonl")
  const existing = fs.existsSync(resultFile)
    ? new Set(fs.readFileSync(resultFile, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse)
      .filter((r) => r.status === "ok" || r.status === "pending").map((r) => `${r.provider}|${r.recording_id}`))
    : new Set()

  for (const row of sample) {
    const audio = fs.readFileSync(path.join(DATASET, row.file_name))
    for (const provider of requested) {
      const key = `${provider}|${row.recording_id}`
      if (existing.has(key)) continue
      const started = Date.now()
      let result
      try {
        const response = await clients[provider](row, audio, env)
        result = { provider, recording_id: row.recording_id, language: row.language, speaker_id: row.speaker_id,
          set: row.set, content_type: row.content_type, reference: row.transcription, transcript: response.transcript,
          model: response.model, latency_ms: Date.now() - started, status: response.status ?? "ok", raw: response.raw }
      } catch (error) {
        result = { provider, recording_id: row.recording_id, language: row.language, speaker_id: row.speaker_id,
          set: row.set, content_type: row.content_type, reference: row.transcription, transcript: "",
          latency_ms: Date.now() - started, status: "error", error: error.message }
      }
      fs.appendFileSync(resultFile, JSON.stringify(result) + "\n")
      console.log(`${provider.padEnd(10)} ${row.recording_id}: ${result.status} (${result.latency_ms} ms)`)
    }
  }
}

main().catch((error) => { console.error(error); process.exit(1) })
