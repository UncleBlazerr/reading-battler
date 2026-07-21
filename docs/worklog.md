# Work Log

A running, session-by-session record of what was built, what's left, and what's
next — so any agent or person can pick up cold. Newest entry first. Architectural
decisions live in `docs/adr/`, not here.

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
