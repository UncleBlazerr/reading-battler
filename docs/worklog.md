# Work Log

A running, session-by-session record of what was built, what's left, and what's
next — so any agent or person can pick up cold. Newest entry first. Architectural
decisions live in `docs/adr/`, not here.

---

## 2026-08-03 — Iteration 9: "Spell the word" quest type

**Status: complete and verified.**

### What shipped

- **Second quest type — spell-the-word (ADR 0005).** The child drags grapheme
  tiles into ordered slots to spell a word; a correct spelling makes the hero
  cast a spell that damages the enemy. Tiles are **graphemes**, single letters
  or compound sounds (`ch e ss`, `k i ng`), and the tray mixes them with
  **confusable distractors** (sh↔ch↔th, ng↔nk, ss↔s). Free placement; judged when
  full — all-correct casts, otherwise wrong tiles flash and pop back (soft fail,
  no penalty). Drag-and-drop, no typing.
- **Alternation + difficulty scaling.** `battleKindForLevel` alternates find
  (odd) / spell (even); level 1 stays find (baked audio). `difficultyTierForLevel`
  now scales **both** quest types: harder spell words + more distractors (and 2
  words at higher tiers), and longer find sentences (sentences are tier-tagged).
- **Content:** `src/content/spellwords.ts` (word → grapheme segmentation + tier +
  `distractorsFor`), tier tags on `sentences.ts`, `types.ts` now has a
  `kind: "find" | "spell"` discriminated `Battle` union, and `ladder.buildLevel`
  returns either kind.
- **Validation core:** `src/game/spelling.ts` — pure `SpellBoard`
  (place/clear/evaluate/isSolved), fully decoupled from Phaser. Deterministic,
  no LLM (ADR 0002).
- **BattleScene** now branches on `battle.kind`. Extracted a shared `castAttack`
  used by both modes; added the spell UI (slots in the clear lane between the
  combatants, seeded-shuffled draggable tiles in the tray, drop/validate). Find
  mode is unchanged.
- `tsconfig`: enabled `allowImportingTsExtensions` + `noEmit` so a runtime import
  (`spelling.ts` → `validation.ts`) resolves under the Node test runner.

### Verified

Typecheck + build clean · **22/22 tests** (6 new spelling tests: order, distractors,
duplicates, case-insensitivity, bounds, distractor quality) · a spell-battle
composite at the real constants confirms the slots sit in the clear lane (clear
of both combatants and the HP bar) and the tray shows correct graphemes +
confusable decoys. Drag interaction itself still wants an on-device playtest.

### Refinements (same day)

- **Drag grab fixed.** Tiles now grab exactly under the finger: the pointer→tile
  offset is captured on `dragstart` and applied on `drag` (was snapping/off-centre).
  Hit area is also padded for easier fingertip grabs.
- **Gentler, richer word ramp.** Expanded `spellwords.ts` so difficulty steps up
  one idea at a time (CVC → one digraph → a blend or a vowel team like
  boat/bring → blend + vowel team), added vowel-team confusable distractors, and
  confirmed via tests that `buildLevel` runs cleanly through level 25 with tiers
  never jumping by more than one — i.e. the ladder never actually "stopped" at
  level 2; the level-2 spell battle was just hard to finish before the drag fix.
- **Praise is now visual, not spoken.** Removed the "Correct!" voice clip; each
  correct answer pops a big, bright, wiggling praise word (GREAT!/WOW!/…) with a
  confetti sparkle (`BattleScene.celebrate`).
- **Fixed the ladder hanging after level 2.** `TransitionScene.advanced` (the
  guard that starts the next battle once) was set on the first transition and
  never reset — Phaser reuses the scene instance, so the *second* transition
  (level 2→3) saw `advanced === true` and never started the next battle,
  freezing on the loading screen. Now reset in `create()`. Root-caused by
  driving the real game in-browser (Claude-in-Chrome).
