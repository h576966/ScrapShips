import Phaser from "phaser";
import { ASSET_KEYS, loadScrapshipsAssets } from "../data/assets";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.cameras.main.setBackgroundColor("#050910");
    loadScrapshipsAssets(this);
  }

  create(): void {
    createGeneratedVisualTextures(this);
    this.scene.start("MainMenuScene");
  }
}

export function createGeneratedVisualTextures(scene: Phaser.Scene): void {
  createBoltTexture(scene);
  createRailTexture(scene);
  createCorrosiveTexture(scene);
  createDustTexture(scene);
}

function createBoltTexture(scene: Phaser.Scene): void {
  createTexture(scene, ASSET_KEYS.generated.projectiles.bolt, 18, 10, (graphics) => {
    graphics.fillStyle(0x4a2f00, 1);
    graphics.fillRect(2, 3, 13, 4);
    graphics.fillStyle(0xfff08a, 1);
    graphics.fillRect(4, 2, 9, 6);
    graphics.fillStyle(0xffffff, 0.9);
    graphics.fillRect(7, 3, 5, 2);
  });
}

function createRailTexture(scene: Phaser.Scene): void {
  createTexture(scene, ASSET_KEYS.generated.projectiles.rail, 32, 6, (graphics) => {
    graphics.fillStyle(0x9edfff, 0.6);
    graphics.fillRect(1, 2, 30, 2);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(8, 1, 20, 4);
  });
}

function createCorrosiveTexture(scene: Phaser.Scene): void {
  createTexture(
    scene,
    ASSET_KEYS.generated.projectiles.corrosive,
    18,
    10,
    (graphics) => {
      graphics.fillStyle(0x193d14, 1);
      graphics.fillRect(2, 3, 13, 4);
      graphics.fillStyle(0x85ff66, 1);
      graphics.fillRect(4, 2, 9, 6);
      graphics.fillStyle(0xe9ffd6, 0.9);
      graphics.fillRect(7, 3, 5, 2);
    }
  );
}

function createDustTexture(scene: Phaser.Scene): void {
  createTexture(scene, ASSET_KEYS.generated.background.dust, 5, 5, (graphics) => {
    graphics.fillStyle(0xb7d8ff, 0.5);
    graphics.fillRect(2, 0, 1, 5);
    graphics.fillRect(0, 2, 5, 1);
    graphics.fillStyle(0xffffff, 0.8);
    graphics.fillRect(2, 2, 1, 1);
  });
}

function createTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (graphics: Phaser.GameObjects.Graphics) => void
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const graphics = scene.add.graphics();
  draw(graphics);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}
