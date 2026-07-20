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
  gfx: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  hit: Phaser.GameObjects.Rectangle;
  width: number;
  homeX: number;
  found: boolean;
}

const CARD = {
  height: 52,
  minWidth: 72,
  maxWidth: 118,
  radius: 10,
  gap: 14,
  rowGap: 14,
  fontSize: 22,
  padX: 16,
  margin: 40,
  baseY: 516,
} as const;

const CARD_COLORS = {
  fill: 0x1c2233,
  stroke: 0x3a465e,
  text: "#ffffff",
  foundFill: 0x24402a,
  foundStroke: 0x8bd450,
  foundText: "#bff29a",
} as const;

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
    const words = this.battle.sentenceWords;
    const usable = W - CARD.margin * 2;

    // One uniform card width for every word — the widest word (plus padding)
    // sets it, clamped so cards stay tidy regardless of vocabulary.
    const widest = Math.max(...words.map((w) => this.measureWord(w)));
    const cardW = Phaser.Math.Clamp(Math.ceil(widest) + CARD.padX * 2, CARD.minWidth, CARD.maxWidth);

    // How many uniform cards fit per row, then balance rows so they're even.
    const perRowFit = Math.max(1, Math.floor((usable + CARD.gap) / (cardW + CARD.gap)));
    const rowCount = Math.ceil(words.length / perRowFit);
    const perRow = Math.ceil(words.length / rowCount);

    const rows: number[][] = [];
    for (let i = 0; i < words.length; i += perRow) {
      rows.push(words.map((_, idx) => idx).slice(i, i + perRow));
    }

    const totalHeight = rows.length * CARD.height + (rows.length - 1) * CARD.rowGap;
    const startY = CARD.baseY - totalHeight / 2 + CARD.height / 2;

    rows.forEach((row, r) => {
      const rowWidth = row.length * cardW + (row.length - 1) * CARD.gap;
      const startX = W / 2 - rowWidth / 2 + cardW / 2;
      const y = startY + r * (CARD.height + CARD.rowGap);
      row.forEach((i, col) => {
        const x = startX + col * (cardW + CARD.gap);
        this.cards.push(this.makeCard(i, words[i], x, y, cardW));
      });
    });
  }

  /** Width in px of a word at the card font (used to size cards uniformly). */
  private measureWord(word: string): number {
    const probe = this.add
      .text(0, 0, word, { fontFamily: "Arial, sans-serif", fontStyle: "bold", fontSize: `${CARD.fontSize}px` })
      .setVisible(false);
    const w = probe.width;
    probe.destroy();
    return w;
  }

  private makeCard(index: number, word: string, x: number, y: number, cardW: number): CardView {
    const gfx = this.add.graphics();
    const label = this.add
      .text(0, 0, word, {
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
        fontSize: `${CARD.fontSize}px`,
        color: CARD_COLORS.text,
      })
      .setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, cardW, CARD.height, 0xffffff, 0.001);
    const container = this.add.container(x, y, [gfx, hit, label]);
    const card: CardView = { index, word, container, gfx, label, hit, width: cardW, homeX: x, found: false };
    this.drawCard(card, cardW, false);
    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", () => this.onCardTap(card));
    return card;
  }

  private drawCard(card: CardView, cardW: number, found: boolean): void {
    const fill = found ? CARD_COLORS.foundFill : CARD_COLORS.fill;
    const stroke = found ? CARD_COLORS.foundStroke : CARD_COLORS.stroke;
    card.gfx.clear();
    card.gfx.fillStyle(fill, 1);
    card.gfx.lineStyle(3, stroke, 1);
    card.gfx.fillRoundedRect(-cardW / 2, -CARD.height / 2, cardW, CARD.height, CARD.radius);
    card.gfx.strokeRoundedRect(-cardW / 2, -CARD.height / 2, cardW, CARD.height, CARD.radius);
    card.label.setColor(found ? CARD_COLORS.foundText : CARD_COLORS.text);
  }

  private resetCards(): void {
    for (const card of this.cards) {
      card.found = false;
      this.drawCard(card, card.width, false);
      card.hit.setInteractive({ useHandCursor: true });
      card.container.setAlpha(1);
    }
  }

  private markFound(card: CardView): void {
    card.found = true;
    this.drawCard(card, card.width, true);
    card.hit.disableInteractive();
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
    // Shake the wrongly-tapped card; no damage, no penalty. Always anchor to the
    // card's fixed home X so repeated wrong taps can't drift it out of place.
    this.tweens.killTweensOf(card.container);
    card.container.setX(card.homeX);
    this.tweens.add({
      targets: card.container,
      x: card.homeX + 8,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => card.container.setX(card.homeX),
    });
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
