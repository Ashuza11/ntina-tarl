#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { parseCsv, readCsvObjects, writeCsv } from "./csv-utils.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, "..")
const sourceDir = path.join(
  root,
  "data/recordings/audios/Ashuza_25-30_from_congodrc_swahili/A",
)
const datasetDir = path.join(root, "data/recordings/dataset-v0")
const audioDir = path.join(datasetDir, "audio")
const scriptPath = path.join(root, "data/recordings/scripts/sw-en_setA_script.csv")
const setBScriptPath = path.join(root, "data/recordings/scripts/sw-en_setB_script.csv")
const setBSource = path.join(
  root,
  "data/recordings/audios/Ashuza_25-30_from_congodrc_swahili/B/B_questions.mp4",
)
const setCSource = path.join(
  root,
  "data/recordings/audios/Ashuza_25-30_from_congodrc_swahili/C/C_sw_en20_intey.mp4",
)
const speakerId = "spk-sw-001"

const setCItems = [
  ["instr-start-letter-syllable-001", "Hebu sasa soma syllable hii kwa sauti."],
  ["instr-retry-001", "Hebu jaribu kuisoma tena. One more time!"],
  ["instr-slow-down-001", "Soma polepole, take your time, usikimbilie maneno."],
  ["instr-ready-check-001", "Uko ready? Twende!"],
  ["praise-first-try-beginner-001", "Hongera! Good job, umeitamka vizuri!"],
  ["praise-first-try-paragraph-001", "Umesoma kifungu vizuri sana. Great job!"],
  ["praise-effort-general-001", "Good try! Umejitahidi; tujaribu tena pamoja."],
  ["praise-improvement-001", "Unazidi kufanya vizuri. Keep it up!"],
  ["hint-sentence-context-001", "Soma sentensi yote; maneno mengine yatakupa clue."],
  ["hint-look-again-001", "Angalia neno hilo tena kwa makini. Take your time."],
  ["correction-letter-soft-001", "Ulikaribia! Sikiliza sauti ya herufi hii: mmm. Try again."],
  ["correction-model-pronunciation-001", "Sikiliza: “shule.” Sasa repeat after me: “shule.”"],
  ["correction-skip-word-001", "Ulikaribia! Umeruka neno moja. Read tena bila kuliacha."],
  ["level-up-letter-to-word-001", "Hongera! Sasa tunaendelea kusoma maneno. Ready? Twende!"],
  ["level-stay-beginner-001", "Tutaendelea kufanya mazoezi ya sauti za herufi. You’re doing well!"],
  ["encourage-tired-001", "Umefanya vizuri sana! Keep going, tunakaribia mwisho!"],
  ["encourage-nervous-001", "Usiwe na wasiwasi; tuko pamoja. Ready? Tuanze!"],
  ["encourage-after-break-001", "Karibu tena! Welcome back, tuendelee tulipoishia."],
  ["closing-thank-you-001", "Asante sana kwa kazi yako nzuri leo, well done!"],
  ["repair-no-audio-001", "Samahani, sikusikia. Please jaribu tena."],
].map(([id, text], index) => ({
  file_name: `sw-en_setC_SPEAKER_${id}.wav`,
  set: "setC",
  item_id_or_act_id: id,
  text_to_read: text,
  difficulty_rank: String(index + 1),
}))

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options })
  if (result.status !== 0) {
    throw new Error(`${command} failed:\n${result.stderr || result.stdout}`)
  }
  return result.stdout
}

