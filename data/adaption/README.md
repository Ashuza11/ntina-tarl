# Adaption Labs pilot

## Purpose

This folder contains the first Adaptive Data pilot for the Swahili–English literacy tutor. The pilot tests whether reviewed, child-directed classroom utterances can be localized to Tanzanian Kiswahili Sanifu while retaining English code-switching only where it sounds natural.

The pilot source is [`sw-en_tz-pilot-20.csv`](./sw-en_tz-pilot-20.csv). Its 20 entries were selected from `data/scaffolding/sw-en.csv` after resolving each `keep` or `fix` review decision into one final completion.

This experiment applies only to flexible tutor scaffolding. It does not authorize automatic localization of the constrained literacy assessment in `data/instrument/swahili.csv`.

## Human variation elicitation packets

Two printable 50-item packets support collection of verified regional-language seed data:

- [`reviewer-packets/bukavu-kivu-swahili-50-pilot.pdf`](./reviewer-packets/bukavu-kivu-swahili-50-pilot.pdf) presents the reviewed Standard Kiswahili source for each pedagogical act and asks a Bukavu speaker to supply natural Bukavu Kivu Swahili, any natural French/English switch, and usage notes.
- [`reviewer-packets/yoruba-variety-50-pilot.pdf`](./reviewer-packets/yoruba-variety-50-pilot.pdf) asks the speaker to name their town and regional variety, then supply both Standard Yorùbá and the corresponding regional form with tone, spelling, and code-switch notes.

The Yorùbá packet intentionally does not reproduce the existing 50 draft scaffolding lines: only 32 of the 88 Yorùbá scaffolding drafts were accepted as written, while the rest have documented problems involving tone, wording, omissions, or code-switching. Presenting those drafts as verified Standard Yorùbá would contaminate the regional elicitation.

Each packet covers 50 acts distributed across instruction, praise, hints, correction, level transitions, encouragement, closing, repair, escalation, and facilitator speech. The packets are data-collection forms, not speaker tests. Returned forms require transcription into structured CSV and a second reviewer before use in Adaptive Data.

The reproducible generator is `tools/generate-variation-packets.py`. It requires ReportLab and a Unicode font capable of rendering Yorùbá diacritics.

## Adaption configuration

- Dataset name: `swahili_english_tutor_prompts`
- Dataset type: Instruction dataset
- Translate or localize by adding language variants: No
- Global constraints or brand guidelines: Yes
- Prompt column: `prompt`
- Completion column: `completion`
- Context columns: `category`, `tarl_level`, `audience`, `target_variety`, `max_words`
- Tracking-only column: `act_id` (not mapped as content)
- Target length: Minimal

The localization option is disabled for this controlled pilot because it would expand the dataset with additional language variants. The intended Tanzanian adaptation is instead specified through the Blueprint and the per-row `target_variety` context.

## Dataset description

> A pilot instruction dataset for a child-facing literacy tutor in Tanzania. Each English prompt describes a pedagogical action, while the completion is a short spoken response using Tanzanian Kiswahili Sanifu as the matrix language with limited, natural English classroom code-switching. The dataset covers reading instructions, hints, corrections, praise, encouragement, level transitions, session closing, and audio repair.

If the interface permits manual domain selection, use `Academic/Education` rather than `Parenting/Family`.

## Blueprint

```text
Adapt each completion for a Tanzanian primary-school literacy setting.

Use natural, child-friendly Kiswahili Sanifu from Tanzania as the
matrix language. Preserve the original pedagogical function, meaning,
reading level, and audience.

English code-switching is allowed only where a bilingual Tanzanian
teacher might naturally use a familiar classroom cue, encouragement,
or established term. Examples may include ready, try again, good job,
take your time, and syllable.

Do not force English into every utterance. Preserve natural monolingual
Kiswahili when English adds no value. Do not translate an entire
utterance into English.

Use correct Kiswahili grammar, spelling, agreement, and Tanzanian
educational terminology. Keep the utterance within its stated maximum
word count. Address children warmly and respectfully.

Do not change example words, names, letter sounds, reading targets,
numbers, or factual content. Return only the adapted teacher utterance.
```

## Baseline platform evaluation

Recorded before running the adaptation:

| Measure | Baseline result |
|---|---:|
| Rows | 20 |
| Grade | C |
| Quality score | 6/10 |
| Percentile | 7.2% |
| Average prompt length | 10.8 words |
| Average completion length | 7.0 words |
| Parenting-family domain | 45% |
| Academic-education domain | 40% |
| Writing-editing-communication domain | 5% |
| Detected English | 100% |
| Educational tone | 55% |
| Encouraging tone | 15% |
| Clear tone | 10% |

The platform reported that 92.8% of datasets in its selected `parenting-family` domain had a higher score.

## Interpretation of the baseline

The generic score is not a reliable linguistic judgment of Tanzanian Kiswahili or of natural code-switching. The English-only language result likely reflects the English `prompt` column receiving substantial weight during automatic classification; the mapped completions themselves contain Kiswahili and English.

The small size, short utterances, narrow literacy domain, and intentionally mixed language may also affect generic dataset comparisons. Rows should not be duplicated or padded merely to improve the automatic score. Platform scores are useful before/after diagnostics, but approval depends on human review by a Tanzanian Kiswahili speaker familiar with primary-school teaching.

## Completed pilot run

The 20-row Adaptive Data job completed with the following identifiers and platform-reported results:

| Measure | Result |
|---|---:|
| Dataset name | `swahili_english_tutor_prompts` |
| Dataset ID | `9b6a5853-6d0a-4163-bcfa-bcaf1b9e4918` |
| Rows adapted | 20 |
| Original quality score | 6.0/10 |
| Adaptive quality score | 6.1/10 |
| Relative improvement | 1.7% |
| Original grade | C |
| Adaptive grade | C |
| Original percentile | 7.2% |
| Adaptive percentile | 7.5% |
| Prompt length shown after the run | 11 words |
| Completion length shown after the run | 7 words |
| Training metrics | Not available yet |

The detected domains remained `Parenting-family` (45%), `Academic-education` (40%), and `Writing-editing-communication` (5%). The platform continued to report English as the detected language. The Blueprint was enabled for the run.

The reported gain is small: the score increased by 0.1 point, the grade did not change, and the percentile increased by 0.3 point. This is a completed adaptation result, not evidence that the outputs have passed linguistic review.

### Preliminary output inspection

The exported adaptive completions must not be accepted automatically. Initial inspection found substantive failures that the generic 6.1 score did not expose:

- `correction-model-pronunciation-001` replaced the required example word `shule` with the placeholder `[word]`, violating the target-preservation rule.
- `instr-comprehension-001` changed a question about whom the story concerned into a question about what happened, changing the pedagogical meaning. It also used plural `niambieni` despite the `child` audience being singular.
- `level-up-letter-to-word-001` addressed `watoto` in the plural even though the row is directed to one child.
- Several completions became longer than their specified `max_words` constraint and require a systematic word-count check.
- Some outputs added `mwanangu` and additional English cues even where they may not be necessary; a Tanzanian educator must judge their classroom naturalness.
- Some outputs removed existing English switches, including `syllable` and `noise`. This may be appropriate in individual cases, but it must be reviewed rather than assumed to be an improvement.

Pilot decision: **hold—do not scale to all 88 rows yet**. The adaptive output requires row-level human review and a stricter second pilot.

## Human evaluation

Score every adapted completion from 1 to 5 on:

1. Preservation of meaning and pedagogical function
2. Tanzanian Kiswahili Sanifu grammar and vocabulary
3. Naturalness and restraint of English code-switching
4. Child-friendly classroom register
5. Appropriate Tanzanian educational terminology
6. Compliance with `max_words`
7. Preservation of names, sounds, reading targets, numbers, and facts

Also flag each of these as present or absent:

- Forced English switch
- Useful natural switch removed
- Kenyan-specific wording retained
- Unnatural Tanzanian wording
- Grammar or agreement error
- Meaning changed
- Reading target changed
- Word limit exceeded

## Scale-up decision

Proceed from the 20-row pilot to all 88 reviewed Swahili scaffolding rows only if:

- At least 18 of 20 outputs are approved without substantive rewriting.
- Every scored dimension averages at least 4/5.
- No reading target or pedagogical function changes.
- No more than two outputs contain forced or unnatural code-switching.
- A Tanzanian reviewer approves the final Blueprint.

Retain these 20 entries as a regression set during the full 88-row adaptation. AutoScientist training is a later step and requires a substantially larger training-ready dataset; this pilot is for Adaptive Data localization and evaluation only.
