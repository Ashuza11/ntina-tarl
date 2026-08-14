# Ntina

Code-switched voice agent for foundational literacy, based on the Teaching
at the Right Level (TaRL) method. Africa Computational Linguistics Summer
School final project and Sahara CodeSwitch Africa Challenge submission.

## Stack

- `server/` — Node.js + Express
- `web/` — React (Vite) + Tailwind
- `engine/` — assessment/scoring logic, framework-independent
- `config/` — one file per language pair, no code branches on language
- `data/` — the corpus (see `data/README.md` — read it before editing anything there)
- `benchmark/` — multi-model STT comparison harness
- `docs/` — decisions and API findings

## Getting started

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

See `CLAUDE.md` for architecture, conventions, and build-order notes.

## Ntina Voice Dataset V0

The prepared public development dataset is in
`data/recordings/dataset-v0/`. It contains 204 aligned WAV clips from adult
Swahili and Yoruba contributors for reading-assessment and code-switched
scaffolding experiments.

- 108 Swahili clips: Set A reading material, Set B scripted prompts, and Set
  C Swahili–English scaffolding
- 96 Yoruba clips: 10 Set B scripted prompts and 86 Yoruba–English Set C
  scaffolding utterances
- mono, 16 kHz, signed 16-bit PCM WAV
- complete transcripts, speaker metadata, consent confirmation, device and
  noise-condition metadata
- contributor-verified Yoruba Set C reference text and clip alignment

For Yoruba Set C, the `yoruba_Recording C2 - 45` source folder supplies the
first 44 scaffold acts. Source recordings C46 through C87 supply the remaining
42 acts. C88 was not recorded and is not expected in V0.

The dataset has been validated locally with Hugging Face `audiofolder`: all
204 metadata rows resolve to exactly 204 audio files, with no missing clips,
extra clips, blank transcripts, or duplicate recording IDs. The intended
Hugging Face repository name is `ntina-voice-dataset-v0` and its display name
is **Ntina Voice Dataset V0**.

V0 is intended to be public; later development versions may remain private.
It uses custom development terms (`license: other`) because source texts keep
their original attribution and licensing requirements. Contact
`ashuza1411@gmail.com` for reuse questions.

Audio is deliberately ignored by the application repository's `.gitignore`,
so recordings are not pushed to GitHub. The prepared Hugging Face dataset has
its own `.gitattributes` rule for storing WAV files with Git LFS.

See `data/recordings/dataset-v0/README.md` for the full dataset card.

## Ntina Text Dataset V0

The Hugging Face-ready text companion is in `data/text-dataset-v0/`. It
contains 470 rows across five configurations: reviewed/draft scaffolding,
reading instruments, trilingual elicitation prompts, dialogue-act
specifications, and a Tanzanian Kiswahili adaptation pilot. Its intended
repository slug is `ntina-text-dataset-v0`.

Review state is preserved rather than flattened: instrument and translated
prompt rows remain drafts, replacement-bearing scaffolding verdicts are
normalized as fixes, and damaged Yoruba orthography is explicitly flagged.
See `data/text-dataset-v0/README.md` before using the text for training.
