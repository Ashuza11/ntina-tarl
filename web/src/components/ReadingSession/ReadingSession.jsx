import { useEffect, useRef, useState } from "react"
import RecordButton from "../RecordButton"
import SessionProgress from "../SessionProgress"

const SESSION_ITEM_COUNT = 6
const POLL_INTERVAL_MS = 3000

// Swahili lines are linguist-reviewed, pulled from data/scaffolding/sw-en.csv
// (real verdict values, not blank drafts): instr-start-word-001
// (verdict=keep) / instr-start-letter-syllable-001 (verdict=fix, using
// corrected_text). The equivalent Yoruba rows in data/scaffolding/yo-en.csv
// could NOT be reused the same way: the word-prompt row is explicitly
// verdict=reject, and the syllable-prompt row's diacritics are corrupted
// into literal "?" characters (the file has no UTF-8 BOM, unlike every
// other linguist-facing CSV in this project -- flagged separately, not
// fixed here since the original characters can't be reliably reconstructed).
// The Yoruba lines below are therefore author-composed placeholders, not
// linguist-reviewed, and should be replaced once yo-en.csv is corrected.
const READ_PROMPT = {
  "sw-en": {
    word: "Sawa, hebu usome neno hili kwa sauti!",
    syllable: "Hebu sasa soma syllable hii kwa sauti.",
  },
  "yo-en": {
    word: "Jọ̀wọ́ ka ọ̀rọ̀ yìí sókè.",
    syllable: "Jọ̀wọ́ ka syllable yìí sókè.",
  },
}

function freshItem(data) {
  return {
    item_id: data.item_id,
    item_type: data.item_type,
    text: data.text,
    phase: "unattempted", // unattempted | swapping | uploading | processing | result | error
    assessmentId: null,
    result: null,
    confirmation: null, // null | "confirmed" | "overridden"
    errorMessage: null,
    epoch: 0,
  }
}

