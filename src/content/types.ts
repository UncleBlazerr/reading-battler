// Content data model for iteration 1 (find-the-word battles).
//
// This is intentionally a small subset of the full PRD data model. It only
// covers what the "find the word" mechanic needs. Future iterations will add
// SpellingCardSet, ComprehensionQuestion, Level, etc. Keeping content as plain
// JSON (not hardcoded) means an offline, LLM-assisted authoring tool can emit
// it later — see ADR 0002 (no runtime LLM).

/** A cosmetic-only attack element. Damage is never affected by the choice. */
export type Element = "fire" | "lightning" | "ice";

/** One turn of a find-the-word battle: the child must tap `targetWords`. */
export interface FindWordPrompt {
  /** Words (from the sentence) the child must tap this turn. */
  targetWords: string[];
  /** Base damage dealt when every target word is found correctly. */
  damage: number;
  /**
   * Optional spoken instruction override. When omitted, the UI generates a
   * default like `Find the word "dog"` for TTS. The target word itself is
   * NEVER rendered as on-screen text (see ADR 0003 / grilling session).
   */
  spokenPrompt?: string;
}

export interface FindWordBattle {
  id: string;
  title: string;
  /** The enemy the child is fighting. */
  enemy: {
    name: string;
    maxHp: number;
  };
  /**
   * The sentence, tokenized into the words shown on screen. Word cards are
   * rendered in this order; the child taps the correct one. The other words
   * act as the distractors (Tier 1: no extra distractors).
   */
  sentenceWords: string[];
  /** Ordered list of find-the-word turns. */
  prompts: FindWordPrompt[];
  difficultyTier: number;
}
