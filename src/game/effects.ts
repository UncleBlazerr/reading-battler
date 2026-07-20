// Attack "juice": a projectile flies from the player to the enemy, bursts into
// element-tinted particles, shakes the screen, and pops a floating damage
// number. All code/particle-driven — no sprite assets (grilling decision).

import Phaser from "phaser";
import { ELEMENTS } from "./elements";
import type { Element } from "../content/types";

/**
 * Fires an attack effect from (fromX, fromY) to (toX, toY). Calls `onImpact`
 * when the projectile lands so the caller can apply damage, sound, and enemy
 * reaction at the right moment.
 */
export function playAttack(
  scene: Phaser.Scene,
  element: Element,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  onImpact: () => void,
): void {
  const style = ELEMENTS[element];

  // Trailing particles that follow the projectile.
  const trail = scene.add.particles(fromX, fromY, "spark", {
    speed: { min: 20, max: 80 },
    scale: { start: 0.9, end: 0 },
    alpha: { start: 0.9, end: 0 },
    lifespan: 300,
    frequency: 15,
    tint: style.color,
    blendMode: Phaser.BlendModes.ADD,
  });
  trail.setDepth(50);

  const projectile = scene.add.circle(fromX, fromY, 16, style.accent).setDepth(51);
  projectile.setStrokeStyle(4, style.color);

  scene.tweens.add({
    targets: [projectile],
    x: toX,
    y: toY,
    duration: 380,
    ease: "Quad.easeIn",
    onUpdate: () => trail.setPosition(projectile.x, projectile.y),
    onComplete: () => {
      trail.stop();
      scene.time.delayedCall(300, () => trail.destroy());
      projectile.destroy();
      burst(scene, element, toX, toY);
      scene.cameras.main.shake(180, 0.012);
      onImpact();
    },
  });
}

/** A radial particle burst + flash at the impact point. */
function burst(scene: Phaser.Scene, element: Element, x: number, y: number): void {
  const style = ELEMENTS[element];

  const flash = scene.add.circle(x, y, 60, style.accent, 0.8).setDepth(52);
  scene.tweens.add({
    targets: flash,
    scale: 2.2,
    alpha: 0,
    duration: 260,
    ease: "Cubic.easeOut",
    onComplete: () => flash.destroy(),
  });

  const emitter = scene.add.particles(x, y, "spark", {
    speed: { min: 120, max: 340 },
    scale: { start: 1.2, end: 0 },
    alpha: { start: 1, end: 0 },
    lifespan: { min: 300, max: 650 },
    tint: [style.color, style.accent],
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  emitter.setDepth(52);
  emitter.explode(28);
  scene.time.delayedCall(700, () => emitter.destroy());
}

/** Floating "-20" style damage number that rises and fades. */
export function floatingDamage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  color: number,
): void {
  const label = scene.add
    .text(x, y, `-${amount}`, {
      fontFamily: "Arial Black, Arial, sans-serif",
      fontSize: "44px",
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      stroke: "#000000",
      strokeThickness: 6,
    })
    .setOrigin(0.5)
    .setDepth(60);

  scene.tweens.add({
    targets: label,
    y: y - 90,
    alpha: 0,
    duration: 900,
    ease: "Cubic.easeOut",
    onComplete: () => label.destroy(),
  });
}

/** Happy confetti burst for the win celebration. */
export function confetti(scene: Phaser.Scene, x: number, y: number): void {
  const emitter = scene.add.particles(x, y, "spark", {
    speed: { min: 200, max: 500 },
    angle: { min: 200, max: 340 },
    gravityY: 600,
    scale: { start: 1.4, end: 0.2 },
    lifespan: 1600,
    tint: [0xff6b35, 0xffe14d, 0x6bd6ff, 0x8bd450, 0xff5db1],
    emitting: false,
  });
  emitter.setDepth(70);
  emitter.explode(80);
  scene.time.delayedCall(1800, () => emitter.destroy());
}
