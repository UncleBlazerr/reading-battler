# Word Quest — a turn-based reading battler for early readers

A browser game where a child's "attacks" are correct reading actions. Built in
baby-steps iterations. This repo currently contains **Iteration 1**: a single
"find the word" battle proof-of-concept.

## Run it

```bash
npm install
npm run dev      # then open the printed localhost URL
```

Pick a magic element, press **Play**, and tap the word the goblin asks for.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server (local, tablet-testable on your LAN IP) |
| `npm run build` | Typecheck (`tsc`) + production build to `dist/` |
| `npm test` | Deterministic validation unit tests (Node test runner) |
| `npm run preview` | Serve the production build locally |

## Where things are

- `src/content/` — JSON content + schema (no runtime LLM; authored offline)
- `src/game/` — validation, elements, effects, speech (UI-decoupled logic)
- `src/scenes/` — Phaser scenes (Boot → Start → Battle)
- `public/audio/` — sound effects (currently placeholders; see work log)
- `tools/` — reproducible asset generators
- `docs/` — see below

## Docs for the next contributor

- **`docs/worklog.md`** — what's done, what's left, what's next (read this first).
- **`docs/iterations/`** — the agreed spec per iteration.
- **`docs/adr/`** — architectural decisions (why web/Phaser, why no runtime LLM,
  why the "find the word" mechanic).
- **`docs/agents/`** — issue-tracker / triage / domain-doc conventions.

## Stack

Phaser 3 · TypeScript · Vite. Free, no runtime services, runs in any browser.
