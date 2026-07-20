# ADR 0001 — Web stack (Phaser 3 + TypeScript + Vite), not Unity

**Status:** Accepted — 2026-07-20
**Supersedes:** PRD assumption of "Unity, built via Unity MCP-driven scaffolding"

## Context

The PRD assumes Unity scaffolded via Unity MCP. The project's actual goals
(stated at kickoff) are: cost-efficient/free tooling, Undertale-like tone with
deliberately simple art, tight "baby-steps" iteration, and showing a working
example early rather than one-shotting the whole game.

## Decision

Build the game as a **web game: Phaser 3 + TypeScript, bundled with Vite.**

## Rationale

- **In-session verifiability.** A web build can be launched and driven
  (including headless via Playwright) so changes are verified before hand-off.
  Unity requires the Editor open + MCP bridge + manual builds — far slower for
  the "show a working example" goal.
- **Free and zero-install for players.** Runs in any browser, including a
  tablet browser (the true target device).
- **Undertale-simple 2D art is native** to a 2D web engine; Phaser handles
  sprites, tweened attack effects, particles, and drag/tap input.
- **Touch works from day one** — Phaser treats touch and mouse uniformly.

## Consequences

- PRD §10's Unity-specific steps (ScriptableObjects, etc.) are translated to
  JSON-driven content — simpler, and authorable by an offline tool later.
- Voice/ASR (PRD §5.2) will use web platform APIs when that optional layer is
  built; deferred, so it does not affect this decision.
- Chosen for "the first iteration" — revisitable if the project outgrows the web
  stack, but nothing in the current roadmap requires Unity.
