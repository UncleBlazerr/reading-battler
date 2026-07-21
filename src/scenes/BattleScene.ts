import Phaser from "phaser";
import battleData from "../content/battle-01.json";
import type { FindWordBattle } from "../content/types";
import { PromptTracker, questBannerFor } from "../game/validation";
import { Speech } from "../game/speech";
import { ELEMENTS, resolveElement, type ElementChoice } from "../game/elements";
import { confetti, floatingDamage, playAttack } from "../game/effects";

const W = 960;
const H = 640;
const ENEMY = new Phaser.Math.Vector2(W / 2, 168);

interface CardView {
  index: number;
  word: string;
  container: Phaser.GameObjects.Container;
  btn: Phaser.GameObjects.NineSlice;
  label: Phaser.GameObjects.Text;
  width: number;
  homeX: number;
  found: boolean;
}

const CARD = {
  height: 58,
  minWidth: 88,
  maxWidth: 136,
  gap: 14,
  rowGap: 14,
  fontSize: 22,
  padX: 24,
  margin: 40,
  baseY: 514,
} as const;

const CARD_TINT = { normal: 0xffffff, found: 0x8fd06a } as const;
const CARD_TEXT = { normal: "#4a2f16", found: "#274d16" } as const;

export class BattleScene extends Phaser.Scene {
  private readonly battle = battleData as FindWordBattle;
  private speech!: Speech;

  private hp = 0;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;

  private enemy!: Phaser.GameObjects.Container;
  private enemyBody!: Phaser.GameObjects.Image;
  private hpBarWidth = 0;

  private cards: CardView[] = [];
  private promptText!: Phaser.GameObjects.Text;
  private speaker!: Phaser.GameObjects.Container;
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
    // Assembled from Kenney Monster Builder parts, layered back-to-front.
    const armL = this.add.image(-104, 30, "m-arm").setScale(0.6).setFlipX(true);
    const armR = this.add.image(104, 30, "m-arm").setScale(0.6);
    const legL = this.add.image(-42, 92, "m-leg").setScale(0.58);
    const legR = this.add.image(42, 92, "m-leg").setScale(0.58).setFlipX(true);
    const body = this.add.image(0, 0, "m-body").setScale(0.62);
    const eyeL = this.add.image(-38, -28, "m-eye").setScale(0.5);
    const eyeR = this.add.image(38, -28, "m-eye").setScale(0.5);
    const mouth = this.add.image(0, 42, "m-mouth").setScale(0.6);
    this.enemyBody = body;

