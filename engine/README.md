# Engine

The core assessment logic — deliberately separate from `server/` so it stays
testable without an HTTP layer. Language-agnostic: takes a `LanguageConfig`
(from `config/`) as a parameter, never branches on which language pair is
active.

Planned modules (not yet built — structure first):

- **scoring** — constrained verification: compare a child's transcribed
  speech against a known target string (from `data/instrument/`), producing
  per-token correct/incorrect, timing, and hesitation count. See
  `docs/API-FINDINGS.md` for why this has to be fuzzy/edit-distance matching
  against a bare transcript, not confidence-score-based.
- **level-assignment** — maps scoring results to a TaRL level
  (beginner / letter_syllable / word / paragraph / story). Never takes
  effect without facilitator confirmation.
- **drilling** — selects level-appropriate practice items and
  scaffolding utterances (from `data/scaffolding/`) for a session.
- **intent** — classifies free-response speech (comprehension answers,
  "I don't know", "repeat please") into a small set of intents. This is the
  one open-ASR path in the system; everything else is constrained scoring.
