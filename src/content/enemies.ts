// The enemy roster for the ladder.
//
// Each EnemyDef is a *visual identity* only — texture key, art file, display
// name, and the scale it renders at in BattleScene. Difficulty (HP) scales with
// the level, not the sprite, so a given creature can reappear higher up the
// ladder as a tougher fight. Every sprite is original CC0 art authored in
// tools/gen-sprites.py (see the character-art skill).
//
// Growing the roster = add a sprite in gen-sprites.py, then append an entry
// here. The more entries, the longer the player climbs before a face repeats.

export interface EnemyDef {
  /** Phaser texture key (loaded in BootScene). */
  key: string;
  /** Asset path under public/. */
  file: string;
  /** Shown in the HP bar. */
  name: string;
  /** Display scale in BattleScene (tuned per sprite so feet sit on the ground
   *  line and the top clears the HP bar; bosses are the bulkiest). */
  scale: number;
  isBoss?: boolean;
}

/** Regular enemies, cycled across the non-boss levels. */
export const REGULAR_ENEMIES: EnemyDef[] = [
  { key: "enemy-goblin", file: "assets/enemy/word-goblin.png", name: "Word Goblin", scale: 0.62 },
  { key: "enemy-wraith", file: "assets/enemy/ink-wraith.png", name: "Ink Wraith", scale: 0.54 },
  { key: "enemy-beetle", file: "assets/enemy/bookworm-beetle.png", name: "Bookworm Beetle", scale: 0.6 },
];

/** Bosses, shown on every 10th level, cycled in order. */
export const BOSSES: EnemyDef[] = [
  { key: "boss-golem", file: "assets/enemy/grimoire-golem.png", name: "Grimoire Golem", scale: 0.42, isBoss: true },
];

/** Everything BootScene needs to preload. */
export const ALL_ENEMIES: EnemyDef[] = [...REGULAR_ENEMIES, ...BOSSES];

/** Every 10th level (10, 20, 30 …) is a boss set-piece. */
export function isBossLevel(level: number): boolean {
  return level % 10 === 0;
}

/**
 * The enemy shown on a given level. Bosses on multiples of 10; otherwise the
 * regular pool cycles so consecutive levels never repeat a face until the pool
 * is exhausted. Deterministic — no randomness (ADR 0002).
 */
export function enemyForLevel(level: number): EnemyDef {
  if (isBossLevel(level)) {
    const bossIndex = Math.floor(level / 10) - 1;
    return BOSSES[bossIndex % BOSSES.length];
  }
  // Count how many regular (non-boss) levels precede this one, so the cycle
  // isn't disturbed by the boss levels we skip over.
  const regularsBefore = level - 1 - Math.floor((level - 1) / 10);
  return REGULAR_ENEMIES[regularsBefore % REGULAR_ENEMIES.length];
}
