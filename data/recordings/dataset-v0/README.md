---
language:
  - sw
  - yo
  - en
pretty_name: Ntina Voice Dataset V0
task_categories:
  - automatic-speech-recognition
tags:
  - code-switching
  - swahili
  - yoruba
  - education
  - reading-assessment
license: other
---

# Ntina Voice Dataset V0

V0 contains read-aloud and prompt-based recordings from one adult Swahili
speaker from the Democratic Republic of the Congo, two adult Yoruba speakers,
and two Yoruba child participants aged 10–15. It is intended for development
of the Ntina TaRL reading-assessment benchmark.

## Development status

This is a public development V0 dataset. Contributor consent is confirmed for
all speakers, and guardian consent is confirmed for both child participants.
Questions and corrections can be sent to `ashuza1411@gmail.com`.

Hugging Face: [Ash11/ntina-voice-dataset-v0](https://huggingface.co/datasets/Ash11/ntina-voice-dataset-v0)

## Contents

- 30 isolated syllables
- 40 isolated words
- 2 paragraphs
- 2 stories
- 4 comprehension-question recordings
- 10 Swahili scripted Set B prompt recordings
- 20 code-switched Set C scaffolding recordings
- 86 Yoruba–English Set C scaffolding recordings
- 10 Yoruba–English scripted Set B prompt recordings
- 58 Yoruba child Set A recordings: 29 syllables, 22 words, 2 paragraphs,
  1 story, and 4 comprehension questions
- 262 WAV files total

Ten Yoruba child Set B source responses do not have verbatim transcripts and
are deliberately excluded from V0. They are retained outside this package for
a possible later dataset version.

All distributed clips are mono, 16 kHz, signed 16-bit PCM WAV. The original
MP4 recordings remain outside this prepared dataset directory.

## Structure

- `audio/` — one WAV file per item
- `metadata.csv` — transcript, item, speaker, duration, format, source, and
  provenance fields
- `speakers.csv` — pseudonymous speaker metadata

Contributors are represented only by the pseudonymous IDs `spk-sw-001`,
`spk-yo-001`, `spk-yo-002`, `spk-yo-003`, and `spk-yo-004`.
The final two IDs represent different child participants: `spk-yo-003`
recorded the first Set A folder and `spk-yo-004` recorded the second Set A
folder. Filenames contain no real name.

For Yoruba Set C, the `yoruba_Recording C2 - 45` source folder maps to the
first 44 scaffold acts. Source recordings C46 through C87 map to the
remaining 42 acts. C88 is not present and is not expected in V0.

## Processing

The syllable, word, and comprehension recordings were split at the midpoint
of detected silence intervals. Detection used `-35 dB`, with a minimum gap of
0.6 seconds for syllables and 1.0 second for words and comprehension items.
Paragraph and story recordings were converted as complete clips. All outputs
were resampled to mono 16 kHz PCM.

The preparation process is reproducible with:

```bash
node tools/prepare-seta-v0.js
node tools/prepare-yoruba-setc-v0.js
node tools/prepare-yoruba-child-v0.js
node tools/finalize-dataset-v0.js
```

## Validation and publication

The prepared directory contains 262 metadata rows matching exactly 262 audio
files. There are no missing or extra clips or blank transcripts. All 58 child
clips are mono, 16 kHz, signed 16-bit PCM.

The public Hugging Face repository is
[Ash11/ntina-voice-dataset-v0](https://huggingface.co/datasets/Ash11/ntina-voice-dataset-v0).
Audio is ignored by the
application Git repository to prevent it from being pushed to GitHub; WAV
files in the separate dataset repository are configured for Git LFS.

## Limitations

- One speaker is not representative of Congolese Swahili diversity.
- Four Yoruba speakers are not representative of Yoruba dialect diversity.
- The Yoruba Set C reference text and recording alignment were verified by a
  contributor for V0.
- “Congolese Swahili” is not a sufficiently precise dialect label; the
  speaker's region must be recorded before dialect claims are made.
- Audio boundaries and alignment were confirmed by the contributor for V0.
- Set B contains scripted readings of the prompt text, not spontaneous
  free-response answers for the adult contributors. Untranscribed child Set B
  responses are excluded from V0 and reserved for a later version.
- The child Set A session is partial. Missing items are `yo-ls-020`,
  `yo-w-001`–`yo-w-010`, `yo-w-012`–`yo-w-018`, `yo-w-020`, and `yo-s-002`.
- This V0 contains monolingual Set A reading material, not spontaneous
  code-switched speech.

## Consent, licensing, and access

Contributor consent is recorded for every speaker, and guardian consent is
recorded for both child participants. Confirmation was entered on 2026-08-15;
the original document-signing date was not supplied. V0 uses custom
development terms (`other` in Hugging Face metadata). Contact
`ashuza1411@gmail.com` with reuse questions. Source texts retain their
original attribution and license requirements.
