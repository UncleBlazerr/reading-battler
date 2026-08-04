import Phaser from "phaser";
import { isBossLevel } from "../content/enemies";
import { roomForLevel, TRANSITION_KEY } from "../content/rooms";

const W = 960;
const H = 640;
const DURATION = 1500; // ms the loading screen shows before the next battle

/**
 * The short "moving through the castle" screen shown between rooms. Displays the
 * starfield/castle art with the next room's name and level, a loading bar, then
 * hands off to the battle. Tapping skips the wait. The target level is read from
 * the registry (set by BattleScene when a level is cleared).
 */
export class TransitionScene extends Phaser.Scene {
  private advanced = false;

  constructor() {
    super("Transition");
  }

  create(): void {
    // Phaser reuses this scene instance across restarts, so the guard must be
    // reset every time — otherwise the second transition (and every one after)
    // sees advanced === true and never starts the next battle. THIS is what made
    // the ladder appear to "stop" after level 2.
    this.advanced = false;

    const level = (this.registry.get("level") as number) ?? 1;
    const room = roomForLevel(level);
    const boss = isBossLevel(level);

    this.add.image(W / 2, H / 2, TRANSITION_KEY).setDisplaySize(W, H);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.25); // gentle dim for text contrast

    this.add
      .text(W / 2, 250, boss ? "The air grows cold…" : "Deeper into the castle…", {
        fontFamily: "Arial, sans-serif",
        fontStyle: "italic",
        fontSize: "24px",
        color: "#9fb0d8",
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 312, boss ? `${room.name.toUpperCase()}` : `Entering the ${room.name}`, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: boss ? "56px" : "44px",
        color: boss ? "#ff6b6b" : "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 366, `${boss ? "👑 Boss · " : ""}Level ${level}`, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "26px",
        color: boss ? "#ffe14d" : "#c8cde0",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Loading bar that fills over DURATION.
    const barW = 360;
    const barX = W / 2 - barW / 2;
    const barY = 430;
    this.add.rectangle(W / 2, barY, barW + 6, 20, 0x000000, 0.5);
    this.add.rectangle(barX, barY, barW, 14, 0x20242e).setOrigin(0, 0.5);
    const fill = this.add.rectangle(barX, barY, 1, 14, 0x8bd450).setOrigin(0, 0.5);
    this.tweens.add({ targets: fill, width: barW, duration: DURATION, ease: "Sine.easeInOut" });

    this.add
      .text(W / 2, 470, "(tap to continue)", {
        fontFamily: "Arial, sans-serif",
        fontSize: "16px",
        color: "#6b7790",
      })
      .setOrigin(0.5)
      .setAlpha(0.7);

    this.time.delayedCall(DURATION, () => this.go());
    this.input.once("pointerdown", () => this.go()); // let impatient players skip
  }

  private go(): void {
    if (this.advanced) return;
    this.advanced = true;
    this.scene.start("Battle");
  }
}
