# Sources — what was actually read, and what wasn't

Every source below was fetched live (WebFetch, or WebFetch's saved binary
re-read locally with `pymupdf` when WebFetch's own text extraction failed).
None of this was answered from memory. Failures are reported as failures,
not silently skipped.

**A technical note that applies to several entries below**: several of
these PDFs are large (200–300 pages) and WebFetch's HTML/text converter
choked on them even though they have real, extractable text layers — it
reported them as "binary/scanned" incorrectly. Rather than trust that
verdict, I saved WebFetch's fetched binary (WebFetch mirrors it locally
automatically) and re-opened it with `pymupdf` directly, which extracted
clean text. Two sources genuinely are scanned images with no text layer at
all (the TaRL PDF, and pages 82–88 of the EPDC compilation) — those are
flagged explicitly below, and for the TaRL PDF I rendered its pages to
images and read them visually instead of giving up.

## The spec

**TaRL Assessment Tools** —
[teachingattherightlevel.org/wp-content/uploads/2023/04/TaRL-Assessment-Tools.pdf](https://teachingattherightlevel.org/wp-content/uploads/2023/04/TaRL-Assessment-Tools.pdf)
— TaRL Africa. **Read successfully**, but not via text extraction — the PDF
is a 3-page image file (Photoshop-generated) with no text layer.
WebFetch's converter correctly reported this as unreadable; I rendered the
3 pages to PNG with `pymupdf` and read them directly. No explicit license
statement on the document. Full findings in `docs/INSTRUMENT-SPEC.md` — this
is the authoritative spec every item in the instrument is built against.

## Real published instruments (Swahili-region)

**EPDC: UWEZO ASER Beekungo Test Items** —
[epdc.org/.../UWEZO%20ASER%20Beekungo%20Test%20Items_June2014.pdf](https://epdc.org/sites/default/files/documents/UWEZO%20ASER%20Beekungo%20Test%20Items_June2014.pdf)
— 91-page compilation covering Kenya, Tanzania, Uganda (Uwezo) and India
(ASER). **Pages 82–88 (Uwezo Kenya + Tanzania reading tools) are confirmed
scanned images with no extractable text** — exactly as flagged in the task.
I did not read those pages; I'm reporting the failure rather than guessing
at their content. I did not exhaustively read the other 83 pages of this
compilation given the time budget — flagging that as unexplored, not as
"nothing else useful is in there."

**Uwezo Tanzania 2017 Annual Learning Assessment Report** —
[twaweza.org/.../Tanzania-Report-2017-Web-Version.pdf](https://twaweza.org/wp-content/uploads/2021/05/Tanzania-Report-2017-Web-Version.pdf)
— **Read successfully** (WebFetch's converter failed on this 71-page PDF;
re-extracted locally with `pymupdf`). Confirms, in the report's own words:
both the Kiswahili and English literacy tests have five competency levels —
non-reader, letters/sounds, words, paragraphs, short story — and "the Uwezo
tests verify whether the child comprehended the story by asking **two**
comprehension questions." Also: children read "one of two paragraphs" and
"a short two-paragraph story," aligned to the Tanzania Standard 2
curriculum, developed with Tanzania Institute of Education and NECTA. No
explicit reuse license stated (a Twaweza/Uwezo report) — used here for its
documented methodology, not adapted verbatim.

**ACER GEM profile of Uwezo** —
[acer.org/files/AssessGEMs_Uwezo.pdf](https://www.acer.org/files/AssessGEMs_Uwezo.pdf)
— **Read successfully** (same converter issue, re-extracted locally). Table
1 gives the exact literacy task structure, ordered by difficulty: letter/
syllable recognition (10 items, child reads any 5), read words (10 items,
read any 5), read a paragraph (**2 paragraphs of 4 sentences each**, read
one), read a short story (6–14 sentences), comprehend a short story
(**2 questions**). This is the strongest single confirmation for our
2-paragraph / 2-questions-per-story targets — independently corroborated
by the Uwezo Tanzania report above. No explicit reuse license stated;
methodology cited, not text reused.

## Method for choosing items (frequency-based selection)

**EGRA Toolkit, 2nd edition** (RTI International / USAID) —
[haiti-now.org/.../USAID_Early-Grade-Reading-Assesment.pdf](https://haiti-now.org/wp-content/uploads/2017/05/USAID_Early-Grade-Reading-Assesment.pdf)
— **CC BY 4.0**, confirmed on page 3 of the document itself. **Read Section
6.2 in full** (WebFetch's converter failed on this 248-page PDF;
re-extracted locally). Concrete, directly usable guidance:
- **Letter identification** (6.2.2): letters selected "based on the
  frequency with which the letter occurs in the language in question,"
  full alphabet listed 10-to-a-row, most-common letters repeated more.
  Developers sample 20–30 pages of grade-appropriate textbook and run a
  frequency count where no ready-made table exists.
- **Familiar word reading** (6.2.6): 50 words, drawn from grade 1–3
  national textbooks via word-frequency analysis; a balance of decodable
  and sight words across parts of speech; nothing repeated disproportionately;
  no one-letter words; unambiguous pronunciation.
- **Oral reading fluency with comprehension** (6.2.4): ~60-word story,
  beginning/middle/dilemma/resolution structure, only 1–2 characters (names
  and places reflecting local culture, but avoiding names already familiar
  from the school textbook so children can't answer from memory), literal
  *and* at least one inferential comprehension question.

**"The Early Grade Reading Assessment: Applications and Interventions to
Improve Basic Literacy"** (eds. Gove & Wetterberg, RTI Press, 2011) —
[files.eric.ed.gov/fulltext/ED531301.pdf](https://files.eric.ed.gov/fulltext/ED531301.pdf)
— **© All rights reserved** (Research Triangle Institute — not CC-licensed
like the Toolkit above; cited for its documented methodology, not reused
verbatim). **Read successfully** (same converter issue, re-extracted
locally). Chapter 1 gives the exact sentence the task referenced: "EGRA
developers select letters for the instrument based on the frequency with
which the letter occurs in the language in question. Adjustments are made
to accommodate each letter at least once." Critically, it also documents
**syllable naming as the standard adaptation for syllable-taught
languages**, and names Kiswahili explicitly as the example: *"in Kiswahili,
legal combinations containing the letter 'k' would include 'ka,' 'ke,'
'ki,' 'ko,' and 'ku.'"* This is the direct precedent behind the
CV-syllable decision for Swahili in `docs/INSTRUMENT-SPEC.md`.

**RTI SharEd** —
[shared.rti.org/sub-topic/early-grade-reading-assessment-egra](https://shared.rti.org/sub-topic/early-grade-reading-assessment-egra)
— **404, page does not exist.** Reporting the failure rather than guessing
at RTI's current instrument index; did not find a working replacement URL
for this specific page.

## Country/language-specific instruments (searched beyond the starting list)

- **Tusome (Kenya)** — not fetched as a primary document (search-result
  level only: NORC endline report, World Bank desk review). Confirms the
  Kiswahili EGRA used in Tusome had six tracks including **"syllable
  fluency (timed)"** as a distinct subtask — a second, independent
  real-world confirmation (alongside the ERIC document above) that
  published Kiswahili EGRA instruments use syllables, not isolated
  letters. Treated as corroborating context, not a directly quoted source.
- **EQUIP-T (Tanzania)** — search only. Confirms a Kiswahili literacy EGRA/EGMA
  was developed for Tanzania Standard 1–2, aligned to national curriculum.
  No item-level detail found within the time budget.
- **Nigeria RARA / NEI Plus, Yoruba** — found a live Yoruba-language page:
  [nemis.education.gov.ng/nmla/earlygrade/yoruba](https://nemis.education.gov.ng/nmla/earlygrade/yoruba).
  **Fetched — this is a consent/intake portal, not the instrument itself.**
  It confirms in Yoruba that the actual assessment covers letters, words,
  and short stories ("N o wa ni ki o ka awon leta, awon oro ati itan kekere
  kan..."), but no actual test items are displayed on this page. Did not
  find a downloadable Nigerian Yoruba EGRA instrument document.
- **PAL Network** — fetched [palnetwork.org/ican/](https://palnetwork.org/ican/)
  directly. ICAN is available in Kiswahili (confirmed, listed with a
  downloadable Kiswahili version) but **not in Yoruba** (not among its ~11
  languages). No item-level Kiswahili content was extracted from this page.

## Story and paragraph material (African Storybook, all CC-licensed)

Indexes fetched: [storybooksafricanlanguages.net/stories/sw/level1/](https://storybooksafricanlanguages.net/stories/sw/level1/)
and `/level2/`, and the Yoruba equivalents at `/stories/yo/level1/` and
`/level2/` (cross-checked against the Nigeria-specific mirror,
[global-asp.github.io/storybooks-nigeria/stories/yo/](https://global-asp.github.io/storybooks-nigeria/stories/yo/)
— same catalog, no additional titles). **Individual stories fetched in
full** (not just index pages):

| Story | Language | Level | Author / Illustrator | License | Used as |
|---|---|---|---|---|---|
| Mwanamume mrefu / Ọkùnrin gíga púpọ̀ kan ("A Very Tall Man") | sw + yo (parallel translation, same ASb story) | 2 | Cornelius Gulere / Catherine Groenewald | CC BY 3.0 | Story 1, both languages — trimmed from ~85–90 words to ~60, narrative arc (beginning/middle/end) kept intact |
| Tom muuza ndizi ("Tom the Banana Seller") | sw | 2 | Humphreys Odunga / Zablon Alex Nguku | CC BY 4.0 | Story 2, Swahili — trimmed from ~280–320 words to ~60, core beat (persistence, market, success) kept |
| Sare za shule ("School Clothes") | sw | 1 | Clare Verbeek et al. / Mlungisi Dlamini, Ingrid Schechter | **CC BY-NC 3.0** | Paragraph source, Swahili — reshaped into a connected 4-sentence paragraph |
| Moto / Íná ("Fire") | sw + yo (parallel) | 1 | Deborah Namugosa et al. / Rob Owen | CC BY 3.0 | Paragraph source, both languages |
| Mo fẹ́ràn kàwé ("I Like to Read") | yo | 1 | Letta Machoga / Wiehan de Jager, Vusi Malindi | CC BY 3.0 | Paragraph source, Yoruba (family context: sister, mother, grandmother, father, grandfather — all human) |

**Note on the CC BY-NC 3.0 item** ("Sare za shule"): this is Non-Commercial,
unlike every other source used here (all CC BY, commercial use allowed).
Flagging explicitly since Ntina's use case (a challenge submission, and
potentially a deployed product) may need to treat this differently — check
before treating this item the same as the others. See notes column on the
relevant CSV row.

**Yoruba story pool is thin.** The African Storybook catalog for Yoruba at
Levels 1–2 has only 6 titles total; after excluding animal-character
stories ("Kíka àwọn ẹranko," counting animals) and a no-character
expository piece ("Íná," used for the paragraph instead), only **one**
clean human-character story short enough to adapt directly was found
("Tall Man"). A Level 3 biographical story about Wangari Maathai exists
(CC BY 4.0, ~900–1,000 words) but compressing it to ~60 words would mean
rewriting it almost entirely, not adapting it — I judged that closer to
"author-created, loosely informed by" than a real adaptation, so Yoruba
Story 2 is honestly marked `Author-created` in the CSV rather than
credited to a source it wouldn't fairly represent. See the report at the
end of this task for the full sourced-vs-authored breakdown.

## Letters/words: no primary frequency analysis was performed

The EGRA Toolkit's own method (above) is to sample 20–30 pages of a real
grade-appropriate textbook and run a frequency count. **I do not have
access to a Swahili or Yoruba textbook corpus, so I did not do this.** The
syllable and word selections in the CSVs are based on general linguistic
knowledge of each language's most common consonants and everyday
child-vocabulary, informed by the sourced methodology above — not on an
actual corpus count. This is flagged in `docs/INSTRUMENT-SPEC.md` and on
every affected row's `review_status`, and it's the single biggest thing
that needs native-speaker/linguist sign-off before this instrument is used
for anything real.
