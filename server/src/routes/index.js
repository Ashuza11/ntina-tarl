import { Router } from "express"
import multer from "multer"
import { getDemoItems, getItemById, sampleDemoItems, PAIRS, resolvePair } from "../data.js"
import { uploadAudio, getStatus, isTerminal } from "../sahara.js"
import { scoreAttempt } from "../../../engine/scoring.js"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// In-memory only -- a demo-scope job store, not a database. Restarting the
// server loses in-flight assessments, which is fine for this slice.
const assessments = new Map()

router.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

// Both language pairs the demo supports -- lets the client build a real
// selector instead of hardcoding "Swahili"/"Yoruba" strings client-side.
router.get("/pairs", (req, res) => {
  res.json({ pairs: Object.entries(PAIRS).map(([pair, v]) => ({ pair, label: v.label })) })
})

// One random syllable/word item for the child to read aloud, for the
// selected language pair. Real content from data/instrument/<language>.csv,
// never invented server-side.
router.get("/item", (req, res) => {
  const pair = resolvePair(req.query.pair)
  const items = getDemoItems(PAIRS[pair].language)
  if (items.length === 0) {
    return res.status(503).json({ error: "No demo items available in the instrument." })
  }
  const item = items[Math.floor(Math.random() * items.length)]
  res.json({ item_id: item.item_id, item_type: item.item_type, text: item.text })
})

// N distinct random items for a full session, fetched once up front so the
// facilitator can navigate freely (forward, back, swap) without re-hitting
// the server per item. Same real-instrument-only guarantee as /item.
router.get("/session", (req, res) => {
  const pair = resolvePair(req.query.pair)
  const parsed = parseInt(req.query.count, 10)
  const requested = Number.isNaN(parsed) ? 6 : parsed // "0" is a valid, parseable count -- don't let it fall through to the default via `|| 6`
  const count = Math.min(Math.max(requested, 1), 20)
  const items = sampleDemoItems(PAIRS[pair].language, count)
  if (items.length === 0) {
    return res.status(503).json({ error: "No demo items available in the instrument." })
  }
  res.json({ items: items.map((i) => ({ item_id: i.item_id, item_type: i.item_type, text: i.text })) })
})

// Starts an assessment: uploads the child's recording to Sahara and returns
// immediately with an assessment_id to poll. Never blocks on Sahara here --
// real-world turnaround has been observed taking well over an hour in
// testing (see docs/API-FINDINGS.md), so nothing in this handler waits on it.
router.post("/assess", upload.single("audio"), async (req, res) => {
  const { item_id } = req.body
  const pair = resolvePair(req.body.pair)
  if (!item_id) return res.status(400).json({ error: "item_id is required" })
  if (!req.file) return res.status(400).json({ error: "audio file is required" })

  let item
  try {
    item = getItemById(PAIRS[pair].language, item_id)
  } catch (err) {
    return res.status(404).json({ error: err.message })
  }

  const apiKey = process.env.SAHARA_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: "SAHARA_API_KEY not configured on the server." })
  }

  let fileId
  try {
    fileId = await uploadAudio(apiKey, req.file.buffer, `assess-${item_id}-${Date.now()}.webm`, PAIRS[pair].saharaCode)
  } catch (err) {
    return res.status(502).json({ error: `Sahara upload failed: ${err.message}` })
  }

  const assessmentId = `asmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  assessments.set(assessmentId, { fileId, item, status: "processing", createdAt: Date.now() })

  res.status(202).json({ assessment_id: assessmentId, status: "processing" })
})

// Poll this until status is no longer "processing". Mirrors Sahara's own
// upload-then-poll design deliberately, rather than hiding the wait from
// the frontend -- see docs/API-FINDINGS.md on why that wait can be long.
router.get("/assess/:assessmentId", async (req, res) => {
  const record = assessments.get(req.params.assessmentId)
  if (!record) return res.status(404).json({ error: "Unknown assessment_id" })

  if (record.status !== "processing") {
    return res.json(record.result)
  }

  const apiKey = process.env.SAHARA_API_KEY
  let statusBody
  try {
    statusBody = await getStatus(apiKey, record.fileId)
  } catch (err) {
    return res.status(502).json({ error: `Sahara status check failed: ${err.message}` })
  }

  const processingStatus = statusBody?.data?.processing_status
  if (!isTerminal(processingStatus)) {
    return res.json({ status: "processing", processing_status: processingStatus })
  }

  if (processingStatus === "FILE_PROCESSING_FAILED") {
    record.status = "failed"
    record.result = { status: "failed" }
    return res.json(record.result)
  }

  const transcript = statusBody.data.audio_transcript || ""
  const scored = scoreAttempt(transcript, record.item.text)

  record.status = "done"
  record.result = {
    status: "done",
    item_id: record.item.item_id,
    expected_text: record.item.text,
    transcript,
    similarity: scored.similarity,
    passed: scored.passed,
    // Explicitly not a level assignment -- CLAUDE.md: a human facilitator
    // confirms every level assignment before it takes effect. This is a
    // draft signal for that confirmation step, not an autonomous result.
    requires_facilitator_confirmation: true,
  }
  res.json(record.result)
})

export default router
