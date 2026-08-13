# Instrument spec — what the TaRL reading tool actually requires

Source: [TaRL Assessment Tools](https://teachingattherightlevel.org/wp-content/uploads/2023/04/TaRL-Assessment-Tools.pdf)
(TaRL Africa, `tarl.info`). 3-page PDF, "Reading" section on pages 1–2.

**A note on how this was read**: the PDF is image-based (Photoshop-generated,
not extractable text) — WebFetch's text extraction returned nothing on it.
I rendered its pages to images myself (`pymupdf`, no OCR) and read them
directly rather than guessing at the content or giving up. Full source
document mirrored locally at
`~/.claude/projects/.../tool-results/webfetch-1786638809994-fuh27z.pdf` if
it needs re-checking.

## The five-part structure

A TaRL reading tool = **a set of letters/syllables, a set of words, a
paragraph, and a short story** — adapted per context, contextually
appropriate. (The PDF also covers a separate Mathematics tool; not relevant
here.)

## Letters/syllables

- Unit chosen depends on what's most meaningful in the language — the doc
  explicitly leaves this open per-language, doesn't mandate letters over
  syllables.
- Commonly-used, familiar to children.
- **Exclude anything with ambiguous regional pronunciation.**
- No item count specified in the source. The example image shows ~10 items
  for illustration only, not a target number.

## Words

- Simple: easy to sound out *and* easy to understand.
- Common sounds, frequently used by **5- to 7-year-olds**.
- No item count specified in the source (same caveat as above).

## Paragraph

- Based on **grade 1** level text.
- **Exactly 4 sentences**, each **4–5 words**.
- Sentences connected in meaning — a coherent paragraph, not 4 unrelated
  lines. Each sentence on its own line.
- No compound words, where avoidable.
- Vocabulary: commonly found in grade 1 textbooks, familiar to grade 1
  children. **Max 1 difficult word** per paragraph.
- The source doc adds one caveat itself: grade-1-level text is *what this
  particular tool* used as a guide — implementers should judge what's
  appropriate for their own context. Treat "grade 1" as a strong default,
  not an absolute.
- A sidebar "Activity" box in the source gives a slightly stricter alternate
  framing (≤4 words/sentence, ≤3 sounds/word) as a simplified teaching
  exercise, not the tool's own rule. I've built against the main-text rule
  (4 sentences × 4–5 words) since that's what describes the actual
  assessment tool.

## Story

- **7–10 sentences, ~60 words total.**
- **Human characters, not animals** — explicitly so it doesn't read as too
  childish for older children being assessed at this level.
- Vocabulary: commonly found in a **grade 2** textbook, commonly used by
  grade 2 children.
- Context familiar to the children the tool is built for.
- Clear beginning, middle, end.

## Comprehension questions

- The source hedges this as something "some TaRL programs" include, not a
  universal requirement: **2–3 questions per story**.
- **Question 1 is direct fact retrieval. The rest are indirect** (require
  inference/connecting information, not a single stated fact).
- Questions must be drawn from **different parts of the story**, not all
  clustered near the end.

## How this maps onto our build target

The source spec describes one minimal instrument (1 letter/syllable set, 1
word set, 1 paragraph, 1 story). Our target — 30 syllables/letters, 40
words, 2 paragraphs, 2 stories per language — is a larger item bank than the
spec itself mandates, built for future item rotation/coverage. This is a
project decision layered on top of the TaRL spec, not something the source
document requires; flagging it here so it's traceable.

The 4 comprehension questions/language in our target = 2 stories × 2
questions each, which sits at the **low end** of the source's 2–3-per-story
range (using the minimum, 2, not the max). Each story's 2 questions follow
the direct-then-indirect pattern from different parts of the story, per the
rule above.

## Letters vs. syllables: the decision, and why (Phase 4)

The TaRL spec leaves this open per-language ("depending on what the most
meaningful unit... is"). Full sourcing in `docs/SOURCES.md`; the decision:

**Both Swahili and Yoruba use CV (consonant+vowel) syllables, not isolated
letters.** Reasoning:

- Both languages are strongly CV-syllabic orthographies — Swahili has
  almost no closed syllables in native vocabulary; Yoruba is even more
  strictly CV (plus syllabic nasals). An isolated-letter approach tests a
  unit smaller than what children are actually taught to decode.
- Two independent real EGRA sources confirm Kiswahili is taught and
  assessed by syllable, not letter: the ERIC-hosted RTI Press volume
  gives Kiswahili's "ka, ke, ki, ko, ku" as its own worked example of
  syllable-taught languages (see `docs/SOURCES.md`), and Kenya's Tusome
  Kiswahili EGRA included "syllable fluency" as a scored subtask.
  Swahili primers teach ba/be/bi/bo/bu as a set, not the isolated
  consonant.
- For Yoruba specifically, tone is contrastive (see below) — a bare
  consonant letter can't carry a tone mark the way a full syllable can,
  so syllables are also the more meaningful unit for testing correct
  tone reading, not just decoding.

**What this does NOT rest on**: actual frequency-count data from a Swahili
or Yoruba textbook corpus. See "No primary frequency analysis" in
`docs/SOURCES.md` — the specific 30 syllables chosen per language are
based on general knowledge of each language's most common consonants
(informed by the sourced EGRA methodology's *principle* — select by
frequency, adjust for full coverage — not by an actual corpus count this
project ran). This is the single item category most in need of
native-speaker verification before use.

## Yoruba tone: not optional, and where it gets ambiguous

Yoruba marks three tones with diacritics (highá, mid a/unmarked, low à)
plus subdot consonants/vowels (ẹ, ọ, ṣ) that are separate phonemes, not
stylistic marks. A syllable or word without its correct tone marking is,
formally, a different word — so every Yoruba item's tone marking is part
of its correctness, not decoration. Any item where the intended reading
could plausibly be scored correct under more than one tone pattern is
flagged in that row's `notes` column for the linguists, rather than
silently picking one.

## Every item in this instrument must satisfy

1. Paragraph: 4 sentences, 4–5 words each, coherent, ≤1 difficult word,
   grade-1 vocabulary.
2. Story: 7–10 sentences, ~60 words, human characters, grade-2 vocabulary,
   clear beginning/middle/end.
3. Comprehension: question 1 direct, question 2 indirect, drawn from
   different parts of the story.
4. Letters/syllables and words: familiar, commonly used, no ambiguous
   regional pronunciation, age-appropriate (5–7 for words).
