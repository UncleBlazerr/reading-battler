import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { StartScene } from "./scenes/StartScene";
import { TransitionScene } from "./scenes/TransitionScene";
import { BattleScene } from "./scenes/BattleScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#0d0d12",
  // Our characters are hand-authored pixel art (tools/gen-sprites.py); nearest
  // sampling keeps their chunky edges crisp when the FIT scale mode stretches
  // the canvas to the viewport.
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 640,
  },
  scene: [BootScene, StartScene, TransitionScene, BattleScene],
});