- Added ladder progression tests (alternation, gentle tier ramp, damage sums,
  no repeated spell words) — **26/26 tests**. Enabled `with { type: "json" }` on
  the ladder's content import so it's reachable from the Node test runner.

### Still open

Picture-assist toggle · tablet/drag playtest · grow the spell-word + sentence
pools · optional "hard mode" that hides the target word · revisit slot layout so
words longer than ~6 tiles fit.

---

## 2026-08-03 — Iteration 8: Castle room backgrounds + transitions

**Status: complete and verified.**

### What shipped

- **Every level is a different castle room.** Replaced the flat dark battle
  background with original pixel-art rooms that change each level, giving a
  sense of climbing through a castle. Six regular rooms cycle (Gatehouse, Great
  Hall, Library, Dungeon, Tower Stair, Chapel) with a **boss lair (Throne Room)**
  on every 10th level. `src/content/rooms.ts` (`roomForLevel`).
- **"Different wing" feel as you climb.** A per-10-level `depthTintForLevel`
  multiply-tints the whole room so a second pass through the same rooms reads as
  a deeper, differently-lit part of the castle rather than a repeat.
- **Transition/loading screen between rooms.** New `TransitionScene`: on win →
  "▶ Level N" now routes through a short starfield-castle loading screen naming
  the next room (boss levels get a colder, red treatment), with a loading bar;
  tap to skip. Then the next battle starts.
- **Background generator** `tools/gen-backgrounds.py` (Python/Pillow), mirroring
  the sprite generator: draws each room at 240×160 native from shared castle
  primitives (brick wall, arch window, torch glow, floor-with-perspective,
  vignette, stars…) and nearest-upscales ×4 to 960×640. The lower-centre "stage"
  is kept calm/dark on purpose so combatants, HP bar, banner and cards stay
  readable. Rooms/attribution in `public/assets/bg/` (original CC0).
- BattleScene draws the room at depth −100 with the wing tint, plus soft contact
  shadows under each combatant; the old code-drawn ground strip/line is gone.

### Verified

Build + typecheck · 16/16 tests · full-battle composites over Gatehouse/Library/
Chapel/Throne at the real BattleScene constants confirm the UI stays readable
over the busy walls (sticker outlines + contact shadows carry the sprites) and
the boss lair reads as a set-piece. On-device browser playtest still worth doing.

### Note / fix

`PIL.ImageDraw` in `"RGBA"` mode *replaces* pixels instead of alpha-blending, so
the first pass' translucent overlays/glows painted solid (and the full-screen
transition dim turned the whole screen black). Fixed by compositing every
translucent effect through its own layer (`BG._acomp`).

### Still open

Picture-assist toggle · tablet playtest · more rooms/boss lairs to lengthen the
unique climb · optional parallax/animated torches · reposition HP bar so bosses
can grow taller.

---

## 2026-08-03 — Iteration 7: Endless enemy ladder + roster expansion

**Status: complete and verified.**

### What shipped

- **Endless ladder progression (ADR 0004).** The game is now a climb: every win
  advances to the next level with a **new enemy and a new quest**, forever
  (no lose state; wrong taps are still soft fails). `level` lives in the Phaser
  registry; StartScene resets it to 1, `win()` bumps it and restarts the battle
  ("▶ Level N" button) instead of returning to Start. A "Level N" badge (👑 on
  boss levels) shows the climb.
- **Content system (`src/content/`).** `enemies.ts` (roster of visual
  `EnemyDef`s + `enemyForLevel`, bosses every 10th via `isBossLevel`),
  `sentences.ts` (early-reader sentence pool), `ladder.ts` (`buildLevel` ties
  enemy + sentence into a `FindWordBattle`; HP scales with level;
  `distributePrompts` makes the enemy die exactly on the last word). Level 1 is
  special-cased to `battle-01.json` so its baked voice clips still match; levels
  2+ use TTS. Deterministic, no runtime LLM (ADR 0002).
