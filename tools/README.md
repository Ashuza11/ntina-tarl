# Tools

Scripts, not application code.

## Scaffolding generation pipeline

```
data/spec/dialogue-acts.csv
        │
        ▼  generate-scaffolding.js  (calls claude-sonnet-4-6 once per act × pair)
data/scaffolding/<pair>.DRAFT.csv   (verdict + corrected_text columns empty)
        │
        ▼  a linguist fills in verdict (keep / fix / reject) and corrected_text
        ▼  merge-scaffolding.js
data/scaffolding/<pair>.csv         (the real working file)
data/scaffolding/<pair>.rejection-report.md
```

```bash
cd tools
npm install
cp .env.example .env   # fill in ANTHROPIC_API_KEY

node generate-scaffolding.js                    # both pairs
node generate-scaffolding.js --pairs sw-en       # one pair
node generate-scaffolding.js --force             # ignore cache, redraft everything

# ... linguist edits the DRAFT.csv, fills verdict + corrected_text ...

node merge-scaffolding.js sw-en
node merge-scaffolding.js yo-en
```

`generate-scaffolding.js` never writes to the working `<pair>.csv` — only to
`<pair>.DRAFT.csv`. It's **incremental by `act_id`**: if a `<pair>.DRAFT.csv`
already exists, every row already in it — including any verdict/corrected_text
a linguist has started filling in — is preserved byte-for-byte and never
redrafted, even if the spec's wording for that act changed. Only `act_id`s in
the spec but missing from the existing DRAFT file get drafted and appended.
Adding acts to the spec and rerunning is therefore exactly "draft the new
ones, leave everything else alone" — no special flag needed. Responses are
also cached in `.cache/` (gitignored, keyed by act + pair content) purely as
crash recovery, not as the mechanism that decides what gets redrafted.

`merge-scaffolding.js` upserts into the working file by `utterance_id`
rather than overwriting it wholesale, so hand-authored rows survive a
re-merge. Columns the DRAFT pipeline doesn't produce (`switch_type`,
`selection_rationale`) are left for linguist follow-up and flagged in each
row's `notes`.

`data/spec/dialogue-acts.csv` holds the full spec (act_id, category,
tarl_level, audience, function, trigger, max_words). Ten categories:
instruction, praise, hint, correction, level_transition, encouragement,
closing (child-directed, the original 74) plus repair, escalation,
facilitator (added later — audio/technical-failure handling and
facilitator-directed lines). `audience` is `child` or `facilitator` — it
switches the drafting prompt's register: facilitator-directed lines are
brief and factual, deliberately not warm or playful, since they're an
operational message between adults, not a line for a child. `tarl_level` and
`audience` both feed the drafting prompt and carry through to the DRAFT and
working CSVs. This spec is dev-authored pedagogical content (English
function/trigger descriptions), not linguistic corpus data, so it doesn't
carry the same fabrication risk as the instrument/scaffolding files — but the
drafted *text* absolutely does, which is exactly what the DRAFT → linguist
review → merge cycle exists to catch.

## Recording scripts

```bash
node build-recording-scripts.js
```

Builds the sheets a human recorder actually holds, one CSV per (set,
language pair), into `data/recordings/scripts/`:

- **Set A** — read-aloud instrument items, from `data/instrument/<language>.csv`
- **Set B** — free spoken answers to `data/recordings/prompts-setB.csv`
  questions (the recorder reads the *question*; the speaker answers freely
  and reads nothing)
- **Set C** — scaffolding utterances read aloud, from `data/scaffolding/<pair>.csv`
  (merge-scaffolding.js output, so this needs a completed DRAFT review first)

Re-runnable, and safe to run before any of its sources are ready — a
missing or empty source produces a one-row placeholder file instead of a
crash, and the status summary printed at the end says exactly what's
blocking each set for each pair. That summary is the actual point of the
script; re-run it any time to see what's ready to record. `EXAMPLE-`
rows (see `data/README.md`) and rejected scaffolding rows are always
excluded from the generated sheets.
