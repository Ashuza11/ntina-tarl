import { useEffect, useState } from "react"

// Landing page for Ntina, a PLANNED code-switched voice tutor for
// foundational reading assessment (TaRL method). Honest framing throughout:
// this is a system in development for the Sahara CodeSwitch Africa
// Challenge, not a deployed product with measured results. See CLAUDE.md.
//
// Hero/illustration approach informed by (not copied from) the sibling
// Ntina.ai reference project's onboarding carousel, see
// /home/ashuza/2026-project/Ntina.ai/apps/web/src/app/[locale]/onboarding/page.tsx
// -- reused pattern: the gold-pill CTA with dark-forest text (not white),
// and a phone-in-badge illustration motif, redrawn for this product.

function MicGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
      <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CheckGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PersonGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="7" r="3.2" fill="currentColor" />
      <path d="M5 20c0-4 3.1-6.5 7-6.5S19 16 19 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function PhoneGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="6" y="2" width="12" height="20" rx="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function DocumentGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CompareGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9 5L4 12l5 7M15 5l5 7l-5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LevelGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="16" width="4" height="5" rx="1" fill="currentColor" />
      <rect x="10" y="11" width="4" height="10" rx="1" fill="currentColor" />
      <rect x="17" y="5" width="4" height="16" rx="1" fill="currentColor" />
    </svg>
  )
}

function NotebookGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 8l1.3 1.3L11.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 15l1.3 1.3L11.5 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

// Cycles through both supported languages on its own, independent of the
// selector below it -- the hero illustration's job is to show off both
// pairs, not just whichever one happens to be currently selected. Real
// instrument words (data/instrument/{swahili,yoruba}.csv), paired by
// meaning (house, water, sun, friend), never invented for the page.
const HERO_WORDS = [
  { pair: "sw-en", word: "nyumba" },
  { pair: "yo-en", word: "ilé" },
  { pair: "sw-en", word: "maji" },
  { pair: "yo-en", word: "omi" },
  { pair: "sw-en", word: "jua" },
  { pair: "yo-en", word: "oòrùn" },
  { pair: "sw-en", word: "rafiki" },
  { pair: "yo-en", word: "ọ̀rẹ́" },
]
const HERO_WORD_INTERVAL_MS = 2500

function HeroPhoneMockup() {
  const [wordIndex, setWordIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((i) => (i + 1) % HERO_WORDS.length)
    }, HERO_WORD_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const current = HERO_WORDS[wordIndex]

  return (
    <div className="relative mx-auto w-48 sm:w-56">
      <div className="rounded-[2rem] border-[6px] border-forest bg-white shadow-xl overflow-hidden">
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-forest/30" />
        </div>
        <div className="flex flex-col items-center gap-4 px-4 py-8">
          <p className="text-gray-400 text-xs">Read this aloud</p>
          <p key={current.word} className="text-forest text-3xl font-bold fade-in">
            {current.word}
          </p>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-terracotta">
            <MicGlyph className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-end gap-1 h-6" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`w-1 bg-gold ${i % 2 === 0 ? "waveform-bar-tall" : "waveform-bar"}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -right-3 -bottom-3 flex h-11 w-11 items-center justify-center rounded-full bg-forest shadow-lg">
        <CheckGlyph className="h-5 w-5 text-white" />
      </div>
    </div>
  )
}

const LANGUAGE_PAIRS = [
  { pair: "sw-en", from: "Swahili", to: "English" },
  { pair: "yo-en", from: "Yoruba", to: "English" },
]

