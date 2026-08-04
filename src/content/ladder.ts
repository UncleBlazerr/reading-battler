// The ladder: turns a level number into a concrete battle (enemy + quest).
//
// The player climbs level by level; every win advances to the next level, so a
// fresh enemy and quest are always waiting. Quest type alternates: find-the-word
// on odd levels, spell-the-word on even ones. Difficulty scales with the level
// for both. Level 1 keeps its authored content (battle-01.json, which has baked
// voice clips). Everything else is assembled deterministically from the enemy
// roster, sentence pool, and spell-word pool (ADR 0002 — no runtime LLM). HP
// scales with the level, so repeat creatures fight harder.

import battle01 from "./battle-01.json" with { type: "json" };
import type { Battle, FindWordBattle, FindWordPrompt, SpellBattle, SpellWordPrompt } from "./types";
import { type EnemyDef, enemyForLevel, isBossLevel } from "./enemies.ts";
import { SENTENCES } from "./sentences.ts";
import { SPELL_WORDS, distractorsFor } from "./spellwords.ts";

export type BattleKind = "find" | "spell";

export interface LevelPlan {
  level: number;
  battle: Battle;
  enemy: EnemyDef;
}

/** Quest type for a level: find on odd levels, spell on even. Level 1 is find. */
export function battleKindForLevel(level: number): BattleKind {
  return level % 2 === 1 ? "find" : "spell";
}

/** Difficulty tier (1..4) — climbs every few levels; applies to both quest types. */
export function difficultyTierForLevel(level: number): number {
  return Math.min(4, 1 + Math.floor((level - 1) / 4));
}

/** Enemy HP for a level — a gentle ramp, with bosses much tankier. */
export function hpForLevel(level: number): number {
  if (isBossLevel(level)) {
    return 150 + (Math.floor(level / 10) - 1) * 40;
  }
  return 60 + (level - 1) * 6;
}

/**
 * Split a battle's total HP across N turns so the enemy dies exactly on the last
 * one. Remainder lands on the final turn so the sum is always `maxHp`.
 */
function splitDamage(n: number, maxHp: number): number[] {
  const base = Math.floor(maxHp / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? maxHp - base * (n - 1) : base));
}

export function distributePrompts(find: string[], maxHp: number): FindWordPrompt[] {
  const dmg = splitDamage(find.length, maxHp);
  return find.map((word, i) => ({ targetWords: [word], damage: dmg[i] }));
}

/** Pick a pool entry by tier: prefer entries at the current tier, cycling, and
 *  fall back to any entry of a lower tier so early levels always have options. */
function pickByTier<T extends { tier: number }>(pool: T[], tier: number, seq: number): T {
  const atTier = pool.filter((p) => p.tier === tier);
  const eligible = atTier.length > 0 ? atTier : pool.filter((p) => p.tier <= tier);
  const list = eligible.length > 0 ? eligible : pool;
  return list[seq % list.length];
}

/** Build a spell-the-word battle: 1 word (tier ≤ 2) or 2 words (tier ≥ 3). */
function buildSpellBattle(level: number, enemy: EnemyDef): SpellBattle {
  const tier = difficultyTierForLevel(level);
  const maxHp = hpForLevel(level);
  const wordCount = tier >= 3 && !isBossLevel(level) ? 2 : 1;
  const dmg = splitDamage(wordCount, maxHp);
  const distractorCount = Math.min(2 + tier, 4); // more decoys as it gets harder

  const words: SpellWordPrompt[] = [];
  for (let i = 0; i < wordCount; i++) {
    // Consecutive sequence numbers pick adjacent (distinct) pool entries, so a
    // 2-word battle never spells the same word twice.
    const def = pickByTier(SPELL_WORDS, tier, Math.floor(level / 2) + i);
    words.push({
      word: def.word,
      tiles: def.tiles,
      distractors: distractorsFor(def, distractorCount),
      damage: dmg[i],
    });
  }

  return {
    kind: "spell",
    id: `level-${level}`,
    title: enemy.name,
    enemy: { name: enemy.name, maxHp },
    words,
    difficultyTier: tier,
  };
}

/** Build a find-the-word battle from the sentence pool at the level's tier. */
function buildFindBattle(level: number, enemy: EnemyDef): FindWordBattle {
  const tier = difficultyTierForLevel(level);
  const maxHp = hpForLevel(level);
  const sentence = pickByTier(SENTENCES, tier, Math.floor(level / 2));
  return {
    kind: "find",
    id: `level-${level}`,
    title: enemy.name,
    enemy: { name: enemy.name, maxHp },
    sentenceWords: sentence.words,
    prompts: distributePrompts(sentence.find, maxHp),
    difficultyTier: tier,
  };
}

/** Build the full battle for a given level (1-based). */
export function buildLevel(level: number): LevelPlan {
  const enemy = enemyForLevel(level);

  // Level 1 uses the authored battle so its baked male-voice clips still match.
  if (level === 1) {
    return { level, battle: battle01 as FindWordBattle, enemy };
  }

  const battle = battleKindForLevel(level) === "spell"
    ? buildSpellBattle(level, enemy)
    : buildFindBattle(level, enemy);
  return { level, battle, enemy };
}
