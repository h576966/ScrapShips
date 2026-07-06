import Phaser from "phaser";
import { ASSET_KEYS, getVisualQualityConfig } from "../data/assets";
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

type Dust = {
  sprite: Phaser.GameObjects.Image;
  driftX: number;
  driftY: number;
};

const STAR_LAYERS: readonly StarLayer[] = [
  { count: 120, radius: [1, 1], alpha: [0.16, 0.42], driftX: -1.4, driftY: 0.25 },
  { count: 72, radius: [1, 2], alpha: [0.28, 0.64], driftX: -2.4, driftY: 0.35 },
  { count: 34, radius: [2, 2], alpha: [0.4, 0.78], driftX: -3.3, driftY: 0.5 }
];

export class SpaceBackground {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private readonly stars: Star[] = [];
  private readonly dust: Dust[] = [];

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
    for (const dust of this.dust) {
      dust.sprite.x += dust.driftX * dt;
      dust.sprite.y += dust.driftY * dt;
      wrap(dust.sprite);
    }
  }

  destroy(): void {
    for (const object of this.objects) {
      object.destroy();
    }
    this.objects.length = 0;
    this.stars.length = 0;
    this.dust.length = 0;
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
    this.createDistantSilhouettes();

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

    this.createSpaceDust();
    this.createArenaBoundary();
  }

  private createArenaBoundary(): void {
    const border = this.scene.add.rectangle(
      ARENA_WIDTH / 2,
      ARENA_HEIGHT / 2,
      ARENA_WIDTH - 32,
      ARENA_HEIGHT - 32
    );
    border.setStrokeStyle(3, 0x1a3654, 0.9);
    border.setDepth(-2);
    this.objects.push(border);

    const inner = this.scene.add.rectangle(
      ARENA_WIDTH / 2,
      ARENA_HEIGHT / 2,
      ARENA_WIDTH - 72,
      ARENA_HEIGHT - 72
    );
    inner.setStrokeStyle(1, 0x5f88aa, 0.22);
    inner.setDepth(-2);
    this.objects.push(inner);

    for (const [x, y, rotation] of [
      [44, 44, 0],
      [ARENA_WIDTH - 44, 44, Math.PI / 2],
      [ARENA_WIDTH - 44, ARENA_HEIGHT - 44, Math.PI],
      [44, ARENA_HEIGHT - 44, -Math.PI / 2]
    ] as const) {
      const corner = this.scene.add.rectangle(x, y, 70, 8, 0x24405f, 0.72);
      corner.setRotation(rotation);
      corner.setDepth(-1);
      this.objects.push(corner);
    }
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

  private createDistantSilhouettes(): void {
    const planet = this.scene.add.circle(ARENA_WIDTH * 0.82, ARENA_HEIGHT * 0.22, 92);
    planet.setFillStyle(0x25405c, 0.11);
    planet.setDepth(-16);
    this.objects.push(planet);

    for (let offset = -48; offset <= 48; offset += 24) {
      const band = this.scene.add.rectangle(
        ARENA_WIDTH * 0.82,
        ARENA_HEIGHT * 0.22 + offset,
        160 - Math.abs(offset),
        7,
        0x8bb5d6,
        0.05
      );
      band.setDepth(-15);
      this.objects.push(band);
    }

    const moon = this.scene.add.circle(ARENA_WIDTH * 0.14, ARENA_HEIGHT * 0.73, 42);
    moon.setFillStyle(0x496279, 0.09);
    moon.setDepth(-16);
    this.objects.push(moon);
  }

  private createSpaceDust(): void {
    if (!this.scene.textures.exists(ASSET_KEYS.generated.background.dust)) {
      return;
    }

    const quality = getVisualQualityConfig("medium");
    for (let i = 0; i < quality.backgroundDustCount; i += 1) {
      const sprite = this.scene.add.image(
        Phaser.Math.Between(6, ARENA_WIDTH - 6),
        Phaser.Math.Between(6, ARENA_HEIGHT - 6),
        ASSET_KEYS.generated.background.dust
      );
      sprite.setDepth(-9);
      sprite.setAlpha(Phaser.Math.FloatBetween(0.12, 0.34));
      sprite.setScale(Phaser.Math.FloatBetween(0.7, 1.5));
      this.objects.push(sprite);
      this.dust.push({
        sprite,
        driftX: Phaser.Math.FloatBetween(-8, -3),
        driftY: Phaser.Math.FloatBetween(0.4, 1.4)
      });
    }
  }
}

function wrap(object: { x: number; y: number }): void {
  if (object.x < -8) {
    object.x = ARENA_WIDTH + 8;
  } else if (object.x > ARENA_WIDTH + 8) {
    object.x = -8;
  }

  if (object.y < -8) {
    object.y = ARENA_HEIGHT + 8;
  } else if (object.y > ARENA_HEIGHT + 8) {
    object.y = -8;
  }
}
