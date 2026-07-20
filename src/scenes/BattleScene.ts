import Phaser from "phaser";
import battleData from "../content/battle-01.json";
import type { FindWordBattle } from "../content/types";
import { PromptTracker, spokenInstructionFor } from "../game/validation";
import { Speech } from "../game/speech";
import { ELEMENTS, resolveElement, type ElementChoice } from "../game/elements";
import { confetti, floatingDamage, playAttack } from "../game/effects";

const W = 960;
const H = 640;
const ENEMY = new Phaser.Math.Vector2(W / 2, 190);

interface CardView {
  index: number;
  word: string;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  found: boolean;
}

export class BattleScene extends Phaser.Scene {
  private readonly battle = battleData as FindWordBattle;
  private speech!: Speech;

  private hp = 0;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;

  private enemy!: Phaser.GameObjects.Container;
  private enemyHurt!: Phaser.GameObjects.Ellipse;

  private cards: CardView[] = [];
  private promptText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;

  private promptIndex = 0;
  private tracker!: PromptTracker;
  private hitIndex = 0;
  private elementChoice: ElementChoice = "auto";
  private inputLocked = false;
  private over = false;

  constructor() {
    super("Battle");
  }

  create(): void {
    this.hp = this.battle.enemy.maxHp;
    this.elementChoice = (this.registry.get("element") as ElementChoice) ?? "auto";
    this.speech = new Speech();
    this.promptIndex = 0;
    this.hitIndex = 0;
    this.over = false;

    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d12);
    this.buildHpBar();
    this.buildEnemy();
    this.buildPromptUi();
    this.buildCards();

