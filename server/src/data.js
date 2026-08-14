// Loads the real linguist-authored instrument (data/instrument/<language>.csv)
// so assessment targets always come from the authoritative corpus, never
// from client-supplied text -- a child's browser request can pick an
// item_id, never define what the "correct" text is.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, "../..")

// Minimal RFC4180-ish CSV parser (same approach as tools/csv-utils.js,
// duplicated here rather than cross-imported since server/ and tools/ are
// separate npm packages with their own node_modules).
function parseCsv(text) {
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows = []
  let row = []
  let field = ""
  let inQuotes = false
  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (inQuotes) {
      if (c === '"') {
        if (body[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }
    if (c === '"') inQuotes = true
    else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && body[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += c
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""))
}

function loadInstrument(language) {
  const csvPath = path.join(ROOT, `data/instrument/${language}.csv`)
  const text = fs.readFileSync(csvPath, "utf8")
  const [header, ...rows] = parseCsv(text)
  return rows
    .map((r) => Object.fromEntries(header.map((col, i) => [col, r[i] ?? ""])))
    .filter((r) => !r.item_id.startsWith("EXAMPLE-"))
}

// Language pairs available in this demo -- both confirmed against Sahara's
// official STT Supported Languages table (docs.voice.intron.io): sw and yo
// are both listed as code-switched. See config/README.md.
export const PAIRS = {
  "sw-en": { language: "swahili", saharaCode: "sw", label: "Swahili" },
  "yo-en": { language: "yoruba", saharaCode: "yo", label: "Yoruba" },
}
export const DEFAULT_PAIR = "sw-en"

export function resolvePair(pairParam) {
  return PAIRS[pairParam] ? pairParam : DEFAULT_PAIR
}

// Demo scope: syllables and words only (short, quick to record and score --
// paragraphs/stories are real instrument content too but a much longer
// interaction, out of scope for this first working slice per CLAUDE.md's
// MVP build order).
export function getDemoItems(language) {
  return loadInstrument(language).filter(
    (r) => r.item_type === "syllable" || r.item_type === "word"
  )
}

export function getItemById(language, itemId) {
  const item = loadInstrument(language).find((r) => r.item_id === itemId)
  if (!item) throw new Error(`Unknown item_id "${itemId}" for language "${language}"`)
  return item
}

// Fisher-Yates partial shuffle -- N distinct items, no replacement, still
// sourced only from the linguist-authored instrument via getDemoItems.
export function sampleDemoItems(language, count) {
  const items = getDemoItems(language)
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, Math.min(count, shuffled.length))
}
