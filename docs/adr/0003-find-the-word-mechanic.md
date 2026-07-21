# ADR 0003 — "Find the word" as the core reading-validation mechanic

**Status:** Accepted — 2026-07-20
**Related:** PRD §2.2 (sentence construction), §2.5 (comprehension)

## Context

The PRD's primary mechanic is sentence *construction* (drag word cards into
order). That mechanic has a validity hole for proving reading: a child can solve
it by trial-and-error, card-shape matching, or position memory — without
decoding any word. We needed a single-battle mechanic that actually correlates
with reading, is deterministic, needs no typing/ASR, and is fun.

## Decision

The core mechanic is **"Find the word"**: a full sentence is shown; the child is
asked (via spoken audio) to **tap** a specific word. Correct tap = damage.

Supporting rules:

- **The target word is delivered as audio, never shown as on-screen text.**
  Showing it would reduce the task to shape-matching. It auto-plays once when the
  prompt appears, with a replay button the child controls.
- A **picture-icon assist** is a per-challenge toggle, **default off**.
- **Validation is deterministic** (see `src/game/validation.ts`): normalize and
  compare the tapped word to the prompt's target words. No LLM (ADR 0002).
- **Soft fail:** a wrong tap deals no damage and never costs player health — the
  enemy just takes a harmless turn. The child retries freely.
- Prompts may target **multiple words** for bonus damage; damage is dealt
  incrementally per correct tap and always sums exactly to the prompt's value.
- The **element** (fire/lightning/ice) of the attack is purely cosmetic and does
  **not** affect damage — this intentionally overrides PRD §2.4, which tied
  fireball/spark to full/partial correctness.

## Rationale

Tapping the correct word among its neighbors requires decoding; the other words
in the sentence are the distractors. It needs no typing or speech, works for
tiny hands, and maps cleanly onto a satisfying attack.

## Consequences

- Spelling and the comprehension boss (also deterministic, closed-set) become
  later rungs that reuse the same validation approach.
- Content schema for this mechanic is a small subset of the full PRD data model;
  see `src/content/types.ts`.

## Update — 2026-07-20: show the target word on screen

The original decision hid the target word (audio-only) to force pure decoding.
In practice, for pre-readers, an unclear TTS voice plus no on-screen objective
made it hard to know what to find. **Revised:** the objective is now also shown
as an on-screen quest banner, e.g. `Quest: Find the word "Dog"!`
(`questBannerFor` in `src/game/validation.ts`).

- **Trade-off, accepted:** showing the word lets a child solve by matching the
  banner word to the identical sentence word (word-matching) rather than pure
  phonetic decoding. Word-matching is still a legitimate early-literacy skill,
  and clarity/accessibility for ages 4-6 was judged more important than strict
  decoding validation at this stage.
- The word is still **spoken aloud** (auto-play once + replay button), now slower
  and with the target word repeated, so the audio channel still teaches
  pronunciation.
- Revisit if playtesting shows kids ignore the words and only pattern-match; a
  future "hard mode" could hide the banner to restore the decoding challenge.