- **Three new original enemies + first boss**, authored in `gen-sprites.py` per
  the `character-art` skill's variety rules — deliberately distinct silhouettes/
  archetypes/palettes, **no re-skins**:
  - **Ink Wraith** — floating indigo specter (drippy tendrils, angry glowing eyes).
  - **Bookworm Beetle** — squat wide chitin bug (shell + rune, mandibles, legs).
  - **Grimoire Golem (Level 10 boss)** — hulking stone guardian built around a
    spellbook with a glowing arcane core, crown, and orbiting rune glyphs;
    biggest/bulkiest on screen.
- BootScene preloads the whole roster; BattleScene renders the level's enemy at
  its per-`EnemyDef` scale (hurt tint/wobble, taunt squash, topple all preserved).

### Verified

Build + typecheck · **16/16 tests** (added 4 ladder tests: boss cadence, no
adjacent repeats, full-pool cycling) · per-enemy layout composite at the real
BattleScene constants confirms each enemy sits on the ground line, clears the HP
bar (boss top y=150 vs bar bottom 145), and the size ladder reads (boss > hero >
… by mass). On-device browser playtest still worth doing.

### Still open

Picture-assist toggle · tablet playtest · grow the roster/sentence pool (the
ladder cycles once pools are exhausted — more sprites = longer unique climb) ·
reposition the enemy HP bar so bosses can grow taller, not just wider · richer
audio beyond level 1 (baked VO vs TTS).

---

## 2026-08-03 — Iteration 6: Original pixel-art characters

**Status: complete and verified.**

### What shipped

- **Hand-authored pixel-art hero + enemy**, replacing the Kenney toon player and
  the assembled Kenney Monster-Builder blob. New look is chunky "sticker outline"
  pixel art — cute chibi proportions, limited palette, thick pale outline hugging
  the whole silhouette — matching a style the owner asked for from two reference
  sheets. Designs/palettes are our own, not traced from the references.
  - **Hero:** a young "word mage" (auburn hair, plum striped tunic, glowing
    spellbook) — fits the reading-battler theme. Three poses: idle (book at side),
    attack (open book raised, charging), cheer (book hoisted).
  - **Enemy:** the **Word Goblin** — a teal imp with big ears/horns, glowing eyes
    and a fanged grin, in the cool-blue "bad guy" palette.
- **Generator:** `tools/gen-sprites.py` (Python/Pillow) draws each sprite at low
  native resolution, auto-adds the 1px silhouette outline, and nearest-upscales
  ×8. Re-run it to tweak the art. Outputs to `public/assets/{player,enemy}/`.
