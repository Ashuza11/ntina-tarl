---
language:
  - sw
  - yo
  - en
pretty_name: Ntina Text Dataset V0
task_categories:
  - text-generation
  - text-classification
tags:
  - code-switching
  - swahili
  - yoruba
  - education
  - reading-assessment
license: other
configs:
  - config_name: scaffolding
    data_files:
      - split: train
        path: data/scaffolding.csv
  - config_name: instrument
    data_files:
      - split: train
        path: data/instrument.csv
  - config_name: prompts
    data_files:
      - split: train
        path: data/prompts.csv
  - config_name: dialogue_acts
    data_files:
      - split: train
        path: data/dialogue_acts.csv
---

# Ntina Text Dataset V0

Ntina Text Dataset V0 is the text companion to Ntina Voice Dataset V0. It
packages the project's literacy assessment material, bilingual tutor
scaffolding, elicitation prompts, and dialogue-act specification as separate
Hugging Face configurations.

The code-switched scaffolding is synthetic model output followed by human
review. `tools/generate-scaffolding.js` records the generation model identifier
as `claude-sonnet-4-6`. Reviewers evaluated every draft as `keep`, `fix`, or
`reject`; deployable `final_text` contains the kept line or supplied repair.

This is a public V0 dataset. Standard Kiswahili content was verified by two
Swahili speakers, one from Tanzania and one from Congo. Standard Yoruba
content was approved and verified by two Yoruba speakers and a linguist.

