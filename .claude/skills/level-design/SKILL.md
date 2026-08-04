---
name: level-design
description: Foundation for designing reading-battler's level ladder — the endless climb of enemies, castle rooms, and reading quests. Covers how a level is assembled (enemy + room + quest), the two quest types (find-the-word, spell-the-word), the gentle difficulty ramp and boss-every-10 cadence, and how to add content (sentences, spell words, enemies, rooms) so the ladder stays cohesive, varied, and deterministic. Use when adding or tuning levels, quests, difficulty, word/sentence pools, or the progression itself.
---

# Level Design

reading-battler is an **endless ladder**: the player climbs level by level, each
a self-contained battle, and every win advances to the next. This skill is the
foundation for that progression — a **data-driven, deterministic** system (no
runtime LLM — ADR 0002), so levels are assembled from small authored pools, not
generated at play time. It pairs with the `character-art` skill, which owns the
*look* of the enemies and rooms this skill *arranges*.

Decisions here are recorded in **ADR 0004** (endless ladder) and **ADR 0005**
(spell-the-word). Read those before changing progression rules.

## The invariants (what makes it "our ladder")

- **Deterministic + offline.** A level is a pure function of its number:
  `buildLevel(level)`. Same level ⇒ same battle. No randomness in outcomes; any
  shuffle (e.g. tile order) is seeded by the level. Content comes from finite,
  hand-authored pools — never generated at runtime.
- **Always forward, never a wall.** Every win advances (`win()` →
  `TransitionScene` → next `Battle`). There is no lose state; wrong answers are
  soft fails (no damage, retry freely) in *both* quest types.
- **Gentle ramp, not exponential.** Difficulty climbs one idea at a time. `dog`
  → `boat`/`bring`, never `dog` → `spaceship`. Tiers step every few levels and
  never jump by more than one (`difficultyTierForLevel`, capped at 4).
- **Bosses every 10th level.** 10, 20, 30… are set-piece fights — a boss enemy
  in a boss room, tankier HP. (`isBossLevel`.)
- **The enemy dies on the last correct answer.** A battle's HP is split across
  its turns so the final correct answer lands the killing blow — the win always
  feels earned, never early or late. (`splitDamage` / `distributePrompts`.)
- **Variety is mandatory** (see `character-art`): consecutive levels never reuse
  the same enemy face or room; pools **cycle** only once exhausted and are
  designed to **grow**.

## Anatomy of a level

`src/content/ladder.ts#buildLevel(level)` returns `{ level, battle, enemy }`.
The room is resolved separately by the scenes. The moving parts:

| Concern            | Function                    | File            |
|--------------------|-----------------------------|-----------------|
| Which enemy        | `enemyForLevel`             | `enemies.ts`    |
| Which room (bg)    | `roomForLevel`              | `rooms.ts`      |
| Per-wing palette   | `depthTintForLevel`         | `rooms.ts`      |
| Quest type         | `battleKindForLevel`        | `ladder.ts`     |
| Difficulty tier    | `difficultyTierForLevel`    | `ladder.ts`     |
| Enemy HP           | `hpForLevel`                | `ladder.ts`     |
| The battle content | `buildFindBattle` / `buildSpellBattle` | `ladder.ts` |

Current cadence: quest type **alternates** — find-the-word on odd levels,
spell-the-word on even (level 1 stays find so its baked voice clips match, and it
uses the authored `battle-01.json`). Tiers: `1 + floor((level-1)/4)`, max 4.
Enemies cycle a regular pool with a boss pool on 10s; rooms cycle a room pool
with a boss-lair on 10s; both drift against the level so enemy/room/quest combos
keep changing.

## The two quest types

Both are pure and unit-tested, fully decoupled from Phaser. `BattleScene`
branches on `battle.kind` and shares one attack beat (`castAttack`) between them.

- **find-the-word** (ADR 0003) — a sentence is shown; the child taps the target
  word. Content: a `SentenceDef { words, find, tier }` from `sentences.ts`; each
  `find` word becomes one turn. Validation: `PromptTracker` in
  `src/game/validation.ts`.
