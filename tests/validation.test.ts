import { test } from "node:test";
import assert from "node:assert/strict";
import { PromptTracker, normalizeWord, spokenInstructionFor } from "../src/game/validation.ts";

test("normalizeWord lowercases and trims", () => {
  assert.equal(normalizeWord("  Dog "), "dog");
  assert.equal(normalizeWord("THE"), "the");
});

test("single-target: correct tap deals full damage and completes", () => {
  const t = new PromptTracker({ targetWords: ["dog"], damage: 20 });
  const out = t.registerTap("dog");
  assert.equal(out.result, "correct");
  assert.equal(out.damage, 20);
  assert.equal(out.complete, true);
});

test("single-target: matching is case-insensitive", () => {
  const t = new PromptTracker({ targetWords: ["the"], damage: 10 });
  const out = t.registerTap("The");
  assert.equal(out.result, "correct");
  assert.equal(out.complete, true);
});

test("wrong tap deals no damage and does not complete", () => {
  const t = new PromptTracker({ targetWords: ["dog"], damage: 20 });
  const out = t.registerTap("park");
  assert.equal(out.result, "wrong");
  assert.equal(out.damage, 0);
  assert.equal(out.complete, false);
});

test("wrong tap does not consume progress; retry still works", () => {
  const t = new PromptTracker({ targetWords: ["dog"], damage: 20 });
  t.registerTap("cat");
  const out = t.registerTap("dog");
  assert.equal(out.result, "correct");
  assert.equal(out.complete, true);
});

test("multi-target: damage accumulates to exactly prompt.damage", () => {
  const t = new PromptTracker({ targetWords: ["The", "the"], damage: 30 });
  const first = t.registerTap("The");
  assert.equal(first.result, "correct");
  assert.equal(first.complete, false);
  const second = t.registerTap("the");
  assert.equal(second.result, "correct");
  assert.equal(second.complete, true);
  assert.equal(first.damage + second.damage, 30);
});

test("multi-target: odd damage still sums exactly (no rounding drift)", () => {
  const t = new PromptTracker({ targetWords: ["a", "b", "c"], damage: 25 });
  const total = ["a", "b", "c"].reduce((sum, w) => sum + t.registerTap(w).damage, 0);
  assert.equal(total, 25);
});

test("empty target list is rejected", () => {
  assert.throws(() => new PromptTracker({ targetWords: [], damage: 10 }));
});

test("spokenInstructionFor uses override when present, else default", () => {
  assert.equal(
    spokenInstructionFor({ targetWords: ["dog"], damage: 20 }),
    "Find the word dog",
  );
  assert.equal(
    spokenInstructionFor({ targetWords: ["The", "the"], damage: 30, spokenPrompt: "Find both words that say the" }),
    "Find both words that say the",
  );
});
