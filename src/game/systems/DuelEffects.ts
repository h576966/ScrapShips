import Phaser from "phaser";
import { PICKUP_DEFINITIONS, type PickupType } from "./PickupSystem";

export class DuelEffects {
  constructor(private readonly scene: Phaser.Scene) {}

  createImpact(x: number, y: number, color: number): void {
    const impact = this.scene.add.circle(x, y, 7, color, 0.85);
    impact.setDepth(30);
    this.scene.tweens.add({
      targets: impact,
      alpha: 0,
      scale: 2.2,
      duration: 160,
      onComplete: () => impact.destroy()
    });
  }

  createAsteroidBreak(x: number, y: number, color: number): void {
    for (let i = 0; i < 7; i += 1) {
      const angle = (Math.PI * 2 * i) / 7;
      const fragment = this.scene.add.rectangle(x, y, 5, 3, color, 0.9);
      fragment.setDepth(30);
      fragment.setRotation(angle);
      this.scene.tweens.add({
        targets: fragment,
        x: x + Math.cos(angle) * Phaser.Math.Between(18, 42),
        y: y + Math.sin(angle) * Phaser.Math.Between(18, 42),
        alpha: 0,
        duration: 280,
        onComplete: () => fragment.destroy()
      });
    }
  }

  createPickupCollect(x: number, y: number, type: PickupType): void {
    const pulse = this.scene.add.circle(
      x,
      y,
      12,
      PICKUP_DEFINITIONS[type].color,
      0.35
    );
    pulse.setDepth(31);
    this.scene.tweens.add({
      targets: pulse,
      alpha: 0,
      scale: 2.6,
      duration: 220,
      onComplete: () => pulse.destroy()
    });
  }

  createMineExplosion(x: number, y: number, color: number, radius: number): void {
    const ring = this.scene.add.circle(x, y, radius, color, 0.12);
    ring.setStrokeStyle(3, color, 0.85);
    ring.setDepth(32);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.25,
      duration: 260,
      onComplete: () => ring.destroy()
    });

    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10;
      const spark = this.scene.add.circle(x, y, 3, color, 0.9);
      spark.setDepth(33);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * Phaser.Math.Between(24, radius),
        y: y + Math.sin(angle) * Phaser.Math.Between(24, radius),
        alpha: 0,
        duration: 220,
        onComplete: () => spark.destroy()
      });
    }
  }
}