- **Engine wiring:** `pixelArt: true` added to the Phaser config so the chunky
  edges stay crisp under FIT scaling. Enemy is now a single image (idle bob, hurt
  tint/wobble, win topple all preserved). Removed the orphaned
  `public/assets/monster/` pack; refreshed asset LICENSE notes (the old player
  art was Kenney's — the new art is original CC0).

### Verified

Build + typecheck · 12/12 tests · a layout composite rendered at the exact
BattleScene constants confirms both combatants stand on the ground line, face
off, clear the HP bar/banner, and read well against the dark stage. On-device
browser playtest still worth doing.

### Still open

Picture-assist toggle · tablet playtest · then Level + comprehension boss.
Expand the roster (more enemies / hero variants) using the same generator once
the style is signed off.

---

## 2026-07-20 — Iteration 5: Side-view battle with a player character

**Status: complete and verified.**

### What shipped

- **Player character.** Added a hero (Kenney Toon Characters — Male Adventurer,
  CC0) on the **left**, facing the boss on the **right**, standing on a ground
  line — a proper 1-v-1 battle view. `public/assets/player/{idle,attack,cheer}.png`.
- **Layout reflow:** enemy moved from center to the right; enemy HP bar now sits
  above the enemy; quest banner + progress moved to the top; a dark "stage"
  strip + ground line anchor the two combatants.
- **Projectiles leave the originator.** Attacks now launch from the player's
  cast point (left) toward the enemy (right), instead of from the tapped card.
- **Player poses react:** attack pose on cast (reverts to idle), cheer pose on win.

### Verified

Build + typecheck · 12/12 tests · headless playthrough clean · screenshots
confirm the side-view layout, HP drain, multi-word bonus prompt, and win flow.

### Still open

Picture-assist toggle · tablet playtest · then Level + comprehension boss.

---

## 2026-07-20 — Iteration 4: Male-voice word reading

**Status: complete and verified.**

### What shipped

- **Male voice reads the words.** Pre-baked one audio clip per prompt using the
  Windows "Microsoft David" (Male) voice via `tools/gen-voice.ps1` (reads the
  battle JSON, synthesizes `public/audio/voice/pN.mp3`). `speakPrompt` plays the
  baked clip; browser TTS remains the fallback if a clip is missing.
  - **Why baked, not the Kenney voiceover pack:** that pack is a fixed phrase
    set (numbers, "correct", "you win", war callouts) with **no vocabulary
    words**, so it cannot read "dog"/"big"/etc. Baked David audio also plays
    consistently on iPad (no device-TTS dependency).
- **Kenney male callouts (CC0)** used where they fit: **"Correct!"** on each
  completed prompt, **"You win!"** on victory.

### Verified

Build + typecheck · 12/12 tests · headless playthrough clean · voice clips serve
(200) and have valid durations (prompt clips ~3–5s, callouts <1s). Audible
pronunciation quality should be confirmed on-device (David is the standard
Windows voice).

### Still open

Picture-assist toggle · tablet playtest (now also confirms the baked VO) ·
then Level + comprehension boss.

---

## 2026-07-20 — Iteration 3: Kenney sprite art (UI + monster)

**Status: complete and verified.**

### What shipped

- **Real monster.** Replaced the code-drawn goblin with a monster assembled from
  the **Kenney Monster Builder Pack** (green body + cute eyes + happy mouth +
  arms/legs, layered in a container). Hurt = red tint + wobble; defeat unchanged.
- **Kenney UI sprites (UI Pack: Adventure).** Word cards are now 9-slice wood
  `button_brown` (cream center, dark-brown bold text — very readable); "found"
  state is a green tint. HP bar sits in a wood `panel_brown` frame. Start-screen
  element chips + PLAY are the same wood buttons (selected = green tint).
- Assets are the **Double (2x)** PNGs for crispness, in `public/assets/{ui,monster}/`
  with each pack's `LICENSE.txt` (CC0). Loaded in `BootScene`.
- Layout fixes: monster scaled/raised so it clears the quest banner; prompt UI
  depth lifted above the enemy; banner given a text stroke for contrast.

### Verified

Build + typecheck pass · 12/12 tests pass · headless playthrough clean ·
screenshots confirm start, battle, multi-word bonus prompt (green found-card,
"1/2 found"), and HP drain.

### Still open

Picture-assist toggle · tablet playtest · then Level + comprehension boss.
Note: the monster's arms read a little like a ring around the body — fine for
now, could refine limb positions later.

---

## 2026-07-20 — Iteration 2: Kenney audio + on-screen objective

**Status: complete and verified.**

### What shipped

- **Real audio (was placeholder).** Swapped procedural WAVs for **Kenney.nl CC0**
  sounds (Interface + Impact packs), converted `.ogg → .mp3` with ffmpeg for
  cross-browser support (**iPad Safari can't play ogg**). Mapping + license in
  `public/audio/CREDITS.md`. Removed `tools/gen-placeholder-audio.mjs`.
- **On-screen quest banner.** The objective now shows the target word as text,
  e.g. `Quest: Find the word "Dog"!` (`questBannerFor` in `validation.ts`, with
  tests). **This revises ADR 0003** (word was previously audio-only to force
  decoding) — trade-off recorded in that ADR.
- **Clearer pronunciation.** TTS slowed (rate 0.8) and now repeats the target
  word; speaker replay button repositions next to the banner each prompt.
- Removed the redundant "Word Goblin" label under the enemy (name is in HP bar).

### Verified

Build + typecheck pass · 12/12 tests pass (added 3 banner tests) · headless
playthrough clean · mp3 assets serve (200) · screenshots confirm layout.

### Still open (unchanged from iteration 1)

Picture-assist toggle (item 2) · tablet playtest (item 3) · then Level + boss.

---

## 2026-07-20 — Iteration 1: "Find the word" battle (PoC)

**Status: complete and verified.**

### What shipped

- **Project scaffold:** Phaser 3 + TypeScript + Vite. `npm run dev/build/test`.
  (ADR 0001.)
- **Content layer:** JSON-driven. `src/content/types.ts` (schema subset for the
  find-the-word mechanic) + `src/content/battle-01.json` ("The big dog ran to
  the park.", Word Goblin, 5 prompts incl. a 2-word bonus prompt).
- **Deterministic validation:** `src/game/validation.ts` — `PromptTracker`
  (per-tap correctness, incremental damage that sums exactly, case-insensitive,
  multi-word prompts, soft-fail on wrong taps). Fully decoupled from UI.
  **9 unit tests, all passing** (`tests/validation.test.ts`, run via the Node
  test runner with `--experimental-transform-types`).
- **Scenes:** `BootScene` (audio preload + particle texture), `StartScene`
  (title + element picker + tap-to-play gesture that unlocks audio), and
  `BattleScene` (the full loop: goblin, HP bar, spoken prompts, word cards, taps,
  attacks, soft-fail, win + replay).
- **Juice:** `src/game/effects.ts` — element projectile + particle burst + screen
  shake + floating damage; confetti on win. `src/game/elements.ts` — fire/
  lightning/ice, cosmetic-only, with auto-rotate. `src/game/speech.ts` — browser
  TTS for prompts (auto-play once + replay button). (ADR 0003.)
- **Audio:** procedural PLACEHOLDER sounds in `public/audio/`, generated by
  `tools/gen-placeholder-audio.mjs`. **These are stand-ins — see remaining work.**

### How it was verified

- `npm run build` (tsc + vite) passes.
- `npm test` — 9/9 validation tests pass.
- Headless Playwright playthrough (software WebGL): no runtime/console errors;
  HP drained correctly across taps; start + battle screens render as intended.

### Known gaps / deferred to next iterations (in rough priority order)

1. **Swap placeholder audio for Kenney.nl CC0 sounds** (Interface/Impact packs).
   Drop files into `public/audio/` with the same names (`fire/lightning/ice/
   impact/wrong/tap/win.wav`, or update keys in `BootScene`/`elements.ts`). This
   was the agreed audio source; placeholders were used only because the pack
   couldn't be cleanly fetched/extracted in the build sandbox.
2. **Picture-assist toggle** is decided (default off) but not yet surfaced in UI.
3. **Human/tablet playtest** — verify on a real touchscreen; the true test.
   Browser TTS voice quality varies by device and may want recorded VO later.
4. **Accessibility** (PRD §8): dyslexia-friendly font option, contrast pass,
   UI narration. Font swap hook noted but not implemented.
5. Minor polish: "Word Goblin" label appears twice (HP text + under enemy);
   prompt/label vertical spacing is a touch tight.

### Test / CI gate

- `npm run verify` = `typecheck` + unit tests.
- `.githooks/pre-commit` runs `verify` and **blocks red commits**; auto-enabled
  on `npm install` via the `prepare` script. Verified red→blocked, green→passes.
- Next: add scene-level/integration coverage (e.g. a headless Playwright smoke
  test in CI) and wire a GitHub Actions workflow when we set up remote CI.

### Suggested next rung

Chain 2-3 find-the-word battles into a **Level**, then add the **comprehension
boss** (pre-authored multiple choice, deterministic — ADR 0002). After that,
the **spelling** battle type (reuses the same validation approach).
