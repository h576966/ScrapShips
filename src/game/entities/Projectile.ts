import Phaser from "phaser";
import { ARENA_HEIGHT, ARENA_WIDTH } from "../data/balance";
import type { WeaponDefinition } from "../data/weapons";
import type { PlayerId } from "../input/bindings";
import { CORROSIVE_PROJECTILE_COLOR } from "../systems/PickupSystem";
import { isProjectileExpired } from "../systems/WeaponSystem";

export type ProjectileOptions = {
  ownerId: PlayerId;
  x: number;
  y: number;
  angle: number;
  damage: number;
  weapon: WeaponDefinition;
  createdAt: number;
  corrosive?: boolean;
};

export class Projectile {
  readonly sprite: Phaser.GameObjects.Shape;
  readonly ownerId: PlayerId;
  readonly damage: number;
  readonly weapon: WeaponDefinition;
  readonly corrosive: boolean;
  readonly impactColor: number;
  previousX: number;
  previousY: number;
  private readonly originX: number;
  private readonly originY: number;
  private readonly velocityX: number;
  private readonly velocityY: number;
  private destroyed = false;

  constructor(
    scene: Phaser.Scene,
    options: ProjectileOptions
  ) {
    this.ownerId = options.ownerId;
    this.damage = options.damage;
    this.weapon = options.weapon;
    this.corrosive = options.corrosive ?? false;
    this.impactColor = getProjectileColor(options);
    this.originX = options.x;
    this.originY = options.y;
    this.previousX = options.x;
    this.previousY = options.y;
    this.velocityX = Math.cos(options.angle) * options.weapon.projectileSpeed;
    this.velocityY = Math.sin(options.angle) * options.weapon.projectileSpeed;
    this.createdAt = options.createdAt;
    this.sprite =
      options.weapon.type === "rail_shot"
        ? scene.add.rectangle(options.x, options.y, 22, 3, this.impactColor)
        : scene.add.circle(
            options.x,
            options.y,
            options.weapon.projectileRadius,
            this.impactColor
          );
    this.sprite.setDepth(8);
    this.sprite.setRotation(options.angle);
    this.sprite.setData("projectile", this);
    scene.physics.add.existing(this.sprite);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    if (options.weapon.type === "rail_shot") {
      body.setSize(22, 3);
    } else {
      body.setCircle(options.weapon.projectileRadius);
    }
    body.setVelocity(0, 0);
  }

  update(time: number, deltaMs: number): void {
    if (this.destroyed) {
      return;
    }

    const deltaSeconds = deltaMs / 1000;
    this.previousX = this.sprite.x;
    this.previousY = this.sprite.y;
    this.sprite.setPosition(
      this.sprite.x + this.velocityX * deltaSeconds,
      this.sprite.y + this.velocityY * deltaSeconds
    );
    (this.sprite.body as Phaser.Physics.Arcade.Body).reset(this.sprite.x, this.sprite.y);

    const expired = isProjectileExpired({
      originX: this.originX,
      originY: this.originY,
      currentX: this.sprite.x,
      currentY: this.sprite.y,
      createdAt: this.createdAt,
      now: time,
      range: this.weapon.range,
      lifetimeMs: this.weapon.lifetimeMs
    });
    const outOfBounds =
      this.sprite.x < -24 ||
      this.sprite.x > ARENA_WIDTH + 24 ||
      this.sprite.y < -24 ||
      this.sprite.y > ARENA_HEIGHT + 24;

    if (expired || outOfBounds) {
      this.destroy();
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.sprite.destroy();
  }

  get isDestroyed(): boolean {
    return this.destroyed;
  }

  private readonly createdAt: number;
}

function getProjectileColor(options: ProjectileOptions): number {
  return options.corrosive ? CORROSIVE_PROJECTILE_COLOR : options.weapon.color;
}
