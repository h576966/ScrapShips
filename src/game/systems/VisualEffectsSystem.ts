import Phaser from "phaser";
import { ASSET_KEYS, getVisualQualityConfig } from "../data/assets";
import { PICKUP_DEFINITIONS, type PickupType } from "./PickupSystem";

export class VisualEffectsSystem {
  private readonly quality = getVisualQualityConfig("medium");

  constructor(private readonly scene: Phaser.Scene) {}

  createImpact(x: number, y: number, color: number): void {
    this.createBurst(x, y, {
      textureKey: ASSET_KEYS.particles.spark,
      color,
      count: 7,
      speed: [34, 105],
      lifespan: 185,
      scale: [0.1, 0]
    });
    this.createFlashCircle(x, y, 7, color, 0.8, 2.1, 155);
  }

  createLaserImpact(x: number, y: number, color: number): void {
    this.createBurst(x, y, {
      textureKey: ASSET_KEYS.particles.spark,
      color,
      count: 4,
      speed: [24, 78],
      lifespan: 120,
      scale: [0.08, 0]
    });
  }

  createShieldShimmer(x: number, y: number, radius: number): void {
    const ring = this.scene.add.circle(x, y, radius, 0x83d8ff, 0.08);
    ring.setStrokeStyle(2, 0x95e7ff, 0.78);
    ring.setDepth(31);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.28,
      duration: 210,
      onComplete: () => ring.destroy()
    });
  }

  createHullSparks(x: number, y: number, color = 0xffd58a): void {
    this.createBurst(x, y, {
      textureKey: ASSET_KEYS.particles.spark,
      color,
      count: 8,
      speed: [36, 118],
      lifespan: 210,
      scale: [0.09, 0]
    });
  }

  createAsteroidBreak(x: number, y: number, color: number): void {
    this.createBurst(x, y, {
      textureKey: ASSET_KEYS.particles.smoke,
      color: 0x9a8f82,
      count: 7,
      speed: [18, 70],
      lifespan: 360,
      scale: [0.08, 0.01],
      blendMode: Phaser.BlendModes.NORMAL
    });

    for (let i = 0; i < 9; i += 1) {
      const angle = (Math.PI * 2 * i) / 9;
      const fragment = this.scene.add.rectangle(x, y, 5, 3, color, 0.9);
      fragment.setDepth(30);
      fragment.setRotation(angle);
      this.scene.tweens.add({
        targets: fragment,
        x: x + Math.cos(angle) * Phaser.Math.Between(22, 50),
        y: y + Math.sin(angle) * Phaser.Math.Between(22, 50),
        alpha: 0,
        duration: 320,
        onComplete: () => fragment.destroy()
      });
    }
  }

  createPickupCollect(x: number, y: number, type: PickupType): void {
    const color = PICKUP_DEFINITIONS[type].color;
    this.createBurst(x, y, {
      textureKey: ASSET_KEYS.particles.circle,
      color,
      count: 8,
      speed: [18, 86],
      lifespan: 220,
      scale: [0.07, 0]
    });
    this.createFlashCircle(x, y, 12, color, 0.32, 2.5, 220);
  }

  createMineExplosion(x: number, y: number, color: number, radius: number): void {
    const ring = this.scene.add.circle(x, y, radius, color, 0.12);
    ring.setStrokeStyle(3, color, 0.85);
    ring.setDepth(32);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.25,
      duration: 260,
      onComplete: () => ring.destroy()
    });

    this.createBurst(x, y, {
      textureKey: ASSET_KEYS.particles.spark,
      color,
      count: 14,
      speed: [70, radius * 2.1],
      lifespan: 260,
      scale: [0.12, 0]
    });
    this.createBurst(x, y, {
      textureKey: ASSET_KEYS.particles.smoke,
      color: 0x8f7960,
      count: 8,
      speed: [18, 84],
      lifespan: 420,
      scale: [0.1, 0.02],
      blendMode: Phaser.BlendModes.NORMAL
    });
  }

  createMuzzleFlash(
    x: number,
    y: number,
    angle: number,
    color: number,
    weaponType: "bolt_cannon" | "rail_shot"
  ): void {
    const flash = this.scene.add.image(x, y, ASSET_KEYS.particles.muzzle);
    flash.setDepth(30);
    flash.setTint(color);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    flash.setRotation(angle);
    flash.setScale(weaponType === "rail_shot" ? 0.14 : 0.1);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: weaponType === "rail_shot" ? 0.22 : 0.16,
      duration: weaponType === "rail_shot" ? 120 : 90,
      onComplete: () => flash.destroy()
    });
  }

  createProjectileTrail(
    x: number,
    y: number,
    angle: number,
    color: number,
    weaponType: "bolt_cannon" | "rail_shot"
  ): void {
    const trace = this.scene.add.image(x, y, ASSET_KEYS.particles.trace);
    trace.setDepth(7);
    trace.setTint(color);
    trace.setBlendMode(Phaser.BlendModes.ADD);
    trace.setRotation(angle);
    trace.setAlpha(weaponType === "rail_shot" ? 0.28 : 0.16);
    trace.setScale(weaponType === "rail_shot" ? 0.1 : 0.06);
    this.scene.tweens.add({
      targets: trace,
      alpha: 0,
      scale: weaponType === "rail_shot" ? 0.18 : 0.1,
      duration: weaponType === "rail_shot" ? 170 : 120,
      onComplete: () => trace.destroy()
    });
  }

  createShipDestruction(x: number, y: number, colors: readonly number[]): void {
    for (let index = 0; index < 14; index += 1) {
      const angle = (Math.PI * 2 * index) / 14;
      const color = colors[index % colors.length] ?? 0xffffff;
      const shard = this.scene.add.rectangle(x, y, 5, 4, color, 0.95);
      shard.setDepth(33);
      shard.setRotation(angle);
      this.scene.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * Phaser.Math.Between(30, 78),
        y: y + Math.sin(angle) * Phaser.Math.Between(30, 78),
        alpha: 0,
        duration: 390,
        onComplete: () => shard.destroy()
      });
    }
    this.createBurst(x, y, {
      textureKey: ASSET_KEYS.particles.smoke,
      color: 0x9fb0c1,
      count: 10,
      speed: [18, 86],
      lifespan: 460,
      scale: [0.1, 0.02],
      blendMode: Phaser.BlendModes.NORMAL
    });
  }

  private createFlashCircle(
    x: number,
    y: number,
    radius: number,
    color: number,
    alpha: number,
    scale: number,
    duration: number
  ): void {
    const impact = this.scene.add.circle(x, y, radius, color, alpha);
    impact.setDepth(30);
    impact.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: impact,
      alpha: 0,
      scale,
      duration,
      onComplete: () => impact.destroy()
    });
  }

  private createBurst(
    x: number,
    y: number,
    options: {
      textureKey: string;
      color: number;
      count: number;
      speed: [number, number];
      lifespan: number;
      scale: [number, number];
      blendMode?: Phaser.BlendModes;
    }
  ): void {
    if (!this.scene.textures.exists(options.textureKey)) {
      return;
    }

    const count = Math.min(options.count, this.quality.burstParticleLimit);
    const emitter = this.scene.add.particles(x, y, options.textureKey, {
      lifespan: options.lifespan,
      speed: { min: options.speed[0], max: options.speed[1] },
      angle: { min: 0, max: 360 },
      scale: {
        start: options.scale[0] * this.quality.particleScale,
        end: options.scale[1]
      },
      alpha: { start: 0.88, end: 0 },
      tint: options.color,
      quantity: count,
      emitting: false,
      blendMode: options.blendMode ?? Phaser.BlendModes.ADD
    });
    emitter.setDepth(34);
    emitter.explode(count, x, y);
    this.scene.time.delayedCall(options.lifespan + 80, () => emitter.destroy());
  }
}
