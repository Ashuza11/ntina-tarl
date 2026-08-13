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

## Conventions

- `_specs/` — write a short spec (see `_specs/template.md`) before building a
  non-trivial feature. `_plans/` holds plans derived from a spec.
- `web/src/components/` — one folder per component (see that folder's
  README). Tests mirror it under `web/tests/components/`.
- `/commit-message` — Claude Code slash command that drafts a commit message
  from staged changes.

Build order is MVP-first: get record → constrained score → level assignment
→ facilitator confirmation working end-to-end before offline sync, PWA
install, or low-data mode.
