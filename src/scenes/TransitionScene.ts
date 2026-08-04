import Phaser from "phaser";
import { isBossLevel } from "../content/enemies";
import { MAP_KEY, roomForLevel } from "../content/rooms";

const W = 960;
const H = 640;
const DURATION = 2200; // ms the map screen shows before the next battle

// A winding trail of level nodes climbing from the lowlands (bottom-left) up
// toward the castle/tower (top-right of the map art). The hero always walks the
// central step — from the just-cleared level's node to the new level's node —
// so it reads as one rung of the endless climb. Nodes are labelled relative to
// the current level; the tower is the ever-present goal.
const NODES: { x: number; y: number }[] = [
  { x: 150, y: 548 }, // n0
  { x: 300, y: 470 }, // n1  ← start (previous level)
  { x: 452, y: 512 }, // n2  ← destination (this level)
  { x: 600, y: 424 }, // n3
  { x: 720, y: 336 }, // n4
  { x: 818, y: 258 }, // n5  (just below the tower)
];
const START = 1; // hero starts on NODES[START]; walks to START+1
const DEST = 2;

export class TransitionScene extends Phaser.Scene {
  private advanced = false;

  constructor() {
    super("Transition");
  }

  create(): void {
    // Phaser reuses this scene instance across restarts, so the guard must be
    // reset every time — otherwise later transitions never start the next battle.
    this.advanced = false;

    const level = (this.registry.get("level") as number) ?? 1;
    const room = roomForLevel(level);
    const boss = isBossLevel(level);

    this.add.image(W / 2, H / 2, MAP_KEY).setDisplaySize(W, H).setDepth(-10);
    this.add.rectangle(W / 2, 70, W, 150, 0x000000, 0.28).setDepth(0); // header scrim for text

    this.drawPath();
    this.drawNodes(level);

    // ---- header text ----
    this.add
      .text(W / 2, 42, boss ? "A boss guards the way…" : "Onward up the tower!", {
        fontFamily: "Arial, sans-serif",
        fontStyle: "italic",
        fontSize: "22px",
        color: "#e8eefc",
        stroke: "#0a0e1a",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20);
    this.add
      .text(W / 2, 86, `${boss ? "👑 " : ""}Level ${level} · ${room.name}`, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "34px",
        color: boss ? "#ff6b6b" : "#ffffff",
        stroke: "#0a0e1a",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(20);

    // ---- hero walks from the previous node to this level's node ----
    const start = NODES[START];
    const hero = this.add
      .image(start.x, start.y - 4, "player-idle")
      .setOrigin(0.5, 1)
      .setScale(0.24)
      .setDepth(15);
    this.hopAlong(hero, NODES[START], NODES[DEST], 4, () => this.arrive(level));

    // ---- loading bar + skip ----
    const barW = 300;
    const barX = W / 2 - barW / 2;
    const barY = 604;
    this.add.rectangle(W / 2, barY, barW + 6, 16, 0x000000, 0.55).setDepth(20);
    this.add.rectangle(barX, barY, barW, 10, 0x20242e).setOrigin(0, 0.5).setDepth(20);
    const fill = this.add.rectangle(barX, barY, 1, 10, 0x8bd450).setOrigin(0, 0.5).setDepth(21);
    this.tweens.add({ targets: fill, width: barW, duration: DURATION, ease: "Sine.easeInOut" });
    this.add
      .text(W / 2, 626, "(tap to continue)", { fontFamily: "Arial, sans-serif", fontSize: "15px", color: "#cfe0ff" })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0.75);

    this.time.delayedCall(DURATION, () => this.go());
    this.input.once("pointerdown", () => this.go());
  }

  /** The dirt trail + evenly-spaced stepping dots linking every node. */
  private drawPath(): void {
    const g = this.add.graphics().setDepth(2);
    for (let i = 0; i < NODES.length - 1; i++) {
      const a = NODES[i];
      const b = NODES[i + 1];
      g.lineStyle(14, 0x6b4a2c, 0.9); // path base
      g.lineBetween(a.x, a.y, b.x, b.y);
      g.lineStyle(6, 0x8a6238, 0.9); // lit centre
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    // stepping dots along each segment
    for (let i = 0; i < NODES.length - 1; i++) {
      const a = NODES[i];
      const b = NODES[i + 1];
      for (let s = 1; s <= 3; s++) {
        const t = s / 4;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        this.add.circle(x, y, 5, 0xf2ead2, 0.9).setStrokeStyle(2, 0x6b4a2c).setDepth(3);
      }
    }
  }

  /** The level nodes, labelled relative to the current level. */
  private drawNodes(level: number): void {
    NODES.forEach((n, i) => {
      const label = level + (i - DEST); // DEST node == current level
      if (label < 1) return; // nothing below level 1

      const isDest = i === DEST;
      const cleared = label < level;
      const boss = label % 10 === 0;

      let fill = 0x7ec850; // upcoming (green)
      if (cleared) fill = 0x4a8b3a; // already climbed (darker green)
      if (boss) fill = isDest ? 0xe23b3b : 0x9a4b6b; // boss node (red/plum)
      if (isDest && !boss) fill = 0xffcf3f; // this level (gold)

      const ring = this.add.circle(n.x, n.y, 24, 0x000000, 0.35).setDepth(4);
      const disc = this.add.circle(n.x, n.y, 21, fill).setStrokeStyle(4, 0xffffff).setDepth(5);
      this.add
        .text(n.x, n.y - 1, boss ? "👑" : `${label}`, {
          fontFamily: "Arial Black, Arial, sans-serif",
          fontSize: boss ? "20px" : "22px",
          color: cleared ? "#e8f5df" : "#20340f",
          stroke: "#000000",
          strokeThickness: cleared || isDest ? 0 : 2,
        })
        .setOrigin(0.5)
        .setDepth(6);

      // The destination node pulses so it's clearly where we're headed.
      if (isDest) {
        this.tweens.add({ targets: [disc, ring], scale: 1.14, duration: 620, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      }
    });
  }

  /** Hop the hero from a→b in `hops` little parabolic jumps (dot to dot). */
  private hopAlong(hero: Phaser.GameObjects.Image, a: { x: number; y: number }, b: { x: number; y: number }, hops: number, done: () => void): void {
    const totalWalk = DURATION * 0.62;
    const hopDur = totalWalk / hops;
    const doHop = (i: number) => {
      if (this.advanced) return;
      if (i >= hops) {
        done();
        return;
      }
      const t0 = i / hops;
      const t1 = (i + 1) / hops;
      const x0 = a.x + (b.x - a.x) * t0;
      const y0 = a.y + (b.y - a.y) * t0;
      const x1 = a.x + (b.x - a.x) * t1;
      const y1 = a.y + (b.y - a.y) * t1;
      const arc = 26;
      const p = { t: 0 };
      this.tweens.add({
        targets: p,
        t: 1,
        duration: hopDur,
        ease: "Sine.easeInOut",
        onUpdate: () => {
          hero.x = x0 + (x1 - x0) * p.t;
          hero.y = (y0 + (y1 - y0) * p.t) - 4 - arc * Math.sin(Math.PI * p.t);
          // tiny squash at the top of the arc for bounce
          hero.setScale(0.24, 0.24 * (1 + 0.06 * Math.sin(Math.PI * p.t)));
        },
        onComplete: () => doHop(i + 1),
      });
    };
    doHop(0);
  }

  /** Landed on the destination node — little celebration puff. */
  private arrive(level: number): void {
    const n = NODES[DEST];
    const puff = this.add.particles(n.x, n.y, "spark", {
      speed: { min: 40, max: 120 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.7, end: 0 },
      lifespan: 500,
      quantity: 10,
      tint: isBossLevel(level) ? [0xff6b6b, 0xffe14d] : [0xffe14d, 0x8bd450, 0xffffff],
      emitting: false,
    });
    puff.setDepth(16);
    puff.explode(14);
    this.time.delayedCall(600, () => puff.destroy());
  }

  private go(): void {
    if (this.advanced) return;
    this.advanced = true;
    this.scene.start("Battle");
  }
}
