import Phaser from "phaser";
import "./style.css";
import { GarageScene } from "./game/scenes/GarageScene";
import { MainMenuScene } from "./game/scenes/MainMenuScene";
import { DuelScene } from "./game/scenes/DuelScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  parent: "game-root",
  width: 1024,
  height: 640,
  backgroundColor: "#07111c",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [MainMenuScene, GarageScene, DuelScene]
};

new Phaser.Game(config);
