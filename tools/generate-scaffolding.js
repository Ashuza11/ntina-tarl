#!/usr/bin/env node
// Drafts scaffolding utterances for linguist correction.
//
// Input:  data/spec/dialogue-acts.csv (act_id, category, tarl_level, audience,
//         function, trigger, max_words)
// Output: data/scaffolding/<pair>.DRAFT.csv  -- never overwrites the working
//         <pair>.csv file; that only happens via merge-scaffolding.js after
//         a linguist has filled in verdict/corrected_text.
//
// Incremental by act_id: if <pair>.DRAFT.csv already exists, every row
// already in it (including verdict/corrected_text a linguist may have
// started filling in) is preserved byte-for-byte and NOT redrafted, even if
// the spec's wording for that act_id changed. Only act_ids present in the
// spec but missing from the existing DRAFT file are drafted and appended.
// This means rerunning after adding new acts to the spec is exactly "draft
// the new ones, leave everything else alone" -- no special flag needed.
//
// One Anthropic API call per (new act, language pair). Responses are also
// cached to disk (separately from the above) so a rerun after a crash only
// re-does the calls that didn't finish, not everything.
//
// Usage:
//   node generate-scaffolding.js [--pairs sw-en,yo-en] [--force]
//
// --force clears the on-disk API-response cache before running (a crash-
// recovery escape hatch), it does not redraft acts already in the DRAFT file.
//
// Requires ANTHROPIC_API_KEY (see .env.example in this directory).

import "dotenv/config"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { fileURLToPath } from "node:url"
import Anthropic from "@anthropic-ai/sdk"
import { readCsvObjects, writeCsv } from "./csv-utils.js"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, "..")
const SPEC_PATH = path.join(ROOT, "data/spec/dialogue-acts.csv")
const SCAFFOLDING_DIR = path.join(ROOT, "data/scaffolding")
const CACHE_DIR = path.join(HERE, ".cache/scaffolding")

const MODEL = "claude-sonnet-4-6"
const MAX_CONCURRENCY = 3
const MAX_RETRIES = 4
const BASE_BACKOFF_MS = 2000

const PAIR_LANGUAGES = {
  "sw-en": "Swahili",
  "yo-en": "Yoruba",
}

const DRAFT_HEADER = [
  "act_id",
  "category",
  "tarl_level",
  "audience",
  "function_reminder",
  "max_words",
  "text_draft",
  "matrix_language",
  "switch_points",
  "register_note",
  "verdict",
  "corrected_text",
]

const DRAFT_TOOL = {
  name: "submit_scaffolding_draft",
  description:
    "Submit the drafted code-switched utterance for this dialogue act.",
  input_schema: {
    type: "object",
    properties: {
      text_draft: {
        type: "string",
        description:
          "The full utterance the voice agent would say, natural speech, at or under the given max_words.",
      },
      switch_points: {
        type: "string",
        description:
          "The same text with every English-switched span wrapped in double brackets, e.g. 'Sawa, [[good job]] hebu tuendelee.' If there is no switch, repeat text_draft unchanged.",
      },
      register_note: {
        type: "string",
        description:
          "One sentence on the tone/formality this line aims for, appropriate to its audience and moment.",
      },
    },
    required: ["text_draft", "switch_points", "register_note"],
    additionalProperties: false,
  },
}

function parseArgs(argv) {
  const args = { pairs: Object.keys(PAIR_LANGUAGES), force: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--pairs") {
      args.pairs = argv[++i].split(",").map((s) => s.trim())
    } else if (argv[i] === "--force") {
      args.force = true
    }
  }
  return args
}

