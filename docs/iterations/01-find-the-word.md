# Iteration 1 — "Find the word" battle (proof of concept)

**Goal:** Prove the core loop — *correct reading = damage* — feels like a game,
with the smallest possible surface area. One enemy, one sentence.

This spec was agreed in a grilling session before any code was written. See the
ADRs for the load-bearing decisions.

## Scope (in)

- **One self-contained battle.** Enemy "Word Goblin", 100 HP.
- **Mechanic:** "Find the word" (ADR 0003). Sentence shown; child is asked via
  **spoken audio** to tap a word. Correct tap → attack → damage.
- **Prompt audio:** auto-plays once on appearance; replay button (🔊) thereafter.
  Target word is **never** shown as text. Picture assist toggle defaults off
  (not surfaced in the UI yet — see remaining work).
- **Combat pacing:** HP pool drained over ~5 prompts; a final bonus prompt asks
  for **two** words for extra damage. Damage driven purely by correctness.
- **Soft fail:** wrong tap = no damage, no health loss, enemy does a harmless
  wobble; child retries freely.
- **Juice:** fire/lightning/ice **particle** attacks (cosmetic only), screen
  shake, floating damage numbers, enemy hurt/defeat, confetti win. Element is
  player-selected on the start screen; **auto-rotates** if "Auto" is chosen.
- **Content sentence:** *"The big dog ran to the park."* (Tier 1.)

## Scope (out — later rungs)

Spelling battles · comprehension boss · difficulty tiers · cosmetics/currency ·
voice/ASR · real sprite art · recorded voiceover · GitHub Pages deploy.

## Stack

Phaser 3 + TypeScript + Vite (ADR 0001). No runtime LLM (ADR 0002). Content is
JSON (`src/content/battle-01.json`).

## How to run

```
npm install
npm run dev      # open the printed localhost URL
npm test         # deterministic validation unit tests
npm run build    # typecheck + production build
```
