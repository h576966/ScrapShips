import Phaser from "phaser";
import "./style.css";
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "./game/data/balance";
import { BootScene } from "./game/scenes/BootScene";
import { GarageScene } from "./game/scenes/GarageScene";
import { MainMenuScene } from "./game/scenes/MainMenuScene";
import { DuelScene } from "./game/scenes/DuelScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  width: VIEWPORT_WIDTH,
  height: VIEWPORT_HEIGHT,
  backgroundColor: "#07111c",
  pixelArt: true,
  roundPixels: true,
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
  scene: [BootScene, MainMenuScene, GarageScene, DuelScene]
};

new Phaser.Game(config);
