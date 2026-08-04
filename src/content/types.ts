// Content data model for iteration 1 (find-the-word battles).
//
// This is intentionally a small subset of the full PRD data model. It only
// covers what the "find the word" mechanic needs. Future iterations will add
// SpellingCardSet, ComprehensionQuestion, Level, etc. Keeping content as plain
// JSON (not hardcoded) means an offline, LLM-assisted authoring tool can emit
// it later — see ADR 0002 (no runtime LLM).

/** A cosmetic-only attack element. Damage is never affected by the choice. */
export type Element = "fire" | "lightning" | "ice" | "energy";

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

/** Shared enemy shape for every battle kind. */
export interface BattleEnemy {
  name: string;
  maxHp: number;
}

export interface FindWordBattle {
  /** Discriminator for the battle kind (see `Battle`). */
  kind: "find";
  id: string;
  title: string;
  /** The enemy the child is fighting. */
  enemy: BattleEnemy;
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

/**
 * One word the child must spell by dragging grapheme tiles into ordered slots.
 * `tiles` is the correct spelling *segmented into graphemes* — single letters
 * (`["d","o","g"]`) or compound sounds (`["ch","e","ss"]`, `["k","i","ng"]`).
 * `distractors` are extra wrong tiles mixed into the tray; the child must pick
 * the correct ones. The board is solved when every slot holds the right
 * grapheme in order.
 */
export interface SpellWordPrompt {
  word: string;
  tiles: string[];
  distractors: string[];
  /** Damage dealt when the word is spelled correctly. */
  damage: number;
}

export interface SpellBattle {
  kind: "spell";
  id: string;
  title: string;
  enemy: BattleEnemy;
  /** Ordered list of words to spell this battle. */
  words: SpellWordPrompt[];
  difficultyTier: number;
}

/** Any battle the ladder can hand to the BattleScene. */
export type Battle = FindWordBattle | SpellBattle;
