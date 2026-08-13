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
