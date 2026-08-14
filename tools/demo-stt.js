#!/usr/bin/env node
// Runnable, step-by-step demo of Sahara's speech-to-text flow, built strictly
// from the official docs (https://docs.voice.intron.io/docs/index/introduction
// -> STT API -> Upload File / Get File Status), NOT from the older hackathon
// project's code. See docs/API-FINDINGS.md for the full writeup of why the
// ASYNC upload endpoint is used here instead of the sync one.
//
// POST /file/v1/upload         -- async: returns a file_id immediately,
//                                  no blocking wait, no 503-on-timeout.
// GET  /file/v1/status/{id}    -- poll this until processing_status is
//                                  terminal (FILE_TRANSCRIBED or
//                                  FILE_PROCESSING_FAILED).
//
// Usage: node demo-stt.js <path-to-audio-file> [language_code]
//   language_code defaults to "sw" (Swahili-English, this project's pair).
//   Supported formats per the docs: wav, mp3, mp4, m4a, ogg, webm, flac.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, "..")

const UPLOAD_URL = "https://infer.voice.intron.io/file/v1/upload"
const STATUS_URL = (fileId) => `https://infer.voice.intron.io/file/v1/status/${fileId}`

const POLL_INTERVAL_MS = 3000
const POLL_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes -- generous; see API-FINDINGS.md
// for why real-world turnaround has been observed to vary widely.

const TERMINAL_STATUSES = new Set(["FILE_TRANSCRIBED", "FILE_PROCESSING_FAILED"])

function loadEnv(envPath) {
  const env = {}
  if (!fs.existsSync(envPath)) return env
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue
    const [k, ...rest] = trimmed.split("=")
    env[k.trim()] = rest.join("=").trim()
  }
  return env
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function uploadAsync(apiKey, audioPath, languageCode) {
  const fileBuffer = fs.readFileSync(audioPath)
  const fileName = path.basename(audioPath)

  const form = new FormData()
  form.set("audio_file_name", fileName)
  form.set("audio_file_blob", new Blob([fileBuffer]), fileName)
  form.set("use_language_asr_input", languageCode)

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  const body = await res.json()
  return { status: res.status, body }
}

// A transient DNS/connect blip has been observed repeatedly against this API
// during testing (unrelated to request content) -- retry a few times before
// giving up, same as a normal transient-network handling policy would.
async function getStatus(apiKey, fileId, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(STATUS_URL(fileId), {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      const body = await res.json()
      return { status: res.status, body }
    } catch (err) {
      if (attempt === retries) throw err
      await sleep(2000 * attempt)
    }
  }
}

async function pollUntilDone(apiKey, fileId) {
  const start = Date.now()
  let attempt = 0
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    attempt += 1
    const { status, body } = await getStatus(apiKey, fileId)
    const processingStatus = body?.data?.processing_status
    const elapsedSec = ((Date.now() - start) / 1000).toFixed(1)
    console.log(`  [poll ${attempt}, +${elapsedSec}s] HTTP ${status} -- ${processingStatus ?? "(no status field)"}`)

    if (status === 200 && TERMINAL_STATUSES.has(processingStatus)) {
      return body
    }
    await sleep(POLL_INTERVAL_MS)
  }
  // Not a script bug -- the backend queue has been observed to take far
  // longer than this in testing (see docs/API-FINDINGS.md). Exit cleanly
  // rather than crashing, and give the exact command to check back later.
  console.log(`\nStill processing after ${POLL_TIMEOUT_MS / 1000}s -- not a script error, the backend queue is just slow.`)
  console.log(`Check back later with: node tools/check-sahara-status.js ${fileId}`)
  return null
}

async function main() {
  const [, , audioPathArg, languageCodeArg] = process.argv
  if (!audioPathArg) {
    console.error("Usage: node demo-stt.js <path-to-audio-file> [language_code]")
    process.exit(1)
  }
  const audioPath = path.resolve(audioPathArg)
  const languageCode = languageCodeArg || "sw"

  if (!fs.existsSync(audioPath)) {
    console.error(`File not found: ${audioPath}`)
    process.exit(1)
  }

  const env = loadEnv(path.join(ROOT, "server/.env"))
  const apiKey = env.SAHARA_API_KEY
  if (!apiKey) {
    console.error("SAHARA_API_KEY not found in server/.env. Copy server/.env.example to server/.env and fill it in.")
    process.exit(1)
  }

  console.log(`Step 1/3 -- Uploading ${path.basename(audioPath)} (language: ${languageCode}) to the async endpoint...`)
  const upload = await uploadAsync(apiKey, audioPath, languageCode)
  console.log(`  HTTP ${upload.status}: ${JSON.stringify(upload.body)}`)

  const fileId = upload.body?.data?.file_id
  if (!fileId) {
    console.error("No file_id returned -- cannot continue. Check the response above for an error message.")
    process.exit(1)
  }

  console.log(`\nStep 2/3 -- Polling for the transcript (file_id: ${fileId})...`)
  const finalBody = await pollUntilDone(apiKey, fileId)
  if (finalBody === null) return // still queued -- pollUntilDone already printed how to recheck

  console.log(`\nStep 3/3 -- Done.`)
  if (finalBody.data.processing_status === "FILE_TRANSCRIBED") {
    console.log(`  Transcript: "${finalBody.data.audio_transcript}"`)
    console.log(`  Duration processed: ${finalBody.data.processed_audio_duration_in_seconds}s`)
  } else {
    console.log(`  Processing failed. Full response: ${JSON.stringify(finalBody, null, 2)}`)
  }
}

main().catch((err) => {
  console.error("Demo failed:", err.message)
  process.exit(1)
})
