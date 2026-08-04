---
name: character-art
description: Foundation for creating varied, never-repeating characters, enemies, and level backgrounds for reading-battler — a shared "sticker pixel-art" language (proportions, palette, outlines, poses, engine wiring) that keeps the game cohesive while every design stays distinct. Covers the ladder progression, the bigger/cooler boss every 10th level, and the castle room backgrounds. Use when adding or editing a hero, enemy, boss, or room/background, when the user asks for a new character/monster/room, or when tuning the look of existing ones.
---

# Character & Enemy Art

The look of every fighter in reading-battler is authored procedurally in
`tools/gen-sprites.py` (Python + Pillow) — no external asset packs. This skill is
a **foundation, not a template.** It defines the shared *language* (a readable
sticker pixel-art look and the technical rules that make sprites drop into the
battle) so the roster feels like one game — while every character stays
genuinely distinct. Treat the current hero (word mage) and the Word Goblin as
*one example* of the style, never as a mould to re-pour.

**Golden rule:** never trace, copy, or lightly edit a third-party sprite, a
reference sheet the owner supplies for inspiration, *or one of our own existing
characters*. Draw from scratch with an original design, silhouette, and palette.
Every sprite ships as original CC0 art.

## Variety is mandatory

This is a ladder-progression game — the player climbs level by level, so they
see a long parade of enemies. **A re-skin is a failure.** Never ship a character
that is another one "but a different colour," or the same body with a swapped
prop. Each new enemy must differ on **at least three** of these axes:

- **Silhouette / body plan** — the single most important one. Vary the outline
  shape: tall vs squat, floating vs standing vs multi-legged, blobby vs spiky vs
  lanky, one big mass vs a cluster, symmetric vs lopsided. A player should be
  able to tell two enemies apart as black silhouettes.
- **Creature archetype** — imp, slime, golem, ghost, bird, bug, plant, machine,
  elemental, undead, beast… Rotate freely; don't do three goblinoids in a row.
- **Feature vocabulary** — horns vs antennae vs fins vs tentacles vs none; one
  big eye vs many vs glowing slits; fanged grin vs beak vs no mouth.
- **Palette family** — shift the whole hue family, not one accent. Keep enemies
  on the cooler/eerier end for the friend-vs-foe read, but range widely within
  it (icy blue, toxic violet, swampy teal, ashen grey-blue, sickly green).
- **Materials & surface** — fur, slime, stone, metal, cloth, chitin, vapour —
  cued by how you shade (hard blocks for stone, drippy edges for slime, soft
  banding for fur).
- **Motif** — since this is a *reading* battler, give enemies word/letter/ink/
  book-monster hooks where it fits, and vary that motif too.

Before drawing, glance at the existing roster (the draw functions in
`gen-sprites.py` and the sprites in `public/assets/enemy/`) and deliberately pick
a lane none of them occupy. If a new idea feels close to an existing one, change
the body plan first.

## The foundation (keep these — they're what make it "our game")

These are the *invariants*. They're about readability and fitting the engine, not
about any one character's design:

- **Chibi, characterful proportions.** Generally a big head and stubby limbs
  reads best at game scale — but this is a starting point, not a straitjacket.
  Bosses and exotic archetypes (a towering golem, a long serpent) can break it
  for effect, as long as they stay readable.
- **Low native resolution, then upscale.** Draw on a small canvas (roughly
  40–64 px per side; bosses may be larger) — that low res *is* the pixel art.
  `gen-sprites.py` nearest-upscales ×8 (`SCALE`) so edges stay chunky.
- **Thick "sticker" outline.** A 1px silhouette outline (auto-added by
  `add_outline`, ~8px after upscale) hugs the whole character so it pops against
  the dark battle stage. Outline colour signals allegiance:
  - **Heroes → warm cream** (`HERO_OUTLINE`).
  - **Enemies → a pale, cool outline** (`GOBLIN_OUTLINE` is one such colour).
    Vary the exact tint per creature/faction; just keep it light and on the cool
    end so it reads as "foe" and pops on the dark stage.
- **Limited palette, flat shading.** ~4–6 hues per character, each with a base +
  one (or two) shadow steps. Shade as flat blocks/bands/patches, not gradients.
  A few bright accent pixels for glints/glow/magic.
- **Friend-vs-foe colour temperature.** Heroes lean warm, enemies lean cool/
  eerie. This is a fast read for young players — vary *within* each temperature
  band, don't cross it.
- **Boss presence.** Any enemy renders visibly larger than the hero at game
  scale; bosses larger still (see below).

## Conventions that make sprites drop into the battle

- **Facing.** Hero faces **right** (features nudged right of centre); enemy faces
  **left**. They square off across the stage.
- **Feet at the bottom edge.** Draw the character standing on the canvas floor;
  the game anchors sprites with `origin (0.5, 1)` on the ground line.
- **Poses.**
  - Hero needs **three**: `idle`, `attack` (weapon/spell raised + a few glow
    pixels, determined face), `cheer` (arms/prop up, big smile). These map to
    `player-idle` / `player-attack` / `player-cheer`.
  - Enemy needs **one**: `idle`. The engine supplies the reactions — red tint +
    angle wobble on a hit, a squash on the taunt, and a topple on defeat — so
    don't bake hurt/death frames.
- **Thematic props over generic weapons.** This is a *reading* battler: the hero
  casts by reading (the current hero wields a glowing spellbook). Keep new
  designs tied to words/reading/magic where it fits.

## Progression & bosses

The game is a ladder: level 1 upward, one enemy per level, difficulty and visual
interest rising as the player climbs. Let the art track the climb:

- **Regular enemies (levels between bosses).** Keep them quick to read and
  cheap to produce, but *never* repetitive — apply the variety rules above.
  Loosely, early levels can feel smaller/goofier and later levels
  meaner/stranger, but every one is a fresh design.
- **Themed runs.** It's fine (and good) to give a stretch of levels a loose
  theme — e.g. an icy run, a haunted run, a machine run — as long as each enemy
  within it is a distinct creature, not a palette swap of its neighbour.
- **Bosses every 10th level (10, 20, 30, …).** These are set-pieces and must be
  the coolest thing on screen so far — each cooler than the last:
  - **Bigger.** Noticeably larger than both regular enemies and the hero; use a
    larger native canvas and/or scale.
  - **Bespoke silhouette.** A one-of-a-kind body plan the player hasn't seen —
    the boss should be recognisable from its outline alone.
  - **More detail budget.** More parts, a richer (still limited) palette with an
    extra shadow/highlight step, layered features (multiple horns/eyes/limbs,
    armour, a crown, trailing effects).
  - **A signature.** One memorable hook — a glowing core, a second head, a
    weapon, an aura of floating letters — that becomes *this* boss's identity.
  - **Escalation.** Each boss should out-cool the previous one, not just re-use
    the last boss's trick at a new hue. If boss N had a glowing core, boss N+10
    does something new.
  - Consider a bespoke defeat/attack beat if the engine supports it later; for
    now the standard tint/wobble/topple still applies to the boss `idle`.

## Level backgrounds (castle rooms)

Backgrounds share the same language and are authored the same way, in
`tools/gen-backgrounds.py` (native 240×160, nearest-upscaled ×4 to the 960×640
battle canvas). The player climbs a castle, so backgrounds carry progression too:

- **One room per level, `roomForLevel` in `src/content/rooms.ts`.** A pool of
  themed stone rooms cycles across regular levels; a **boss lair** shows every
  10th. Apply the same variety rule as enemies — each room a distinct space
  (gatehouse, hall, library, dungeon, tower, chapel, throne…), never a recolour
  of its neighbour.
- **"Moving deeper," not looping.** `depthTintForLevel` multiply-tints the whole
  room per 10-level wing so re-used rooms read as a different part of the castle.
- **Keep the stage readable.** The lower-centre (where the combatants stand and
  the word cards sit) must stay calm and mid-dark; concentrate detail on the
  upper wall and edges. Combatants get sticker outlines + contact shadows to
  separate them from the wall. Floor top = native y108 (= display GROUND 432).
- **Shared primitives** (`BG` class): brick wall, arch window, torch (small soft
  glow), floor-with-perspective, vignette, stars. **Translucent effects must go
  through `BG._acomp`** — `PIL.ImageDraw` in RGBA mode replaces pixels instead of
  blending, so raw alpha fills paint solid.
- **Transitions:** a short `TransitionScene` (starfield + distant castle) plays
  between rooms naming the next one. There's one transition art; new rooms don't
  need their own.
- Boss lairs are set-pieces (grander, a signature glow/throne) — the environment
  echo of the "bosses are cooler" rule.

## Adding a character (workflow)

1. **Palette.** Add a dict of RGBA colours near the top of `gen-sprites.py`
   (see `P` for the hero, `G` for the goblin). Base + `_sh` shadow per material.
2. **Draw function.** Write `def <name>(path):` that builds a `Canvas(w, h)` and
   composes the body from primitives — `rect`, `ell`, `hline`/`vline`, `px`, and
   `cv.d.polygon(...)` for horns/ears/fangs. Draw back-to-front (limbs, then
   body, then face/details). For a multi-pose hero, factor the shared body into a
   `<name>_base()` like `hero_base()` and add per-pose arms/props.
3. **Finish.** Call `finish(cv, <OUTLINE_COLOR>, path)` — it auto-outlines,
   upscales ×8, and saves. Output paths:
   `public/assets/player/<pose>.png` and `public/assets/enemy/<slug>.png`.
4. **Preview.** Add the new file(s) to `preview()` and run
   `python tools/gen-sprites.py`. Open `tools/_sprite-preview.png` (gitignored)
   and iterate until it reads at a glance. Tune blind-drawing by eye — expect a
   few passes.

## Wiring into the game

1. **Load** the texture in `src/scenes/BootScene.ts` (`this.load.image(...)`).
2. **Place** it in `src/scenes/BattleScene.ts`:
   - Hero → `buildPlayer` (`origin(0.5,1)` at `PLAYER`, `PLAYER_SCALE`).
   - Enemy → `buildEnemy` (single image, `origin(0.5,1)` at `(ENEMY.x, GROUND)`,
     `ENEMY_SCALE`; idle-bob tween; the `ENEMY` vector stays the mid-body aim
     point for projectiles/damage numbers).
   - Pick a scale so feet sit on `GROUND` and the top clears the HP bar (~y145)
     and top banner. Boss > hero.
3. `pixelArt: true` is already set in `src/main.ts` — keep it, or the sticker
   edges blur under FIT scaling.

## Attribution

Every character folder carries a `LICENSE.txt` stating the art is **original**,
generated by `tools/gen-sprites.py`, **CC0**, and *not* derived from any
third-party pack. Add/keep one for any new asset folder. If you replace art that
was previously third-party (as we did when swapping out the Kenney player/monster
sprites), update that folder's licence note so it no longer credits the old
source.

## Verify before calling it done

- `python tools/gen-sprites.py` regenerates cleanly; preview sheet looks right.
- `npm run verify` (typecheck + tests) passes.
- Sanity-check placement at real game constants — either run `npm run dev` and
  look, or composite the PNGs at the `BattleScene` coordinates — confirming feet
  on the ground line, boss-vs-hero sizing, and clearance of the HP bar/banner.
- Record the change in `docs/worklog.md` (newest entry first).
