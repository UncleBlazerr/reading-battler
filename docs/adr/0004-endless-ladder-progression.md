# ADR 0004 — Endless ladder progression

**Status:** Accepted — 2026-08-03
**Related:** ADR 0002 (no runtime LLM), ADR 0003 (find-the-word mechanic)

## Context

Iterations 1–6 shipped a single battle (`battle-01.json`) that returned to the
start screen on victory. The game needs a sense of climb: the player should
advance level by level, always meeting a **new enemy and a new quest** after each
win, with **bigger "boss" set-pieces every 10th level**. It must stay
deterministic and author-driven (no runtime LLM, ADR 0002), and keep working
offline.

## Decision

Progression is an **endless ladder** keyed by an integer `level` (held in the
Phaser registry). Each win increments it; there is no lose state — a wrong tap is
still only a soft fail (ADR 0003).

A level is assembled deterministically by `src/content/ladder.ts#buildLevel`:

- **Enemy** comes from `src/content/enemies.ts`. A regular pool cycles across the
  non-boss levels so consecutive rungs never repeat a face; `isBossLevel`
  (every 10th) selects from a separate boss pool. Each `EnemyDef` is a visual
  identity only (sprite key + display scale); **HP scales with the level**, so a
  creature can reappear higher up as a tougher fight.
- **Quest** comes from a sentence pool (`src/content/sentences.ts`). Each
  sentence lists the words to find; `distributePrompts` splits the level's HP
  across those words so the enemy dies exactly as the last word is found.
- **Level 1 is special-cased** to the authored `battle-01.json` so its baked
  male-voice clips still match. Levels 2+ use browser-TTS prompts (the existing
  fallback), because baked audio can't exist for procedurally chosen sentences.

Art follows the `character-art` skill: every enemy is an original, visually
distinct sprite (no re-skins), and bosses are bigger/bulkier set-pieces.

## Rationale

- **Deterministic + offline:** picking from finite, hand-authored pools (not
  generating content at runtime) keeps ADR 0002 intact and makes progression
  unit-testable (`tests/ladder.test.ts`).
- **Cohesive but varied:** cycling a curated roster guarantees "a new enemy
  every level" up to the pool size, while the shared art language keeps the game
  looking like one thing.

## Consequences

- The ladder currently **cycles** once the enemy/sentence pools are exhausted —
  the same faces and quests recur (with higher HP) rather than being infinite and
  unique. This is expected: the roster is designed to **grow**. Adding a sprite +
  an `EnemyDef` (and more sentences) lengthens the climb before anything repeats.
- Audio quality drops from level 2 on (TTS vs. baked VO). If this matters,
  future options: bake a wider vocabulary, or record VO for the sentence pool.
- Boss visuals can currently only grow in *mass/width*, because sprite height is
  bounded by the space between the ground line and the enemy HP bar. Truly
  towering bosses would need the HP bar repositioned — deferred.

## Update — 2026-08-03: castle room backgrounds

Progression is now also *environmental*. Each level renders a different castle
room (`src/content/rooms.ts#roomForLevel`): a pool of themed rooms cycles across
regular levels, a boss lair shows on every 10th, and a per-10-level
`depthTintForLevel` shifts the palette so higher floors read as a different wing
rather than a repeat. Between rooms, a short `TransitionScene` (starfield +
distant castle) names the next room, reinforcing "moving further into the
castle." Backgrounds are original CC0 pixel art from `tools/gen-backgrounds.py`,
sharing the same low-native-res-then-upscale approach as the sprites. Same
consequence as the enemy roster: the room set **cycles** once exhausted and is
designed to grow.
