#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const file = path.join(ROOT, "benchmark/results/raw-results.jsonl")
const env = Object.fromEntries(fs.readFileSync(path.join(ROOT, "server/.env"), "utf8").split(/\r?\n/)
  .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
const rows = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse)

for (const row of rows.filter((r) => r.provider === "sahara" && r.status === "pending")) {
  const id = row.raw?.file_id
  const res = await fetch(`https://infer.voice.intron.io/file/v1/status/${id}`, { headers: { Authorization: `Bearer ${env.SAHARA_API_KEY}` } })
  const body = await res.json()
  if (body.data?.processing_status === "FILE_TRANSCRIBED") {
    fs.appendFileSync(file, JSON.stringify({ ...row, status: "ok", transcript: body.data.audio_transcript ?? "", raw: body }) + "\n")
    console.log(`${row.recording_id}: completed`)
  } else console.log(`${row.recording_id}: ${body.data?.processing_status ?? `HTTP ${res.status}`}`)
  await new Promise((resolve) => setTimeout(resolve, 1100))
}
