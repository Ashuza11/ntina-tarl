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
  - config_name: adaptation_pilot
    data_files:
      - split: train
        path: data/adaptation_pilot.csv
---

# Ntina Text Dataset V0

Ntina Text Dataset V0 is the text companion to Ntina Voice Dataset V0. It
packages the project's literacy assessment material, bilingual tutor
scaffolding, elicitation prompts, dialogue-act specification, and Tanzanian
Kiswahili adaptation pilot as separate Hugging Face configurations.

This is a public development dataset, not a uniformly approved linguistic
gold set. Every configuration preserves review and provenance fields so users
can select material appropriate to their task.

## Configurations

| Configuration | Rows | Contents | Current status |
|---|---:|---|---|
| `scaffolding` | 176 | 88 Swahili–English and 88 Yoruba–English tutor utterances | Reviewer decisions included; see Yoruba encoding warning |
| `instrument` | 156 | Swahili and Yoruba TaRL reading items | All source rows remain marked `draft` |
| `prompts` | 30 | Ten Set B prompts in English, Swahili, and Yoruba | Local-language translations remain `draft-needs-review` |
| `dialogue_acts` | 88 | Language-neutral pedagogical functions and triggers | Developer-authored specification |
| `adaptation_pilot` | 20 | Tanzanian Kiswahili Sanifu localization pilot | Pending Tanzanian native-speaker review |

Total: 470 rows across five configurations.

## Validation

All five configurations load successfully with the Hugging Face `datasets`
library. The exported CSV files are UTF-8, contain no empty records, and have
no duplicate primary keys within a language or language-pair configuration.
The scaffolding export contains 54 normalized `keep` decisions, 121 `fix`
decisions, and one unrepaired `reject`.

## Scaffolding decisions

The `scaffolding` configuration retains both the raw reviewer verdict and a
normalized decision:

- `keep`: `final_text` is the original draft.
- `fix`: the reviewer supplied a replacement, and `final_text` is that
  replacement.
- `reject`: no usable replacement was supplied, so `final_text` is blank.

This implements the project's review rule that a row with a good replacement
is a fix, even when the raw verdict begins with the word “reject.” The raw
verdict remains available in `review_decision` for auditability.

## Known Yoruba encoding damage

The source working file `data/scaffolding/yo-en.csv` contains literal ASCII
question marks where some Yoruba letters or tone marks were lost before this
export was built. This is source-data loss, not a display-font problem, and it
cannot be reconstructed reliably without the native-speaker source.

Affected rows are preserved rather than guessed. They are marked with
`suspected_encoding_damage=yes` and
`text_status=reviewed_source_encoding_damaged`. Filter them out for training
or production use until a native Yoruba speaker restores the orthography.

## Recommended use

- Use `normalized_decision` and non-empty `final_text` when selecting reviewed
  scaffolding.
- Retain `act_id` to join scaffolding rows to the `dialogue_acts`
  configuration.
- Treat instruments and translated prompts as development drafts until their
  source status changes.
- Treat the adaptation pilot as an evaluation/regression set, not as approved
  Tanzanian training data.

## Sources and licensing

The dataset uses custom terms (`license: other`) because its reading material
has mixed provenance. Most adapted African Storybook material is CC BY 3.0 or
CC BY 4.0, while the adapted “Sare za shule” item is CC BY-NC 3.0. Other rows
are author-created or informed by separately cited assessment methodology.
Source and attribution details are preserved per row where available and are
documented in the project `docs/SOURCES.md` file.

Public availability does not waive source attribution, non-commercial, or
other underlying requirements. Contact `ashuza1411@gmail.com` with licensing,
reuse, or correction questions.

## Rebuilding

From the project root:

```bash
node tools/prepare-text-dataset-v0.js
```

The intended Hugging Face repository slug is `ntina-text-dataset-v0`.