Published repository:
[Ash11/ntina-text-dataset-v0](https://huggingface.co/datasets/Ash11/ntina-text-dataset-v0).

## Configurations

| Configuration | Rows | Contents | Current status |
|---|---:|---|---|
| `scaffolding` | 176 | 88 Swahili–English and 88 Yoruba–English tutor utterances | Approved `keep` and repaired `fix` rows |
| `instrument` | 156 | Standard Kiswahili and Standard Yoruba TaRL reading items | Approved |
| `prompts` | 30 | Ten Set B prompts in English, Standard Kiswahili, and Standard Yoruba | Approved/reference text |
| `dialogue_acts` | 88 | Language-neutral pedagogical functions and triggers | Developer-authored specification |

Total: 450 rows across four configurations. The experimental Tanzanian
adaptation pilot is intentionally excluded from this main dataset.

## Validation

All four configurations load successfully with the Hugging Face `datasets`
library. The exported CSV files are UTF-8, contain no empty records, and have
no duplicate primary keys within a language or language-pair configuration.
The scaffolding export contains 54 normalized `keep` decisions and 122 `fix`
decisions. No unrepaired rejection is included.

## Scaffolding decisions

The `scaffolding` configuration retains both the raw reviewer verdict and a
normalized decision:

- `keep`: `final_text` is the original draft.
- `fix`: the reviewer supplied a replacement, and `final_text` is that
  replacement.
- `reject`: no usable replacement was supplied, so the row is excluded from
  the deployable configuration.

This implements the project's review rule that a row with a good replacement
is a fix, even when the raw verdict begins with the word “reject.” The raw
verdict remains available in `review_decision` for auditability.

## Linguist evaluation findings

The Yoruba linguist review identified wrong code-switch words or labels,
incorrect tone marking, unnecessary word additions, and generated lines with
no actual code-switch. The Swahili review found repeated translation-like
openers—especially overuse of `Sawa` as a direct equivalent of English
“Okay”—and other phrasing that preserved the English intent without sounding
like natural bilingual classroom speech. These are qualitative observations,
not measured corpus-wide error rates. The final dataset contains reviewed or
repaired text rather than unfiltered drafts.

Full methodology and examples are included in the
[synthetic-data evaluation](documentation/SYNTHETIC-DATA-EVALUATION.md).

## Yoruba Unicode recovery

The linguist's reviewed workbook preserved the Yoruba subdots and tone marks,
while an earlier CSV export replaced some of them with literal question
marks. The working `yo-en.csv` was therefore rebuilt from the intact UTF-8
draft by copying only the workbook's `verdict` and `corrected_text` columns.
All 88 dialogue-act IDs and all ten non-review columns were checked for exact
agreement before replacement. The damaged export is no longer used.

The recovery is reproducible with `tools/recover-yoruba-scaffolding.py`. The
original `.xlsx` workbook remains as review provenance; users do not need it
to load this Hugging Face export.

For future reviews, this recovery script can safely transfer the linguist's
review fields from `.xlsx` to UTF-8 CSV without losing Yoruba subdots or tone
marks. It validates the row IDs and unchanged source columns before creating
the CSV, avoiding the character damage caused by some spreadsheet CSV exports.

## Recommended use

- Use `normalized_decision` and non-empty `final_text` when selecting reviewed
  scaffolding.
- Retain `act_id` to join scaffolding rows to the `dialogue_acts`
  configuration.
- Use the `reviewed_by`, `review_status`, and provenance fields when auditing
  the approved instrument rows.

## Sources and licensing

The dataset uses custom terms (`license: other`) because its reading material
has mixed provenance. Row-level source and attribution details are retained in
the `instrument` configuration.

### Assessment methodology

- [TaRL Assessment Tools](https://teachingattherightlevel.org/wp-content/uploads/2023/04/TaRL-Assessment-Tools.pdf)
  provided the overall reading-level structure.
- The [EGRA Toolkit, second edition](https://haiti-now.org/wp-content/uploads/2017/05/USAID_Early-Grade-Reading-Assesment.pdf)
  and [EGRA Applications and Interventions](https://files.eric.ed.gov/fulltext/ED531301.pdf)
  informed the use of Kiswahili syllables, including the `ka, ke, ki, ko, ku`
  pattern; familiar Grade 1–3 vocabulary; frequency-based item selection; and
  short stories with literal and inferential questions.
- The recommended EGRA frequency procedure was not completed: the project did
  not sample 20–30 textbook pages or calculate national textbook frequencies.
  The 30 syllables and 40 words in each language were author-created and later
  speaker/linguist verified, but they are not curriculum-frequency samples.
- The [EPDC UWEZO/ASER compilation](https://epdc.org/sites/default/files/documents/UWEZO%20ASER%20Beekungo%20Test%20Items_June2014.pdf)
  was located, but its Kenya and Tanzania test-item pages were scanned images
  and were not visually read during generation. No item text was copied or
  adapted from those test pages.

### Narrative material actually used

African Storybook supplied the principal source material for paragraphs and
stories:

- Swahili: *Sare za shule* (paragraph 1), *Moto* (paragraph 2), *Mwanamume
  mrefu* (story 1), and *Tom muuza ndizi* (story 2).
- Yoruba: African Storybook/Storybooks Nigeria material includes *Ọkùnrin gíga
  púpọ̀ kan*. One Yoruba story and much of the short-item material are
  author-created, as identified in the row-level source fields.
- [Storybooks Tanzania](https://global-asp.github.io/storybooks-tanzania/about/)
  states that its African Storybook collection was repurposed for Tanzanian
  audiences. Its [Moto page](https://global-asp.github.io/storybooks-swahili/stories/sw/0302/)
  credits Matteo E. Mwita as translator and Lauwo George as reader.
- [Storybooks Nigeria](https://global-asp.github.io/storybooks-nigeria/about/)
  states that its collection was repurposed for Nigerian audiences. The
  Yoruba [*Ọkùnrin gíga púpọ̀ kan*](https://global-asp.github.io/storybooks-nigeria/stories/yo/0001/)
  page credits Taiwo Ẹhinẹni as translator.

Most adapted African Storybook material is CC BY 3.0 or CC BY 4.0. The
adapted *Sare za shule* item is CC BY-NC 3.0 and retains a non-commercial
restriction.

### Sources identified later, not used to generate the 70 short Swahili items

These sources are valuable for future country-alignment work but were not the
original basis of the author-created Swahili syllables and words:

- [Tanzania Standard I–II syllabus](https://www.tie.go.tz/uploads/documents/sw-1727083562-Elimu%20ya%20Msingi%20DRS%20I-II%20FINAL%20FINAL.pdf)
- [TIE reading-teaching module](https://www.tie.go.tz/uploads/files/Moduli%20ya%20Kusoma%20I-II%209.pdf)
- [BAKITA publications](https://www.bakita.go.tz/books)
- [KICD Lower Primary curriculum](https://kicd.ac.ke/cbc-materials/lower-primary/)

These limitations do not override the human variety verification: this
release labels the content `Standard Kiswahili` and `Standard Yoruba`. They
do mean the short items must not be described as copied from, statistically
selected from, or officially approved by a national curriculum authority.

Public availability does not waive source attribution, non-commercial, or
other underlying requirements. Contact `ashuza1411@gmail.com` with licensing,
reuse, or correction questions.

## Rebuilding

From the project root:

```bash
node tools/prepare-text-dataset-v0.js
```

The main package builder is
[`scripts/prepare-text-dataset-v0.js`](scripts/prepare-text-dataset-v0.js).
The approval-recording and optional `.xlsx` recovery implementations are
[`scripts/approve-main-text-v0.js`](scripts/approve-main-text-v0.js) and
[`scripts/recover-yoruba-scaffolding.py`](scripts/recover-yoruba-scaffolding.py).
The recovery script is only needed when the reviewed workbook is present; the
main Hugging Face build reads the already recovered UTF-8 `yo-en.csv`.

Hugging Face repository:
[Ash11/ntina-text-dataset-v0](https://huggingface.co/datasets/Ash11/ntina-text-dataset-v0).
