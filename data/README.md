# Data — rules before you start editing

This folder holds the corpus that makes Ntina work: the reading assessment
items, the code-switched things the agent says, and the benchmark recordings.
Everything here is CSV, edited directly by the linguists. Read this whole
file before you open anything.

## Rule 1 — File format

**Always: File → Save As → CSV UTF-8 (Comma delimited) (*.csv)**
**Never: plain "Save" or "Save As → CSV (Comma delimited)" (no "UTF-8" in the name)**
**Never: .xlsx**

Why this matters: Swahili and Yoruba text in this project includes characters
plain English spreadsheets don't expect — Yoruba subdot letters (ẹ, ọ, ṣ) and
tone marks (à, á, ẹ̀, ọ́) especially. Excel's plain CSV save option writes
the file using your computer's default text encoding, which cannot represent
those characters — the file will look fine on your screen right up until you
close it, and the diacritics will be silently destroyed or the save will
outright fail on those characters. "CSV UTF-8" is the specific Excel option
that avoids this — it's the only one that can hold every character we need to
write.

`.xlsx` is excluded for a different reason: it's a compressed binary format,
so changes to it can't be reviewed line-by-line the way changes to a text
file can. CSV UTF-8 is a plain text file, so every edit is visible and
reviewable.

If a file you're editing ever displays a character as a box, a question
mark, or garbled text after reopening it — stop, don't save over it, and
flag it. That's the file being opened in the wrong mode, and saving again
will make it worse, not better.

## Rule 2 — Examples live at the top of the real file, not in a separate one

Every file you fill in has 2–3 fully completed example rows directly under
the header, at the top. Each one is unmistakable two ways: the first column
is prefixed `EXAMPLE-` (e.g. `EXAMPLE-sw-b-001`), and the row is marked
`EXAMPLE-DELETE-ME` (in `review_status` where that column exists, in `notes`
otherwise). Open the file, read those first few rows to see what a complete
entry looks like — length, tone, how much detail belongs in each rationale
column — then add your own rows below them, written from scratch.

**Never edit or copy an EXAMPLE- row's content into a real row.** For the
instrument files especially, the example `text` is a bracketed placeholder
like `<a 2-syllable word a 6-year-old knows>`, not real Swahili or Yoruba —
inventing real-looking language content there would put fabricated,
plausible-looking-but-wrong data into the corpus, which is worse than an
empty cell.

Every script and process in this project that reads these files (the
generation and recording-script tools in `tools/`) already skips any row
whose ID starts with `EXAMPLE-`. Leave the example rows in place — delete
them only once you've added enough real rows that you no longer need them
for reference, and even then it's not urgent.

## What do I record, and where is the text?

Three recording sets, each sourced from a different file, built into
ready-to-use sheets by `tools/build-recording-scripts.js` — run it and look
in `data/recordings/scripts/` for `<pair>_setA_script.csv`,
`<pair>_setB_script.csv`, `<pair>_setC_script.csv`.

| Set | What the speaker does | Source file |
|---|---|---|
| A | Reads an instrument item aloud (monolingual). | `instrument/<language>.csv` |
| B | **Listens to a question, answers freely** — does not read anything. | `recordings/prompts-setB.csv` |
| C | Reads a scaffolding utterance aloud (code-switched). | `scaffolding/<pair>.csv` (merge output — see below) |

**Set B is the priority.** It's the only genuinely spontaneous code-switched
speech in the whole corpus — Sets A and C are read-aloud from a script, so
the switching pattern is whatever the linguist wrote, not what a real
speaker produces unprompted. Set B is what the challenge judges care about
most: translate `recordings/prompts-setB.csv` first, even before finishing
the instrument or scaffolding files. `data/recordings/scripts/` will tell
you exactly which set is blocked and why — rerun
`node tools/build-recording-scripts.js` any time and read its status
summary rather than guessing what's ready.

V0 recording note: the currently prepared Swahili and Yoruba Set B clips are
contributor-confirmed readings of the prompt text, not spontaneous answers.
They are labeled `scripted_prompt_reading` in V0 metadata and must not be
reported as spontaneous benchmark speech. Future Set B sessions should follow
the listen-and-answer procedure above.

## File layout

