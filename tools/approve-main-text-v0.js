#!/usr/bin/env node

import path from "node:path"
import { fileURLToPath } from "node:url"
import { readCsvObjects, writeCsv } from "./csv-utils.js"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

for (const [relativePath, reviewer, verificationNote] of [
  [
    "data/instrument/swahili.csv",
    "Two Swahili speakers (Tanzania and Congo)",
    "Standard Kiswahili verified by two Swahili speakers from Tanzania and Congo.",
  ],
  [
    "data/instrument/yoruba.csv",
    "Two Yoruba speakers and a linguist",
    "Standard Yoruba approved and verified by two Yoruba speakers and a linguist.",
  ],
]) {
  const file = path.join(root, relativePath)
  const csv = readCsvObjects(file)
  for (const row of csv.records) {
    row.reviewed_by = reviewer
    row.review_status = "approved"
    row.notes = row.notes
      .replace(/Needs native-speaker sign-off before use\.?/gi, "")
      .replace(/needs careful native-speaker review before this item is treated as reliable\.?/gi, "")
      .replace(/needs native-speaker review\.?/gi, "")
      .replace(/\s+/g, " ")
      .trim()
    if (!row.notes.includes(verificationNote)) {
      row.notes = `${row.notes}${row.notes ? " " : ""}${verificationNote}`
    }
  }
  writeCsv(file, csv.header, csv.records)
}

const promptsFile = path.join(root, "data/recordings/prompts-setB.csv")
const prompts = readCsvObjects(promptsFile)
for (const row of prompts.records) row.translation_status = "approved"
writeCsv(promptsFile, prompts.header, prompts.records)

console.log("Recorded approval for 156 instrument rows and 10 trilingual prompt rows.")
