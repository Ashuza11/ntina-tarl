#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { readCsvObjects, writeCsv } from "./csv-utils.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..")
const sourceDir = path.join(
  root,
  "data/recordings/audios/Ashuza_25-30_from_congodrc_swahili/A",
)
const datasetDir = path.join(root, "data/recordings/dataset-v0")
const audioDir = path.join(datasetDir, "audio")
const scriptPath = path.join(root, "data/recordings/scripts/sw-en_setA_script.csv")
const speakerId = "spk-sw-001"

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options })
  if (result.status !== 0) {
    throw new Error(`${command} failed:\n${result.stderr || result.stdout}`)
  }
  return result.stdout
}

function outputName(template) {
  return template.replace("SPEAKER", speakerId)
}

function detectSilences(input, minDuration) {
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-i",
      input,
      "-af",
      `silencedetect=noise=-35dB:d=${minDuration}`,
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  )
  // ffmpeg returns success while writing filter diagnostics to stderr.
  if (result.status !== 0) throw new Error(result.stderr)
  const starts = [...result.stderr.matchAll(/silence_start: ([0-9.]+)/g)].map((m) => Number(m[1]))
  const ends = [...result.stderr.matchAll(/silence_end: ([0-9.]+)/g)].map((m) => Number(m[1]))
  if (starts.length !== ends.length) {
    throw new Error(`Unpaired silence boundaries in ${input}`)
  }
  return starts.map((start, i) => ({ start, end: ends[i] }))
}

function splitOnSilence(input, rows, minDuration) {
  const silences = detectSilences(input, minDuration)
  if (silences.length !== rows.length + 1) {
    throw new Error(
      `${path.basename(input)}: expected ${rows.length + 1} silence regions, found ${silences.length}`,
    )
  }
  const cutPoints = silences.map(({ start, end }) => (start + end) / 2)
  rows.forEach((row, i) => {
    const out = path.join(audioDir, outputName(row.file_name))
    run("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      cutPoints[i].toFixed(6),
      "-to",
      cutPoints[i + 1].toFixed(6),
      "-i",
      input,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "pcm_s16le",
      out,
    ])
  })
}

function convertWhole(input, row) {
  const out = path.join(audioDir, outputName(row.file_name))
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
    out,
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

fs.mkdirSync(audioDir, { recursive: true })

const rows = readCsvObjects(scriptPath).records.filter(
  (row) => row.file_name && row.item_id_or_act_id,
)
const byType = Object.groupBy(rows, (row) => row.item_type)

splitOnSilence(
  path.join(sourceDir, "A_sylables.mp4"),
  byType.syllable,
  0.6,
)
splitOnSilence(path.join(sourceDir, "A_words.mp4"), byType.word, 1.0)
splitOnSilence(
  path.join(sourceDir, "A_Comprihension_question.mp4"),
  byType.comprehension_question,
  1.0,
)

convertWhole(path.join(sourceDir, "Aparagraphe1.mp4"), byType.paragraph[0])
convertWhole(path.join(sourceDir, "Aparagraphe2.mp4"), byType.paragraph[1])
convertWhole(path.join(sourceDir, "A_Story1.mp4"), byType.story[0])
convertWhole(path.join(sourceDir, "A_Story2.mp4"), byType.story[1])

const metadataHeader = [
  "file_name",
  "recording_id",
  "speaker_id",
  "language",
  "target_variety",
  "set",
  "content_id",
  "content_type",
  "story_id",
  "difficulty_rank",
  "transcription",
  "duration_seconds",
  "sample_rate_hz",
  "channels",
  "device",
  "noise_condition",
  "date_recorded",
  "consent_confirmed",
  "consent_date",
  "source_file",
  "split_method",
  "version",
  "notes",
]

const sourceByType = {
  syllable: "A_sylables.mp4",
  word: "A_words.mp4",
  paragraph: null,
  story: null,
  comprehension_question: "A_Comprihension_question.mp4",
}

const metadata = rows.map((row, index) => {
  const fileName = outputName(row.file_name)
  let sourceFile = sourceByType[row.item_type]
  if (row.item_type === "paragraph") sourceFile = `Aparagraphe${row.difficulty_rank}.mp4`
  if (row.item_type === "story") sourceFile = `A_Story${row.difficulty_rank}.mp4`
  return {
    file_name: `audio/${fileName}`,
    recording_id: `v0-sw-${String(index + 1).padStart(4, "0")}`,
    speaker_id: speakerId,
    language: "sw",
    target_variety: "Congolese Swahili (specific regional variety unconfirmed)",
    set: "setA",
    content_id: row.item_id_or_act_id,
    content_type: row.item_type,
    story_id: row.story_id,
    difficulty_rank: row.difficulty_rank,
    transcription: row.text_to_read,
    duration_seconds: durationSeconds(path.join(audioDir, fileName)),
    sample_rate_hz: "16000",
    channels: "1",
    device: "unknown",
    noise_condition: "unreviewed",
    date_recorded: "",
    consent_confirmed: "no",
    consent_date: "",
    source_file: sourceFile,
    split_method:
      row.item_type === "syllable"
        ? "silence midpoint (-35 dB, 0.6 s minimum)"
        : ["word", "comprehension_question"].includes(row.item_type)
          ? "silence midpoint (-35 dB, 1.0 s minimum)"
          : "whole source recording",
    version: "v0",
    notes: "Publication blocked until consent and missing provenance fields are confirmed.",
  }
})

writeCsv(path.join(datasetDir, "metadata.csv"), metadataHeader, metadata)

const expectedFiles = new Set(rows.map((row) => outputName(row.file_name)))
const actualFiles = new Set(fs.readdirSync(audioDir).filter((name) => name.endsWith(".wav")))
const missing = [...expectedFiles].filter((name) => !actualFiles.has(name))
const unexpected = [...actualFiles].filter((name) => !expectedFiles.has(name))
if (missing.length || unexpected.length) {
  throw new Error(`Audio validation failed. Missing=${missing}; unexpected=${unexpected}`)
}

console.log(`Prepared ${rows.length} Set A clips in ${datasetDir}`)
