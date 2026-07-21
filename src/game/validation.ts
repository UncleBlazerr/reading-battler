// Deterministic find-the-word validation — the testable core of the mechanic.
//
// Decoupled from Phaser/UI on purpose (PRD §10 step 3, ADR 0003). No LLM, no
// randomness: given a prompt and the word a child tapped, the outcome is a pure
// function of the content data.

import type { FindWordPrompt } from "../content/types";

export type TapResult = "correct" | "wrong";

export interface TapOutcome {
  result: TapResult;
  /** Damage dealt by THIS tap (0 unless correct). */
  damage: number;
  /** True once every target word for the prompt has been found. */
  complete: boolean;
  foundCount: number;
  totalCount: number;
}

/** Case-insensitive, whitespace-trimmed word comparison. */
export function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}

/**
 * Tracks progress through a single find-the-word prompt.
 *
 * A prompt may ask for multiple words (e.g. "find both words that say the").
 * Correct taps accumulate; damage is dealt incrementally so each hit feels
 * responsive, and the running total always lands exactly on `prompt.damage`.
 *
 * Wrong taps deal no damage and never fail the run — the caller treats a wrong
 * tap as a soft fail (enemy takes a harmless turn) and lets the child retry.
 */
export class PromptTracker {
  private readonly remaining: string[];
  private readonly total: number;
  private awarded = 0;
  private foundCount = 0;

  constructor(private readonly prompt: FindWordPrompt) {
    if (prompt.targetWords.length === 0) {
      throw new Error("FindWordPrompt must have at least one target word");
    }
    this.remaining = prompt.targetWords.map(normalizeWord);
    this.total = prompt.targetWords.length;
  }

  get isComplete(): boolean {
    return this.remaining.length === 0;
  }

  /** Register a tap on the given word. Returns what happened. */
  registerTap(tappedWord: string): TapOutcome {
    const word = normalizeWord(tappedWord);
    const idx = this.remaining.indexOf(word);

    if (idx === -1) {
      // Not an outstanding target — wrong tap (soft fail).
      return {
        result: "wrong",
        damage: 0,
        complete: this.isComplete,
        foundCount: this.foundCount,
        totalCount: this.total,
      };
    }

    this.remaining.splice(idx, 1);
    this.foundCount += 1;

    // Distribute the prompt's damage across its targets so the cumulative
    // total is exactly prompt.damage regardless of rounding.
    const cumulative = Math.round((this.prompt.damage * this.foundCount) / this.total);
    const damage = cumulative - this.awarded;
    this.awarded = cumulative;

    return {
      result: "correct",
      damage,
      complete: this.isComplete,
      foundCount: this.foundCount,
      totalCount: this.total,
    };
  }
}

/**
 * Builds the spoken instruction for a prompt (TTS) when content doesn't override
 * it. The target word is spoken aloud.
 */
export function spokenInstructionFor(prompt: FindWordPrompt): string {
  if (prompt.spokenPrompt) return prompt.spokenPrompt;
  const word = prompt.targetWords[0];
  return `Find the word ${word}`;
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Builds the on-screen quest banner, which DOES show the target word as text so
 * the objective is always clear (ADR 0003, revised 2026-07-20). Example:
 * `Quest: Find the word "Dog"!`
 */
export function questBannerFor(prompt: FindWordPrompt): string {
  const words = prompt.targetWords;
  if (words.length === 1) {
    return `Quest: Find the word "${capitalize(words[0])}"!`;
  }
  const unique = [...new Set(words.map(normalizeWord))];
  if (unique.length === 1) {
    return `Quest: Find both words that say "${unique[0]}"!`;
  }
  return `Quest: Find ${words.map((w) => `"${capitalize(w)}"`).join(" and ")}!`;
}
