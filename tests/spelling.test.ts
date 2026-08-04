import { test } from "node:test";
import assert from "node:assert/strict";
import { SpellBoard, spellsCorrectly } from "../src/game/spelling.ts";
import { distractorsFor, SPELL_WORDS } from "../src/content/spellwords.ts";

test("board solves only when every slot is the right grapheme in order", () => {
  const b = new SpellBoard(["ch", "e", "ss"]);
  assert.equal(b.size, 3);
  assert.equal(b.isSolved, false);
  b.place(0, "ch");
  b.place(1, "e");
  assert.equal(b.isFull, false);
  b.place(2, "ss");
  assert.equal(b.isFull, true);
  assert.equal(b.isSolved, true);
  assert.deepEqual(b.evaluate(), [true, true, true]);
});

test("right graphemes in the wrong order do not solve", () => {
  const b = new SpellBoard(["sh", "i", "p"]);
  b.place(0, "i");
  b.place(1, "sh");
  b.place(2, "p");
  assert.equal(b.isFull, true);
  assert.equal(b.isSolved, false);
  assert.deepEqual(b.evaluate(), [false, false, true]);
});

test("a distractor tile never satisfies a slot; clearing works", () => {
  const b = new SpellBoard(["k", "i", "ng"]);
  b.place(0, "k");
  b.place(2, "nk"); // confusable distractor
  assert.equal(b.isSlotCorrect(2), false);
  b.clear(2);
  assert.equal(b.at(2), null);
  b.place(2, "ng");
  b.place(1, "i");
  assert.equal(b.isSolved, true);
});

test("matching is case-insensitive", () => {
  assert.equal(spellsCorrectly(["ch", "e", "ss"], ["CH", "E", "SS"]), true);
  assert.equal(spellsCorrectly(["d", "o", "g"], ["d", "o", null]), false);
});

test("out-of-range slot access throws", () => {
  const b = new SpellBoard(["d", "o", "g"]);
  assert.throws(() => b.place(3, "x"));
  assert.throws(() => b.clear(-1));
});

test("distractors are meaningful and never part of the word", () => {
  for (const def of SPELL_WORDS) {
    const d = distractorsFor(def, 3);
    assert.equal(d.length, 3, `${def.word} should get 3 distractors`);
    assert.equal(new Set(d).size, 3, `${def.word} distractors must be unique`);
    for (const g of d) {
      assert.ok(!def.tiles.includes(g), `${def.word}: distractor "${g}" is in the word`);
    }
  }
});
