# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Ntina — a code-switched voice agent for foundational literacy, based on the
Teaching at the Right Level (TaRL) method. Final project for the African
Computational Linguistics Summer School and a submission to the Sahara
CodeSwitch Africa Challenge (Agriculture & Education track). Team of three:
one dev, two linguists. Submission deadline: 2026-09-15.

A child reads aloud into a cheap Android phone, offline. The agent scores
against the five TaRL reading levels (beginner, letter/syllable, word,
paragraph, story), assigns a learning level, runs level-appropriate practice
drills, and emits a monitoring record. **A human facilitator confirms every
level assignment before it takes effect** — the agent assists, it does not
replace the teacher. Language pairs: Swahili–English and Yoruba–English.

## The key architectural insight

Reading assessment is CONSTRAINED VERIFICATION, not open transcription — the
target text is already known, so the question is "did the child produce the
expected token, and how fluently," not "what did the child say." Sahara's
STT API returns a bare transcript string only (no token-level confidence, no
word timings, no vocabulary biasing — confirmed by reading the previous
hackathon project's actual API responses). So constrained scoring has to be
done as fuzzy/edit-distance matching of the transcript against the expected
target string — that's not a fallback, it's the only path available. See
`docs/API-FINDINGS.md`.

Free responses (comprehension answers, "I don't know", "repeat please") are
the one place that uses open ASR, and only need classifying into a few
intents — everything else is constrained.

## Language is a config value

`engine/`, `server/`, and `web/` never branch on which language pair is
active — they take a loaded config (`config/<pair>.yaml`) as a parameter.
Adding a language pair means adding a config file and authoring content in
`data/`, not touching code. See `config/README.md`.

## Stack

- `server/` — Node.js + Express, plain JavaScript (no TypeScript — chosen
  for a short build window, can be added later if it earns its keep)
- `web/` — React (Vite) + Tailwind, plain JS/JSX. One folder per component
  under `web/src/components/`, tests mirrored under `web/tests/components/`
  (convention borrowed from the Claude Code Masterclass starter project)
- `engine/` — assessment/scoring logic, framework-independent, testable
  without an HTTP layer
- `config/` — one YAML file per language pair
- `data/` — the linguist-authored corpus. CSV, UTF-8 with BOM, always. Read
  `data/README.md` in full before touching anything under `data/` — it has
  the format rule, the sample-file convention, and the full column glossary.
- `benchmark/` — multi-model STT comparison harness (not yet built)
- `docs/` — API findings and other decisions worth not re-deriving

## Build order

MVP-first. Get record → constrained score → level assignment → facilitator
confirmation working end-to-end before offline sync, PWA install, or
low-data mode — those come later, deliberately, not as an oversight.

## Design system

Colors, motion, and component grammar are adapted from an earlier related
project (`Ntina.ai`, a different product built on the same brand) — palette:
terracotta `#C4633A`, forest `#2D5A27`, gold `#D4A017`, cream `#FAF7F2`,
already wired into `web/tailwind.config.js` and `web/src/index.css`. The
screens themselves don't transfer (that project was a teacher-facing STEM
content app, not a child-facing reading assessment) — only the visual
language does.

## Conventions

- `_specs/` — spec a non-trivial feature before building it (see
  `_specs/template.md`). `_plans/` holds plans derived from a spec.
- `/commit-message` — slash command, drafts a commit message from staged
  changes and asks for confirmation before committing. Never auto-commits.
- Recording children requires consent. Any code touching recordings must
  treat consent metadata as mandatory, not optional — see
  `data/README.md`'s `guardian_consent` column for the pattern this follows.

## Do not

- Do not invent Sahara API behavior. Where it's unconfirmed (e.g. whether
  Sahara supports Yoruba at all), say so and check the docs — don't guess.
- Do not branch on language pair anywhere in `engine/`, `server/`, or `web/`.
