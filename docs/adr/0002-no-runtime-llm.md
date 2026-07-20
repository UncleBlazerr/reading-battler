# ADR 0002 — No LLM at runtime; LLM only for offline authoring

**Status:** Accepted — 2026-07-20
**Related:** PRD §6 (LLM Usage — Explicitly Scoped)

## Context

Reading validation and comprehension grading could in principle be done by a
live LLM. During design we considered using a model to grade free-text answers
against the story. The audience is ages 4-6.

## Decision

**No LLM calls at runtime, ever.** The LLM's only role is **offline,
human-reviewed content authoring** (generating candidate sentences, distractors,
comprehension questions + answer choices, phonetic word sets), which is baked
into JSON content before shipping.

## Rationale

- **Every runtime answer is a small closed set** — tap a word, pick a card,
  order letters. Closed sets are graded deterministically; there is no free text
  for a model to interpret. (A pre-writer can't type a free-text answer anyway.)
- **Cost.** Zero per-play API spend; works fully offline.
- **Child safety.** Nothing a 4-year-old sees is model-generated live; all
  content is human-reviewed at authoring time.
- **Consistency & latency.** No live variability or network waits mid-battle.

## Consequences

- Content lives as plain JSON (see `src/content/`) so an offline authoring tool
  can emit it. The runtime only reads validated data.
- Text-to-speech (browser Web Speech API) is **not** an LLM and is allowed at
  runtime for reading prompts aloud.
- If open-ended *spoken* answers are ever graded, that is the deferred voice/ASR
  risk area (PRD §8) and would get its own ADR — it does not reopen this one.
