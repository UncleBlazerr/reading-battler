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
  private chips: { key: ElementChoice; box: Phaser.GameObjects.Rectangle }[] = [];

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
      .text(W / 2, 190, "Find the words. Beat the goblin!", {
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
      const box = this.add.rectangle(x, 370, chipW, 70, 0x1c1f2e).setStrokeStyle(3, 0x333849);
      box.setInteractive({ useHandCursor: true });
      this.add
        .text(x, 370, opt.label, { fontFamily: "Arial, sans-serif", fontSize: "24px", color: "#ffffff" })
        .setOrigin(0.5);
      box.on("pointerdown", () => this.select(opt.key));
      this.chips.push({ key: opt.key, box });
      x += chipW + gap;
    }
    this.select("auto");

    // Play button.
    const play = this.add.rectangle(W / 2, 500, 260, 84, 0x8bd450).setStrokeStyle(4, 0xffffff);
    play.setInteractive({ useHandCursor: true });
    this.add
      .text(W / 2, 500, "▶  PLAY", {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "36px",
        color: "#0d0d12",
      })
      .setOrigin(0.5);
    play.on("pointerdown", () => {
      this.registry.set("element", this.choice);
      this.scene.start("Battle");
    });
  }

  private select(key: ElementChoice): void {
    this.choice = key;
    for (const chip of this.chips) {
      const selected = chip.key === key;
      chip.box.setStrokeStyle(selected ? 4 : 3, selected ? 0x8bd450 : 0x333849);
      chip.box.setFillStyle(selected ? 0x2a3348 : 0x1c1f2e);
    }
  }
}
