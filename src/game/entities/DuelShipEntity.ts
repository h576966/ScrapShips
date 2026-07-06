import Phaser from "phaser";
import type { PlayerId } from "../input/bindings";
import type { ShipAttributes, ShipBuild } from "../model";
import {
  calculateShipHitRadius,
  type ShipVisualSpec
} from "../rendering/ShipVisualFactory";
import { createOrUpdateShipTexture } from "../rendering/ShipTextureFactory";
import {
  getEffectiveShipAttributes,
  type ShipStats
} from "../services/ShipStatsCalculator";
import type { PlayerInputState } from "../systems/InputSystem";
import {
  applyCorrosiveDamageOverTime,
  applyPickupEffect,
  createEmptyShipEffects,
  expireTimedEffects,
  getSpeedMultiplier,
  hasCorrosiveAmmo,
  tickDamageOverTime,
  type PickupType,
  type ShipEffectState
} from "../systems/PickupSystem";
import { getForwardPoint } from "../systems/WeaponSystem";

export type DuelShipOptions = {
  playerId: PlayerId;
  label: string;
  build: ShipBuild;
  stats: ShipStats;
  spawn: {
    x: number;
    y: number;
    rotation: number;
  };
};

export class DuelShipEntity {
  readonly playerId: PlayerId;
  readonly build: ShipBuild;
  readonly stats: ShipStats;
  readonly effectiveAttributes: ShipAttributes;
  readonly shape: Phaser.GameObjects.Rectangle;

  private readonly shipSprite: Phaser.GameObjects.Image;
  private readonly boostFlame: Phaser.GameObjects.Triangle;
  private readonly visualSpec: ShipVisualSpec;
  private readonly nameLabel: Phaser.GameObjects.Text;
  private readonly hpBarBack: Phaser.GameObjects.Rectangle;
  private readonly hpBar: Phaser.GameObjects.Rectangle;
  private readonly shieldBar: Phaser.GameObjects.Rectangle;
  private readonly primaryColor: number;
  private readonly accentColor: number;
  private readonly muzzleDistance: number;
  private readonly flameDistance: number;
  private readonly hudOffset: number;
  private readonly hitRadius: number;
  private hitFlashUntil = 0;
  private lastExhaustAt = 0;
  private effects: ShipEffectState = createEmptyShipEffects();

  hp: number;
  shield: number;

