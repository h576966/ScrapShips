import Phaser from "phaser";
import type { PlayerId } from "../input/bindings";
import {
  PROXIMITY_MINE_DEFINITION,
  isMineArmed,
  isMineExpired,
  type MineDefinition,
  type MineState
} from "../systems/MineSystem";

export type MineEntityOptions = {
  ownerId: PlayerId;
  x: number;
  y: number;
  placedAt: number;
  definition?: MineDefinition;
};

export class MineEntity {
  readonly ownerId: PlayerId;
  readonly placedAt: number;
  readonly definition: MineDefinition;
  readonly core: Phaser.GameObjects.Arc;
  private readonly ring: Phaser.GameObjects.Arc;
  private destroyed = false;

  constructor(
    private readonly scene: Phaser.Scene,
    options: MineEntityOptions
  ) {
    this.ownerId = options.ownerId;
    this.placedAt = options.placedAt;
    this.definition = options.definition ?? PROXIMITY_MINE_DEFINITION;

    this.ring = scene.add.circle(options.x, options.y, 9);
    this.ring.setStrokeStyle(2, 0x8aa4bf, 0.65);
    this.ring.setDepth(7);

    this.core = scene.add.circle(options.x, options.y, 5, 0x5f7895, 0.85);
    this.core.setDepth(8);
  }

  update(time: number): void {
    if (this.destroyed) {
      return;
    }

    if (isMineExpired(this.getState(), time, this.definition)) {
      this.destroy();
      return;
    }

    const armed = this.isArmed(time);
    const pulse = 0.45 + Math.sin(time / (armed ? 120 : 240)) * 0.2;
    this.core.setFillStyle(armed ? 0xffd05f : 0x5f7895, armed ? 0.9 : 0.68);
    this.ring.setStrokeStyle(2, armed ? 0xffe39c : 0x8aa4bf, armed ? 0.75 + pulse : 0.45);
  }

  isArmed(time: number): boolean {
    return isMineArmed(this.getState(), time, this.definition);
  }

  getState(): MineState {
    return {
      ownerId: this.ownerId,
      placedAt: this.placedAt,
      x: this.core.x,
      y: this.core.y
    };
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.core.destroy();
    this.ring.destroy();
  }

  get isDestroyed(): boolean {
    return this.destroyed;
  }
}
