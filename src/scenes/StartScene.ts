import Phaser from "phaser";
import { ELEMENT_ORDER, ELEMENTS, type ElementChoice } from "../game/elements";

const W = 960;
const H = 640;

/**
 * Title + element picker. Also serves as the required user-gesture gate that
 * unlocks audio and speech synthesis before the battle starts.
 */
export class StartScene extends Phaser.Scene {
  private choice: ElementChoice = "auto";
  private chips: { key: ElementChoice; btn: Phaser.GameObjects.NineSlice }[] = [];

  constructor() {
    super("Start");
  }

  create(): void {
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d12);

    this.add
      .text(W / 2, 120, "WORD QUEST", {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "72px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 190, "Find the words. Climb the monster ladder!", {
        fontFamily: "Arial, sans-serif",
        fontSize: "26px",
        color: "#9aa0b5",
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, 290, "Pick your magic", {
        fontFamily: "Arial, sans-serif",
        fontSize: "24px",
        color: "#c8cde0",
      })
      .setOrigin(0.5);

    // Element chips: Auto + the three elements.
    const options: { key: ElementChoice; label: string }[] = [
      { key: "auto", label: "🎲 Auto" },
      ...ELEMENT_ORDER.map((e) => ({ key: e as ElementChoice, label: `${ELEMENTS[e].emoji} ${ELEMENTS[e].label}` })),
    ];
    const chipW = 190;
    const gap = 20;
    const totalW = options.length * chipW + (options.length - 1) * gap;
    let x = W / 2 - totalW / 2 + chipW / 2;
    for (const opt of options) {
      const btn = this.add.nineslice(x, 372, "ui-button", undefined, chipW, 66, 18, 18, 16, 16);
      btn.setInteractive({ useHandCursor: true });
      this.add
        .text(x, 371, opt.label, {
          fontFamily: "Arial, sans-serif",
          fontStyle: "bold",
          fontSize: "23px",
          color: "#4a2f16",
        })
        .setOrigin(0.5);
      btn.on("pointerdown", () => this.select(opt.key));
      this.chips.push({ key: opt.key, btn });
      x += chipW + gap;
    }
    this.select("auto");

    // Play button.
    const play = this.add.nineslice(W / 2, 502, "ui-button", undefined, 280, 88, 20, 20, 18, 18);
    play.setTint(0x8fd06a);
    play.setInteractive({ useHandCursor: true });
    this.add
      .text(W / 2, 500, "▶  PLAY", {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "34px",
        color: "#274d16",
      })
      .setOrigin(0.5);
    play.on("pointerdown", () => {
      this.registry.set("element", this.choice);
      this.registry.set("level", 1); // start every run at the bottom of the ladder
      this.scene.start("Battle");
    });
  }

  private select(key: ElementChoice): void {
    this.choice = key;
    for (const chip of this.chips) {
      chip.btn.setTint(chip.key === key ? 0x8fd06a : 0xffffff);
    }
  }
}
