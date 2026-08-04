import Phaser from "phaser";
import type { Battle, FindWordBattle, SpellBattle, SpellWordPrompt } from "../content/types";
import { buildLevel } from "../content/ladder";
import { type EnemyDef, isBossLevel } from "../content/enemies";
import { depthTintForLevel, roomForLevel } from "../content/rooms";
import { PromptTracker, questBannerFor } from "../game/validation";
import { SpellBoard } from "../game/spelling";
import { Speech } from "../game/speech";
import { ELEMENTS, resolveElement, type ElementChoice } from "../game/elements";
import { confetti, floatingDamage, playAttack } from "../game/effects";

const W = 960;
const H = 640;
// Side-on battle: player on the left, enemy on the right, facing off.
const GROUND = 432;
const PLAYER = new Phaser.Math.Vector2(186, GROUND);
const CAST = new Phaser.Math.Vector2(250, 300); // where the player's attack launches from
const ENEMY = new Phaser.Math.Vector2(760, 300); // aim point (mid-body) for projectiles & damage
const PLAYER_SCALE = 0.58;

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

// Spell-the-word: the clear vertical "lane" between the two combatants where the
// answer slots sit, and the tile tray along the bottom.
const SPELL = {
  slotCenterX: 445,
  slotY: 188,
  slotH: 56,
  slotMax: 66,
  slotGap: 8,
  laneWidth: 300, // room between the player (right edge) and enemy (left edge)
  trayY: 512,
  tileH: 56,
  tileGap: 12,
  fontSize: 26,
} as const;

interface SlotView {
  index: number;
  x: number;
  box: Phaser.GameObjects.Rectangle;
  w: number;
  tile: TileView | null;
}

interface TileView {
  value: string;
  container: Phaser.GameObjects.Container;
  btn: Phaser.GameObjects.NineSlice;
  home: { x: number; y: number };
  slot: number | null;
  locked: boolean;
  /** Pointer→tile offset captured on grab, so the tile stays under the finger. */
  grabX: number;
  grabY: number;
}

export class BattleScene extends Phaser.Scene {
  private level = 1;
  private battle!: Battle;
  private enemyDef!: EnemyDef;
  private speech!: Speech;

  private hp = 0;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;

  private enemy!: Phaser.GameObjects.Image;
  private enemyBaseY = GROUND;
  private player!: Phaser.GameObjects.Image;
  private hpBarWidth = 0;

  private cards: CardView[] = [];
  private promptText!: Phaser.GameObjects.Text;
  private speaker!: Phaser.GameObjects.Container;
  private progressText!: Phaser.GameObjects.Text;

  // Spell-the-word state.
  private spellSlots: SlotView[] = [];
  private spellTiles: TileView[] = [];
  private spellBoard!: SpellBoard;
  private spellIndex = 0;
  private dragReady = false; // scene-level drag listeners registered once

  private promptIndex = 0;
  private tracker!: PromptTracker;
  private hitIndex = 0;
  private praiseIndex = 0;
  private elementChoice: ElementChoice = "auto";
  private inputLocked = false;
  private over = false;

  constructor() {
    super("Battle");
  }

  /** Narrowed accessors — each is only used from within its own quest mode. */
  private get findBattle(): FindWordBattle {
    return this.battle as FindWordBattle;
  }
  private get spellBattle(): SpellBattle {
    return this.battle as SpellBattle;
  }

  create(): void {
    // Which rung of the ladder are we on? StartScene sets this to 1; each win
    // bumps it. buildLevel() hands back the enemy + quest for this level.
    this.level = (this.registry.get("level") as number) ?? 1;
    const plan = buildLevel(this.level);
    this.battle = plan.battle;
    this.enemyDef = plan.enemy;

    this.hp = this.battle.enemy.maxHp;
    this.elementChoice = (this.registry.get("element") as ElementChoice) ?? "auto";
    this.speech = new Speech();
    this.promptIndex = 0;
    this.hitIndex = 0;
    this.over = false;
    // Scenes are reused across restarts — start each level with clean UI state.
    this.cards = [];
    this.spellSlots = [];
    this.spellTiles = [];
    this.spellIndex = 0;

    this.buildBackground();
    this.buildPlayer();
    this.buildEnemy();
    this.buildHpBar();
    this.buildPromptUi();

    if (this.battle.kind === "spell") {
      this.registerDragHandlers();
      this.startSpellWord();
    } else {
      this.buildCards();
      this.startPrompt();
    }
  }

