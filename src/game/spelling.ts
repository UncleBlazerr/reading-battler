// Deterministic spell-the-word validation — the testable core of the mechanic.
//
// Decoupled from Phaser/UI (like validation.ts). The child drags grapheme tiles
// into ordered slots; this tracks what's in each slot and reports correctness.
// No randomness, no LLM: the board is a pure function of the target segmentation
// and what's been placed (ADR 0002, ADR 0005).

import { normalizeWord } from "./validation.ts";

/**
 * A row of slots the child fills with grapheme tiles to spell a word. Each slot
 * expects the target grapheme at its position. The board is *solved* when every
 * slot holds the correct grapheme, in order.
 */
export class SpellBoard {
  private readonly target: string[];
  private readonly slots: (string | null)[];

  constructor(target: string[]) {
    if (target.length === 0) throw new Error("SpellBoard needs at least one target tile");
    this.target = target.map(normalizeWord);
    this.slots = target.map(() => null);
  }

  get size(): number {
    return this.target.length;
  }

  /** Put a grapheme in a slot (replacing whatever was there). */
  place(slotIndex: number, grapheme: string): void {
    this.assertIndex(slotIndex);
    this.slots[slotIndex] = normalizeWord(grapheme);
  }

  /** Empty a slot. */
  clear(slotIndex: number): void {
    this.assertIndex(slotIndex);
    this.slots[slotIndex] = null;
  }

  /** The grapheme currently in a slot, or null. */
  at(slotIndex: number): string | null {
    this.assertIndex(slotIndex);
    return this.slots[slotIndex];
  }

  /** Is this slot holding the correct grapheme for its position? */
  isSlotCorrect(slotIndex: number): boolean {
    this.assertIndex(slotIndex);
    return this.slots[slotIndex] === this.target[slotIndex];
  }

  /** Per-slot correctness (used to flash wrong tiles). */
  evaluate(): boolean[] {
    return this.slots.map((g, i) => g === this.target[i]);
  }

  /** Every slot filled (correctly or not)? */
  get isFull(): boolean {
    return this.slots.every((g) => g !== null);
  }

  /** Every slot holds the correct grapheme in order? */
  get isSolved(): boolean {
    return this.slots.every((g, i) => g === this.target[i]);
  }

  private assertIndex(i: number): void {
    if (!Number.isInteger(i) || i < 0 || i >= this.target.length) {
      throw new RangeError(`slot index ${i} out of range 0..${this.target.length - 1}`);
    }
  }
}

/** Convenience pure check: does an ordered placement spell the target? */
export function spellsCorrectly(target: string[], placed: (string | null)[]): boolean {
  if (placed.length !== target.length) return false;
  return target.every((t, i) => placed[i] != null && normalizeWord(placed[i] as string) === normalizeWord(t));
}