- **spell-the-word** (ADR 0005) — the child drags grapheme tiles into ordered
  slots to spell a word. Content: a `SpellWordDef { word, tiles, tier }` from
  `spellwords.ts`, where `tiles` is the spelling **segmented into graphemes**
  (single letters or compound sounds like `ch`, `ng`, `oa`). Distractors are
  generated from **confusable** graphemes (`distractorsFor`). Validation:
  `SpellBoard` in `src/game/spelling.ts`.

The target word is shown *and* spoken (consistent with ADR 0003's revision); the
challenge is decoding/segmenting among distractors, not recall.

## Adding content (the workflow)

Everything is additive — drop an entry in a pool and the ladder picks it up.
More entries = a longer unique climb before anything repeats.

1. **A find sentence** — add to `SENTENCES` in `sentences.ts`:
   `{ words: [...], find: [...], tier }`. Keep each `find` word appearing exactly
   once in `words` (unambiguous), and match the tier to its reading level.
2. **A spell word** — add to `SPELL_WORDS` in `spellwords.ts`:
   `{ word, tiles, tier }`. Segment `tiles` into real graphemes (`chess` →
   `["ch","e","ss"]`). Keep to ≤6 tiles (tray layout). If it uses a new
   grapheme, add its confusables to `CONFUSABLE` and the pool so distractors stay
   meaningful.
3. **An enemy** — add a sprite + an `EnemyDef` (`enemies.ts`); regulars cycle,
   bosses go in `BOSSES`. Art rules live in `character-art`.
4. **A room** — add a background + a `RoomDef` (`rooms.ts`); regulars cycle,
   boss lairs in `BOSS_ROOMS`. Art rules live in `character-art`.
5. **A boss** — a boss enemy *and* (usually) a boss room; `hpForLevel` already
   makes 10s tankier. Bosses should feel like the coolest thing so far.

Then preload any new texture in `BootScene` and confirm the roster/pool arrays
are exported for it.

## Difficulty philosophy (spell + find alike)

- **One new concept per step.** Tier 1: CVC / single letters. Tier 2: one
  digraph. Tier 3: a blend *or* a simple vowel team. Tier 4: a blend *and* a
  vowel team, or 5–6 tiles. Longer find sentences / more distractors as tiers
  rise; a second spell word at higher tiers.
- **HP scales, mechanics don't get punishing.** More HP just means the child
  answers a bit more; wrong answers never cost anything.
- Tag every new pool entry with the right `tier` — that's the single lever that
  keeps the ramp gentle. `pickByTier` prefers the current tier and falls back to
  easier entries, so lower tiers always have options.

## Wiring & lifecycle gotchas

- `BattleScene.create()` reads `level` from the registry, calls `buildLevel`,
  and branches on `battle.kind`. **Reset all per-level UI state at the top of
  `create()`** — Phaser reuses scene instances across restarts, so stale arrays
  or one-shot guard flags carry over. (This class of bug hung the ladder after
  level 2: `TransitionScene.advanced` wasn't reset in `create()`.)
- `win()` is shared: it advances `level` and routes through `TransitionScene`
  (the world-map node walk — the hero hops from the cleared level's node to the
  new one, climbing toward the tower) to the next battle.
- Only level 1 has baked voice; generated levels use browser TTS (the fallback).

## Verify before calling it done

- `npm run verify` — typecheck + unit tests. Add/extend tests in
  `tests/ladder.test.ts` (progression, alternation, gentle ramp, damage sums,
  no repeats) and `tests/spelling.test.ts` / `tests/validation.test.ts` for
  mechanics.
- Sanity-check a few levels in the real app (`npm run dev`) — or, for a stubborn
  runtime/lifecycle bug, drive the actual game in-browser (Claude-in-Chrome) and
  read the console; the game loop pauses in a hidden tab, so keep it visible.
- Record progression changes in `docs/worklog.md` (newest first) and, for a rule
  change, an ADR.
