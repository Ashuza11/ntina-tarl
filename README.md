# Ntina

A code-switched voice tutor that assesses foundational reading skills in
children aged roughly 6 to 8, following the Teaching at the Right Level
(TaRL) framework. Swahili-English and Yoruba-English.

**Status: partially built.** The reading assessment pipeline (record, score,
facilitator confirmation) runs end to end against the real Sahara speech API
for both language pairs. The linguistic datasets (text and audio) are
published and validated, and a four-provider ASR benchmark is complete. The
offline PWA and the drilling/monitoring-record loop beyond a single reading
check are not built yet.
See [Status and roadmap](#status-and-roadmap) for the specific line between
the two.

## Links

| Artifact | Status |
|---|---|
| Text dataset (Hugging Face) | [Ash11/ntina-text-dataset-v0](https://huggingface.co/datasets/Ash11/ntina-text-dataset-v0) |
| Audio dataset (Hugging Face) | [Ash11/ntina-voice-dataset-v0](https://huggingface.co/datasets/Ash11/ntina-voice-dataset-v0) |
| Live demo | Not deployed. Runs locally, see [Getting started](#getting-started) |
| Pitch deck | [`Ntina — Africomplings Summer School Final Project`](docs/Ntina-Africomplings_SummerSchool_Final_Project.pptx) |

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

Packaged at [`data/text-dataset-v0/`](data/text-dataset-v0/), 450 rows
across four configurations. The public dataset is available on Hugging Face:
**[Ash11/ntina-text-dataset-v0](https://huggingface.co/datasets/Ash11/ntina-text-dataset-v0)**.

| Configuration | Rows | Contents |
|---|---:|---|
| `scaffolding` | 176 | Approved/repaired Standard Kiswahili-English and Standard Yoruba-English tutor utterances |
| `instrument` | 156 | Approved Standard Kiswahili and Standard Yoruba TaRL reading items |
| `prompts` | 30 | Ten approved/reference Set B prompts in English, Standard Kiswahili, and Standard Yoruba |
| `dialogue_acts` | 88 | Language-neutral pedagogical functions and triggers the scaffolding is drafted against |

The Yoruba scaffolding was recovered from the linguist's Unicode workbook and
validated against all 88 intact draft rows. Full dataset card and licensing
detail: [`data/text-dataset-v0/README.md`](data/text-dataset-v0/README.md).
The scaffolding was synthetically drafted with the model identifier
`claude-sonnet-4-6` and then corrected through native-speaker/linguist review.
The observed Yoruba and Swahili drafting issues are documented in
[`docs/SYNTHETIC-DATA-EVALUATION.md`](docs/SYNTHETIC-DATA-EVALUATION.md).

### Audio dataset

Packaged at [`data/recordings/dataset-v0/`](data/recordings/dataset-v0/),
262 aligned WAV clips (mono, 16 kHz, 16-bit PCM): 108 Swahili adult clips,
96 Yoruba adult clips, and 58 Yoruba child clips from two different children.
The children recorded the two partial Set A folders. Contributor and guardian
consent are confirmed. Ten untranscribed Yoruba child Set B responses are
excluded from V0 and retained locally for a later version.
The public dataset is available on Hugging Face:
**[Ash11/ntina-voice-dataset-v0](https://huggingface.co/datasets/Ash11/ntina-voice-dataset-v0)**.
Full dataset card:
[`data/recordings/dataset-v0/README.md`](data/recordings/dataset-v0/README.md).

Participant and guardian permissions use the
[`Bilingual Code-Switching Data Collection Consent Form`](docs/Bilingual_Code_Switching_Data_Collection_Consent_Form.docx).

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
benchmark/                  reproducible four-provider ASR benchmark, results, and charts
_specs/                     spec template for non-trivial features before building them
```

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
- A 262-clip benchmark of Sahara, Groq Whisper Large V3, AssemblyAI, and
  Deepgram, with resumable API calls, WER/CER analysis, latency measurements,
  and presentation-ready charts. Sahara produced the lowest aggregate error
  rates; Deepgram was fastest. See [`docs/ASR-BENCHMARK.md`](docs/ASR-BENCHMARK.md).

**Planned, not built:**

- Offline operation and PWA install.
- The practice-drill loop and the automated monitoring record (step 6 of
  the pipeline above is designed, not implemented).
- Yoruba dialectal adaptation.
- Country-curriculum frequency validation of the syllable and word
  selections. Human language review is complete, but the selections still
  rest on general linguistic knowledge rather than textbook frequency data.
  See `docs/SOURCES.md` for the distinction.

## Limitations

- Ntina assists the facilitator. It does not replace the teacher, and no
  level assignment takes effect until a human facilitator confirms it.
- The audio dataset has five contributors total: one Swahili adult, two
  Yoruba adults, and two Yoruba children. Results are indicative, not
  speaker-independent.
- Recording a child requires both guardian consent and the child's own
  assent. See the `guardian_consent` column convention in
  [`data/README.md`](data/README.md).
- The text dataset is human-verified, but that does not make its author-created
  short items official national-curriculum or textbook-frequency selections.

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
