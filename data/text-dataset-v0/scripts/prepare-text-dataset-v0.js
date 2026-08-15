#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { readCsvObjects, writeCsv } from "./csv-utils.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..")
const outputDir = path.join(root, "data/text-dataset-v0/data")
const publishedScriptsDir = path.join(root, "data/text-dataset-v0/scripts")
const publishedDocsDir = path.join(root, "data/text-dataset-v0/documentation")
fs.mkdirSync(outputDir, { recursive: true })
fs.mkdirSync(publishedScriptsDir, { recursive: true })
fs.mkdirSync(publishedDocsDir, { recursive: true })
const staleAdaptation = path.join(outputDir, "adaptation_pilot.csv")
if (fs.existsSync(staleAdaptation)) fs.rmSync(staleAdaptation)

const read = (relativePath) => readCsvObjects(path.join(root, relativePath)).records
// A normal question mark is followed by whitespace, closing punctuation, or
// the end of the sentence. The damaged export instead placed '?' inside
// Yoruba words, often immediately before a letter or combining/tone mark.
const hasQuestionDamage = (...values) => values.some((value) =>
  /\?(?=[\p{L}\p{M}`´])/u.test(String(value || "")),
)

const instrumentHeader = [
  "item_id", "language", "target_variety", "tarl_level", "item_type", "text",
  "difficulty_rank", "selection_rationale", "source", "reviewed_by",
  "review_status", "notes", "source_file",
]
const instrumentRows = [
  ...read("data/instrument/swahili.csv").map((row) => ({
    ...row,
    language: "sw",
    target_variety: "Standard Kiswahili",
    source_file: "data/instrument/swahili.csv",
  })),
  ...read("data/instrument/yoruba.csv").map((row) => ({
    ...row,
    language: "yo",
    target_variety: "Standard Yoruba",
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
    if (damaged) {
      throw new Error(`Suspected Yoruba encoding damage in ${row.act_id}`)
    }
    if (normalized === "reject") continue
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
      text_status: "approved",
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

for (const script of [
  "approve-main-text-v0.js",
  "recover-yoruba-scaffolding.py",
  "prepare-text-dataset-v0.js",
  "csv-utils.js",
]) {
  fs.copyFileSync(path.join(here, script), path.join(publishedScriptsDir, script))
}
fs.copyFileSync(
  path.join(root, "docs/SYNTHETIC-DATA-EVALUATION.md"),
  path.join(publishedDocsDir, "SYNTHETIC-DATA-EVALUATION.md"),
)

console.log(JSON.stringify({
  instrument: instrumentRows.length,
  scaffolding: scaffoldingRows.length,
  prompts: promptRows.length,
  dialogue_acts: dialogueRows.length,
  total: instrumentRows.length + scaffoldingRows.length + promptRows.length + dialogueRows.length,
}, null, 2))
