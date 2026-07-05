import Phaser from "phaser";
import type { AsteroidDefinition } from "../data/arenaObjects";

export type AsteroidOptions = {
  id: string;
  x: number;
  y: number;
  definition: AsteroidDefinition;
};

export class AsteroidEntity {
  readonly id: string;
  readonly definition: AsteroidDefinition;
  readonly shape: Phaser.GameObjects.Polygon;

  hp: number;
  private destroyed = false;
  private flashUntil = 0;

  constructor(scene: Phaser.Scene, options: AsteroidOptions) {
    this.id = options.id;
    this.definition = options.definition;
    this.hp = options.definition.maxHp;
    this.shape = scene.add.polygon(
      options.x,
      options.y,
      makeAsteroidPoints(options.definition.radius),
      options.definition.color
    );
    this.shape.setStrokeStyle(2, options.definition.strokeColor, 0.9);
    this.shape.setDepth(7);
    this.shape.setData("asteroid", this);
  }

  update(time: number): void {
    if (this.destroyed) {
      return;
    }

    this.shape.setFillStyle(
      time < this.flashUntil ? 0xd9edf8 : this.definition.color,
      1
    );
  }

  takeDamage(amount: number, time: number): boolean {
    if (this.destroyed) {
      return false;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.flashUntil = time + 90;
    if (this.hp <= 0) {
      this.destroy();
      return true;
    }

    return false;
  }

  getHitRadius(): number {
    return this.definition.radius;
  }

  setPosition(x: number, y: number): void {
    this.shape.setPosition(x, y);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.shape.destroy();
  }

  get isDestroyed(): boolean {
    return this.destroyed;
  }
}

function makeAsteroidPoints(radius: number): number[] {
  const points: number[] = [];
  const vertices = Phaser.Math.Between(8, 11);

  for (let i = 0; i < vertices; i += 1) {
    const angle = (Math.PI * 2 * i) / vertices;
    const jaggedRadius = radius * Phaser.Math.FloatBetween(0.72, 1.12);
    points.push(Math.cos(angle) * jaggedRadius, Math.sin(angle) * jaggedRadius);
  }

  return points;
}