function buildSystemPrompt(matrixLanguage, audience) {
  const yorubaNote =
    matrixLanguage === "Yoruba"
      ? " Yoruba text must use correct tone marks (à, á) and subdot characters (ẹ, ọ, ṣ) -- never omit them, even though they take extra keystrokes."
      : ""
  const sharedPreamble =
    `You are drafting utterances for Ntina, a voice-based literacy tutor for ` +
    `6-8 year old children learning to read. ${matrixLanguage} is the matrix ` +
    `(primary) language of the utterance -- English is embedded only in the ` +
    `short spans where a real bilingual speaker in this setting would ` +
    `naturally code-switch. Do not translate the whole utterance into English ` +
    `and do not produce an English-only utterance.${yorubaNote}`

  if (audience === "facilitator") {
    return (
      `${sharedPreamble} The speaker here is talking to the adult facilitator ` +
      `supervising the session, not the child -- this is an operational message ` +
      `between adults. Keep it brief and factual: no warmth-for-a-child framing, ` +
      `no cheerleading, no exclamation marks used for excitement. State exactly ` +
      `what the facilitator needs to know or do.`
    )
  }

  return (
    `${sharedPreamble} The speaker here is talking directly to the child. Keep ` +
    `the tone warm and simple, appropriate for a young child, never exam-like.`
  )
}

function buildUserMessage(act) {
  const levelNote =
    act.tarl_level && act.tarl_level !== "any"
      ? `TaRL level: ${act.tarl_level} -- calibrate vocabulary and sentence complexity to a child reading at this level.\n`
      : ""
  const audienceNote = `Audience: ${act.audience === "facilitator" ? "the adult facilitator" : "the child"}\n`
  return (
    `Dialogue act: ${act.act_id}\n` +
    `Category: ${act.category}\n` +
    audienceNote +
    levelNote +
    `Function: ${act.function}\n` +
    `Trigger: ${act.trigger}\n` +
    `Max words: ${act.max_words}\n\n` +
    `Draft this utterance now and call submit_scaffolding_draft with your result.`
  )
}

function cacheKeyFor(pair, act) {
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ pair, act }))
    .digest("hex")
    .slice(0, 16)
  return `${act.act_id}.${hash}.json`
}

async function withRetry(fn, label) {
  let lastErr
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const retryable =
        err instanceof Anthropic.RateLimitError ||
        err instanceof Anthropic.InternalServerError ||
        err instanceof Anthropic.APIConnectionError
      if (!retryable || attempt === MAX_RETRIES) break
      const delay = BASE_BACKOFF_MS * 2 ** (attempt - 1)
      console.warn(
        `  [retry ${attempt}/${MAX_RETRIES}] ${label}: ${err.message} -- waiting ${delay}ms`,
      )
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastErr
}

async function draftOne(client, pair, matrixLanguage, act) {
  fs.mkdirSync(path.join(CACHE_DIR, pair), { recursive: true })
  const cachePath = path.join(CACHE_DIR, pair, cacheKeyFor(pair, act))

  if (fs.existsSync(cachePath)) {
    return { ...JSON.parse(fs.readFileSync(cachePath, "utf8")), fromCache: true }
  }

  const response = await withRetry(
    () =>
      client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        thinking: { type: "disabled" },
        output_config: { effort: "low" },
        system: buildSystemPrompt(matrixLanguage, act.audience),
        tools: [DRAFT_TOOL],
        tool_choice: { type: "tool", name: DRAFT_TOOL.name },
        messages: [{ role: "user", content: buildUserMessage(act) }],
      }),
    `${pair}/${act.act_id}`,
  )

  const toolUse = response.content.find((b) => b.type === "tool_use")
  if (!toolUse) {
    throw new Error(
      `${pair}/${act.act_id}: no tool_use block in response (stop_reason=${response.stop_reason})`,
    )
  }

  const result = {
    text_draft: toolUse.input.text_draft,
    switch_points: toolUse.input.switch_points,
    register_note: toolUse.input.register_note,
  }
  fs.writeFileSync(cachePath, JSON.stringify(result, null, 2))
  return { ...result, fromCache: false }
}

async function runPool(items, concurrency, worker) {
  const results = new Array(items.length)
  let next = 0
  async function runner() {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: concurrency }, runner))
  return results
}

// Rows drafted before the `audience` column existed don't have it in the
// file -- they were all child-directed acts by construction (the only kind
// that existed then), so backfill rather than leave it blank.
function normalizeExistingRow(row) {
  return { ...row, audience: row.audience || "child" }
}

