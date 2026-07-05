import Phaser from "phaser";
import {
  PICKUP_DEFINITIONS,
  type PickupType
} from "../systems/PickupSystem";

export type PickupOptions = {
  id: string;
  type: PickupType;
  x: number;
  y: number;
  createdAt: number;
  lifetimeMs?: number;
};

export class PickupEntity {
  readonly id: string;
  readonly type: PickupType;
  readonly sprite: Phaser.GameObjects.Arc;
  private readonly marker: Phaser.GameObjects.Shape;
  private readonly expiresAt: number;
  private destroyed = false;

  constructor(scene: Phaser.Scene, options: PickupOptions) {
    const definition = PICKUP_DEFINITIONS[options.type];
    this.id = options.id;
    this.type = options.type;
    this.expiresAt = options.createdAt + (options.lifetimeMs ?? definition.despawnMs);
    this.sprite = scene.add.circle(
      options.x,
      options.y,
      definition.radius,
      definition.color,
      0.88
    );
    this.sprite.setStrokeStyle(2, 0xffffff, 0.8);
    this.sprite.setDepth(13);

    this.marker = createMarker(scene, options.type, options.x, options.y);
    this.marker.setDepth(14);
  }

  update(time: number): void {
    if (this.destroyed) {
      return;
    }

    const pulse = 1 + Math.sin(time / 140) * 0.08;
    this.sprite.setScale(pulse);
    this.marker.setPosition(this.sprite.x, this.sprite.y);

    if (time >= this.expiresAt) {
      this.destroy();
    }
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  get radius(): number {
    return PICKUP_DEFINITIONS[this.type].radius;
  }

  get isDestroyed(): boolean {
    return this.destroyed;
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.sprite.destroy();
    this.marker.destroy();
  }
}

function createMarker(
  scene: Phaser.Scene,
  type: PickupType,
  x: number,
  y: number
): Phaser.GameObjects.Shape {
  if (type === "repair") {
    return scene.add.rectangle(x, y, 13, 4, 0xffffff, 0.95);
  }

  if (type === "speed_boost") {
    return scene.add.triangle(x, y, -5, 6, 6, 0, -5, -6, 0xffffff, 0.95);
  }

  return scene.add.polygon(x, y, [0, -7, 7, 0, 0, 7, -7, 0], 0xffffff, 0.95);
}