function outputName(template) {
  // Keep the recording-sheet filename exactly as authored. The speaker is
  // linked through metadata, while the literal SPEAKER token stays in the
  // portable filename template.
  return template
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

function splitBetweenSilences(input, rows, minDuration) {
  const silences = detectSilences(input, minDuration)
  if (silences.length !== rows.length - 1) {
    throw new Error(
      `${path.basename(input)}: expected ${rows.length - 1} inter-item silences, found ${silences.length}`,
    )
  }
  const fullDuration = Number(
    run("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      input,
    ]).trim(),
  )
  const cutPoints = [
    0,
    ...silences.map(({ start, end }) => (start + end) / 2),
    fullDuration,
  ]
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
const setBMatrix = parseCsv(fs.readFileSync(setBScriptPath, "utf8"))
const setBHeader = setBMatrix[1]
const setBRows = setBMatrix.slice(2).map((values) =>
  Object.fromEntries(setBHeader.map((column, i) => [column, values[i] ?? ""])),
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
splitBetweenSilences(setBSource, setBRows, 2.0)
splitOnSilence(setCSource, setCItems, 1.5)

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
  "prompt_text",
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

const setAMetadata = rows.map((row, index) => {
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
    prompt_text: "",
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

const setBMetadata = setBRows.map((row, index) => {
  const fileName = outputName(row.file_name)
  return {
    file_name: `audio/${fileName}`,
    recording_id: `v0-sw-${String(rows.length + index + 1).padStart(4, "0")}`,
    speaker_id: speakerId,
    language: "sw-en",
    target_variety: "Congolese Swahili (specific regional variety unconfirmed)",
    set: "setB",
    content_id: row.item_id_or_act_id,
    content_type: "free_response",
    story_id: "",
    difficulty_rank: String(index + 1),
    prompt_text: row.text_to_read,
    transcription: "",
    duration_seconds: durationSeconds(path.join(audioDir, fileName)),
    sample_rate_hz: "16000",
    channels: "1",
    device: "unknown",
    noise_condition: "unreviewed",
    date_recorded: "",
    consent_confirmed: "no",
    consent_date: "",
    source_file: "B_questions.mp4",
    split_method: "inter-answer silence midpoint (-35 dB, 2.0 s minimum)",
    version: "v0",
    notes: "Audio contains the speaker's free response; transcription requires manual verification. Publication blocked until consent and missing provenance fields are confirmed.",
  }
})

const setCMetadata = setCItems.map((row, index) => {
  const fileName = outputName(row.file_name)
  return {
    file_name: `audio/${fileName}`,
    recording_id: `v0-sw-${String(rows.length + setBRows.length + index + 1).padStart(4, "0")}`,
    speaker_id: speakerId,
    language: "sw-en",
    target_variety: "Congolese Swahili (specific regional variety unconfirmed)",
    set: "setC",
    content_id: row.item_id_or_act_id,
    content_type: "scaffolding_utterance",
    story_id: "",
    difficulty_rank: row.difficulty_rank,
    prompt_text: "",
    transcription: row.text_to_read,
    duration_seconds: durationSeconds(path.join(audioDir, fileName)),
    sample_rate_hz: "16000",
    channels: "1",
    device: "unknown",
    noise_condition: "unreviewed",
    date_recorded: "",
    consent_confirmed: "no",
    consent_date: "",
    source_file: "C_sw_en20_intey.mp4",
    split_method: "silence midpoint (-35 dB, 1.5 s minimum)",
    version: "v0",
    notes: row.item_id_or_act_id === "instr-slow-down-001"
      ? "This recording follows the earlier script wording 'usikimbilie maneno'; the current reviewed corpus now uses 'usiache maneno'. Publication blocked until consent and missing provenance fields are confirmed."
      : "Publication blocked until consent and missing provenance fields are confirmed.",
  }
})

const metadata = [...setAMetadata, ...setBMetadata, ...setCMetadata]

const datasetMetadataPath = path.join(datasetDir, "metadata.csv")
let otherDatasetRows = []
if (fs.existsSync(datasetMetadataPath)) {
  otherDatasetRows = readCsvObjects(datasetMetadataPath).records.filter(
    (row) => row.speaker_id !== speakerId,
  )
}
writeCsv(datasetMetadataPath, metadataHeader, [...metadata, ...otherDatasetRows])

const repositoryMetadataPath = path.join(root, "data/recordings/metadata.csv")
const repositoryMetadata = readCsvObjects(repositoryMetadataPath)
const preservedRepositoryRows = repositoryMetadata.records.filter(
  (row) => row.recording_id.startsWith("EXAMPLE-") || row.speaker_id !== speakerId,
)
const actualRows = metadata.map((row) => ({
  recording_id: row.recording_id,
  speaker_id: row.speaker_id,
  language: row.language,
  content_type:
    row.set === "setB"
      ? "free_response"
      : row.set === "setC"
        ? "scaffolding_utterance"
        : "instrument_item",
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
  [...preservedRepositoryRows, ...actualRows],
)

const expectedFiles = new Set(
  [...rows, ...setBRows, ...setCItems].map((row) => outputName(row.file_name)),
)
const actualFiles = new Set(
  fs.readdirSync(audioDir).filter((name) => name.startsWith("sw-en_") && name.endsWith(".wav")),
)
const missing = [...expectedFiles].filter((name) => !actualFiles.has(name))
const unexpected = [...actualFiles].filter((name) => !expectedFiles.has(name))
if (missing.length || unexpected.length) {
  throw new Error(`Audio validation failed. Missing=${missing}; unexpected=${unexpected}`)
}

console.log(
  `Prepared ${rows.length} Set A, ${setBRows.length} Set B, and ${setCItems.length} Set C clips in ${datasetDir}`,
)
