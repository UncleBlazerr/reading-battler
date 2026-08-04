import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REGULAR_ENEMIES,
  enemyForLevel,
  isBossLevel,
} from "../src/content/enemies.ts";

// NOTE: these tests import only enemies.ts (no JSON) so the Node test runner
// doesn't need import attributes. buildLevel/distributePrompts pull in
// battle-01.json and are exercised by the headless playthrough instead.

test("bosses land on every 10th level and nowhere else", () => {
  for (let lvl = 1; lvl <= 40; lvl++) {
    assert.equal(isBossLevel(lvl), lvl % 10 === 0);
    assert.equal(!!enemyForLevel(lvl).isBoss, lvl % 10 === 0);
  }
});

test("level 1 is the Word Goblin", () => {
  assert.equal(enemyForLevel(1).name, "Word Goblin");
});

test("consecutive non-boss levels never show the same enemy", () => {
  // As long as there are 2+ regulars, adjacent regular levels must differ so
  // the player always faces a fresh face on each rung.
  assert.ok(REGULAR_ENEMIES.length >= 2);
  let prev = enemyForLevel(1).key;
  for (let lvl = 2; lvl <= 30; lvl++) {
    if (isBossLevel(lvl) || isBossLevel(lvl - 1)) {
      prev = enemyForLevel(lvl).key;
      continue;
    }
    const cur = enemyForLevel(lvl).key;
    assert.notEqual(cur, prev, `levels ${lvl - 1} and ${lvl} repeat ${cur}`);
    prev = cur;
  }
});

test("the regular pool cycles through every enemy", () => {
  const seen = new Set<string>();
  for (let lvl = 1; lvl <= 30; lvl++) {
    if (!isBossLevel(lvl)) seen.add(enemyForLevel(lvl).key);
  }
  for (const e of REGULAR_ENEMIES) {
    assert.ok(seen.has(e.key), `${e.key} never appeared`);
  }
});

// --- ladder progression (buildLevel) ------------------------------------------
import { buildLevel, battleKindForLevel, difficultyTierForLevel } from "../src/content/ladder.ts";

test("quest type alternates: find on odd levels, spell on even", () => {
  for (let lvl = 1; lvl <= 20; lvl++) {
    assert.equal(battleKindForLevel(lvl), lvl % 2 === 1 ? "find" : "spell");
  }
});

test("difficulty climbs gently (1..4), never jumps by more than a tier", () => {
  let prev = difficultyTierForLevel(1);
  for (let lvl = 1; lvl <= 40; lvl++) {
    const t = difficultyTierForLevel(lvl);
    assert.ok(t >= 1 && t <= 4);
    assert.ok(t - prev <= 1, `tier jumped from ${prev} to ${t} at level ${lvl}`);
    prev = t;
  }
});

test("buildLevel produces a valid battle for many levels (no stop at 2)", () => {
  for (let lvl = 1; lvl <= 25; lvl++) {
    const { battle, enemy } = buildLevel(lvl);
    assert.ok(enemy.key, `level ${lvl} has an enemy`);
    assert.equal(battle.kind, battleKindForLevel(lvl));
    assert.ok(battle.enemy.maxHp > 0);
    if (battle.kind === "spell") {
      assert.ok(battle.words.length >= 1);
      for (const w of battle.words) {
        assert.ok(w.tiles.length >= 2 && w.distractors.length >= 1);
        // total damage of all words equals maxHp (enemy dies exactly)
      }
      const sum = battle.words.reduce((a, w) => a + w.damage, 0);
      assert.equal(sum, battle.enemy.maxHp, `level ${lvl} spell damage sums to maxHp`);
    } else {
      assert.ok(battle.prompts.length >= 1);
      // Generated find battles split HP exactly; level 1 is authored (battle-01)
      // and intentionally over-deals, so only assert the sum for generated ones.
      if (lvl > 1) {
        const sum = battle.prompts.reduce((a, p) => a + p.damage, 0);
        assert.equal(sum, battle.enemy.maxHp, `level ${lvl} find damage sums to maxHp`);
      }
    }
  }
});

test("spell words never spell the same word twice in one battle", () => {
  for (let lvl = 2; lvl <= 40; lvl += 2) {
    const { battle } = buildLevel(lvl);
    if (battle.kind === "spell" && battle.words.length > 1) {
      const uniq = new Set(battle.words.map((w) => w.word));
      assert.equal(uniq.size, battle.words.length, `level ${lvl} repeats a spell word`);
    }
  }
});
