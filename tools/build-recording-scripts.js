#!/usr/bin/env node
// Builds the recording sheets a human recorder actually holds -- one CSV per
// (set, language pair), each row pre-filled with everything except the
// fields a recorder fills in by hand (done/usable/notes).
//
// Set A -- read-aloud instrument items      <- data/instrument/<language>.csv
// Set B -- free spoken answers to prompts   <- data/recordings/prompts-setB.csv
// Set C -- scaffolding utterances read aloud <- data/scaffolding/<pair>.csv
//          (merge-scaffolding.js output -- may not exist yet)
//
// Re-runnable: always rebuilds every output from current sources. Sources
// change independently and any of them may be empty or absent -- that
// produces a placeholder script file (never a crash), and the status summary
// printed at the end is the actual point of this script: see at a glance
// what's blocking recording, for which pair, for which set.
//
// EXAMPLE- rows (see data/README.md) are always skipped. Rows a linguist
// rejected never reach data/scaffolding/<pair>.csv in the first place
// (merge-scaffolding.js excludes them) -- Set C still filters defensively on
// review_status in case a rejected-looking row ever ends up there by hand.
//
// Usage: node build-recording-scripts.js

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { readCsvObjects, writeCsv } from "./csv-utils.js"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, "..")
const DATA = path.join(ROOT, "data")
const OUT_DIR = path.join(DATA, "recordings/scripts")

const PAIRS = {
  "sw-en": { language: "swahili", promptCol: "prompt_sw" },
  "yo-en": { language: "yoruba", promptCol: "prompt_yo" },
}

const SCRIPT_HEADER = [
  "file_name",
  "set",
  "item_id_or_act_id",
  "text_to_read",
  "done",
  "usable",
  "notes",
]

function isExampleRow(row, idCol) {
  return (row[idCol] || "").startsWith("EXAMPLE-")
}

function isRejected(row) {
  return (row.review_status || "").toLowerCase().includes("reject")
}

function fileName(pair, set, itemId) {
  return `${pair}_${set}_SPEAKER_${itemId}.wav`
}

function writeNotReady(outPath, set, reason) {
  writeCsv(outPath, SCRIPT_HEADER, [
    {
      file_name: "",
      set,
      item_id_or_act_id: "",
      text_to_read: `SOURCE NOT READY -- ${reason}. This set cannot be recorded yet.`,
      done: "",
      usable: "",
      notes: "",
    },
  ])
}

function buildSetA(pair, language) {
  const set = "setA"
  const outPath = path.join(OUT_DIR, `${pair}_${set}_script.csv`)
  const srcPath = path.join(DATA, `instrument/${language}.csv`)
  const srcLabel = `instrument/${language}.csv`

  if (!fs.existsSync(srcPath)) {
    const reason = `${srcLabel} does not exist yet`
    writeNotReady(outPath, set, reason)
    return { ready: false, reason }
  }

  const { records } = readCsvObjects(srcPath)
  const items = records.filter((r) => !isExampleRow(r, "item_id"))

  if (items.length === 0) {
    const reason = `${srcLabel} has 0 authored items`
    writeNotReady(outPath, set, reason)
    return { ready: false, reason }
  }

  const rows = items.map((r) => ({
    file_name: fileName(pair, set, r.item_id),
    set,
    item_id_or_act_id: r.item_id,
    text_to_read: r.text,
    done: "",
    usable: "",
    notes: "",
  }))
  writeCsv(outPath, SCRIPT_HEADER, rows)
  return { ready: true, count: rows.length }
}

function buildSetB(pair, promptCol) {
  const set = "setB"
  const outPath = path.join(OUT_DIR, `${pair}_${set}_script.csv`)
  const srcPath = path.join(DATA, "recordings/prompts-setB.csv")
  const srcLabel = "recordings/prompts-setB.csv"

  if (!fs.existsSync(srcPath)) {
    const reason = `${srcLabel} does not exist yet`
    writeNotReady(outPath, set, reason)
    return { ready: false, reason }
  }

  const { records } = readCsvObjects(srcPath)
  const translated = records.filter((r) => (r[promptCol] || "").trim() !== "")

  if (translated.length === 0) {
    const reason = `${promptCol} column empty, needs translation`
    writeNotReady(outPath, set, reason)
    return { ready: false, reason }
  }

  const rows = records.map((r) => {
    const question = (r[promptCol] || "").trim()
    return {
      file_name: fileName(pair, set, r.prompt_id),
      set,
      item_id_or_act_id: r.prompt_id,
      text_to_read: question || "[NOT YET TRANSLATED -- skip this item for now]",
      done: "",
      usable: "",
      notes: question ? "" : "Translation missing for this prompt.",
    }
  })
  writeCsv(outPath, SCRIPT_HEADER, rows, {
    leadingNotes: [
      "NOTE: text_to_read here is the QUESTION to read aloud to the speaker. " +
        "The speaker does not read anything -- they listen to the question and answer freely. " +
        "Record their answer, not the question.",
    ],
  })
  return { ready: true, count: translated.length, total: records.length }
}

function buildSetC(pair) {
  const set = "setC"
  const outPath = path.join(OUT_DIR, `${pair}_${set}_script.csv`)
  const srcPath = path.join(DATA, `scaffolding/${pair}.csv`)
  const srcLabel = `scaffolding/${pair}.csv`

  if (!fs.existsSync(srcPath)) {
    const reason = `${srcLabel} does not exist yet`
    writeNotReady(outPath, set, reason)
    return { ready: false, reason }
  }

  const { records } = readCsvObjects(srcPath)
  const items = records.filter((r) => !isExampleRow(r, "utterance_id") && !isRejected(r))

  if (items.length === 0) {
    const reason = `${srcLabel} has 0 usable rows`
    writeNotReady(outPath, set, reason)
    return { ready: false, reason }
  }

  const rows = items.map((r) => ({
    file_name: fileName(pair, set, r.utterance_id),
    set,
    item_id_or_act_id: r.utterance_id,
    text_to_read: r.text,
    done: "",
    usable: "",
    notes: "",
  }))
  writeCsv(outPath, SCRIPT_HEADER, rows)
  return { ready: true, count: rows.length }
}

function statusLine(label, result) {
  const padded = label.padEnd(17)
  if (result.ready) {
    const detail =
      result.total != null
        ? `${result.count}/${result.total} prompts translated`
        : `${result.count} items`
    return `${padded}: READY — ${detail}`
  }
  return `${padded}: NOT READY — ${result.reason}`
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const lines = []
  for (const [pair, { language, promptCol }] of Object.entries(PAIRS)) {
    lines.push(statusLine(`Set A (${language})`, buildSetA(pair, language)))
    lines.push(statusLine(`Set B (${pair})`, buildSetB(pair, promptCol)))
    lines.push(statusLine(`Set C (${pair})`, buildSetC(pair)))
  }

  console.log(`Wrote recording scripts to ${path.relative(ROOT, OUT_DIR)}/\n`)
  console.log("=== Status ===")
  for (const line of lines) console.log(line)
}

main()
