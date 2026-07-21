import Phaser from "phaser";
import { ELEMENT_ORDER, ELEMENTS } from "../game/elements";

/** Loads audio, generates the particle texture, then hands off to StartScene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    // Kenney.nl CC0 sounds, converted to mp3 for cross-browser support
    // (iPad Safari can't play ogg). See public/audio/CREDITS.md.
    this.load.audio("impact", "audio/impact.mp3");
    this.load.audio("wrong", "audio/wrong.mp3");
    this.load.audio("tap", "audio/tap.mp3");
    this.load.audio("win", "audio/win.mp3");
    for (const el of ELEMENT_ORDER) {
      this.load.audio(ELEMENTS[el].sound, `audio/${ELEMENTS[el].sound}.mp3`);
    }
  }

  create(): void {
    // A soft white dot used for all particle effects (tinted per element).
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(8, 8, 8);
    g.generateTexture("spark", 16, 16);
    g.destroy();

    this.scene.start("Start");
  }
}
