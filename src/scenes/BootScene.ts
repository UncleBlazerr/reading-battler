import Phaser from "phaser";
import { ELEMENT_ORDER, ELEMENTS } from "../game/elements";

/** Loads audio, generates the particle texture, then hands off to StartScene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    this.load.audio("impact", "audio/impact.wav");
    this.load.audio("wrong", "audio/wrong.wav");
    this.load.audio("tap", "audio/tap.wav");
    this.load.audio("win", "audio/win.wav");
    for (const el of ELEMENT_ORDER) {
      this.load.audio(ELEMENTS[el].sound, `audio/${ELEMENTS[el].sound}.wav`);
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
