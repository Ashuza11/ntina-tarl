#!/usr/bin/env node

import path from "node:path"
import { fileURLToPath } from "node:url"
import { readCsvObjects, writeCsv } from "./csv-utils.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..")
const datasetMetadataPath = path.join(root, "data/recordings/dataset-v0/metadata.csv")
const repositoryMetadataPath = path.join(root, "data/recordings/metadata.csv")
const consentDate = "2026-08-15"
const childSpeakers = new Set(["spk-yo-003", "spk-yo-004"])
const confirmedSpeakers = new Set(["spk-sw-001", "spk-yo-001", "spk-yo-002", ...childSpeakers])
const devices = {
  "spk-sw-001": "Google Pixel 6 (Android 17)",
  "spk-yo-001": "Mixed Yoruba workflow: Dell Latitude E5450, Praat, Zoom recorder, and Android phone",
  "spk-yo-002": "Mixed Yoruba workflow: Dell Latitude E5450, Praat, Zoom recorder, and Android phone",
  "spk-yo-003": "Android phone (model unspecified)",
  "spk-yo-004": "Android phone (model unspecified)",
}

const dataset = readCsvObjects(datasetMetadataPath)
for (const row of dataset.records) {
  if (!confirmedSpeakers.has(row.speaker_id)) continue
  row.device = devices[row.speaker_id]
  row.noise_condition = "quiet"
  row.consent_confirmed = "yes"
  row.consent_date = consentDate
  row.target_variety = row.speaker_id === "spk-sw-001" ? "Standard Kiswahili" : "Standard Yoruba"

  if (childSpeakers.has(row.speaker_id)) {
    row.notes = "Reference text is the presented reading item; actual child performance may differ. Contributor and guardian consent confirmed; speaker/session mapping confirmed for V0."
    continue
  }

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

for (const [speakersPath, varietyColumn] of [
  [path.join(root, "data/recordings/dataset-v0/speakers.csv"), "target_variety"],
  [path.join(root, "data/recordings/speakers.csv"), "accent"],
]) {
  const speakers = readCsvObjects(speakersPath)
  for (const row of speakers.records) {
    if (!confirmedSpeakers.has(row.speaker_id)) continue
    row.consent_obtained = "yes"
    row.consent_date = consentDate
    if (row.speaker_id === "spk-sw-001") {
      row[varietyColumn] = "Standard Kiswahili"
      row.country = "Democratic Republic of the Congo"
      row.notes = "Standard Kiswahili contributor from the Democratic Republic of the Congo. Consent confirmed on 2026-08-15."
    } else {
      row[varietyColumn] = "Standard Yoruba"
      row.country = "Nigeria"
      if (childSpeakers.has(row.speaker_id)) {
        row.guardian_consent = "yes"
        row.notes = "Set A child participant aged 10-15 from Nigeria. Contributor and guardian consent confirmed on 2026-08-15; speaker/session mapping confirmed for V0."
      } else {
        row.notes = `${row.notes.replace(/Consent confirmed[^.]*\.?/g, "").trim()} Standard Yoruba contributor from Nigeria; consent confirmed on 2026-08-15.`.trim()
      }
    }
  }
  writeCsv(speakersPath, speakers.header, speakers.records)
}

console.log(`Finalized ${dataset.records.length} V0 metadata rows.`)
