import Phaser from "phaser";
import { ARENA_HEIGHT, ARENA_WIDTH, PROJECTILE_LIFETIME_MS } from "../data/balance";
import type { PlayerId } from "../input/bindings";

export class Projectile {
  readonly sprite: Phaser.GameObjects.Arc;
  readonly ownerId: PlayerId;
  readonly damage: number;
  private destroyed = false;

  constructor(
    scene: Phaser.Scene,
    ownerId: PlayerId,
    x: number,
    y: number,
    angle: number,
    speed: number,
    damage: number,
    color: number,
    private readonly createdAt: number
  ) {
    this.ownerId = ownerId;
    this.damage = damage;
    this.sprite = scene.add.circle(x, y, 4, color);
    this.sprite.setDepth(8);
    this.sprite.setData("projectile", this);
    scene.physics.add.existing(this.sprite);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setCircle(4);
    body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  update(time: number): void {
    if (this.destroyed) {
      return;
    }

    const expired = time - this.createdAt > PROJECTILE_LIFETIME_MS;
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
}
