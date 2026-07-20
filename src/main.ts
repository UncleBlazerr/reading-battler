import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { StartScene } from "./scenes/StartScene";
import { BattleScene } from "./scenes/BattleScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#0d0d12",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 640,
  },
  scene: [BootScene, StartScene, BattleScene],
});
