# ADR 0005 — "Spell the word" as the second quest type

**Status:** Accepted — 2026-08-03
**Related:** ADR 0002 (no runtime LLM), ADR 0003 (find-the-word), ADR 0004 (ladder)

## Context

Find-the-word (ADR 0003) proves *word recognition*. The next reading skill is
*encoding* — building a word from its sounds. We want a second quest type that
alternates with find-the-word up the ladder, requires no typing, and is fun and
deterministic.

## Decision

**Spell the word:** the child drags grapheme **tiles** into ordered **slots** at
the top of the battle to spell a spoken/shown word. When every slot holds the
correct grapheme in order, the hero casts a spell that damages the enemy.

Supporting rules:

- **Graphemes, not just letters.** Tiles are the word's spelling *segmented into
  graphemes* — single letters (`d o g`) or compound sounds (`ch e ss`,
  `k i ng`). This teaches sound units, not just letter-picking. Segmentation is
  authored per word in `src/content/spellwords.ts`.
- **Meaningful distractors.** The tray mixes the correct tiles with wrong ones
  drawn from *confusable* graphemes (sh↔ch↔th, ng↔nk, ss↔s…), so choosing
  correctly is the reading skill. Distractors are generated deterministically
  (`distractorsFor`), never anything actually in the word.
- **Forgiving validation.** Free placement; when all slots are filled the board
  is judged (`SpellBoard` in `src/game/spelling.ts`, pure + unit-tested). All
  correct → cast + damage. Otherwise the wrong slots flash and their tiles pop
  back to the tray; correct placements stay. No damage to the player, unlimited
  retries — same soft-fail spirit as find-the-word.
- **Alternation + scaling.** `battleKindForLevel`: find on odd levels, spell on
  even (level 1 stays find to keep its baked audio). `difficultyTierForLevel`
  scales *both* quest types — longer/compound spell words and longer find
  sentences, more distractors, and 2 words to spell at higher tiers.
- **The word is shown and spoken.** Consistent with ADR 0003's revision, the
  target word appears in the banner and is read aloud (replayable). The
  challenge is segmenting/ordering the correct graphemes among distractors.
- Deterministic, no LLM (ADR 0002): tile order is a seeded shuffle by level.

## Rationale

Drag-and-drop suits small hands and needs no keyboard/ASR. Grapheme tiles + a
closed set of confusable distractors make the task a genuine encoding exercise
that's still a pure function of the content — so it's unit-testable and offline.

## Consequences

- Reuses the shared battle scaffolding (enemy, HP, room, `castAttack`, win/
  transition); `BattleScene` branches on `battle.kind`.
- Spelling levels use browser TTS (no baked VO), like other generated levels.
- The word/segmentation pool **cycles** once exhausted (like the enemy/room
  pools) and is designed to grow — add entries to `spellwords.ts`.
- Screen space: slots live in the clear lane between the combatants, capping
  practical word length at ~6 tiles until the layout is revisited.