function LanguagePairOption({ from, to, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold border transition-colors ${
        selected ? "bg-forest text-white border-forest" : "bg-white text-forest border-forest/30 hover:border-forest"
      }`}
    >
      {from} ↔ {to}
    </button>
  )
}

const LEVELS = [
  { label: "Beginner", height: 44 },
  { label: "Letter / Syllable", height: 68 },
  { label: "Word", height: 92 },
  { label: "Paragraph", height: 116 },
  { label: "Story", height: 140 },
]

function LevelLadder() {
  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 overflow-x-auto py-4">
      {LEVELS.map((level, i) => (
        <div key={level.label} className="flex flex-col items-center gap-2 shrink-0">
          <div
            className="w-14 sm:w-20 rounded-t-lg bg-gradient-to-t from-forest to-forest-light flex items-start justify-center pt-2"
            style={{ height: `${level.height}px` }}
          >
            <span className="text-white text-xs font-bold">{i + 1}</span>
          </div>
          {/* Fixed height regardless of 1-line or 2-line label text, so a
              longer label (e.g. "Letter / Syllable") never pushes its own
              bar out of alignment with the others -- the bars all sit on
              the same baseline no matter how the label wraps. */}
          <p className="text-forest text-xs sm:text-sm font-semibold text-center w-16 sm:w-20 h-10 flex items-center justify-center leading-tight">
            {level.label}
          </p>
        </div>
      ))}
    </div>
  )
}

const WORKFLOW_STEPS = [
  {
    icon: PhoneGlyph,
    title: "The child reads",
    body: "A child reads a known passage aloud, on an inexpensive Android phone.",
  },
  {
    icon: DocumentGlyph,
    title: "Speech becomes text",
    body: "Speech-to-text turns the recording into a transcript.",
  },
  {
    icon: CompareGlyph,
    title: "Ntina checks the match",
    body: "Ntina compares that transcript with the known target, using fuzzy, edit-distance matching.",
  },
  {
    icon: LevelGlyph,
    title: "A level is estimated",
    body: "It estimates one of five reading levels: beginner, letter/syllable, word, paragraph, or story.",
  },
  {
    icon: PersonGlyph,
    title: "A person confirms",
    body: "A human facilitator confirms the result before it counts.",
  },
  {
    icon: NotebookGlyph,
    title: "Practice and a record",
    body: "The tutor gives practice prompts suited to that level and produces a monitoring record.",
  },
]

function WorkflowStep({ step, index }) {
  const Icon = step.icon
  return (
    <div className="flex flex-col items-center text-center gap-2 bg-white rounded-xl p-4 shadow-sm h-full">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-forest text-white">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-gray-400 text-xs font-semibold">Step {index + 1}</p>
      <p className="text-forest font-bold">{step.title}</p>
      <p className="text-gray-600 text-sm">{step.body}</p>
    </div>
  )
}

function CTAButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl bg-gold px-8 py-4 text-lg font-extrabold text-forest-dark shadow-lg hover:bg-gold-light transition-colors"
    >
      {children}
    </button>
  )
}

function SectionHeading({ children }) {
  return <h2 className="text-forest text-2xl sm:text-3xl font-extrabold text-center">{children}</h2>
}

function LandingPage({ pair, onPairChange, onStart }) {
  return (
    <div className="min-h-dvh bg-cream flex flex-col items-center">
      <header className="w-full max-w-5xl px-6 pt-8">
        <p className="text-forest text-xl font-extrabold">Ntina</p>
      </header>

      {/* Hero */}
      <section className="w-full max-w-5xl px-6 py-12 grid gap-10 sm:grid-cols-2 items-center">
        <div className="flex flex-col gap-5 text-center sm:text-left">
          <div>
            <h1 className="text-forest text-4xl font-extrabold leading-tight">Ntina</h1>
            <p className="text-gray-600 text-lg mt-2 opacity-90">
              A code-switched voice tutor that helps children learn to read in their own language.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            {LANGUAGE_PAIRS.map((lp) => (
              <LanguagePairOption
                key={lp.pair}
                from={lp.from}
                to={lp.to}
                selected={pair === lp.pair}
                onSelect={() => onPairChange(lp.pair)}
              />
            ))}
          </div>
          <p className="text-gray-500 text-sm">
            Adding a new language pair is a config file, not a code change.
          </p>
          <div className="flex justify-center sm:justify-start">
            <CTAButton onClick={onStart}>Try it now →</CTAButton>
          </div>
        </div>
        <HeroPhoneMockup />
      </section>

      {/* The problem */}
      <section className="w-full max-w-3xl px-6 py-10 flex flex-col gap-6 items-center text-center">
        <SectionHeading>The problem</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-1 w-full">
          <p className="text-gray-700 bg-white rounded-xl p-4 shadow-sm">
            More than half of Grade 2 students in resource-limited countries cannot read a single word of a
            short text.
          </p>
          <p className="text-gray-700 bg-white rounded-xl p-4 shadow-sm">
            Every child has to be assessed one on one to find their reading level, then reassessed every few
            weeks.
          </p>
          <p className="text-gray-700 bg-white rounded-xl p-4 shadow-sm">
            None of that assessment works if the child does not speak the language of instruction.
          </p>
        </div>
        <p className="text-gray-600">
          Teaching at the Right Level works. It groups children by measured level, not age, and the evidence
          for it is strong. But the assessment itself is slow, needs trained staff, has to be rebuilt for
          every local language, and has to be redone again and again. That labor is the real cost.
        </p>
      </section>

      {/* What TaRL actually is */}
      <section className="w-full max-w-3xl px-6 py-10 flex flex-col gap-6 items-center text-center bg-white rounded-3xl shadow-sm my-6">
        <SectionHeading>What TaRL actually is</SectionHeading>
        <p className="text-gray-600">
          Before a teacher can teach a child, they first have to find out what that child can actually do. An
          assessor sits one on one with a single child and works up a ladder of difficulty: can you read this
          syllable? This word? This paragraph? This story? The child stops at whichever rung they can't clear,
          and that rung becomes their level. Children are then grouped by level, not by age or grade, and
          taught at exactly that level.
        </p>

        <LevelLadder />

        <p className="text-gray-600 text-left sm:text-center">
          The instrument can't just be translated from English. The syllable set is chosen from what's
          frequent and unambiguous in that specific language, and the word list has to be words a six-year-old
          speaker of that language already knows. Translate an English list word for word and you get items
          selected for English frequency, which measures nothing about a Swahili or Yoruba reader. That's why
          linguists author each instrument natively, one language at a time, rather than translating a single
          master list.
        </p>
      </section>

      {/* How Ntina works */}
      <section className="w-full max-w-4xl px-6 py-10 flex flex-col gap-6 items-center">
        <SectionHeading>How Ntina works</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
          {WORKFLOW_STEPS.map((step, i) => (
            <WorkflowStep key={step.title} step={step} index={i} />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 w-full">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-forest font-bold mb-1">Code-switching is the point</p>
            <p className="text-gray-600 text-sm">
              Real classrooms mix the local language with English, especially for numbers and school words.
              But the reading test itself is monolingual: a child assessed on Swahili reads Swahili, start to
              finish. The code-switching lives in what the tutor says around the test, in its instructions,
              praise, hints, corrections, and level transitions, not in the passage being read.
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-forest font-bold mb-1">Offline by design</p>
            <p className="text-gray-600 text-sm">
              One shared Android phone per learning camp is enough. No stable internet connection required.
            </p>
          </div>
        </div>
      </section>

      {/* The two datasets */}
      <section className="w-full max-w-3xl px-6 py-10 flex flex-col gap-6 items-center">
        <SectionHeading>The two datasets</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2 w-full">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-forest font-bold mb-2">Text dataset</p>
            <p className="text-gray-600 text-sm">
              Powers the tutor itself: the reading instrument for each language, plus the code-switched
              scaffolding the tutor speaks around it, annotated for language tag, switch type, borrowing
              versus switch, TaRL level, and pedagogical function.
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-forest font-bold mb-2">Audio dataset</p>
            <p className="text-gray-600 text-sm">
              Powers the benchmark: recorded code-switched speech with metadata for language pair, accent,
              country, device, and noise condition.
            </p>
          </div>
        </div>
      </section>

      <footer className="w-full max-w-5xl px-6 py-12 flex flex-col items-center gap-4 text-center">
        <CTAButton onClick={onStart}>Try it now →</CTAButton>
        <p className="text-gray-500 text-sm max-w-md">
          Live demo, uses real speech recognition, so a result can take a little while. That's part of showing
          the real thing, not a shortcut.
        </p>
      </footer>
    </div>
  )
}

export default LandingPage