  // ---- Arena / Player ------------------------------------------------------

  private buildBackground(): void {
    // Fallback fill in case the room texture is missing, then the castle room
    // for this level. The per-wing tint shifts the palette as the player climbs
    // so deeper floors read as a different part of the castle (see rooms.ts).
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0d12).setDepth(-101);
    const room = roomForLevel(this.level);
    this.add
      .image(W / 2, H / 2, room.key)
      .setDisplaySize(W, H)
      .setTint(depthTintForLevel(this.level))
      .setDepth(-100);

    // Soft contact shadows so the combatants read as standing on the floor.
    this.add.ellipse(PLAYER.x, GROUND + 4, 150, 26, 0x000000, 0.32).setDepth(1);
    this.add.ellipse(ENEMY.x, GROUND + 4, 210, 30, 0x000000, 0.32).setDepth(1);
  }

  private buildPlayer(): void {
    this.player = this.add
      .image(PLAYER.x, PLAYER.y, "player-idle")
      .setOrigin(0.5, 1)
      .setScale(PLAYER_SCALE)
      .setDepth(10);
    this.add
      .text(PLAYER.x, GROUND + 16, "You", {
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
        fontSize: "18px",
        color: "#c8cde0",
      })
      .setOrigin(0.5)
      .setDepth(10);
  }

  private playerAttackPose(): void {
    if (this.over) return;
    this.player.setTexture("player-attack");
    this.time.delayedCall(500, () => {
      if (!this.over) this.player.setTexture("player-idle");
    });
  }

  // ---- Enemy ---------------------------------------------------------------

  private buildEnemy(): void {
    // This level's enemy — a single hand-authored pixel-art sprite standing on
    // the ground line, facing the hero. Sprite + scale come from the roster
    // (see src/content/enemies.ts, tools/gen-sprites.py).
    this.enemyBaseY = GROUND;
    this.enemy = this.add
      .image(ENEMY.x, this.enemyBaseY, this.enemyDef.key)
      .setOrigin(0.5, 1)
      .setScale(this.enemyDef.scale)
      .setDepth(10);

    // Idle bob — a gentle hover off the ground line.
    this.tweens.add({
      targets: this.enemy,
      y: this.enemyBaseY - 8,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private hurtEnemy(): void {
    this.enemy.setTint(0xff6b6b);
    this.time.delayedCall(220, () => this.enemy.clearTint());
    this.tweens.add({ targets: this.enemy, angle: { from: -6, to: 6 }, duration: 60, yoyo: true, repeat: 3, onComplete: () => this.enemy.setAngle(0) });
  }

  /** Harmless "enemy takes a turn" squash on a wrong tap (soft fail). */
  private enemyTaunt(): void {
    const s = this.enemyDef.scale;
    this.tweens.add({
      targets: this.enemy,
      scaleX: s * 1.06,
      scaleY: s * 0.94,
      duration: 120,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  // ---- HP bar --------------------------------------------------------------

  private buildHpBar(): void {
    const cx = ENEMY.x;
    const cy = 120;
    const panelW = 340;
    const panelH = 50;
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
    // Ladder position — a small "Level N" badge (a crown on boss levels) so the
    // player always knows how high they've climbed.
    const boss = isBossLevel(this.level);
    this.add
      .text(24, 24, `${boss ? "👑 " : ""}Level ${this.level}`, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "24px",
        color: boss ? "#ffe14d" : "#c8cde0",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0, 0.5)
      .setDepth(20);

    // Quest banner — states the objective in words, including the target word,
    // so the child always knows what to find (see ADR 0003 update).
    this.promptText = this.add
      .text(W / 2, 56, "", {
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
    this.speaker = this.add.container(0, 56, [bg, icon]);
    this.speaker.setDepth(20);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", () => this.replayPrompt());

    this.progressText = this.add
      .text(W / 2, 96, "", { fontFamily: "Arial, sans-serif", fontSize: "20px", color: "#c8cde0" })
      .setOrigin(0.5)
      .setDepth(20);
  }

  // ---- Cards ---------------------------------------------------------------

  private buildCards(): void {
    const words = this.findBattle.sentenceWords;
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
    const prompt = this.findBattle.prompts[this.promptIndex];
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
    const prompt = this.findBattle.prompts[this.promptIndex];
    const total = prompt.targetWords.length;
    if (total > 1) {
      const found = this.cards.filter((c) => c.found).length;
      this.progressText.setText(`${found} / ${total} found`);
    } else {
      this.progressText.setText("");
    }
  }

  private speakPrompt(): void {
    // The baked male-voice clips are authored for level 1 only (they match its
    // exact prompts, in order). On every other level the prompts are generated,
    // so use browser TTS — the intended fallback.
    const prompt = this.findBattle.prompts[this.promptIndex];
    const key = `voice-p${this.promptIndex}`;
    if (this.level === 1 && this.cache.audio.exists(key)) {
      this.sound.play(key, { volume: 1 });
      return;
    }
    const word = prompt.targetWords[0];
    this.speech.say(prompt.spokenPrompt ?? `Find the word, ${word}.`);
  }

  /**
   * A big, bright, bouncy word of praise on each correct answer — replaces the
   * spoken "Correct!" with something visual and exciting for young players.
   */
  private celebrate(): void {
    const words = ["GREAT!", "AWESOME!", "WOW!", "SUPER!", "YES!", "NICE!", "AMAZING!", "YAY!"];
    const colors = ["#ff5ea8", "#ffd23f", "#4dd2ff", "#8bd450", "#b78fff", "#ff8a3d"];
    const i = this.praiseIndex++;
    const label = this.add
      .text(W / 2, 244, words[i % words.length], {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "72px",
        color: colors[i % colors.length],
        stroke: "#000000",
        strokeThickness: 9,
      })
      .setOrigin(0.5)
      .setDepth(90)
      .setScale(0)
      .setAngle(-6);

    // Pop in with an overshoot, wiggle, then float up and fade away.
    this.tweens.add({ targets: label, scale: 1, duration: 340, ease: "Back.easeOut" });
    this.tweens.add({ targets: label, angle: 6, duration: 110, yoyo: true, repeat: 1, ease: "Sine.easeInOut" });
    this.tweens.add({
      targets: label,
      y: 196,
      alpha: 0,
      scale: 1.25,
      delay: 620,
      duration: 420,
      ease: "Quad.easeIn",
      onComplete: () => label.destroy(),
    });
    confetti(this, W / 2, 232); // a little sparkle burst
  }

  /** Replay the current objective's audio (find or spell). */
  private replayPrompt(): void {
    if (this.battle.kind === "spell") this.speakSpellWord();
    else this.speakPrompt();
  }

  /**
   * Shared "hero casts, projectile flies, enemy is hurt" beat used by both quest
   * types. Deducts `damage`, plays the visuals/sfx, and either wins the battle
   * (hp ≤ 0) or calls `onResolved` so the caller can continue its own flow.
   */
  private castAttack(damage: number, onResolved: () => void): void {
    const element = resolveElement(this.elementChoice, this.hitIndex++);
    this.sound.play(ELEMENTS[element].sound, { volume: 0.6 });
    this.playerAttackPose();

    // Projectile leaves the player (left) and flies to the enemy (right).
    playAttack(this, element, CAST.x, CAST.y, ENEMY.x, ENEMY.y, () => {
      this.hp = Math.max(0, this.hp - damage);
      this.updateHpBar();
      floatingDamage(this, ENEMY.x, ENEMY.y - 40, damage, ELEMENTS[element].color);
      this.sound.play("impact", { volume: 0.7 });
      this.hurtEnemy();

      if (this.hp <= 0) {
        this.win();
        return;
      }
      onResolved();
    });
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

    this.castAttack(outcome.damage, () => {
      if (outcome.complete) {
        this.celebrate(); // vibrant praise text instead of a spoken "Correct!"
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
    if (this.promptIndex >= this.findBattle.prompts.length) {
      this.win(); // ran out of prompts — treat as victory
      return;
    }
    this.startPrompt();
  }

  // ---- Spell-the-word flow -------------------------------------------------

  private startSpellWord(): void {
    const prompt = this.spellBattle.words[this.spellIndex];
    this.spellBoard = new SpellBoard(prompt.tiles);
    this.inputLocked = false;

    this.promptText.setText(`Spell:  "${this.capitalize(prompt.word)}"`);
    this.speaker.setPosition(this.promptText.x + this.promptText.displayWidth / 2 + 34, this.promptText.y);
    this.updateSpellProgress();
    this.buildSpellSlots(prompt.tiles.length);
    this.buildSpellTiles(prompt);
    this.speakSpellWord();
  }

  private updateSpellProgress(): void {
    const total = this.spellBattle.words.length;
    this.progressText.setText(total > 1 ? `Word ${this.spellIndex + 1} / ${total}` : "");
  }

  private speakSpellWord(): void {
    const word = this.spellBattle.words[this.spellIndex].word;
    this.speech.say(`Spell the word. ${word}.`);
  }

  /** The empty answer boxes across the clear lane between the combatants. */
  private buildSpellSlots(n: number): void {
    const gap = SPELL.slotGap;
    const w = Math.min(SPELL.slotMax, Math.floor((SPELL.laneWidth - (n - 1) * gap) / n));
    const totalW = n * w + (n - 1) * gap;
    const startX = SPELL.slotCenterX - totalW / 2 + w / 2;
    for (let i = 0; i < n; i++) {
      const x = startX + i * (w + gap);
      const box = this.add
        .rectangle(x, SPELL.slotY, w, SPELL.slotH, 0x120e1a, 0.72)
        .setStrokeStyle(3, 0x6bd6ff)
        .setDepth(15);
      this.spellSlots.push({ index: i, x, box, w, tile: null });
    }
  }

  /** The shuffled draggable tiles (correct graphemes + distractors) in the tray. */
  private buildSpellTiles(prompt: SpellWordPrompt): void {
    const values = this.seededShuffle(
      [...prompt.tiles, ...prompt.distractors],
      this.level * 31 + this.spellIndex * 7,
    );
    const n = values.length;
    const perRow = Math.min(n, 6);
    const rows = Math.ceil(n / perRow);
    const tileW = 84;
    const gap = SPELL.tileGap;
    const rowStep = SPELL.tileH + 10;

    values.forEach((val, idx) => {
      const row = Math.floor(idx / perRow);
      const colCount = row === rows - 1 ? n - perRow * row : perRow;
      const rowWidth = colCount * tileW + (colCount - 1) * gap;
      const startX = W / 2 - rowWidth / 2 + tileW / 2;
      const col = idx - row * perRow;
      const x = startX + col * (tileW + gap);
      const y = SPELL.trayY + row * rowStep - ((rows - 1) * rowStep) / 2;
      this.spellTiles.push(this.makeTile(val, x, y, tileW));
    });
  }

  private makeTile(value: string, x: number, y: number, w: number): TileView {
    const btn = this.add.nineslice(0, 0, "ui-button", undefined, w, SPELL.tileH, 18, 18, 16, 16);
    const label = this.add
      .text(0, -1, value, {
        fontFamily: "Arial, sans-serif",
        fontStyle: "bold",
        fontSize: `${SPELL.fontSize}px`,
        color: CARD_TEXT.normal,
      })
      .setOrigin(0.5);
    const container = this.add.container(x, y, [btn, label]).setDepth(30);
    const tile: TileView = { value, container, btn, home: { x, y }, slot: null, locked: false, grabX: 0, grabY: 0 };
    // A generous, centred hit area so the whole tile (and a little around it) is
    // easy to grab with a fingertip.
    const pad = 8;
    container.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2 - pad, -SPELL.tileH / 2 - pad, w + pad * 2, SPELL.tileH + pad * 2),
      Phaser.Geom.Rectangle.Contains,
    );
    this.input.setDraggable(container);
    container.setData("tile", tile);
    return tile;
  }

  private registerDragHandlers(): void {
    if (this.dragReady) return; // scene instance persists across restarts
    this.dragReady = true;

    this.input.on("dragstart", (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      const tile = obj.getData("tile") as TileView | undefined;
      if (!tile || tile.locked || this.inputLocked) return;
      // Remember where on the tile the finger landed, so it doesn't snap to the
      // tile's centre — the grabbed point stays under the finger.
      tile.grabX = tile.container.x - p.worldX;
      tile.grabY = tile.container.y - p.worldY;
      tile.container.setDepth(60);
      this.tweens.add({ targets: tile.container, scale: 1.1, duration: 80 });
    });
    this.input.on("drag", (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      const tile = obj.getData("tile") as TileView | undefined;
      if (!tile || tile.locked || this.inputLocked) return;
      tile.container.setPosition(p.worldX + tile.grabX, p.worldY + tile.grabY);
    });
    this.input.on("dragend", (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      const tile = obj.getData("tile") as TileView | undefined;
      if (!tile || tile.locked) return;
      this.tweens.add({ targets: tile.container, scale: 1, duration: 80 });
      tile.container.setDepth(30);
      this.onTileDrop(tile);
    });
  }

  /** Resolve where a dropped tile lands: into a slot, or back to the tray. */
  private onTileDrop(tile: TileView): void {
    const c = tile.container;
    const slot = this.spellSlots.find(
      (s) => Math.abs(c.x - s.x) <= s.w / 2 + 22 && Math.abs(c.y - SPELL.slotY) <= SPELL.slotH / 2 + 44,
    );

    if (!slot || this.inputLocked) {
      if (tile.slot !== null) this.spellSlots[tile.slot].tile = null;
      this.returnTileHome(tile);
      return;
    }

    // Vacate the tile's previous slot.
    if (tile.slot !== null && tile.slot !== slot.index) this.spellSlots[tile.slot].tile = null;
    // Eject whoever was already in the target slot back to the tray.
    if (slot.tile && slot.tile !== tile) {
      const occupant = slot.tile;
      occupant.slot = null;
      this.returnTileHome(occupant);
    }
    slot.tile = tile;
    tile.slot = slot.index;
    this.sound.play("tap", { volume: 0.5 });
    this.tweens.add({ targets: c, x: slot.x, y: SPELL.slotY, duration: 120, ease: "Back.easeOut" });
    this.checkSpell();
  }

  private returnTileHome(tile: TileView): void {
    tile.slot = null;
    this.tweens.add({ targets: tile.container, x: tile.home.x, y: tile.home.y, duration: 160, ease: "Quad.easeOut" });
  }

  /** Sync the board with the slots; if every slot is filled, judge the answer. */
  private checkSpell(): void {
    for (const s of this.spellSlots) {
      if (s.tile) this.spellBoard.place(s.index, s.tile.value);
      else this.spellBoard.clear(s.index);
    }
    if (!this.spellBoard.isFull) return;
    if (this.spellBoard.isSolved) this.onSpellSolved();
    else this.onSpellWrong();
  }

  private onSpellSolved(): void {
    this.inputLocked = true;
    for (const s of this.spellSlots) {
      if (s.tile) {
        s.tile.locked = true;
        s.tile.btn.setTint(CARD_TINT.found);
        s.box.setStrokeStyle(3, 0x8fd06a);
      }
    }
    this.celebrate(); // vibrant praise text instead of a spoken "Correct!"

    const prompt = this.spellBattle.words[this.spellIndex];
    this.castAttack(prompt.damage, () => {
      // Enemy survived (more words to spell) — advance to the next word.
      this.time.delayedCall(500, () => {
        this.spellIndex += 1;
        this.clearSpellUi();
        this.startSpellWord();
      });
    });
  }

  private onSpellWrong(): void {
    this.sound.play("wrong", { volume: 0.5 });
    this.enemyTaunt();
    // Flash the wrong slots and send only those tiles back to the tray; correct
    // placements stay put. No damage, no penalty — the child just tries again.
    const correct = this.spellBoard.evaluate();
    for (const s of this.spellSlots) {
      if (!correct[s.index] && s.tile) {
        const tile = s.tile;
        s.box.setStrokeStyle(3, 0xff5555);
        this.time.delayedCall(450, () => s.box.setStrokeStyle(3, 0x6bd6ff));
        s.tile = null;
        tile.slot = null;
        this.returnTileHome(tile);
      }
    }
    this.speech.say("Try again.");
  }

  private clearSpellUi(): void {
    for (const t of this.spellTiles) t.container.destroy();
    for (const s of this.spellSlots) s.box.destroy();
    this.spellTiles = [];
    this.spellSlots = [];
  }

  private capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }

  private seededShuffle<T>(arr: T[], seed: number): T[] {
    const a = [...arr];
    let s = (seed * 2654435761) >>> 0;
    const rnd = () => {
      s = (1103515245 * s + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- Win -----------------------------------------------------------------

  private win(): void {
    if (this.over) return;
    this.over = true;
    this.inputLocked = true;
    this.progressText.setText("");
    this.promptText.setText("");

    // Player celebrates; enemy topples and fades.
    this.player.setTexture("player-cheer");
    this.tweens.killTweensOf(this.enemy); // stop the idle bob before the topple
    this.tweens.add({ targets: this.enemy, angle: 90, y: this.enemyBaseY + 24, alpha: 0.25, duration: 700, ease: "Cubic.easeIn" });

    const beatBoss = isBossLevel(this.level);
    this.time.delayedCall(500, () => {
      this.sound.play("win", { volume: 0.6 });
      this.sound.play("vo-win", { volume: 1 }); // male "You win!"
      confetti(this, W / 2, 200);
      this.add
        .text(W / 2, 268, beatBoss ? "BOSS DEFEATED!" : "YOU DID IT!", {
          fontFamily: "Arial Black, Arial, sans-serif",
          fontSize: beatBoss ? "64px" : "72px",
          color: "#ffe14d",
          stroke: "#000000",
          strokeThickness: 8,
        })
        .setOrigin(0.5)
        .setDepth(80);
      this.add
        .text(W / 2, 330, `Level ${this.level} cleared`, {
          fontFamily: "Arial, sans-serif",
          fontStyle: "bold",
          fontSize: "26px",
          color: "#c8cde0",
          stroke: "#000000",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(80);

      // The ladder never ends — every win leads straight to the next enemy.
      const next = this.add.rectangle(W / 2, 430, 320, 80, 0x8bd450).setStrokeStyle(4, 0xffffff).setDepth(80);
      this.add
        .text(W / 2, 430, `▶  Level ${this.level + 1}`, { fontFamily: "Arial Black, Arial, sans-serif", fontSize: "32px", color: "#0d0d12" })
        .setOrigin(0.5)
        .setDepth(81);
      next.setInteractive({ useHandCursor: true });
      next.on("pointerdown", () => {
        this.registry.set("level", this.level + 1);
        this.scene.start("Transition"); // castle "loading" screen, then the next room
      });
    });
  }
}
