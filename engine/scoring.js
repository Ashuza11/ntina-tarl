// Constrained-verification scoring via fuzzy/edit-distance matching.
// See docs/API-FINDINGS.md -- Sahara's STT API returns a bare transcript
// string only (no confidence, alignment, or vocabulary biasing), confirmed
// against the official docs, so "did the child produce the expected token"
// has to be answered by comparing the transcript against the known target
// string, not by trusting a confidence score that doesn't exist.
//
// Pure functions, no I/O -- testable without an HTTP layer or a language
// config beyond the token itself.

// Case-folds and collapses whitespace/punctuation. Does NOT strip Latin
// diacritics -- Yoruba tone marks and subdot characters (ẹ, ọ, ṣ) are
// distinct phonemes, not decoration, and stripping them would silently
// mark a wrong-tone reading as correct. See docs/INSTRUMENT-SPEC.md.
export function normalize(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:"'()]/g, "")
    .replace(/\s+/g, " ")
}

export function levenshteinDistance(a, b) {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  let prevRow = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const currRow = [i]
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      currRow.push(Math.min(prevRow[j] + 1, currRow[j - 1] + 1, prevRow[j - 1] + cost))
    }
    prevRow = currRow
  }
  return prevRow[n]
}

// 1.0 = identical after normalization, 0.0 = completely different.
export function similarity(transcript, expected) {
  const a = normalize(transcript)
  const b = normalize(expected)
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(a, b) / maxLen
}

// Default threshold is deliberately lenient at the syllable/word level --
// STT transcription noise on short utterances is expected, and this is a
// draft signal for a facilitator to confirm, not an autonomous pass/fail.
export function scoreAttempt(transcript, expected, { threshold = 0.7 } = {}) {
  const score = similarity(transcript, expected)
  return {
    transcript,
    expected,
    similarity: Math.round(score * 1000) / 1000,
    passed: score >= threshold,
    threshold,
  }
}
