#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { parseCsv, readCsvObjects, writeCsv } from "./csv-utils.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..")
const earlyDir = path.join(root, "data/recordings/audios/yoruba_Recording C2 - 45")
const lateDir = path.join(root, "data/recordings/audios/Yoruba_C46_88")
const setBDir = path.join(
  root,
  "data/recordings/audios/yor-en_setBAudio001_010_Adult25_34",
)
const datasetDir = path.join(root, "data/recordings/dataset-v0")
const audioDir = path.join(datasetDir, "audio")
const draftPath = path.join(root, "data/scaffolding/yo-en.DRAFT.csv")
const setBScriptPath = path.join(root, "data/recordings/scripts/yo-en_setB_script.csv")

const speakers = {
  early: "spk-yo-001",
  late: "spk-yo-002",
}

const descriptiveEarlyNames = {
  "praise-first-try-story-001": "Praise finishing a story with strong fluency..m4a",
  "praise-after-retry-word-001": "Praise the child for succeeding after a retry..m4a",
  "praise-after-retry-syllable-001":
    "Praise the child for succeeding after a retry at syllable level..m4a",
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" })
  if (result.status !== 0) {
    throw new Error(`${command} failed:\n${result.stderr || result.stdout}`)
  }
  return result.stdout
}

function convert(input, output) {
  run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    input,
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    output,
  ])
}

function durationSeconds(file) {
  return Number(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      file,
    ]).trim(),
  ).toFixed(3)
}

function earlySourceFor(actId) {
  return path.join(earlyDir, descriptiveEarlyNames[actId] ?? `${actId}.m4a`)
}

function lateSourceFor(position) {
  return path.join(lateDir, `yo-en_setC_SPEAKER_setC-${position}.wav.wav`)
}

fs.mkdirSync(audioDir, { recursive: true })

const draftRows = readCsvObjects(draftPath).records
if (draftRows.length !== 88) {
  throw new Error(`Expected 88 Yoruba scaffolding rows, found ${draftRows.length}`)
}

const available = []
const suppliedItems = [
  ...Array.from({ length: 44 }, (_, i) => ({ actPosition: i + 1, group: "early" })),
  ...Array.from({ length: 42 }, (_, i) => ({
    actPosition: i + 45,
    sourceLabel: i + 46,
    group: "late",
  })),
]
for (const { actPosition, sourceLabel, group } of suppliedItems) {
  const row = draftRows[actPosition - 1]
  const source = group === "early" ? earlySourceFor(row.act_id) : lateSourceFor(sourceLabel)
  if (!fs.existsSync(source)) {
    throw new Error(`Missing expected source for scaffold act ${actPosition}: ${source}`)
  }
  const fileName = `yo-en_setC_SPEAKER_${row.act_id}.wav`
  const output = path.join(audioDir, fileName)
  convert(source, output)
  available.push({ position: actPosition, row, group, source, fileName, output })
}

const setBMatrix = parseCsv(fs.readFileSync(setBScriptPath, "utf8"))
const setBHeader = setBMatrix[1]
const setBRows = setBMatrix.slice(2).map((values) =>
  Object.fromEntries(setBHeader.map((column, i) => [column, values[i] ?? ""])),
)
for (const row of setBRows) {
  const source = path.join(setBDir, `${row.file_name}.wav`)
  if (!fs.existsSync(source)) throw new Error(`Missing Yoruba Set B source: ${source}`)
  convert(source, path.join(audioDir, row.file_name))
}

const metadataPath = path.join(datasetDir, "metadata.csv")
const datasetMetadata = readCsvObjects(metadataPath)
const preservedDatasetRows = datasetMetadata.records.filter(
  (row) => !Object.values(speakers).includes(row.speaker_id),
)
const setCMetadataRows = available.map(({ position, row, group, source, fileName, output }) => ({
  file_name: `audio/${fileName}`,
  recording_id: `v0-yo-${String(position).padStart(4, "0")}`,
  speaker_id: speakers[group],
  language: "yo-en",
  target_variety: "Yoruba (specific regional variety unconfirmed)",
  set: "setC",
  content_id: row.act_id,
  content_type: "scaffolding_utterance",
  story_id: "",
  difficulty_rank: String(position),
  prompt_text: "",
  transcription: row.text_draft,
  duration_seconds: durationSeconds(output),
  sample_rate_hz: "16000",
  channels: "1",
  device: "Basic Android phone (model unspecified)",
  noise_condition: "moderate",
  date_recorded: "",
  consent_confirmed: "yes",
  consent_date: "2026-08-14",
  source_file: path.basename(source),
  split_method: "one supplied source file converted as one complete clip",
  version: "v0",
  notes:
    "Yoruba reference text and audio alignment confirmed by contributor for development V0.",
}))
const setBMetadataRows = setBRows.map((row, index) => {
  const output = path.join(audioDir, row.file_name)
  return {
    file_name: `audio/${row.file_name}`,
    recording_id: `v0-yo-b-${String(index + 1).padStart(4, "0")}`,
    speaker_id: speakers.early,
    language: "yo-en",
    target_variety: "Yoruba (specific regional variety unconfirmed)",
    set: "setB",
    content_id: row.item_id_or_act_id,
    content_type: "free_response",
    story_id: "",
    difficulty_rank: String(index + 1),
    prompt_text: row.text_to_read,
    transcription: "",
    duration_seconds: durationSeconds(output),
    sample_rate_hz: "16000",
    channels: "1",
    device: "Basic Android phone (model unspecified)",
    noise_condition: "moderate",
    date_recorded: "",
    consent_confirmed: "yes",
    consent_date: "2026-08-14",
    source_file: `${row.file_name}.wav`,
    split_method: "one supplied source file converted as one complete clip",
    version: "v0",
    notes:
      "Contributor-confirmed scripted reading of prompt_text; this is not a spontaneous free-response answer. Audio and segmentation QA confirmed for development V0.",
  }
})
const metadataRows = [...setCMetadataRows, ...setBMetadataRows]
writeCsv(metadataPath, datasetMetadata.header, [...preservedDatasetRows, ...metadataRows])

const repositoryMetadataPath = path.join(root, "data/recordings/metadata.csv")
const repositoryMetadata = readCsvObjects(repositoryMetadataPath)
const preservedRepositoryRows = repositoryMetadata.records.filter(
  (row) => !Object.values(speakers).includes(row.speaker_id),
)
const repositoryRows = metadataRows.map((row) => ({
  recording_id: row.recording_id,
  speaker_id: row.speaker_id,
  language: row.language,
  content_type: "scaffolding_utterance",
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
writeCsv(
  repositoryMetadataPath,
  repositoryMetadata.header,
  [...preservedRepositoryRows, ...repositoryRows],
)

const expected = new Set([
  ...available.map(({ fileName }) => fileName),
  ...setBRows.map((row) => row.file_name),
])
const actual = new Set(
  fs.readdirSync(audioDir).filter(
    (name) => name.startsWith("yo-en_") && name.includes("_SPEAKER_") && name.endsWith(".wav"),
  ),
)
const missing = [...expected].filter((name) => !actual.has(name))
const unexpected = [...actual].filter((name) => !expected.has(name))
if (missing.length || unexpected.length) {
  throw new Error(`Yoruba validation failed. Missing=${missing}; unexpected=${unexpected}`)
}

console.log(
  `Prepared ${setBRows.length} Yoruba Set B clips and ${available.length} Set C clips (the first 86 scaffold acts).`,
)
