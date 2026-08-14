#!/usr/bin/env node

import path from "node:path"
import { fileURLToPath } from "node:url"
import { readCsvObjects, writeCsv } from "./csv-utils.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..")
const datasetMetadataPath = path.join(root, "data/recordings/dataset-v0/metadata.csv")
const repositoryMetadataPath = path.join(root, "data/recordings/metadata.csv")
const consentDate = "2026-08-14"

const dataset = readCsvObjects(datasetMetadataPath)
for (const row of dataset.records) {
  row.device = "Basic Android phone (model unspecified)"
  row.noise_condition = "moderate"
  row.consent_confirmed = "yes"
  row.consent_date = consentDate

  if (row.set === "setB") {
    // The contributor confirmed these clips contain the scripted question,
    // rather than an unscripted answer. Preserve that distinction explicitly.
    row.transcription = row.prompt_text
    row.content_type = "scripted_prompt_reading"
    row.notes =
      "Contributor-confirmed scripted reading of prompt_text; this is not a spontaneous free-response answer. Audio and segmentation QA confirmed for development V0."
  } else if (row.language === "yo-en" && row.set === "setC") {
    row.notes =
      "Yoruba reference text and audio alignment confirmed by contributor for development V0."
  } else {
    row.notes = row.notes
      .replace(/Publication blocked until consent and missing provenance fields are confirmed\.?/g, "")
      .replace(/(?:Audio and segmentation QA confirmed for development V0\.\s*)+/g, "")
      .trim()
    row.notes = `${row.notes}${row.notes ? " " : ""}Audio and segmentation QA confirmed for development V0.`
  }
}
writeCsv(datasetMetadataPath, dataset.header, dataset.records)

const repository = readCsvObjects(repositoryMetadataPath)
const byRecordingId = new Map(dataset.records.map((row) => [row.recording_id, row]))
for (const row of repository.records) {
  const source = byRecordingId.get(row.recording_id)
  if (!source) continue
  row.content_type = source.content_type
  row.reference_transcript = source.transcription
  row.device = source.device
  row.noise_condition = source.noise_condition
  row.consent_confirmed = source.consent_confirmed
  row.consent_date = source.consent_date
  row.notes = source.prompt_text ? `Prompt: ${source.prompt_text} ${source.notes}` : source.notes
}
writeCsv(repositoryMetadataPath, repository.header, repository.records)

console.log(`Finalized ${dataset.records.length} V0 metadata rows.`)
