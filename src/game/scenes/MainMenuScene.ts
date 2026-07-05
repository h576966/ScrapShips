import Phaser from "phaser";
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from "../data/balance";

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create(): void {
    this.add.rectangle(
      VIEWPORT_WIDTH / 2,
      VIEWPORT_HEIGHT / 2,
      VIEWPORT_WIDTH,
      VIEWPORT_HEIGHT,
      0x07111c
    );

    for (let i = 0; i < 70; i += 1) {
      this.add.circle(
        Phaser.Math.Between(8, VIEWPORT_WIDTH - 8),
        Phaser.Math.Between(8, VIEWPORT_HEIGHT - 8),
        Phaser.Math.Between(1, 2),
        0xffffff,
        Phaser.Math.FloatBetween(0.25, 0.85)
      );
    }

    this.add
      .text(VIEWPORT_WIDTH / 2, 190, "ScrapShips", {
        fontFamily: "monospace",
        fontSize: "54px",
        color: "#ffffff"
      })
      .setOrigin(0.5);

    this.add
      .text(VIEWPORT_WIDTH / 2, 252, "Local ship garage and duel prototype", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#b9cce2"
      })
      .setOrigin(0.5);

    this.addButton(VIEWPORT_WIDTH / 2, 340, "Open Garage", () => {
      this.scene.start("GarageScene");
    });

    this.addButton(VIEWPORT_WIDTH / 2, 410, "Quick Duel", () => {
      this.scene.start("DuelScene");
    });
  }

  private addButton(x: number, y: number, label: string, onClick: () => void): void {
    const box = this.add.rectangle(x, y, 240, 46, 0x122235);
    box.setStrokeStyle(2, 0x62b3ff);
    box.setInteractive({ useHandCursor: true });
    box.on("pointerdown", onClick);

    const text = this.add
      .text(x, y, label, {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#e8f4ff"
      })
      .setOrigin(0.5);
    text.setInteractive({ useHandCursor: true });
    text.on("pointerdown", onClick);
  }
}
