// The sentence pool the ladder draws from for levels 2+.
//
// Level 1 keeps its hand-authored content (battle-01.json) so its baked
// male-voice clips still match. From level 2 up, buildLevel() picks a sentence
// here and turns each `find` word into a find-the-word turn (spoken via
// browser TTS — the existing fallback). Deterministic, no LLM (ADR 0002).
//
// Early-reader friendly: short sentences, simple decodable target words. Keep
// each `find` word appearing exactly once in `words` so the target is
// unambiguous. Add more entries to lengthen the climb before quests repeat.

export interface SentenceDef {
  /** The sentence, tokenized into the on-screen word cards (display order). */
  words: string[];
  /** Words the child must find, in prompt order. Each must appear in `words`. */
  find: string[];
  /** Difficulty tier — the ladder picks harder sentences as the player climbs. */
  tier: number;
}

export const SENTENCES: SentenceDef[] = [
  // Tier 1 — short, simple words
  { words: ["The", "red", "cat", "sat", "on", "a", "mat"], find: ["cat", "red", "sat"], tier: 1 },
  { words: ["My", "dog", "can", "run", "and", "jump"], find: ["dog", "run", "jump"], tier: 1 },
  { words: ["The", "hot", "sun", "is", "up", "high"], find: ["hot", "sun", "high"], tier: 1 },
  { words: ["We", "had", "fun", "in", "the", "sun"], find: ["fun", "sun"], tier: 1 },
  // Tier 2 — a few more words / distractors
  { words: ["A", "big", "fish", "can", "swim", "fast"], find: ["fish", "big", "swim", "fast"], tier: 2 },
  { words: ["The", "frog", "sat", "on", "a", "green", "log"], find: ["frog", "green", "log"], tier: 2 },
  { words: ["An", "owl", "sits", "high", "in", "a", "tree"], find: ["owl", "sits", "tree"], tier: 2 },
  { words: ["The", "duck", "swims", "in", "a", "cold", "pond"], find: ["duck", "swims", "cold", "pond"], tier: 2 },
  // Tier 3 — longer sentences
  { words: ["The", "brave", "king", "has", "a", "big", "gold", "crown"], find: ["brave", "king", "gold", "crown"], tier: 3 },
  { words: ["A", "small", "brown", "mouse", "ran", "under", "the", "chair"], find: ["small", "brown", "mouse", "chair"], tier: 3 },
];