// CLAUDE.md build order: record -> constrained score -> level assignment ->
// facilitator confirmation, end to end. This orchestrates a real multi-item
// session over that loop -- not the full 5-level battery, but a real guided
// walkthrough instead of one disconnected card per reload.
function ReadingSession({ pair, onExit }) {
  const [sessionPhase, setSessionPhase] = useState("loading") // loading | active | summary | error
  const [items, setItems] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionErrorMessage, setSessionErrorMessage] = useState(null)

  const pollTimersRef = useRef(new Map()) // index -> timeoutId, survives navigation
  const hasFetchedSessionRef = useRef(false)

  useEffect(() => {
    if (hasFetchedSessionRef.current) return
    hasFetchedSessionRef.current = true
    loadSession()
    return () => {
      pollTimersRef.current.forEach((timerId) => clearTimeout(timerId))
      pollTimersRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-only; timers live in a ref, not state
  }, [])

  async function loadSession() {
    setSessionPhase("loading")
    setSessionErrorMessage(null)
    try {
      const res = await fetch(`/api/session?pair=${pair}&count=${SESSION_ITEM_COUNT}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Couldn't load the reading items. Check the connection and try again.")
      setItems(data.items.map(freshItem))
      setCurrentIndex(0)
      setSessionPhase("active")
    } catch (err) {
      setSessionErrorMessage(err.message)
      setSessionPhase("error")
    }
  }

  function updateItem(index, epoch, updater) {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it
        if (epoch != null && it.epoch !== epoch) return it // stale response for a slot that's since been reset
        return typeof updater === "function" ? updater(it) : { ...it, ...updater }
      })
    )
  }

  function resetSlot(index, fields) {
    const timerId = pollTimersRef.current.get(index)
    if (timerId) {
      clearTimeout(timerId)
      pollTimersRef.current.delete(index)
    }
    setItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              ...fields,
              epoch: it.epoch + 1,
              phase: "unattempted",
              assessmentId: null,
              result: null,
              confirmation: null,
              errorMessage: null,
            }
          : it
      )
    )
  }

  function startPolling(index, assessmentId, epoch) {
    async function tick() {
      try {
        const res = await fetch(`/api/assess/${assessmentId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Lost the connection while checking this word. Try again or come back to it later.")

        if (data.status === "processing") {
          pollTimersRef.current.set(index, setTimeout(tick, POLL_INTERVAL_MS))
          return
        }
        pollTimersRef.current.delete(index)

        if (data.status === "failed") {
          updateItem(index, epoch, { phase: "error", errorMessage: "Ntina couldn't hear that clearly. Try recording again." })
          return
        }
        updateItem(index, epoch, { phase: "result", result: data })
      } catch (err) {
        pollTimersRef.current.delete(index)
        updateItem(index, epoch, { phase: "error", errorMessage: err.message })
      }
    }
    tick()
  }

  async function handleRecordingComplete(index, blob) {
    const item = items[index]
    updateItem(index, item.epoch, { phase: "uploading", errorMessage: null })
    try {
      const form = new FormData()
      form.set("audio", blob, "recording.webm")
      form.set("item_id", item.item_id)
      form.set("pair", pair)

      const res = await fetch("/api/assess", { method: "POST", body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed.")

      updateItem(index, item.epoch, { phase: "processing", assessmentId: data.assessment_id })
      startPolling(index, data.assessment_id, item.epoch)
    } catch (err) {
      updateItem(index, item.epoch, { phase: "error", errorMessage: err.message })
    }
  }

  async function handleChangeWord(index) {
    const usedIds = new Set(items.map((it) => it.item_id))
    updateItem(index, items[index].epoch, { phase: "swapping", errorMessage: null })
    try {
      let candidate = null
      for (let attempt = 0; attempt < 5; attempt++) {
        const res = await fetch(`/api/item?pair=${pair}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Couldn't find another word.")
        if (!usedIds.has(data.item_id)) {
          candidate = data
          break
        }
        candidate = data // accept the last one tried even if it collided -- good enough for a 70-item pool
      }
      resetSlot(index, { item_id: candidate.item_id, item_type: candidate.item_type, text: candidate.text })
    } catch (err) {
      updateItem(index, items[index].epoch, { phase: "error", errorMessage: err.message })
    }
  }

  function handleRedo(index) {
    const it = items[index]
    resetSlot(index, { item_id: it.item_id, item_type: it.item_type, text: it.text })
  }

  function handleConfirm(index, value) {
    updateItem(index, items[index].epoch, { confirmation: value })
  }

  function goTo(index) {
    setCurrentIndex(Math.max(0, Math.min(index, items.length - 1)))
  }

  if (sessionPhase === "loading") {
    return (
      <Card>
        <p className="text-gray-500">Getting your first word ready…</p>
      </Card>
    )
  }

  if (sessionPhase === "error") {
    return (
      <Card>
        <p className="text-terracotta-dark text-center">{sessionErrorMessage}</p>
        <button type="button" onClick={loadSession} className="rounded-lg bg-forest px-4 py-2 text-white hover:bg-forest-light">
          Try again
        </button>
      </Card>
    )
  }

  if (sessionPhase === "summary") {
    const confirmed = items.filter((it) => it.confirmation === "confirmed").length
    const overridden = items.filter((it) => it.confirmation === "overridden").length
    const stillProcessing = items.filter((it) => it.phase === "processing" || it.phase === "uploading" || it.phase === "swapping").length
    const needsReview = items.filter((it) => it.phase === "result" && it.confirmation === null).length

    return (
      <Card>
        <h1 className="text-forest text-xl font-bold">Session complete.</h1>
        <p className="text-gray-600 text-sm text-center">
          {items.length} words: {confirmed} confirmed correct, {overridden} overridden by facilitator
          {needsReview > 0 && `, ${needsReview} still need review`}
          {stillProcessing > 0 && `, ${stillProcessing} still processing`}.
          {stillProcessing > 0 && " You can come back to them."}
        </p>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-500 border-b">
                <th className="py-1 pr-2">Word</th>
                <th className="py-1 pr-2">Heard</th>
                <th className="py-1 pr-2">Match</th>
                <th className="py-1">Decision</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.item_id} className="border-b last:border-0">
                  <td className="py-1 pr-2 font-semibold text-forest">{it.text}</td>
                  <td className="py-1 pr-2">{it.result?.transcript || "-"}</td>
                  <td className="py-1 pr-2">{it.result ? `${(it.result.similarity * 100).toFixed(0)}%` : "-"}</td>
                  <td className="py-1">
                    {it.confirmation === "confirmed" && "Confirmed"}
                    {it.confirmation === "overridden" && "Overridden"}
                    {it.confirmation === null && it.phase === "result" && "Needs review"}
                    {(it.phase === "processing" || it.phase === "uploading") && "Thinking…"}
                    {(it.phase === "unattempted" || it.phase === "swapping") && "Not attempted"}
                    {it.phase === "error" && "Error"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={loadSession} className="rounded-lg bg-gold px-4 py-2 text-white hover:bg-gold-light">
            Start new session
          </button>
          <button type="button" onClick={onExit} className="rounded-lg bg-white border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
            ← Back to landing
          </button>
        </div>
      </Card>
    )
  }

  const item = items[currentIndex]

  return (
    <Card>
      <h1 className="text-forest text-xl font-bold">Ntina reading check</h1>

      <SessionProgress
        items={items}
        currentIndex={currentIndex}
        onJump={goTo}
        onPrevious={() => goTo(currentIndex - 1)}
        onNext={() => goTo(currentIndex + 1)}
      />

      <ItemCard
        item={item}
        pair={pair}
        onRecordingComplete={(blob) => handleRecordingComplete(currentIndex, blob)}
        onChangeWord={() => handleChangeWord(currentIndex)}
        onRedo={() => handleRedo(currentIndex)}
        onConfirm={(value) => handleConfirm(currentIndex, value)}
        onNext={() => goTo(currentIndex + 1)}
        hasNext={currentIndex < items.length - 1}
      />

      <button type="button" onClick={() => setSessionPhase("summary")} className="text-forest text-sm font-semibold underline">
        Finish session
      </button>
    </Card>
  )
}

function Card({ children }) {
  return <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg flex flex-col items-center gap-6">{children}</div>
}

function ItemCard({ item, pair, onRecordingComplete, onChangeWord, onRedo, onConfirm, onNext, hasNext }) {
  if (item.phase === "swapping") {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <p className="text-gray-500 text-sm">Finding another word…</p>
      </div>
    )
  }

  if (item.phase === "unattempted" || item.phase === "uploading") {
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <p className="text-gray-500 text-sm">
          {READ_PROMPT[pair]?.[item.item_type] || READ_PROMPT["sw-en"].word}
        </p>
        <p className="text-forest text-4xl font-bold">{item.text}</p>
        <RecordButton onRecordingComplete={onRecordingComplete} disabled={item.phase === "uploading"} />
        {item.phase === "uploading" && <p className="text-gray-500 text-sm">Ntina is listening…</p>}
        {item.phase === "unattempted" && (
          <button type="button" onClick={onChangeWord} className="text-forest text-sm font-semibold underline">
            Try a different word
          </button>
        )}
      </div>
    )
  }

  if (item.phase === "processing") {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-forest text-2xl font-bold">{item.text}</p>
        <div className="flex items-end gap-1 h-8" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`w-1.5 bg-gold ${i % 2 === 0 ? "waveform-bar-tall" : "waveform-bar"}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
        <p className="text-forest font-semibold">Ntina is thinking</p>
      </div>
    )
  }

  if (item.phase === "error") {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-terracotta-dark text-center">{item.errorMessage}</p>
        <RecordButton onRecordingComplete={onRecordingComplete} />
        <button type="button" onClick={onChangeWord} className="text-forest text-sm font-semibold underline">
          Try a different word
        </button>
      </div>
    )
  }

  // phase === "result"
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className={`w-full rounded-xl p-4 text-center ${item.result.passed ? "bg-forest/10" : "bg-terracotta/10"}`}>
        <p className="text-gray-500 text-sm">Expected</p>
        <p className="text-forest text-2xl font-bold mb-2">{item.result.expected_text}</p>
        <p className="text-gray-500 text-sm">Heard</p>
        <p className="text-xl font-semibold">{item.result.transcript || "(nothing heard)"}</p>
        <p className="text-gray-500 text-xs mt-2">
          Match: {(item.result.similarity * 100).toFixed(0)}%, a draft signal, not a final score. Confirm or override below.
        </p>
      </div>

      {item.confirmation === null ? (
        <div className="w-full rounded-xl border-2 border-gold p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            A facilitator must confirm this before it's saved. Ntina never assigns a result on its own.
          </p>
          <div className="flex gap-3 justify-center">
            <button type="button" onClick={() => onConfirm("confirmed")} className="rounded-lg bg-forest px-4 py-2 text-white hover:bg-forest-light">
              Confirm
            </button>
            <button
              type="button"
              onClick={() => onConfirm("overridden")}
              className="rounded-lg bg-white border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Override
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-forest font-semibold">
            {item.confirmation === "confirmed" ? "Confirmed by facilitator." : "Overridden by facilitator."}
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={onRedo} className="text-forest text-sm font-semibold underline">
              Redo this word
            </button>
            {hasNext && (
              <button type="button" onClick={onNext} className="rounded-lg bg-gold px-4 py-2 text-white hover:bg-gold-light">
                Next word →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReadingSession
