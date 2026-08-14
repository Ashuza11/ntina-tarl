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

V0 contains read-aloud and scripted-prompt recordings from one adult Swahili
speaker from the Democratic Republic of the Congo and two adult Yoruba
speakers. It is intended for development of the Ntina TaRL
reading-assessment benchmark.

## Development status

This is a public development V0 dataset. Contributor consent is recorded.
Questions, corrections, and collaboration requests can be sent to
`ashuza1411@gmail.com`.

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
- 204 WAV files total

All distributed clips are mono, 16 kHz, signed 16-bit PCM WAV. The original
MP4 recordings remain outside this prepared dataset directory.

## Structure

- `audio/` — one WAV file per item
- `metadata.csv` — transcript, item, speaker, duration, format, source, and
  provenance fields
- `speakers.csv` — pseudonymous speaker metadata

Contributors are represented only by the pseudonymous IDs `spk-sw-001`,
`spk-yo-001`, and `spk-yo-002`. Filenames retain the recording sheet's
literal `SPEAKER` placeholder and contain no real name.

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
node tools/finalize-dataset-v0.js
```

## Validation and publication

The prepared directory was loaded successfully with Hugging Face
`audiofolder`. Its 204 metadata rows match exactly 204 audio files; validation
found no missing or extra clips, blank transcripts, or duplicate recording
IDs. Consent is marked `yes` throughout, recording devices are documented as
basic Android phones, and the noise condition is recorded as `moderate`.

The intended public Hugging Face repository slug is
`ntina-voice-dataset-v0`. Audio is ignored by the application Git repository
to prevent it from being pushed to GitHub; WAV files in the separate dataset
repository are configured for Git LFS.

## Limitations

- One speaker is not representative of Congolese Swahili diversity.
- Two speakers are not representative of Yoruba dialect diversity.
- The Yoruba Set C reference text and recording alignment were verified by a
  contributor for V0.
- “Congolese Swahili” is not a sufficiently precise dialect label; the
  speaker's region must be recorded before dialect claims are made.
- Audio boundaries and alignment were confirmed by the contributor for V0.
- Set B contains scripted readings of the prompt text, not spontaneous
  free-response answers, and must not be reported as spontaneous benchmark
  speech.
- This V0 contains monolingual Set A reading material, not spontaneous
  code-switched speech.

## Consent, licensing, and access

Contributor consent is recorded for the development dataset. V0 is published
publicly under custom development terms (`other` in Hugging Face metadata).
Contact `ashuza1411@gmail.com` with reuse questions. Source texts retain their
original attribution and license requirements; public availability does not
waive those underlying terms.
