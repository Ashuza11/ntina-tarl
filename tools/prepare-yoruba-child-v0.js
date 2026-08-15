#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { readCsvObjects, writeCsv } from "./csv-utils.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..")
const sourceDirs = {
  setA1: path.join(root, "data/recordings/audios/yor_en_setA_speaker_children10_15_Audio01-030"),
  setA2: path.join(root, "data/recordings/audios/yor_en_setA_speaker_children10_15_Audio042-079"),
  setB: path.join(root, "data/recordings/audios/yor_en_setBAudio01_1_010_1_children_10-15"),
}
const datasetDir = path.join(root, "data/recordings/dataset-v0")
const audioDir = path.join(datasetDir, "audio")
const firstSetASpeakerId = "spk-yo-003"
const secondSetASpeakerId = "spk-yo-004"
const setBSpeakerId = "spk-yo-005"
// Keep the deferred Set B speaker in this cleanup set so an earlier V0 build
// cannot leave stale packaged files or metadata behind.
const managedChildSpeakerIds = new Set([firstSetASpeakerId, secondSetASpeakerId, setBSpeakerId])
const activeChildSpeakerIds = [firstSetASpeakerId, secondSetASpeakerId]

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" })
  if (result.status !== 0) throw new Error(`${command} failed:\n${result.stderr || result.stdout}`)
  return result.stdout
}

function convert(input, output) {
  run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", input, "-vn",
    "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", output,
  ])
}

function duration(file) {
  return Number(run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", file,
  ]).trim()).toFixed(3)
}

function filesIn(directory) {
  if (!fs.existsSync(directory)) throw new Error(`Missing extracted directory: ${directory}`)
  return fs.readdirSync(directory).map((name) => path.join(directory, name)).filter((file) => fs.statSync(file).isFile())
}

fs.mkdirSync(audioDir, { recursive: true })
for (const name of fs.readdirSync(audioDir)) {
  if ([...managedChildSpeakerIds].some((speakerId) => name.includes(`_${speakerId}_`))) {
    fs.unlinkSync(path.join(audioDir, name))
  }
}

const instrument = new Map(
  readCsvObjects(path.join(root, "data/instrument/yoruba.csv")).records.map((row) => [row.item_id, row]),
)
const setASources = [
  ...filesIn(sourceDirs.setA1).map((source) => ({ source, speakerId: firstSetASpeakerId })),
  ...filesIn(sourceDirs.setA2).map((source) => ({ source, speakerId: secondSetASpeakerId })),
]
const seenItems = new Set()
const rows = []
for (const { source, speakerId } of setASources) {
  const match = path.basename(source).match(/(yo-(?:ls|w|p|s)-\d{3}(?:-q\d+)?)\./)
  if (!match) throw new Error(`Cannot identify Set A item from ${source}`)
  const contentId = match[1]
  if (seenItems.has(contentId)) throw new Error(`Duplicate Set A item ${contentId}`)
  seenItems.add(contentId)
  const item = instrument.get(contentId)
  if (!item) throw new Error(`No Yoruba instrument row for ${contentId}`)
  const fileName = `yo-en_setA_${speakerId}_${contentId}.wav`
  const output = path.join(audioDir, fileName)
  convert(source, output)
  rows.push({
    file_name: `audio/${fileName}`,
    recording_id: `v0-yo-child-a-${contentId}`,
    speaker_id: speakerId,
    language: "yo",
    target_variety: "Standard Yoruba",
    set: "setA",
    content_id: contentId,
    content_type: item.item_type,
    story_id: contentId.includes("-q") ? contentId.replace(/-q\d+$/, "") : "",
    difficulty_rank: item.difficulty_rank,
    prompt_text: "",
    transcription: item.text,
    duration_seconds: duration(output),
    sample_rate_hz: "16000",
    channels: "1",
    device: "Android phone (model unspecified)",
    noise_condition: "quiet",
    date_recorded: "2026-08-14",
    consent_confirmed: "yes",
    consent_date: "2026-08-15",
    source_file: path.relative(path.join(root, "data/recordings/audios"), source),
    split_method: "one supplied source file converted as one complete clip",
    version: "v0",
    notes: "Reference text is the presented reading item; actual child performance may differ. Contributor and guardian consent confirmed; final listening-based speaker validation is pending before upload.",
  })
}

const datasetMetadataPath = path.join(datasetDir, "metadata.csv")
const datasetMetadata = readCsvObjects(datasetMetadataPath)
writeCsv(datasetMetadataPath, datasetMetadata.header, [
  ...datasetMetadata.records.filter((row) => !managedChildSpeakerIds.has(row.speaker_id)),
  ...rows,
])

const centralMetadataPath = path.join(root, "data/recordings/metadata.csv")
const centralMetadata = readCsvObjects(centralMetadataPath)
const centralRows = rows.map((row) => ({
  recording_id: row.recording_id,
  speaker_id: row.speaker_id,
  language: row.language,
  content_type: row.set === "setA" ? "instrument_item" : row.content_type,
  content_id: row.content_id,
  reference_transcript: row.transcription,
  file_path: `dataset-v0/${row.file_name}`,
  duration_seconds: row.duration_seconds,
  device: row.device,
  noise_condition: row.noise_condition,
  date_recorded: row.date_recorded,
  consent_confirmed: row.consent_confirmed,
  consent_date: row.consent_date,
  notes: row.prompt_text ? `Prompt: ${row.prompt_text} ${row.notes}` : row.notes,
}))
writeCsv(centralMetadataPath, centralMetadata.header, [
  ...centralMetadata.records.filter((row) => !managedChildSpeakerIds.has(row.speaker_id)),
  ...centralRows,
])

const speakerRows = activeChildSpeakerIds.map((speakerId) => ({
    speaker_id: speakerId,
    role: "child_participant",
    age_range: "10-15",
    native_language: "Yoruba",
    target_variety: "Standard Yoruba",
    country: "Nigeria",
    consent_obtained: "yes",
    consent_date: "2026-08-15",
    guardian_consent: "yes",
    notes: "Set A child participant aged 10-15 from Nigeria. Contributor and guardian consent confirmed on 2026-08-15; speaker/session mapping confirmed for V0.",
  }))
const datasetSpeakersPath = path.join(datasetDir, "speakers.csv")
const datasetSpeakers = readCsvObjects(datasetSpeakersPath)
writeCsv(datasetSpeakersPath, datasetSpeakers.header, [
  ...datasetSpeakers.records.filter((row) => !managedChildSpeakerIds.has(row.speaker_id)),
  ...speakerRows,
])

const centralSpeakersPath = path.join(root, "data/recordings/speakers.csv")
const centralSpeakers = readCsvObjects(centralSpeakersPath)
const centralSpeakerRows = speakerRows.map((row) => ({ ...row, accent: row.target_variety }))
writeCsv(centralSpeakersPath, centralSpeakers.header, [
  ...centralSpeakers.records.filter((row) => !managedChildSpeakerIds.has(row.speaker_id)),
  ...centralSpeakerRows,
])

console.log(`Prepared ${rows.length} Set A child clips; raw Set B sources retained for a future version.`)
