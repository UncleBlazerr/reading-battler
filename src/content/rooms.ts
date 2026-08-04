// Castle rooms for the ladder background.
//
// The player climbs a castle: every level is a different room, cycling through
// a set of themed stone rooms, with a boss lair on every 10th level. As levels
// climb past each boss, a per-"wing" palette tint shifts the whole scene so it
// reads as moving further into a *different* part of the castle rather than
// looping the same rooms. Every background is original CC0 art authored in
// tools/gen-backgrounds.py (see the character-art skill's style rules).

import { isBossLevel } from "./enemies";

export interface RoomDef {
  key: string;
  file: string;
  /** Shown on the transition/loading screen ("Entering the …"). */
  name: string;
}

/** Regular rooms, cycled across the non-boss levels. */
export const ROOMS: RoomDef[] = [
  { key: "room-gatehouse", file: "assets/bg/room-gatehouse.png", name: "Gatehouse" },
  { key: "room-hall", file: "assets/bg/room-hall.png", name: "Great Hall" },
  { key: "room-library", file: "assets/bg/room-library.png", name: "Library" },
  { key: "room-dungeon", file: "assets/bg/room-dungeon.png", name: "Dungeon" },
  { key: "room-tower", file: "assets/bg/room-tower.png", name: "Tower Stair" },
  { key: "room-chapel", file: "assets/bg/room-chapel.png", name: "Chapel" },
];

/** Boss lairs, shown on every 10th level. */
export const BOSS_ROOMS: RoomDef[] = [
  { key: "room-throne", file: "assets/bg/room-throne.png", name: "Throne Room" },
];

/** The starfield/castle art shown on the loading screen between rooms. */
export const TRANSITION_KEY = "screen-transition";
export const TRANSITION_FILE = "assets/bg/screen-transition.png";

/** Everything BootScene needs to preload. */
export const ALL_ROOMS: RoomDef[] = [...ROOMS, ...BOSS_ROOMS];

/** The room for a given level — boss lair on 10s, else the cycling pool. */
export function roomForLevel(level: number): RoomDef {
  if (isBossLevel(level)) {
    const i = Math.floor(level / 10) - 1;
    return BOSS_ROOMS[i % BOSS_ROOMS.length];
  }
  const regularsBefore = level - 1 - Math.floor((level - 1) / 10);
  return ROOMS[regularsBefore % ROOMS.length];
}

// Subtle multiply tints, one per castle "wing" (each 10-level floor). Kept light
// so text/UI stays readable; they nudge the whole room's hue so a second pass
// through the same rooms feels like a deeper, different part of the castle.
const WING_TINTS = [
  0xffffff, // ground floors — true colour
  0xcdd8ff, // cooler, higher up
  0xffe0c8, // warmer torch-deep wing
  0xdcc8ff, // arcane violet wing
  0xc8ecd8, // mossy green wing
];

/** Colour tint for a level, shifting each 10-level "wing". */
export function depthTintForLevel(level: number): number {
  const wing = Math.floor((level - 1) / 10);
  return WING_TINTS[wing % WING_TINTS.length];
}