    this.startPrompt();
  }

  // ---- Enemy ---------------------------------------------------------------

  private buildEnemy(): void {
    const c = this.add.container(ENEMY.x, ENEMY.y);
    const body = this.add.ellipse(0, 0, 190, 170, 0x6aa84f).setStrokeStyle(4, 0x3d6b2c);
    const belly = this.add.ellipse(0, 25, 110, 90, 0x8bc46a);
    const earL = this.add.triangle(-95, -30, 0, 0, 40, -20, 20, 40, 0x6aa84f);
    const earR = this.add.triangle(95, -30, 0, 0, -40, -20, -20, 40, 0x6aa84f);
    const eyeL = this.add.circle(-38, -20, 22, 0xffffff);
    const eyeR = this.add.circle(38, -20, 22, 0xffffff);
    const pupL = this.add.circle(-38, -16, 9, 0x101018);
    const pupR = this.add.circle(38, -16, 9, 0x101018);
    const mouth = this.add.ellipse(0, 35, 60, 26, 0x2a1a1a);
    this.enemyHurt = this.add.ellipse(0, 0, 190, 170, 0xff3b3b, 0).setName("hurt");

    c.add([earL, earR, body, belly, eyeL, eyeR, pupL, pupR, mouth, this.enemyHurt]);
    c.setDepth(10);
    this.enemy = c;

    // Idle bob.
    this.tweens.add({
      targets: c,
      y: ENEMY.y + 10,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add
      .text(ENEMY.x, ENEMY.y + 120, this.battle.enemy.name, {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        color: "#9aa0b5",
      })
      .setOrigin(0.5)
      .setDepth(10);
  }

  private hurtEnemy(): void {
    this.enemyHurt.setAlpha(0.7);
    this.tweens.add({ targets: this.enemyHurt, alpha: 0, duration: 260 });
    this.tweens.add({ targets: this.enemy, angle: { from: -6, to: 6 }, duration: 60, yoyo: true, repeat: 3, onComplete: () => this.enemy.setAngle(0) });
  }

  /** Harmless "enemy takes a turn" wobble on a wrong tap (soft fail). */
  private enemyTaunt(): void {
    this.tweens.add({ targets: this.enemy, scaleX: 1.08, scaleY: 0.92, duration: 120, yoyo: true, ease: "Quad.easeOut" });
  }

  // ---- HP bar --------------------------------------------------------------

  private buildHpBar(): void {
    this.add.rectangle(280, 70, 400, 26, 0x2a2a35).setOrigin(0, 0.5).setStrokeStyle(2, 0x444a5e);
    this.hpFill = this.add.rectangle(280, 70, 400, 26, 0xff5b6a).setOrigin(0, 0.5);
    this.hpText = this.add
      .text(W / 2, 40, "", { fontFamily: "Arial, sans-serif", fontSize: "20px", color: "#c8cde0" })
      .setOrigin(0.5);
    this.updateHpBar();
  }

  private updateHpBar(): void {
    const frac = Phaser.Math.Clamp(this.hp / this.battle.enemy.maxHp, 0, 1);
    this.tweens.add({ targets: this.hpFill, displayWidth: 400 * frac, duration: 250, ease: "Quad.easeOut" });
    this.hpText.setText(`${this.battle.enemy.name}    HP ${this.hp} / ${this.battle.enemy.maxHp}`);
  }

  // ---- Prompt UI -----------------------------------------------------------

  private buildPromptUi(): void {
    this.promptText = this.add
      .text(W / 2 - 30, 340, "", {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "34px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    // Replay speaker button — child can hear the word again as often as needed.
    const speaker = this.add.circle(0, 0, 30, 0x2a3348).setStrokeStyle(3, 0x6bd6ff);
    const icon = this.add.text(0, 0, "🔊", { fontSize: "30px" }).setOrigin(0.5);
    this.add.container(W / 2 + 190, 340, [speaker, icon]);
    speaker.setInteractive({ useHandCursor: true });
    speaker.on("pointerdown", () => this.speakPrompt());

    this.progressText = this.add
      .text(W / 2, 392, "", { fontFamily: "Arial, sans-serif", fontSize: "20px", color: "#9aa0b5" })
      .setOrigin(0.5);
  }

  // ---- Cards ---------------------------------------------------------------

  private buildCards(): void {
    const gap = 14;
    const rowY = 500;
    const maxRowWidth = W - 60;

    const widths = this.battle.sentenceWords.map((w) => Math.max(90, w.length * 24 + 44));

    // Simple greedy wrap into rows.
    const rows: number[][] = [[]];
    let rowWidth = 0;
    this.battle.sentenceWords.forEach((_, i) => {
      const wpx = widths[i] + gap;
      if (rowWidth + wpx > maxRowWidth && rows[rows.length - 1].length > 0) {
        rows.push([]);
        rowWidth = 0;
      }
      rows[rows.length - 1].push(i);
      rowWidth += wpx;
    });

    rows.forEach((row, r) => {
      const totalW = row.reduce((s, i) => s + widths[i], 0) + gap * (row.length - 1);
      let x = W / 2 - totalW / 2;
      const y = rowY + r * 92;
      for (const i of row) {
        const cw = widths[i];
        const word = this.battle.sentenceWords[i];
        const bg = this.add.rectangle(0, 0, cw, 76, 0x1c2233).setStrokeStyle(3, 0x3a465e);
        const label = this.add
          .text(0, 0, word, { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "34px", color: "#ffffff" })
          .setOrigin(0.5);
        const container = this.add.container(x + cw / 2, y, [bg, label]);
        bg.setInteractive({ useHandCursor: true });
        const card: CardView = { index: i, word, container, bg, label, found: false };
        bg.on("pointerdown", () => this.onCardTap(card));
        this.cards.push(card);
        x += cw + gap;
      }
    });
  }

  private resetCards(): void {
    for (const card of this.cards) {
      card.found = false;
      card.bg.setFillStyle(0x1c2233);
      card.bg.setStrokeStyle(3, 0x3a465e);
      card.label.setColor("#ffffff");
      card.bg.setInteractive({ useHandCursor: true });
      card.container.setAlpha(1);
    }
  }

  private markFound(card: CardView): void {
    card.found = true;
    card.bg.setFillStyle(0x24402a);
    card.bg.setStrokeStyle(3, 0x8bd450);
    card.label.setColor("#bff29a");
    card.bg.disableInteractive();
  }

  // ---- Prompt flow ---------------------------------------------------------

  private startPrompt(): void {
    const prompt = this.battle.prompts[this.promptIndex];
    this.tracker = new PromptTracker(prompt);
    this.resetCards();
    this.inputLocked = false;

    const count = prompt.targetWords.length;
    this.promptText.setText(count > 1 ? `Find ${count} words!` : "Find the word!");
    this.updateProgress();
    this.speakPrompt(); // auto-play once on appearance
  }

  private updateProgress(): void {
    const prompt = this.battle.prompts[this.promptIndex];
    const total = prompt.targetWords.length;
    if (total > 1) {
      const found = this.cards.filter((c) => c.found).length;
      this.progressText.setText(`${found} / ${total} found`);
    } else {
      this.progressText.setText("");
    }
  }

  private speakPrompt(): void {
    const prompt = this.battle.prompts[this.promptIndex];
    this.speech.say(spokenInstructionFor(prompt));
  }

  private onCardTap(card: CardView): void {
    if (this.inputLocked || this.over) return;
    this.sound.play("tap", { volume: 0.5 });

    const outcome = this.tracker.registerTap(card.word);

    if (outcome.result === "wrong") {
      this.softFail(card);
      return;
    }

    // Correct tap: launch the attack from the found word to the enemy.
    this.inputLocked = true;
    this.markFound(card);
    this.updateProgress();

    const element = resolveElement(this.elementChoice, this.hitIndex++);
    this.sound.play(ELEMENTS[element].sound, { volume: 0.6 });

    const from = card.container;
    playAttack(this, element, from.x, from.y, ENEMY.x, ENEMY.y, () => {
      this.hp = Math.max(0, this.hp - outcome.damage);
      this.updateHpBar();
      floatingDamage(this, ENEMY.x, ENEMY.y - 40, outcome.damage, ELEMENTS[element].color);
      this.sound.play("impact", { volume: 0.7 });
      this.hurtEnemy();

      if (this.hp <= 0) {
        this.win();
        return;
      }
      if (outcome.complete) {
        this.time.delayedCall(600, () => this.advance());
      } else {
        this.inputLocked = false; // more target words remain this turn
      }
    });
  }

  private softFail(card: CardView): void {
    this.sound.play("wrong", { volume: 0.5 });
    this.enemyTaunt();
    // Shake the wrongly-tapped card; no damage, no penalty.
    this.tweens.add({ targets: card.container, x: card.container.x + 8, duration: 50, yoyo: true, repeat: 3 });
    const orig = card.container.x;
    this.time.delayedCall(260, () => card.container.setX(orig));
  }

  private advance(): void {
    this.promptIndex += 1;
    if (this.promptIndex >= this.battle.prompts.length) {
      this.win(); // ran out of prompts — treat as victory
      return;
    }
    this.startPrompt();
  }

  // ---- Win -----------------------------------------------------------------

  private win(): void {
    if (this.over) return;
    this.over = true;
    this.inputLocked = true;
    this.progressText.setText("");
    this.promptText.setText("");

    // Enemy defeat: topple and fade.
    this.tweens.add({ targets: this.enemy, angle: 90, y: ENEMY.y + 60, alpha: 0.25, duration: 700, ease: "Cubic.easeIn" });

    this.time.delayedCall(500, () => {
      this.sound.play("win", { volume: 0.7 });
      confetti(this, W / 2, 200);
      this.add
        .text(W / 2, 300, "YOU DID IT!", {
          fontFamily: "Arial Black, Arial, sans-serif",
          fontSize: "72px",
          color: "#ffe14d",
          stroke: "#000000",
          strokeThickness: 8,
        })
        .setOrigin(0.5)
        .setDepth(80);

      const again = this.add.rectangle(W / 2, 430, 300, 80, 0x8bd450).setStrokeStyle(4, 0xffffff).setDepth(80);
      this.add
        .text(W / 2, 430, "▶  Play again", { fontFamily: "Arial Black, Arial, sans-serif", fontSize: "32px", color: "#0d0d12" })
        .setOrigin(0.5)
        .setDepth(81);
      again.setInteractive({ useHandCursor: true });
      again.on("pointerdown", () => {
        this.cards = [];
        this.scene.start("Start");
      });
    });
  }
}