```
instrument/<language>.csv       swahili.csv, yoruba.csv
                                 The reading test itself. Monolingual — a
                                 child reads their own language, never a
                                 code-switched sentence, at this stage.

scaffolding/<pair>.DRAFT.csv    sw-en.DRAFT.csv, yo-en.DRAFT.csv
                                 AI-drafted scaffolding utterances awaiting
                                 linguist verdict (keep/fix/reject). See
                                 scaffolding/REVIEWING-DRAFTS.md.

scaffolding/<pair>.csv          sw-en.csv, yo-en.csv
                                 The clean working file — everything the
                                 agent says out loud, code-switched. This is
                                 OUTPUT: tools/merge-scaffolding.js builds it
                                 from a reviewed DRAFT file. Don't hand-author
                                 it and don't worry if it doesn't exist yet —
                                 it appears once a DRAFT round has been
                                 reviewed and merged.

recordings/prompts-setB.csv     The ten open questions for Set B (see above).
                                 prompt_en is fixed; prompt_sw/prompt_yo are
                                 for linguists to translate.

recordings/metadata.csv         One row per benchmark audio recording.
recordings/speakers.csv         One row per person who recorded benchmark
                                 audio (children and adult contributors).
                                 These two are for the mandatory speech-model
                                 benchmark only — not a log of real usage.

recordings/scripts/             Generated recording sheets — see "What do I
                                 record" above. Rebuilt by
                                 tools/build-recording-scripts.js, safe to
                                 rerun any time.
```

## Column glossary

### instrument/&lt;language&gt;.csv

| Column | What goes in it |
|---|---|
| `item_id` | Unique ID you make up, e.g. `sw-w-012` (language-level-sequence). Keep the level letter consistent: `b`=beginner, `ls`=letter/syllable, `w`=word, `p`=paragraph, `s`=story. |
| `tarl_level` | One of: `beginner`, `letter_syllable`, `word`, `paragraph`, `story`. |
| `item_type` | The unit type: `letter`, `syllable`, `word`, `sentence`, `paragraph`, `story`. Usually matches `tarl_level` but not always — a paragraph-level item might still be built of individual sentences you want tracked separately later. |
| `text` | The exact text the child reads aloud. This is the target string the scoring engine checks their speech against — spelling and punctuation here matter. |
| `difficulty_rank` | A number ordering items within the same level, easiest first. Doesn't need to be unique across the whole file, just consistent within a level. |
| `selection_rationale` | Why this specific item, in this order, at this level — required, not optional. If you can't explain why an item belongs where it is, that's worth flagging rather than guessing. |
| `source` | Where it came from — a national curriculum/primer, an original item you wrote, an adaptation of an existing test. |
| `reviewed_by` | Name of the native-speaker reviewer, once reviewed. Leave as `TBD` until then — never blank, since blank looks like "forgotten" rather than "not yet reviewed." |
| `review_status` | `draft`, `reviewed`, `approved`, or `EXAMPLE-DELETE-ME` for the example rows at the top of the file. Only `approved` items should be used in the live assessment. |
| `notes` | Anything else worth flagging — regional variants, alternate spellings, concerns. |

### scaffolding/&lt;pair&gt;.DRAFT.csv

See `scaffolding/REVIEWING-DRAFTS.md` for the full column-by-column review
guide — this is the file a linguist actually opens and marks up.

### scaffolding/&lt;pair&gt;.csv

Built by `tools/merge-scaffolding.js` from a reviewed DRAFT file — you
normally won't hand-edit this, but here's what's in it:

| Column | What goes in it |
|---|---|
| `utterance_id` | Unique ID, e.g. `sw-en-praise-002` (pair-function-sequence). |
| `pedagogical_function` | One of: `instruction`, `praise`, `hint`, `correction`, `level_transition`, `encouragement`, `closing`, `repair`, `escalation`, `facilitator`. |
| `tarl_level` | Which level this utterance is used at, or `any` if level-independent. |
| `audience` | `child` or `facilitator`. Facilitator-directed lines (the `facilitator` category, plus two `escalation` lines that alert the adult) are a different register — brief and factual, never warm or playful — since the agent is talking to the adult supervising the session, not the child. |
| `text` | The full utterance exactly as the agent would say it — natural code-switched speech, not a translated sentence. |
| `switch_points` | The same text with the switched span wrapped in double brackets, e.g. `Sawa, [[let's try the next one]]`. Marks exactly where the language changes — needed later for TTS voice/accent selection and for auditing how switching is actually distributed. |
| `switch_type` | One of: `intra_sentential` (switch mid-sentence), `inter_sentential` (switch between full clauses/sentences), `tag_switch` (a short fixed phrase or interjection), `borrowing` (a loanword that's already naturalized in the local language, not really a "switch" — flag these so they don't get double-counted as code-switching). |
| `register_note` | Tone/formality notes — who it's said to, how warm or brief it should be. This is what a facilitator would need to say the line naturally, not just correctly. |
| `selection_rationale` | Why this exact phrasing and this exact switch point, not another one. |
| `reviewed_by` / `review_status` / `notes` | Same meaning as in the instrument file. |

