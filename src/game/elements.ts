// Cosmetic attack elements. Per the grilling session, the element is PURELY a
// visual/audio preference — it never changes damage (which is driven only by
// reading correctness). The player picks one, or "auto" rotates through them.

import type { Element } from "../content/types";

export type ElementChoice = Element | "auto";

export interface ElementStyle {
  label: string;
  emoji: string;
  /** Core tint for particles/projectile. */
  color: number;
  /** Lighter accent for flashes. */
  accent: number;
  /** Audio key (loaded in BootScene) for the attack whoosh. */
  sound: string;
}

export const ELEMENTS: Record<Element, ElementStyle> = {
  fire: { label: "Fire", emoji: "🔥", color: 0xff6b35, accent: 0xffd166, sound: "fire" },
  lightning: { label: "Lightning", emoji: "⚡", color: 0xffe14d, accent: 0xffffff, sound: "lightning" },
  ice: { label: "Ice", emoji: "❄️", color: 0x6bd6ff, accent: 0xe3f6ff, sound: "ice" },
};

export const ELEMENT_ORDER: Element[] = ["fire", "lightning", "ice"];

/**
 * Resolves the element to use for a given hit. When the player chose a specific
 * element it's always that; when they chose "auto" it rotates by hit index.
 */
export function resolveElement(choice: ElementChoice, hitIndex: number): Element {
  if (choice === "auto") {
    return ELEMENT_ORDER[hitIndex % ELEMENT_ORDER.length];
  }
  return choice;
}
