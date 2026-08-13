# Reviewing a DRAFT file — instructions for linguists

Every so often you'll get a new `<pair>.DRAFT.csv` file to review (e.g.
`sw-en.DRAFT.csv`, `yo-en.DRAFT.csv`). These are AI-drafted lines for
Ntina — the things the voice tutor says out loud to a child while it
listens to them read. Your job is to read each line and judge it.

## Before you open anything

Read `data/README.md` first if you haven't — it has the CSV file-format
rule (Save As → CSV UTF-8, never plain Save, never .xlsx) that applies here
too. Getting this wrong can silently corrupt diacritics.

## What's in each row

| Column | What it is |
|---|---|
| `act_id` | Which line this is — you don't need to touch this. |
| `category` | The kind of thing being said: instruction, praise, hint, correction, level_transition, encouragement, closing, repair, escalation, facilitator. |
| `tarl_level` | Which TaRL level this line is for (`beginner`, `letter_syllable`, `word`, `paragraph`, `story`), or `any` if it's used at every level. Vocabulary and sentence complexity should match this — a `beginner` line should read simpler than a `story` line. |
| `audience` | `child` or `facilitator`. **This changes what "correct" looks like.** For `child` rows, judge against the warm, simple voice described below. For `facilitator` rows, judge the opposite: brief, factual, adult-to-adult — flag it as `fix` if it reads warm or playful, that's wrong for this audience. |
| `function_reminder` | One sentence on what this line is supposed to accomplish. |
| `max_words` | The word budget it was drafted against. |
| `text_draft` | **The draft itself** — read this. For `child`-audience rows, it's meant to sound like a warm bilingual teacher talking to a 6-8 year old, mixing the local language with English the way a real teacher would, not a translated sentence. For `facilitator`-audience rows, it's a short operational line to the adult supervising the session — still code-switched the same way, but plain and to the point. |
| `matrix_language` | Confirms which language is the primary one for this file. |
| `switch_points` | The same text with the English part(s) marked in `[[double brackets]]`, so you can see exactly what the model treated as a switch. |
| `register_note` | The model's own one-line note on the tone it was aiming for — a sanity check, not gospel. |
| `verdict` | **You fill this in.** One of: `keep`, `fix`, `reject`. |
| `corrected_text` | **You fill this in, only if verdict is `fix`.** Write the corrected line here — leave it blank for `keep` and `reject`. |

## How to judge each line

- **`keep`** — the line is natural, correctly switches where a real teacher
  would, and fits a 6-8 year old. Leave `corrected_text` blank.
- **`fix`** — the idea is right but the wording, switch point, spelling, or
  tone is off. Write the corrected version in `corrected_text`. The rest of
  the row (category, function_reminder, etc.) stays as-is.
- **`reject`** — the line is wrong in a way that isn't a quick fix (wrong
  register, wrong meaning, code-switches in a way no real teacher would).
  It will be dropped entirely — no need to explain why in the file itself,
  though a note in Slack/email is welcome if it's a pattern worth flagging.

Every row needs a verdict before this round counts as reviewed. A row with
no verdict is treated as "not yet reviewed" and won't make it into the
working file.

## When you're done

Save the file (CSV UTF-8, per the rule above) and hand it back. The dev
runs a merge step that turns your reviewed DRAFT into the real working file
`<pair>.csv` — kept and fixed lines go in, rejected and unreviewed lines are
left out — and produces a rejection-rate report per category, which is
useful for tracking how the draft quality is trending round over round.
