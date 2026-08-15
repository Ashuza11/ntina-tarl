# Ntina

A code-switched voice tutor that assesses foundational reading skills in
children aged roughly 6 to 8, following the Teaching at the Right Level
(TaRL) framework. Swahili-English and Yoruba-English.

**Status: partially built.** The reading assessment pipeline (record, score,
facilitator confirmation) runs end to end against the real Sahara speech API
for both language pairs. The linguistic datasets (text and audio) are
packaged and validated. The offline PWA, the drilling/monitoring-record loop
beyond a single reading check, and the benchmark harness are not built yet.
See [Status and roadmap](#status-and-roadmap) for the specific line between
the two.

## Links

| Artifact | Status |
|---|---|
| Text dataset (Hugging Face) | Not yet published. Packaged locally at [`data/text-dataset-v0/`](data/text-dataset-v0/), intended slug `ntina-text-dataset-v0` |
| Audio dataset (Hugging Face) | Not yet published. Packaged locally at [`data/recordings/dataset-v0/`](data/recordings/dataset-v0/), intended slug `ntina-voice-dataset-v0` |
| Live demo | Not deployed. Runs locally, see [Getting started](#getting-started) |
| Pitch deck | Not currently in the repository. Screenshots of the working app are in [`Demo_img/`](Demo_img/) |

## The problem

More than half of Grade 2 children in resource-limited countries cannot read
a single word of a short text. TaRL addresses this by assessing each child
individually and grouping them by measured reading level rather than by
grade. That assessment is one-on-one, has to be repeated every few weeks,
and has to be rebuilt from scratch for every local language it runs in.
That rebuilding and repetition is the labor Ntina targets.

## How it works

1. A child reads a known passage aloud on an inexpensive Android phone.
2. Speech-to-text converts the recording into a transcript.
3. Ntina compares the transcript with the known target using fuzzy
   edit-distance matching.
4. It estimates one of five reading levels: beginner, letter/syllable,
   word, paragraph, story.
5. A human facilitator confirms the result before it counts.
6. The tutor gives level-appropriate practice prompts and produces a
   monitoring record.

The reading instrument itself is monolingual: a child assessed on Swahili
reads Swahili start to finish. The code-switching lives in what the tutor
says around the test, in its instructions, praise, hints, corrections, and
level transitions, not in the passage being read. See
[`docs/INSTRUMENT-SPEC.md`](docs/INSTRUMENT-SPEC.md) for why the test itself
has to stay monolingual to remain a valid measurement.

## The datasets

### Text dataset

Packaged at [`data/text-dataset-v0/`](data/text-dataset-v0/), 470 rows
across five configurations.

| Configuration | Rows | Contents |
|---|---:|---|
| `scaffolding` | 176 | Swahili-English and Yoruba-English tutor utterances, with reviewer verdicts preserved |
| `instrument` | 156 | Swahili and Yoruba TaRL reading items (syllables, words, paragraphs, stories, comprehension questions) |
| `prompts` | 30 | Ten Set B free-response prompts in English, Swahili, and Yoruba |
| `dialogue_acts` | 88 | Language-neutral pedagogical functions and triggers the scaffolding is drafted against |
| `adaptation_pilot` | 20 | Tanzanian Kiswahili Sanifu localization pilot (see below) |

Full dataset card, licensing detail, and the known Yoruba encoding issue in
one source file: [`data/text-dataset-v0/README.md`](data/text-dataset-v0/README.md).

### Audio dataset

Packaged at [`data/recordings/dataset-v0/`](data/recordings/dataset-v0/),
204 aligned WAV clips (mono, 16 kHz, 16-bit PCM) from adult Swahili and
Yoruba contributors: 108 Swahili clips and 96 Yoruba clips, with transcripts,
speaker metadata, consent confirmation, device, and noise-condition fields.
Full dataset card:
[`data/recordings/dataset-v0/README.md`](data/recordings/dataset-v0/README.md).

### Dialectal adaptation

Low-resourceness compounds within a single language. The project treats
"Swahili" and "Yoruba" as starting points, not fixed targets:

- **Swahili**: the baseline instrument is authored against standard,
  Kenyan-influenced Swahili. A 20-row pilot adapts a subset toward
  Tanzanian Kiswahili Sanifu, documented with its actual quality-score
  results and known failures in
  [`data/adaption/README.md`](data/adaption/README.md). One Swahili
  contributor recording is from a Congolese Swahili (Kingwana) speaker
  from Bukavu and Goma, DRC, captured in the audio dataset above.
- **Yoruba**: adapting the instrument toward a specific regional variety
  is planned, not built. Only the standard-variety instrument exists today.

## Repository structure

```
config/                    one YAML file per language pair, no code branches on language
  languages/template.yaml    copy this to add a pair
  sw-en.yaml, yo-en.yaml
data/                       the corpus. Read data/README.md before editing anything here.
  instrument/                 the reading test itself: swahili.csv, yoruba.csv
  scaffolding/                 code-switched agent utterances, DRAFT and reviewed
  spec/dialogue-acts.csv       the 88-act pedagogical spec scaffolding is drafted against
  adaption/                   dialectal-adaptation pilot work
  recordings/                  raw contributor audio, recording sheets, consent metadata
  text-dataset-v0/             packaged Hugging Face text dataset (see above)
engine/                     scoring logic, framework-independent, testable without an HTTP layer
  scoring.js                   fuzzy edit-distance matching
server/                     Node.js + Express backend
  src/routes/index.js          /api/session, /api/item, /api/assess endpoints
  src/sahara.js                Sahara STT client (async upload + status poll)
  src/data.js                  instrument loader, language-pair resolver
web/                        React (Vite) + Tailwind frontend
  src/components/              LandingPage/, ReadingSession/, RecordButton/, SessionProgress/
tools/                      scripts, not application code
  build-recording-scripts.js, generate-scaffolding.js, merge-scaffolding.js
  prepare-*-v0.js, finalize-dataset-v0.js   dataset packaging scripts
docs/                       decisions worth not re-deriving
  API-FINDINGS.md              live-tested Sahara STT findings
  INSTRUMENT-SPEC.md, SOURCES.md
benchmark/                  not yet built. Currently contains only a README describing the plan.
_specs/                     spec template for non-trivial features before building them
```

## For linguists

You do not need git or a terminal for most of this project. You need a
spreadsheet program that can save "CSV UTF-8," and a text editor if you want
to look at a file without risking an accidental save.

**The files you own:**

- `data/instrument/swahili.csv` and `data/instrument/yoruba.csv`, the
  reading test items.
- `data/scaffolding/sw-en.DRAFT.csv` and `yo-en.DRAFT.csv`, where you mark
  each AI-drafted line `keep`, `fix` (with your replacement), or `reject`.
- `data/recordings/prompts-setB.csv`, the free-response question
  translations.

**The one rule that matters most:** always use **File → Save As → CSV
UTF-8 (Comma delimited)**. Never plain "Save," never "CSV (Comma
delimited)" without "UTF-8" in the name, never `.xlsx`. Plain CSV saves
silently destroy Yoruba subdot letters (ẹ, ọ, ṣ) and tone marks. If a file
ever shows a character as a box or a question mark after you reopen it,
stop, do not save over it, and flag it to the team instead. Full
explanation and the complete column-by-column glossary for every file:
[`data/README.md`](data/README.md).

Review instructions specifically for the scaffolding DRAFT files:
[`data/scaffolding/REVIEWING-DRAFTS.md`](data/scaffolding/REVIEWING-DRAFTS.md).

## Getting started

Prerequisites: Node.js 20 or later, and a Sahara API key (see
[docs.voice.intron.io](https://docs.voice.intron.io)). There is currently no
offline or mock mode. The server needs a real `SAHARA_API_KEY` to do
anything beyond serving instrument items, and real calls can be slow: see
[`docs/API-FINDINGS.md`](docs/API-FINDINGS.md) for measured turnaround
times before expecting a fast response.

```bash
# backend
cd server
npm install
cp .env.example .env   # fill in SAHARA_API_KEY
npm run dev             # http://localhost:3001

# frontend, in a second terminal
cd web
npm install
npm run dev              # http://localhost:5173
```

Open `http://localhost:5173`. See [`CLAUDE.md`](CLAUDE.md) for architecture,
conventions, and build-order notes.

## Status and roadmap

**Works today:**

- Recording a child's read-aloud attempt in the browser and scoring it
  against the real Sahara STT API, for both Swahili-English and
  Yoruba-English.
- Fuzzy edit-distance scoring against the known target string.
- A multi-item session with navigation, word-swap, redo, and a mandatory
  facilitator confirm/override step before any result counts.
- The reading instrument (78 items per language) and the scaffolding
  corpus, packaged and validated as Hugging Face-ready datasets.

**Planned, not built:**

- Publishing the two datasets to Hugging Face.
- Offline operation and PWA install.
- The practice-drill loop and the automated monitoring record (step 6 of
  the pipeline above is designed, not implemented).
- The multi-model speech benchmark (`benchmark/` currently holds only a
  plan).
- Yoruba dialectal adaptation.
- Native-speaker review of the instrument's syllable and word selections,
  which currently rest on general linguistic knowledge rather than a
  corpus frequency count. See `docs/SOURCES.md` for the specifics.

## Limitations

- Ntina assists the facilitator. It does not replace the teacher, and no
  level assignment takes effect until a human facilitator confirms it.
- The audio dataset has three contributors total (one Swahili, two
  Yoruba). Results from it are indicative, not speaker-independent.
- Recording a child requires both guardian consent and the child's own
  assent. See the `guardian_consent` column convention in
  [`data/README.md`](data/README.md).
- Several instrument and scaffolding rows are still marked draft or
  unreviewed. Do not treat unreviewed rows as validated content.

## Team

Team Ntina, African Computational Linguistics Summer School final project,
submission to the Sahara CodeSwitch Africa Challenge (Agriculture &
Education track). Submission deadline: 2026-09-15.

- Muhigiri Ashuza, developer and team lead
- Olufemi Oyelade, linguist
- Oladejo Zainab, linguist

## License and acknowledgements

**Code**: no license file is currently in this repository. Treat the code
as all-rights-reserved until a license is added.

**Datasets**: both V0 datasets are packaged under custom development terms
(`license: other` in their Hugging Face metadata, ready for when they are
published), because the underlying reading material has mixed provenance. Most adapted African Storybook
material is CC BY 3.0 or CC BY 4.0; one item ("Sare za shule") is CC
BY-NC 3.0, non-commercial, and is flagged separately in its row. Full
source-by-source attribution: [`docs/SOURCES.md`](docs/SOURCES.md).

The reading instrument's methodology draws on the publicly available TaRL
Africa Assessment Tools, the RTI/USAID EGRA Toolkit (CC BY 4.0), and
published Uwezo/ACER assessment reports, cited for methodology rather than
reused as text. Story and paragraph material is adapted from African
Storybook, credited per item in `docs/SOURCES.md`.
