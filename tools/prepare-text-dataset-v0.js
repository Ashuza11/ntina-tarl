#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { readCsvObjects, writeCsv } from "./csv-utils.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..")
const outputDir = path.join(root, "data/text-dataset-v0/data")
fs.mkdirSync(outputDir, { recursive: true })

const read = (relativePath) => readCsvObjects(path.join(root, relativePath)).records
const hasQuestionDamage = (...values) => values.some((value) => String(value || "").includes("?"))

const instrumentHeader = [
  "item_id", "language", "target_variety", "tarl_level", "item_type", "text",
  "difficulty_rank", "selection_rationale", "source", "reviewed_by",
  "review_status", "notes", "source_file",
]
const instrumentRows = [
  ...read("data/instrument/swahili.csv").map((row) => ({
    ...row,
    language: "sw",
    target_variety: "Kiswahili (variety not yet reviewer-confirmed)",
    source_file: "data/instrument/swahili.csv",
  })),
  ...read("data/instrument/yoruba.csv").map((row) => ({
    ...row,
    language: "yo",
    target_variety: "Yoruba (regional variety not yet reviewer-confirmed)",
    source_file: "data/instrument/yoruba.csv",
  })),
]
writeCsv(path.join(outputDir, "instrument.csv"), instrumentHeader, instrumentRows)

function normalizeDecision(row) {
  const raw = row.verdict.trim().toLowerCase()
  if (raw.startsWith("keep")) return "keep"
  if (row.corrected_text.trim()) return "fix"
  if (raw.startsWith("reject")) return "reject"
  return "unreviewed"
}

const scaffoldingHeader = [
  "act_id", "language_pair", "matrix_language", "category", "tarl_level",
  "audience", "function_reminder", "max_words", "text_draft", "switch_points",
  "register_note", "review_decision", "normalized_decision", "corrected_text",
  "final_text", "text_status", "suspected_encoding_damage", "source_file",
]
const scaffoldingRows = []
for (const [file, pair, matrix] of [
  ["data/scaffolding/sw-en.csv", "sw-en", "Swahili"],
  ["data/scaffolding/yo-en.csv", "yo-en", "Yoruba"],
]) {
  for (const row of read(file)) {
    const normalized = normalizeDecision(row)
    const damaged = pair === "yo-en" && hasQuestionDamage(
      row.text_draft,
      row.switch_points,
      row.corrected_text,
    )
    scaffoldingRows.push({
      act_id: row.act_id,
      language_pair: pair,
      matrix_language: matrix,
      category: row.category,
      tarl_level: row.tarl_level,
      audience: row.audience,
      function_reminder: row.function_reminder,
      max_words: row.max_words,
      text_draft: row.text_draft,
      switch_points: row.switch_points,
      register_note: row.register_note,
      review_decision: row.verdict,
      normalized_decision: normalized,
      corrected_text: row.corrected_text,
      final_text: normalized === "fix" ? row.corrected_text : normalized === "keep" ? row.text_draft : "",
      text_status: normalized === "reject" ? "rejected" : damaged ? "reviewed_source_encoding_damaged" : "reviewed",
      suspected_encoding_damage: damaged ? "yes" : "no",
      source_file: file,
    })
  }
}
writeCsv(path.join(outputDir, "scaffolding.csv"), scaffoldingHeader, scaffoldingRows)

const promptHeader = [
  "prompt_id", "language", "text", "text_status", "notes", "source_file",
]
const promptRows = []
for (const row of read("data/recordings/prompts-setB.csv")) {
  promptRows.push({
    prompt_id: row.prompt_id,
    language: "en",
    text: row.prompt_en,
    text_status: "source_reference",
    notes: row.notes,
    source_file: "data/recordings/prompts-setB.csv",
  })
  for (const [language, column] of [["sw", "prompt_sw"], ["yo", "prompt_yo"]]) {
    promptRows.push({
      prompt_id: row.prompt_id,
      language,
      text: row[column],
      text_status: row.translation_status.toLowerCase().replaceAll("_", "-"),
      notes: row.notes,
      source_file: "data/recordings/prompts-setB.csv",
    })
  }
}
writeCsv(path.join(outputDir, "prompts.csv"), promptHeader, promptRows)

const dialogueHeader = [
  "act_id", "category", "tarl_level", "audience", "function", "trigger",
  "max_words", "text_status", "source_file",
]
const dialogueRows = read("data/spec/dialogue-acts.csv").map((row) => ({
  ...row,
  text_status: "developer_authored_specification",
  source_file: "data/spec/dialogue-acts.csv",
}))
writeCsv(path.join(outputDir, "dialogue_acts.csv"), dialogueHeader, dialogueRows)

const adaptationHeader = [
  "act_id", "prompt", "completion", "category", "tarl_level", "audience",
  "target_variety", "max_words", "text_status", "source_file",
]
const adaptationRows = read("data/adaption/sw-en_tz-pilot-20.csv").map((row) => ({
  ...row,
  text_status: "pilot_pending_tanzanian_native_speaker_review",
  source_file: "data/adaption/sw-en_tz-pilot-20.csv",
}))
writeCsv(path.join(outputDir, "adaptation_pilot.csv"), adaptationHeader, adaptationRows)

console.log(JSON.stringify({
  instrument: instrumentRows.length,
  scaffolding: scaffoldingRows.length,
  prompts: promptRows.length,
  dialogue_acts: dialogueRows.length,
  adaptation_pilot: adaptationRows.length,
  total: instrumentRows.length + scaffoldingRows.length + promptRows.length + dialogueRows.length + adaptationRows.length,
}, null, 2))
