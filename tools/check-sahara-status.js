#!/usr/bin/env node
// Polls Sahara's (undocumented) file-status endpoint for a file_id returned
// by a 503 "file queued for processing" response from the sync upload
// endpoint. See docs/API-FINDINGS.md -- the sync endpoint can time out
// after ~65-120s even though the file keeps processing server-side; this is
// the only way to retrieve the transcript once that happens. Observed
// real-world turnaround from queued to FILE_TRANSCRIBED: from under a
// minute up to several hours in testing -- there is no documented SLA.
//
// Usage: node check-sahara-status.js <file_id>

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, "..")

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

async function main() {
  const fileId = process.argv[2]
  if (!fileId) {
    console.error("Usage: node check-sahara-status.js <file_id>")
    process.exit(1)
  }

  const env = loadEnv(path.join(ROOT, "server/.env"))
  const apiKey = env.SAHARA_API_KEY
  if (!apiKey) {
    console.error("SAHARA_API_KEY not found in server/.env")
    process.exit(1)
  }

  const res = await fetch(`https://infer.voice.intron.io/file/v1/status/${fileId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  const body = await res.json()
  console.log(`HTTP ${res.status}`)
  console.log(JSON.stringify(body, null, 2))
}

main()