    c.add([armL, armR, legL, legR, body, eyeL, eyeR, mouth]);
    c.setDepth(10);
    c.setScale(0.66);
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
  }

  private hurtEnemy(): void {
    this.enemyBody.setTint(0xff6b6b);
    this.time.delayedCall(220, () => this.enemyBody.clearTint());
    this.tweens.add({ targets: this.enemy, angle: { from: -6, to: 6 }, duration: 60, yoyo: true, repeat: 3, onComplete: () => this.enemy.setAngle(0) });
  }

  /** Harmless "enemy takes a turn" wobble on a wrong tap (soft fail). */
  private enemyTaunt(): void {
    this.tweens.add({ targets: this.enemy, scaleX: 1.08, scaleY: 0.92, duration: 120, yoyo: true, ease: "Quad.easeOut" });
  }

  // ---- HP bar --------------------------------------------------------------

  private buildHpBar(): void {
    const cx = W / 2;
    const cy = 66;
    const panelW = 440;
    const panelH = 52;
    this.add.nineslice(cx, cy, "ui-panel", undefined, panelW, panelH, 24, 24, 24, 24).setDepth(5);

    const barW = panelW - 52;
    const barH = 18;
    this.hpBarWidth = barW;
    const barX = cx - barW / 2;
    this.add.rectangle(barX, cy, barW, barH, 0x2c1c10).setOrigin(0, 0.5).setDepth(6);
    this.hpFill = this.add.rectangle(barX, cy, barW, barH, 0xe23b3b).setOrigin(0, 0.5).setDepth(6);

    this.hpText = this.add
      .text(cx, cy, "", {
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
        fontSize: "18px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(7);
    this.updateHpBar();
  }

  private updateHpBar(): void {
    const frac = Phaser.Math.Clamp(this.hp / this.battle.enemy.maxHp, 0, 1);
    this.tweens.add({ targets: this.hpFill, displayWidth: this.hpBarWidth * frac, duration: 250, ease: "Quad.easeOut" });
    this.hpText.setText(`${this.battle.enemy.name}    HP ${this.hp} / ${this.battle.enemy.maxHp}`);
  }

  // ---- Prompt UI -----------------------------------------------------------

  private buildPromptUi(): void {
    // Quest banner — states the objective in words, including the target word,
    // so the child always knows what to find (see ADR 0003 update).
    this.promptText = this.add
      .text(W / 2, 338, "", {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "30px",
        color: "#ffffff",
        align: "center",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(20);

    // Replay speaker button — child can hear the word again as often as needed.
    // Repositioned next to the banner each prompt (banner width varies).
    const bg = this.add.circle(0, 0, 26, 0x2a3348).setStrokeStyle(3, 0x6bd6ff);
    const icon = this.add.text(0, 0, "🔊", { fontSize: "26px" }).setOrigin(0.5);
    this.speaker = this.add.container(0, 338, [bg, icon]);
    this.speaker.setDepth(20);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => this.speakPrompt());

    this.progressText = this.add
      .text(W / 2, 392, "", { fontFamily: "Arial, sans-serif", fontSize: "20px", color: "#c8cde0" })
      .setOrigin(0.5)
      .setDepth(20);
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
    const btn = this.add.nineslice(0, 0, "ui-button", undefined, cardW, CARD.height, 18, 18, 16, 16);
    const label = this.add
      .text(0, -1, word, {
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
        fontSize: `${CARD.fontSize}px`,
        color: CARD_TEXT.normal,
      })
      .setOrigin(0.5);
    const container = this.add.container(x, y, [btn, label]);
    const card: CardView = { index, word, container, btn, label, width: cardW, homeX: x, found: false };
    btn.setInteractive({ useHandCursor: true });
    btn.on("pointerdown", () => this.onCardTap(card));
    return card;
  }

  private resetCards(): void {
    for (const card of this.cards) {
      card.found = false;
      card.btn.setTint(CARD_TINT.normal);
      card.label.setColor(CARD_TEXT.normal);
      card.btn.setInteractive({ useHandCursor: true });
      card.container.setAlpha(1);
    }
  }

  private markFound(card: CardView): void {
    card.found = true;
    card.btn.setTint(CARD_TINT.found);
    card.label.setColor(CARD_TEXT.found);
    card.btn.disableInteractive();
  }

  // ---- Prompt flow ---------------------------------------------------------

  private startPrompt(): void {
    const prompt = this.battle.prompts[this.promptIndex];
    this.tracker = new PromptTracker(prompt);
    this.resetCards();
    this.inputLocked = false;

    this.promptText.setText(questBannerFor(prompt));
    // Park the speaker button just to the right of the banner.
    this.speaker.setPosition(this.promptText.x + this.promptText.displayWidth / 2 + 34, this.promptText.y);
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
    // Prefer the baked male-voice clip; fall back to browser TTS if it's missing
    // (e.g. content added without regenerating audio).
    const key = `voice-p${this.promptIndex}`;
    if (this.cache.audio.exists(key)) {
      this.sound.play(key, { volume: 1 });
      return;
    }
    const prompt = this.battle.prompts[this.promptIndex];
    const word = prompt.targetWords[0];
    this.speech.say(prompt.spokenPrompt ?? `Find the word, ${word}.`);
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
        this.sound.play("vo-correct", { volume: 0.9 }); // male "Correct!"
        this.time.delayedCall(700, () => this.advance());
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
      this.sound.play("win", { volume: 0.6 });
      this.sound.play("vo-win", { volume: 1 }); // male "You win!"
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