  fireReadyAt = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    options: DuelShipOptions
  ) {
    this.playerId = options.playerId;
    this.build = options.build;
    this.stats = options.stats;
    this.effectiveAttributes = getEffectiveShipAttributes(options.build);
    this.primaryColor = colorToNumber(options.build.colors.primary);
    const texture = createOrUpdateShipTexture(scene, options.build, {
      stats: options.stats
    });
    this.visualSpec = texture.spec;
    this.accentColor = colorToNumber(this.visualSpec.visualStyle.accentColor);
    this.hp = options.stats.maxHp;
    this.shield = options.stats.maxShield;
    const noseLength = this.visualSpec.noseDistance;
    const tailLength = this.visualSpec.tailDistance;
    this.muzzleDistance = this.visualSpec.muzzleDistance;
    this.flameDistance = tailLength + 9;
    this.hudOffset = noseLength + 32;
    this.hitRadius = calculateShipHitRadius({
      width: this.visualSpec.bodyWidth,
      height: this.visualSpec.bodyHeight
    });

    this.boostFlame = scene.add.triangle(0, 0, 0, 12, -7, -7, 7, -7, 0xffc44d);
    this.boostFlame.setBlendMode(Phaser.BlendModes.ADD);
    this.boostFlame.setDepth(5);

    this.shipSprite = scene.add.image(options.spawn.x, options.spawn.y, texture.key);
    this.shipSprite.setDepth(11);
    this.shipSprite.setOrigin(0.5);
    tryAddGlow(this.shipSprite, this.accentColor, scene);

    this.shape = scene.add.rectangle(
      options.spawn.x,
      options.spawn.y,
      this.visualSpec.bodyWidth,
      this.visualSpec.bodyHeight,
      0xffffff,
      0
    );
    this.shape.setDepth(10);
    scene.physics.add.existing(this.shape);

    const body = this.body;
    body.setAllowGravity(false);
    body.setCollideWorldBounds(true);
    body.setBounce(0.9, 0.9);
    body.setSize(this.visualSpec.bodyWidth, this.visualSpec.bodyHeight);
    body.setMaxVelocity(options.stats.turboMaxSpeed);

    this.nameLabel = scene.add.text(0, 0, options.label, {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#e8f4ff",
      align: "center",
      lineSpacing: 1
    });
    this.nameLabel.setOrigin(0.5, 1);
    this.nameLabel.setDepth(20);

    this.hpBarBack = scene.add.rectangle(0, 0, 56, 6, 0x152130);
    this.hpBarBack.setOrigin(0, 0.5);
    this.hpBarBack.setDepth(20);

    this.hpBar = scene.add.rectangle(0, 0, 56, 6, 0x5cff82);
    this.hpBar.setOrigin(0, 0.5);
    this.hpBar.setDepth(21);

    this.shieldBar = scene.add.rectangle(0, 0, 56, 3, 0x72d8ff);
    this.shieldBar.setOrigin(0, 0.5);
    this.shieldBar.setDepth(21);

    this.reset(options.spawn.x, options.spawn.y, options.spawn.rotation);
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.shape.body as Phaser.Physics.Arcade.Body;
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  reset(x: number, y: number, rotation: number): void {
    this.hp = this.stats.maxHp;
    this.shield = this.stats.maxShield;
    this.fireReadyAt = 0;
    this.hitFlashUntil = 0;
    this.effects = createEmptyShipEffects();
    this.shape.setActive(true).setVisible(true);
    this.shipSprite.setActive(true).setVisible(true).clearTint().setAlpha(1);
    this.boostFlame.setVisible(false);
    this.body.enable = true;
    this.body.reset(x, y);
    this.body.setVelocity(0, 0);
    this.shape.setRotation(rotation);
    this.updateHullDetails();
    this.updateHud();
  }

  update(deltaMs: number, input: PlayerInputState, canMove: boolean, time: number): void {
    this.updateStatusEffects(time);

    if (!this.alive) {
      this.body.setVelocity(0, 0);
      this.boostFlame.setVisible(false);
      this.updateHullDetails();
      this.updateHud();
      return;
    }

    if (canMove) {
      this.updateMovement(deltaMs, input, time);
    }

    const flash = time < this.hitFlashUntil;
    this.updateShipVisualStyle(flash, getSpeedMultiplier(this.effects, time) > 1);
    this.updateHullDetails();
    this.updateBoostFlame(input.thrust || input.turbo, time);
    this.updateHud();
  }

  markFired(time: number, cooldownMs: number): void {
    this.fireReadyAt = time + cooldownMs;
  }

  takeDamage(amount: number, time: number): void {
    if (!this.alive) {
      return;
    }

    const absorbed = Math.min(this.shield, amount);
    this.shield -= absorbed;
    this.hp = Math.max(0, this.hp - (amount - absorbed));
    this.hitFlashUntil = time + 90;

    this.hideIfDestroyed();
  }

  takeHullDamage(amount: number, time: number): void {
    if (!this.alive) {
      return;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashUntil = time + 90;
    this.hideIfDestroyed();
  }

  applyPickup(pickupType: PickupType, time: number): void {
    const result = applyPickupEffect(
      this.hp,
      this.stats.maxHp,
      this.effects,
      pickupType,
      time
    );
    this.hp = result.hp;
    this.effects = result.effects;
    this.hitFlashUntil = time + 120;
    this.updateHud();
  }

  hasCorrosiveAmmo(time: number): boolean {
    return hasCorrosiveAmmo(this.effects, time);
  }

  applyCorrosiveDamageOverTime(time: number): void {
    this.effects = applyCorrosiveDamageOverTime(this.effects, time);
  }

  getEffectSnapshot(time: number): {
    speedBoostActive: boolean;
    corrosiveAmmoActive: boolean;
    damageOverTimeActive: boolean;
  } {
    return {
      speedBoostActive: getSpeedMultiplier(this.effects, time) > 1,
      corrosiveAmmoActive: hasCorrosiveAmmo(this.effects, time),
      damageOverTimeActive:
        this.effects.damageOverTime !== null && this.effects.damageOverTime.endsAt > time
    };
  }

  getFacingAngle(): number {
    return this.shape.rotation - Math.PI / 2;
  }

  getMuzzlePosition(): Phaser.Math.Vector2 {
    const point = getForwardPoint({
      originX: this.shape.x,
      originY: this.shape.y,
      angle: this.getFacingAngle(),
      distance: this.muzzleDistance
    });
    return new Phaser.Math.Vector2(point.x, point.y);
  }

  getRearPosition(distance = this.flameDistance + 6): Phaser.Math.Vector2 {
    const point = getForwardPoint({
      originX: this.shape.x,
      originY: this.shape.y,
      angle: this.getFacingAngle(),
      distance: -distance
    });
    return new Phaser.Math.Vector2(point.x, point.y);
  }

  getHitRadius(): number {
    return this.hitRadius;
  }

  getHitboxDebugSnapshot(): {
    bodyX: number;
    bodyY: number;
    bodyWidth: number;
    bodyHeight: number;
    hitRadius: number;
    centerX: number;
    centerY: number;
    muzzleX: number;
    muzzleY: number;
  } {
    const muzzle = this.getMuzzlePosition();
    return {
      bodyX: this.body.x,
      bodyY: this.body.y,
      bodyWidth: this.body.width,
      bodyHeight: this.body.height,
      hitRadius: this.hitRadius,
      centerX: this.shape.x,
      centerY: this.shape.y,
      muzzleX: muzzle.x,
      muzzleY: muzzle.y
    };
  }

  destroy(): void {
    this.shape.destroy();
    this.shipSprite.destroy();
    this.boostFlame.destroy();
    this.nameLabel.destroy();
    this.hpBarBack.destroy();
    this.hpBar.destroy();
    this.shieldBar.destroy();
  }

  private updateMovement(deltaMs: number, input: PlayerInputState, time: number): void {
    const dt = deltaMs / 1000;
    const rotationStep = this.stats.turnRate * dt;
    const speedMultiplier = getSpeedMultiplier(this.effects, time);

    if (input.rotateLeft) {
      this.shape.rotation -= rotationStep;
    }
    if (input.rotateRight) {
      this.shape.rotation += rotationStep;
    }

    const angle = this.getFacingAngle();
    const forwardX = Math.cos(angle);
    const forwardY = Math.sin(angle);
    const force =
      (input.thrust ? this.stats.acceleration * speedMultiplier : 0) +
      (input.turbo ? this.stats.turboAcceleration * speedMultiplier : 0) -
      (input.brake ? this.stats.acceleration * 0.65 * speedMultiplier : 0);

    this.body.velocity.x += forwardX * force * dt;
    this.body.velocity.y += forwardY * force * dt;

    this.body.velocity.scale(input.thrust || input.brake || input.turbo ? 0.995 : 0.988);

    const maxSpeed =
      (input.turbo ? this.stats.turboMaxSpeed : this.stats.maxSpeed) * speedMultiplier;
    if (this.body.velocity.length() > maxSpeed) {
      this.body.velocity.setLength(maxSpeed);
    }
  }

  private updateStatusEffects(time: number): void {
    this.effects = expireTimedEffects(this.effects, time);
    const dotTick = tickDamageOverTime(this.effects, time);
    this.effects = dotTick.effects;

    if (dotTick.damage > 0) {
      this.takeDamage(dotTick.damage, time);
    }
  }

  private hideIfDestroyed(): void {
    if (this.alive) {
      return;
    }

    this.body.enable = false;
    this.shape.setVisible(false);
    this.shipSprite.setVisible(false);
    this.boostFlame.setVisible(false);
  }

  private updateBoostFlame(active: boolean, time: number): void {
    if (!this.alive || !active) {
      this.boostFlame.setVisible(false);
      return;
    }

    const angle = this.getFacingAngle();
    this.boostFlame.setVisible(true);
    this.boostFlame.setAlpha(0.6 + Math.random() * 0.3);
    this.boostFlame.setPosition(
      this.shape.x - Math.cos(angle) * this.flameDistance,
      this.shape.y - Math.sin(angle) * this.flameDistance
    );
    this.boostFlame.setRotation(this.shape.rotation);
    this.emitEngineExhaust(angle, time);
  }

  private updateHullDetails(): void {
    this.shipSprite.setPosition(this.shape.x, this.shape.y);
    this.shipSprite.setRotation(this.shape.rotation);
    this.shipSprite.setVisible(this.alive);
  }

  private updateShipVisualStyle(flash: boolean, boosted: boolean): void {
    if (flash) {
      this.shipSprite.setTint(0xffffff);
      this.shipSprite.setAlpha(1);
      return;
    }

    if (boosted) {
      this.shipSprite.setTint(0xbfeeff);
      this.shipSprite.setAlpha(1);
      return;
    }

    this.shipSprite.clearTint();
    this.shipSprite.setAlpha(1);
  }

  private emitEngineExhaust(angle: number, time: number): void {
    if (time < this.lastExhaustAt) {
      return;
    }

    this.lastExhaustAt = time + 42;
    const rear = this.getRearPosition(this.flameDistance + 2);
    const spread = Phaser.Math.FloatBetween(-0.22, 0.22);
    const travelAngle = angle + Math.PI + spread;
    const ember = this.scene.add.circle(
      rear.x,
      rear.y,
      Phaser.Math.FloatBetween(1.5, 3.2),
      Math.random() > 0.45 ? this.accentColor : this.primaryColor,
      0.65
    );
    ember.setDepth(6);
    ember.setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: ember,
      x: rear.x + Math.cos(travelAngle) * Phaser.Math.Between(14, 30),
      y: rear.y + Math.sin(travelAngle) * Phaser.Math.Between(14, 30),
      alpha: 0,
      scale: 0.25,
      duration: 260,
      onComplete: () => ember.destroy()
    });
  }

  private updateHud(): void {
    const x = this.shape.x - 28;
    const y = this.shape.y - this.hudOffset;
    const hpRatio = Phaser.Math.Clamp(this.hp / this.stats.maxHp, 0, 1);
    const shieldRatio =
      this.stats.maxShield > 0
        ? Phaser.Math.Clamp(this.shield / this.stats.maxShield, 0, 1)
        : 0;

    this.nameLabel.setPosition(this.shape.x, y - 5);
    this.hpBarBack.setPosition(x, y);
    this.hpBar.setPosition(x, y);
    this.hpBar.displayWidth = 56 * hpRatio;
    this.shieldBar.setPosition(x, y + 6);
    this.shieldBar.displayWidth = 56 * shieldRatio;

    const visible = this.alive;
    this.nameLabel.setVisible(visible);
    this.hpBarBack.setVisible(visible);
    this.hpBar.setVisible(visible);
    this.shieldBar.setVisible(visible && this.stats.maxShield > 0);
  }
}

function colorToNumber(color: string): number {
  return Number.parseInt(color.replace("#", ""), 16);
}

function tryAddGlow(
  sprite: Phaser.GameObjects.Image,
  color: number,
  scene: Phaser.Scene
): void {
  if (scene.game.renderer.type !== Phaser.WEBGL) {
    return;
  }

  const postFx = (sprite as Phaser.GameObjects.Image & {
    postFX?: { addGlow?: (...args: unknown[]) => void };
  }).postFX;
  if (postFx && "addGlow" in postFx) {
    postFx.addGlow?.(color, 0.6, 0, false, 0.08, 8);
  }
}