async function main() {
  const { pairs, force } = parseArgs(process.argv.slice(2))

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY is not set. Copy tools/.env.example to tools/.env and fill it in.",
    )
    process.exit(1)
  }

  const { records: acts } = readCsvObjects(SPEC_PATH)
  if (acts.length === 0) {
    console.error(`No acts found in ${SPEC_PATH}`)
    process.exit(1)
  }

  const seen = new Set()
  for (const act of acts) {
    if (!act.act_id) throw new Error("Found a row in dialogue-acts.csv with no act_id")
    if (seen.has(act.act_id)) throw new Error(`Duplicate act_id in spec: ${act.act_id}`)
    seen.add(act.act_id)
  }

  for (const pair of pairs) {
    if (!(pair in PAIR_LANGUAGES)) {
      console.error(`Unknown pair "${pair}" -- known pairs: ${Object.keys(PAIR_LANGUAGES).join(", ")}`)
      process.exit(1)
    }
  }

  const client = new Anthropic()

  const summary = { drafted: 0, cached: 0, preserved: 0, failed: [], outputPaths: [], newByCategory: {} }

  for (const pair of pairs) {
    const matrixLanguage = PAIR_LANGUAGES[pair]
    const outPath = path.join(SCAFFOLDING_DIR, `${pair}.DRAFT.csv`)

    let existingRows = []
    if (fs.existsSync(outPath)) {
      existingRows = readCsvObjects(outPath).records.map(normalizeExistingRow)
    }
    const existingIds = new Set(existingRows.map((r) => r.act_id))
    const actsToDraft = acts.filter((act) => !existingIds.has(act.act_id))
    summary.preserved += existingRows.length

    console.log(
      `\n=== ${pair} (${matrixLanguage}) -- ${existingRows.length} already drafted (untouched), ${actsToDraft.length} new to draft ===`,
    )

    if (force) {
      const pairCacheDir = path.join(CACHE_DIR, pair)
      if (fs.existsSync(pairCacheDir)) fs.rmSync(pairCacheDir, { recursive: true })
    }

    const newRows = []
    await runPool(actsToDraft, MAX_CONCURRENCY, async (act) => {
      try {
        const draft = await draftOne(client, pair, matrixLanguage, act)
        if (draft.fromCache) summary.cached++
        else summary.drafted++

        newRows.push({
          act_id: act.act_id,
          category: act.category,
          tarl_level: act.tarl_level || "any",
          audience: act.audience || "child",
          function_reminder: act.function,
          max_words: act.max_words,
          text_draft: draft.text_draft,
          matrix_language: matrixLanguage,
          switch_points: draft.switch_points,
          register_note: draft.register_note,
          verdict: "",
          corrected_text: "",
        })
        summary.newByCategory[act.category] = (summary.newByCategory[act.category] || 0) + 1
        console.log(`  ${draft.fromCache ? "[cache]" : "[drafted]"} ${act.act_id}`)
      } catch (err) {
        summary.failed.push({ pair, act_id: act.act_id, error: err.message })
        console.error(`  [FAILED] ${act.act_id}: ${err.message}`)
      }
    })

    // New rows appended in spec order, after every preserved existing row.
    newRows.sort(
      (a, b) => acts.findIndex((x) => x.act_id === a.act_id) - acts.findIndex((x) => x.act_id === b.act_id),
    )

    fs.mkdirSync(SCAFFOLDING_DIR, { recursive: true })
    writeCsv(outPath, DRAFT_HEADER, [...existingRows, ...newRows])
    summary.outputPaths.push(outPath)
  }

  console.log("\n=== Summary ===")
  console.log(`Acts drafted (new API calls): ${summary.drafted}`)
  console.log(`Acts served from cache: ${summary.cached}`)
  console.log(`Rows already present, preserved untouched: ${summary.preserved}`)
  console.log(`Failures: ${summary.failed.length}`)
  for (const f of summary.failed) {
    console.log(`  - ${f.pair}/${f.act_id}: ${f.error}`)
  }
  console.log("New acts drafted this run, by category:")
  for (const [cat, n] of Object.entries(summary.newByCategory).sort()) {
    console.log(`  - ${cat}: ${n}`)
  }
  console.log("Output files:")
  for (const p of summary.outputPaths) {
    console.log(`  - ${p}`)
  }

  if (summary.failed.length > 0) {
    console.log(
      "\nSome acts failed. Rerun this script (it will reuse cached results and only retry the failures).",
    )
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
