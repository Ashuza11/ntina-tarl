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
  "speaker_type",
  "done",
  "usable",
  "notes",
]

// Set A gets extra structure: item_type/story_id/difficulty_rank so a
// recorder can see, at a glance, which block they're in and which story a
// comprehension question belongs to -- the flat single-list layout was
// unusable in a live session with a child.
const SET_A_HEADER = [
  "file_name",
  "set",
  "item_id_or_act_id",
  "item_type",
  "story_id",
  "difficulty_rank",
  "text_to_read",
  "speaker_type",
  "done",
  "usable",
  "notes",
]

// Block order for Set A, and the assessor instruction shown as a section
// header row right before each block starts.
const SET_A_BLOCKS = [
  {
    type: "syllable",
    instruction:
      "SYLLABLES/LETTERS — point to each one and ask the speaker to read it " +
      "aloud. Pause between each. Do not correct them.",
  },
  {
    type: "word",
    instruction:
      "WORDS — point to each word and ask the speaker to read it aloud. " +
      "Pause between each. Do not correct them.",
  },
  {
    type: "paragraph",
    instruction:
      "PARAGRAPHS — show the speaker the whole paragraph and ask them to " +
      "read it aloud from start to finish, without stopping. Do not " +
      "correct them mid-read.",
  },
  {
    type: "story",
    instruction:
      "STORIES — show the speaker the whole story and ask them to read it " +
      "aloud from start to finish, without stopping. Do not correct them " +
      "mid-read. After they finish, ask the comprehension questions for " +
      "this story (see the COMPREHENSION QUESTIONS block below — each " +
      "question shows which story it belongs to).",
  },
  {
    type: "comprehension_question",
    instruction:
      "COMPREHENSION QUESTIONS — ask each question aloud right after the " +
      "speaker finishes reading the matching story (each question below " +
      "shows which story it's for). Do not show the speaker the written " +
      "question. Record their spoken answer, not a summary of it.",
  },
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

// Comprehension question item_ids follow "<story_id>-qN" (e.g.
// "sw-s-002-q1" belongs to story "sw-s-002") -- the convention the
// instrument was authored with.
function storyIdFor(itemId) {
  return itemId.replace(/-q\d+$/, "")
}

function writeNotReady(outPath, header, set, reason) {
  const row = {
    file_name: "",
    set,
    item_id_or_act_id: "",
    text_to_read: `SOURCE NOT READY -- ${reason}. This set cannot be recorded yet.`,
    speaker_type: "",
    done: "",
    usable: "",
    notes: "",
  }
  writeCsv(outPath, header, [row])
}

function sectionHeaderRow(set, instruction) {
  return {
    file_name: "",
    set,
    item_id_or_act_id: "",
    item_type: "=== SECTION ===",
    story_id: "",
    difficulty_rank: "",
    text_to_read: `ASSESSOR INSTRUCTION: ${instruction}`,
    speaker_type: "",
    done: "",
    usable: "",
    notes: "",
  }
}

function buildSetA(pair, language) {
  const set = "setA"
  const outPath = path.join(OUT_DIR, `${pair}_${set}_script.csv`)
  const srcPath = path.join(DATA, `instrument/${language}.csv`)
  const srcLabel = `instrument/${language}.csv`

  if (!fs.existsSync(srcPath)) {
    const reason = `${srcLabel} does not exist yet`
    writeNotReady(outPath, SET_A_HEADER, set, reason)
    return { ready: false, reason }
  }

  const { records } = readCsvObjects(srcPath)
  const items = records.filter((r) => !isExampleRow(r, "item_id"))

  if (items.length === 0) {
    const reason = `${srcLabel} has 0 authored items`
    writeNotReady(outPath, SET_A_HEADER, set, reason)
    return { ready: false, reason }
  }

  const byRank = (a, b) => Number(a.difficulty_rank) - Number(b.difficulty_rank)

  const rows = []
  for (const { type, instruction } of SET_A_BLOCKS) {
    const blockItems = items.filter((r) => r.item_type === type)
    if (blockItems.length === 0) continue

    if (type === "comprehension_question") {
      blockItems.sort((a, b) => {
        const storyCmp = storyIdFor(a.item_id).localeCompare(storyIdFor(b.item_id))
        return storyCmp !== 0 ? storyCmp : byRank(a, b)
      })
    } else {
      blockItems.sort(byRank)
    }

    rows.push(sectionHeaderRow(set, instruction))
    for (const r of blockItems) {
      rows.push({
        file_name: fileName(pair, set, r.item_id),
        set,
        item_id_or_act_id: r.item_id,
        item_type: r.item_type,
        story_id: type === "comprehension_question" ? storyIdFor(r.item_id) : "",
        difficulty_rank: r.difficulty_rank,
        text_to_read: r.text,
        speaker_type: "all",
        done: "",
        usable: "",
        notes: "",
      })
    }
  }

  writeCsv(outPath, SET_A_HEADER, rows)
  const itemCount = rows.filter((r) => r.item_type !== "=== SECTION ===").length
  return { ready: true, count: itemCount }
}

function buildSetB(pair, promptCol) {
  const set = "setB"
  const outPath = path.join(OUT_DIR, `${pair}_${set}_script.csv`)
  const srcPath = path.join(DATA, "recordings/prompts-setB.csv")
  const srcLabel = "recordings/prompts-setB.csv"

  if (!fs.existsSync(srcPath)) {
    const reason = `${srcLabel} does not exist yet`
    writeNotReady(outPath, SCRIPT_HEADER, set, reason)
    return { ready: false, reason }
  }

  const { records } = readCsvObjects(srcPath)
  const translated = records.filter((r) => (r[promptCol] || "").trim() !== "")

  if (translated.length === 0) {
    const reason = `${promptCol} column empty, needs translation`
    writeNotReady(outPath, SCRIPT_HEADER, set, reason)
    return { ready: false, reason }
  }

  const rows = records.map((r) => {
    const question = (r[promptCol] || "").trim()
    return {
      file_name: fileName(pair, set, r.prompt_id),
      set,
      item_id_or_act_id: r.prompt_id,
      text_to_read: question || "[NOT YET TRANSLATED -- skip this item for now]",
      speaker_type: "all",
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
    writeNotReady(outPath, SCRIPT_HEADER, set, reason)
    return { ready: false, reason }
  }

  const { records } = readCsvObjects(srcPath)
  const items = records.filter((r) => !isExampleRow(r, "utterance_id") && !isRejected(r))

  if (items.length === 0) {
    const reason = `${srcLabel} has 0 usable rows`
    writeNotReady(outPath, SCRIPT_HEADER, set, reason)
    return { ready: false, reason }
  }

  // Set C is teacher/facilitator scaffolding lines -- a child reading these
  // aloud would produce speech that never occurs in the deployed system, so
  // recording is restricted to adult speakers only.
  const rows = items.map((r) => ({
    file_name: fileName(pair, set, r.utterance_id),
    set,
    item_id_or_act_id: r.utterance_id,
    text_to_read: r.text,
    speaker_type: "adult_only",
    done: "",
    usable: "",
    notes: "",
  }))
  writeCsv(outPath, SCRIPT_HEADER, rows)
  return { ready: true, count: rows.length }
}

const BLOCK_LABELS = {
  syllable: "Syllables/letters",
  word: "Words",
  paragraph: "Paragraphs",
  story: "Stories",
  comprehension_question: "Comprehension questions",
}

function mdEscape(s) {
  return String(s ?? "").replace(/\|/g, "\\|")
}

// Builds the printable/one-screen session sheet a recorder actually carries.
// Pulls straight from the instrument and prompts-setB source files (not from
// the generated script CSVs) so it can't drift out of sync with them, and is
// skipped entirely -- same as the other builders -- if a source isn't ready.
function buildSessionSheet(pair, language, promptCol) {
  const outPath = path.join(OUT_DIR, `SESSION-SHEET-${language}.md`)
  const instrPath = path.join(DATA, `instrument/${language}.csv`)
  const promptsPath = path.join(DATA, "recordings/prompts-setB.csv")

  if (!fs.existsSync(instrPath) || !fs.existsSync(promptsPath)) {
    const reason = "instrument or prompts-setB.csv missing"
    fs.writeFileSync(
      outPath,
      `﻿# Ntina recording session — ${language}\n\nSOURCE NOT READY -- ${reason}. This sheet cannot be generated yet.\n`,
      "utf8"
    )
    return { ready: false, reason }
  }

  const { records: instrRecords } = readCsvObjects(instrPath)
  const items = instrRecords.filter((r) => !isExampleRow(r, "item_id"))
  if (items.length === 0) {
    const reason = "instrument has 0 authored items"
    fs.writeFileSync(
      outPath,
      `﻿# Ntina recording session — ${language}\n\nSOURCE NOT READY -- ${reason}. This sheet cannot be generated yet.\n`,
      "utf8"
    )
    return { ready: false, reason }
  }

  const { records: promptRecords } = readCsvObjects(promptsPath)
  const questions = promptRecords
    .map((r) => (r[promptCol] || "").trim())
    .filter((q) => q !== "")

  const byRank = (a, b) => Number(a.difficulty_rank) - Number(b.difficulty_rank)
  const langLabel = language[0].toUpperCase() + language.slice(1)

  const lines = []
  lines.push(`# Ntina recording session — ${langLabel} (${pair})`)
  lines.push("")
  lines.push(
    "One page, front to back, for whoever is holding the phone. " +
      "Print it or open it on a second phone during the session."
  )
  lines.push("")
  lines.push("## Four rules — read this before you start")
  lines.push("")
  lines.push("1. **Never correct the speaker.** Errors and hesitation are the data.")
  lines.push(
    "2. **If someone cannot read an item, record the attempt or the silence " +
      "anyway. Do not skip the row.**"
  )
  lines.push("3. **One file per utterance.** Never one long recording per session.")
  lines.push("4. **No real names** in any filename or in `metadata.csv` — use the `speaker_id` only.")
  lines.push("")
  lines.push(
    "**Children will stall or fail on paragraph and story items — this is " +
      "expected at this reading level, not a mistake. Record it anyway " +
      "(see rule 2).**"
  )
  lines.push("")

  lines.push("## 1. Before you start")
  lines.push("")
  lines.push(
    "- [ ] Consent check: `consent_obtained = yes` for this speaker, and " +
      "`guardian_consent = yes` as well if the speaker is a child. Do not " +
      "record without this."
  )
  lines.push("- [ ] Assign a `speaker_id` (e.g. `spk-0xx`) — never a real name.")
  lines.push(
    "- [ ] Fill in the speaker's row in `data/recordings/speakers.csv` now, " +
      "not after the session."
  )
  lines.push(
    "- [ ] Record 5 seconds of room tone (silence) as the first clip of the " +
      "session, before Set A."
  )
  lines.push("")

  lines.push(`## 2. Set A — read-aloud instrument items (${items.length} items)`)
  lines.push("")
  for (const { type, instruction } of SET_A_BLOCKS) {
    const blockItems = items.filter((r) => r.item_type === type)
    if (blockItems.length === 0) continue

    if (type === "comprehension_question") {
      blockItems.sort((a, b) => {
        const storyCmp = storyIdFor(a.item_id).localeCompare(storyIdFor(b.item_id))
        return storyCmp !== 0 ? storyCmp : byRank(a, b)
      })
    } else {
      blockItems.sort(byRank)
    }

    lines.push(`### ${BLOCK_LABELS[type]}`)
    lines.push("")
    lines.push(`> ${instruction}`)
    lines.push("")
    for (const r of blockItems) {
      const tag =
        type === "comprehension_question" ? ` _(for ${storyIdFor(r.item_id)})_` : ""
      lines.push(`- \`${r.item_id}\`${tag}: ${mdEscape(r.text)}`)
    }
    lines.push("")
  }

  lines.push(
    `## 3. Set B — free spoken answers (${questions.length} questions, ` +
      "READ ALOUD to the speaker)"
  )
  lines.push("")
  lines.push(
    "Read each question aloud to the speaker. The speaker reads nothing and " +
      "answers freely, in their own words. Record their answer, not the question."
  )
  lines.push("")
  promptRecords.forEach((r, i) => {
    const q = (r[promptCol] || "").trim()
    lines.push(`${i + 1}. ${q || "_[NOT YET TRANSLATED — skip for now]_"}`)
  })
  lines.push("")

  lines.push("## 4. After the session")
  lines.push("")
  lines.push(
    "- [ ] Fill in one row per recording in `data/recordings/metadata.csv` " +
      "the same day — don't let this pile up."
  )
  lines.push(
    "- [ ] Confirm every recording's `consent_confirmed` matches the " +
      "speaker's `consent_obtained`."
  )
  lines.push(
    "- [ ] Double-check every `file_name` uses the `speaker_id`, never a real name."
  )
  lines.push("")

  fs.writeFileSync(outPath, "﻿" + lines.join("\n") + "\n", "utf8")
  return { ready: true, count: items.length }
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
    lines.push(
      statusLine(`Session sheet (${language})`, buildSessionSheet(pair, language, promptCol))
    )
  }

  console.log(`Wrote recording scripts to ${path.relative(ROOT, OUT_DIR)}/\n`)
  console.log("=== Status ===")
  for (const line of lines) console.log(line)
}

main()
