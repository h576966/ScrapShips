import Phaser from "phaser";
import { ARENA_HEIGHT, ARENA_WIDTH } from "../data/balance";

type StarLayer = {
  count: number;
  radius: [number, number];
  alpha: [number, number];
  driftX: number;
  driftY: number;
};

type Star = {
  shape: Phaser.GameObjects.Arc;
  driftX: number;
  driftY: number;
};

const STAR_LAYERS: readonly StarLayer[] = [
  { count: 95, radius: [1, 1], alpha: [0.18, 0.42], driftX: -1.4, driftY: 0.25 },
  { count: 65, radius: [1, 2], alpha: [0.28, 0.62], driftX: -2.4, driftY: 0.35 },
  { count: 28, radius: [2, 2], alpha: [0.4, 0.76], driftX: -3.3, driftY: 0.5 }
];

export class SpaceBackground {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly stars: Star[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.create();
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const star of this.stars) {
      star.shape.x += star.driftX * dt;
      star.shape.y += star.driftY * dt;
      wrap(star.shape);
    }
  }

  destroy(): void {
    for (const object of this.objects) {
      object.destroy();
    }
    this.objects.length = 0;
    this.stars.length = 0;
  }

  private create(): void {
    const base = this.scene.add.rectangle(
      ARENA_WIDTH / 2,
      ARENA_HEIGHT / 2,
      ARENA_WIDTH,
      ARENA_HEIGHT,
      0x050910
    );
    base.setDepth(-20);
    this.objects.push(base);

    this.createNebulaPatch(ARENA_WIDTH * 0.26, ARENA_HEIGHT * 0.28, 210, 0x132237);
    this.createNebulaPatch(ARENA_WIDTH * 0.72, ARENA_HEIGHT * 0.66, 260, 0x102531);

    for (const layer of STAR_LAYERS) {
      for (let i = 0; i < layer.count; i += 1) {
        const star = this.scene.add.circle(
          Phaser.Math.Between(6, ARENA_WIDTH - 6),
          Phaser.Math.Between(6, ARENA_HEIGHT - 6),
          Phaser.Math.Between(layer.radius[0], layer.radius[1]),
          0xffffff,
          Phaser.Math.FloatBetween(layer.alpha[0], layer.alpha[1])
        );
        star.setDepth(-10);
        this.objects.push(star);
        this.stars.push({
          shape: star,
          driftX: layer.driftX,
          driftY: layer.driftY
        });
      }
    }

    const border = this.scene.add.rectangle(
      ARENA_WIDTH / 2,
      ARENA_HEIGHT / 2,
      ARENA_WIDTH - 32,
      ARENA_HEIGHT - 32
    );
    border.setStrokeStyle(3, 0x1a3654, 0.9);
    border.setDepth(-2);
    this.objects.push(border);
  }

  private createNebulaPatch(x: number, y: number, radius: number, color: number): void {
    for (let i = 0; i < 5; i += 1) {
      const patch = this.scene.add.circle(
        x + Phaser.Math.Between(-90, 90),
        y + Phaser.Math.Between(-70, 70),
        radius * Phaser.Math.FloatBetween(0.45, 0.9),
        color,
        Phaser.Math.FloatBetween(0.035, 0.07)
      );
      patch.setDepth(-15);
      this.objects.push(patch);
    }
  }
}

function wrap(star: Phaser.GameObjects.Arc): void {
  if (star.x < -8) {
    star.x = ARENA_WIDTH + 8;
  } else if (star.x > ARENA_WIDTH + 8) {
    star.x = -8;
  }

  if (star.y < -8) {
    star.y = ARENA_HEIGHT + 8;
  } else if (star.y > ARENA_HEIGHT + 8) {
    star.y = -8;
  }
}
