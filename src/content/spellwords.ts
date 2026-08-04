// The word pool for spell-the-word battles.
//
// Each word is pre-segmented into the graphemes a beginning reader should build
// it from — single letters, or compound sounds ("ch", "sh", "th", "ck", "ng",
// "ss"…). Words are grouped by difficulty tier; the ladder picks harder words as
// the player climbs (see difficultyTierForLevel). Deterministic, no LLM
// (ADR 0002). Distractor tiles are generated from confusable graphemes so the
// "wrong" options are pedagogically meaningful (sh vs ch vs th, ng vs nk …).

export interface SpellWordDef {
  word: string;
  /** Correct spelling, segmented into graphemes, in order. */
  tiles: string[];
  tier: number;
}

export const SPELL_WORDS: SpellWordDef[] = [
  // Tier 1 — CVC, single letters
  { word: "cat", tiles: ["c", "a", "t"], tier: 1 },
  { word: "dog", tiles: ["d", "o", "g"], tier: 1 },
  { word: "sun", tiles: ["s", "u", "n"], tier: 1 },
  { word: "big", tiles: ["b", "i", "g"], tier: 1 },
  { word: "hat", tiles: ["h", "a", "t"], tier: 1 },
  { word: "pig", tiles: ["p", "i", "g"], tier: 1 },
  { word: "bed", tiles: ["b", "e", "d"], tier: 1 },
  { word: "fox", tiles: ["f", "o", "x"], tier: 1 },

  // Tier 2 — a single digraph (sh/ch/th/ck/ng/ss). One new sound over tier 1.
  { word: "ship", tiles: ["sh", "i", "p"], tier: 2 },
  { word: "chin", tiles: ["ch", "i", "n"], tier: 2 },
  { word: "fish", tiles: ["f", "i", "sh"], tier: 2 },
  { word: "duck", tiles: ["d", "u", "ck"], tier: 2 },
  { word: "king", tiles: ["k", "i", "ng"], tier: 2 },
  { word: "bath", tiles: ["b", "a", "th"], tier: 2 },
  { word: "chess", tiles: ["ch", "e", "ss"], tier: 2 },
  { word: "sock", tiles: ["s", "o", "ck"], tier: 2 },
  { word: "song", tiles: ["s", "o", "ng"], tier: 2 },
  { word: "wish", tiles: ["w", "i", "sh"], tier: 2 },

  // Tier 3 — a consonant blend, or a simple vowel team. Words like "bring",
  // "boat" — one clear step up from tier 2, not a leap.
  { word: "frog", tiles: ["f", "r", "o", "g"], tier: 3 },
  { word: "bring", tiles: ["b", "r", "i", "ng"], tier: 3 },
  { word: "brush", tiles: ["b", "r", "u", "sh"], tier: 3 },
  { word: "crash", tiles: ["c", "r", "a", "sh"], tier: 3 },
  { word: "boat", tiles: ["b", "oa", "t"], tier: 3 },
  { word: "rain", tiles: ["r", "ai", "n"], tier: 3 },
  { word: "tree", tiles: ["t", "r", "ee"], tier: 3 },
  { word: "star", tiles: ["s", "t", "ar"], tier: 3 },
  { word: "play", tiles: ["p", "l", "ay"], tier: 3 },

  // Tier 4 — a blend AND a vowel team, or 5–6 tiles. Still short, everyday words.
  { word: "train", tiles: ["t", "r", "ai", "n"], tier: 4 },
  { word: "sheep", tiles: ["sh", "ee", "p"], tier: 4 },
  { word: "chair", tiles: ["ch", "ai", "r"], tier: 4 },
  { word: "cloud", tiles: ["c", "l", "ou", "d"], tier: 4 },
  { word: "storm", tiles: ["s", "t", "or", "m"], tier: 4 },
  { word: "stamp", tiles: ["s", "t", "a", "m", "p"], tier: 4 },
  { word: "plant", tiles: ["p", "l", "a", "n", "t"], tier: 4 },
  { word: "dragon", tiles: ["d", "r", "a", "g", "o", "n"], tier: 4 },
];

// Graphemes that are commonly confused with each other — the best distractors,
// because telling them apart *is* the reading skill.
const CONFUSABLE: Record<string, string[]> = {
  ch: ["sh", "th"], sh: ["ch", "th"], th: ["sh", "ch"],
  ck: ["k", "c"], k: ["ck", "c"], c: ["k", "ck"],
  ng: ["nk", "n"], ss: ["s", "z"], s: ["ss", "z"],
  p: ["b"], b: ["p", "d"], d: ["b", "p"], g: ["j"],
  a: ["e"], e: ["a"], i: ["e"], o: ["u"], u: ["o"],
  m: ["n"], n: ["m"], f: ["v"], r: ["l"], l: ["r"],
  // vowel teams — confused with each other and with the matching single vowel
  oa: ["ow", "o"], ai: ["ay", "a"], ay: ["ai", "a"], ea: ["ee", "e"],
  ee: ["ea", "e"], ou: ["ow", "oo"], oo: ["ou", "o"], ar: ["or", "a"],
  or: ["ar", "aw"], ow: ["oa", "ou"],
};

// Fallback pool when a word doesn't supply enough confusables.
const GRAPHEME_POOL = [
  "sh", "ch", "th", "ng", "ck", "ss",
  "ai", "ay", "ee", "ea", "oa", "ow", "ou", "ar", "or",
  "b", "d", "g", "k", "m", "n", "p", "s", "t", "z", "f", "l", "r", "w",
];

/**
 * Pick `count` distractor tiles for a word: confusable graphemes first (drawn
 * from the word's own tiles), then filled from the pool — never anything that's
 * actually in the word. Deterministic given the word.
 */
export function distractorsFor(def: SpellWordDef, count: number): string[] {
  const inWord = new Set(def.tiles);
  const out: string[] = [];
  const push = (g: string) => {
    if (!inWord.has(g) && !out.includes(g) && out.length < count) out.push(g);
  };

  for (const tile of def.tiles) {
    for (const c of CONFUSABLE[tile] ?? []) push(c);
  }
  // Deterministic fill from the pool, offset by word length so it varies.
  let i = def.word.length * 3;
  while (out.length < count) {
    push(GRAPHEME_POOL[i % GRAPHEME_POOL.length]);
    i += 1;
    if (i > def.word.length * 3 + GRAPHEME_POOL.length * 2) break; // safety
  }
  return out;
}
