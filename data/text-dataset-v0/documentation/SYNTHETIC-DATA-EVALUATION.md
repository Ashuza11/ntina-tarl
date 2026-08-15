# Synthetic text generation and linguist evaluation

## Scope and generation model

Ntina Text Dataset V0 contains synthetic and adapted educational text. The
code-switched tutor scaffolding was drafted from the 88 language-neutral
dialogue acts in `data/spec/dialogue-acts.csv`. The generation implementation
is `tools/generate-scaffolding.js`, which records the model identifier
`claude-sonnet-4-6` and calls it once per dialogue act and language pair
through the Anthropic SDK.

The model output was never treated as native-speaker ground truth. It entered
the repository as `data/scaffolding/<pair>.DRAFT.csv`, then passed through a
human `keep` / `fix` / `reject` review. A supplied replacement is normalized
as a fix even when the reviewer's raw note begins with “reject”; only a row
without a usable replacement is a true rejection.

The reading instruments are also synthetic/adapted rather than official
national test items. Their syllables and words were author-created following
TaRL/EGRA design principles, while narrative items were adapted from the
African Storybook sources documented in `docs/SOURCES.md`. Human approval
does not turn those items into official curriculum or textbook-frequency
selections.

## Yoruba linguist findings

The Yoruba review is documented in
`NTINA- AfriCompLing_Code_Switching_Benchmarking_Categories.docx`. The
linguist identified four recurring qualitative error categories:

1. **Wrong code-switch word or label.** Some spans marked as English switches
   were actually Yoruba, so they were not Yoruba–English switches. Other
   sentences used an English word that did not fit the intended context.
2. **Incorrect tone marking.** High, mid, or low tones were assigned
   incorrectly, sometimes changing the orthographic or phonological form and
   potentially the intended word or meaning.
3. **Unnecessary or incorrect word addition.** Added words made some lines
   unnatural, ungrammatical, redundant, or different in meaning. Reviewers
   removed or replaced those additions.
4. **No code-switching.** Some generated lines were entirely Yoruba despite
   the bilingual scaffolding task. The reviewer inserted an English word or
   phrase only where a natural opportunity existed.

These are reviewer-observed categories, not corpus-wide measured error rates.
The reviewed working file preserves the raw verdict and correction for audit.
Yoruba Unicode subdots and tone marks were recovered from the linguist's
`.xlsx` workbook using `tools/recover-yoruba-scaffolding.py`, avoiding the
damage introduced by an earlier spreadsheet CSV export.

## Swahili reviewer findings

The main Swahili observation was translation-like discourse framing. The
drafting model frequently placed **“Sawa”** at the beginning of a sentence as
if translating English **“Okay”** directly. Native Swahili speakers do not
normally begin all of these classroom utterances that way, so repeated
instances sounded formulaic and unnatural.

The same broader issue appeared with some other words and switch choices: the
line could preserve the English intent while still sounding like an English
sentence translated into Swahili, rather than something a bilingual Swahili
teacher would naturally say to a child. Review therefore focused on removing
unnecessary “Sawa,” rewriting translation-shaped syntax, and retaining
English only where the classroom code-switch was contextually natural.

This finding is qualitative and should not be interpreted as a measured rate
of “Sawa” errors. The final dataset contains the reviewed `keep` text or the
reviewer's replacement, not an unfiltered model draft.

## Implications for use

- Use `final_text`, not `text_draft`, for approved scaffolding applications.
- Preserve `review_decision`, `normalized_decision`, and `corrected_text` when
  studying synthetic drafting errors or reviewer behavior.
- Do not train from raw draft text without filtering and native-speaker review.
- Do not infer that code-switching is natural merely because an English span
  is present or bracketed.
- Yoruba tone marks and Swahili discourse particles require language-specific
  evaluation; generic translation quality is not sufficient.