### recordings/prompts-setB.csv

| Column | What goes in it |
|---|---|
| `prompt_id` | Unique ID, e.g. `setB-01`. |
| `prompt_en` | The English reference version of the question. Already filled in — don't change it. |
| `prompt_sw` / `prompt_yo` | The question translated naturally into Swahili or Yoruba, the way you'd actually ask a child — not a stiff literal translation, and never code-switched (an English word in the question would prime the speaker toward switching, which is exactly what this set exists to observe unprompted). Currently AI-drafted and marked `DRAFT-NEEDS-REVIEW` — read them as a starting point to correct, not as finished text. |
| `notes` | Anything worth flagging about this specific question — e.g. prompts 6 and 7 are marked as deliberately testing which number form (local-language or English) a speaker reaches for; don't "fix" that by prompting them toward one or the other. |
| `translation_status` | `DRAFT-NEEDS-REVIEW` until a native speaker has checked the row, then `reviewed` (or `approved`, matching the other files' convention). **Don't record from a row still marked `DRAFT-NEEDS-REVIEW`** — a badly phrased prompt repeated across every speaker session is a lot of wasted recording, not a one-line fix. |

### recordings/metadata.csv

| Column | What goes in it |
|---|---|
| `recording_id` | Unique ID, e.g. `rec-0001`. |
| `speaker_id` | Must match a row in `recordings/speakers.csv`. |
| `language` | The language actually spoken in this recording (`sw`, `yo`, etc. — not a pair, since instrument recordings are monolingual). |
| `content_type` | `instrument_item` or `scaffolding_utterance`. |
| `content_id` | The `item_id` or `utterance_id` this recording is of — must match a real row in the corresponding file. |
| `reference_transcript` | The exact text that was read/spoken — copy it from the `text` column of the referenced row. This is the ground truth the benchmark scores transcripts against, so it must match exactly, including punctuation. |
| `file_path` | Where the audio file lives, relative to `data/recordings/`. |
| `duration_seconds` | Length of the clip. |
| `device` | What it was recorded on — matters because Ntina targets cheap Android phones specifically. |
| `noise_condition` | `quiet`, `moderate`, or `noisy` — a rough, consistent judgment call, not a measurement. The two example rows at the top of the file show a `quiet` and a `noisy` recording side by side so this judgment call has a concrete anchor. |
| `date_recorded` | ISO date, `YYYY-MM-DD`. |
| `consent_confirmed` | `yes` or `no`. **A row with `no` must never be included in any published benchmark set or shared externally, no matter how useful the clip is.** |
| `consent_date` | Date consent was obtained — blank only if `consent_confirmed` is `no`. |
| `notes` | Anything else worth flagging. |

### recordings/speakers.csv

| Column | What goes in it |
|---|---|
| `speaker_id` | Unique ID, e.g. `spk-001`. |
| `role` | `child_participant`, `facilitator`, or `volunteer_adult`. |
| `age_range` | A band, not an exact age, for any child speaker (e.g. `6-8`) — keeps identifying detail about a child to a minimum. `adult` for grown contributors. |
| `native_language` | Their first/home language. |
| `accent` | Regional accent or dialect, as specific as you can reasonably describe it. |
| `country` | Country of residence. |
| `consent_obtained` | `yes` or `no`. |
| `consent_date` | ISO date. |
| `guardian_consent` | `yes` for any child speaker — **never leave blank or write "n/a" for a child; recording a child without guardian consent on file is a hard stop, not a formality to fill in later.** `n/a` is only valid for adult speakers. |
| `notes` | Anything else worth flagging. |

## Questions

If a column's purpose isn't obvious from the example rows, ask before
guessing — an empty cell is easy to fill in later; a wrong guess that looks
plausible can sit unnoticed for a long time.
