import Phaser from "phaser";
import type { AsteroidDefinition } from "../data/arenaObjects";
import {
  createAsteroidVisualSpec,
  type AsteroidPit,
  type AsteroidVisualSpec
} from "../rendering/AsteroidVisualFactory";

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
  private readonly visualSpec: AsteroidVisualSpec;
  private readonly shadow: Phaser.GameObjects.Polygon;
  private readonly highlight: Phaser.GameObjects.Polygon;
  private readonly pits: Phaser.GameObjects.Arc[] = [];
  private readonly baseRotation: number;
  private destroyed = false;
  private flashUntil = 0;

  constructor(scene: Phaser.Scene, options: AsteroidOptions) {
    this.id = options.id;
    this.definition = options.definition;
    this.hp = options.definition.maxHp;
    this.visualSpec = createAsteroidVisualSpec(
      options.definition.radius,
      `${options.id}:${Math.round(options.x)}:${Math.round(options.y)}`
    );
    this.baseRotation = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.shadow = scene.add.polygon(
      options.x,
      options.y,
      this.visualSpec.shadowPoints,
      0x05070b,
      0.26
    );
    this.shadow.setDepth(6);

    this.shape = scene.add.polygon(
      options.x,
      options.y,
      this.visualSpec.points,
      options.definition.color
    );
    this.shape.setStrokeStyle(2, options.definition.strokeColor, 0.9);
    this.shape.setDepth(7);
    this.shape.setData("asteroid", this);

    this.highlight = scene.add.polygon(
      options.x,
      options.y,
      this.visualSpec.highlightPoints,
      0xdce7ee,
      0.14
    );
    this.highlight.setDepth(8);

    for (const pit of this.visualSpec.pits) {
      const crater = scene.add.circle(options.x + pit.x, options.y + pit.y, pit.radius);
      crater.setFillStyle(0x101821, pit.alpha);
      crater.setStrokeStyle(1, options.definition.strokeColor, 0.18);
      crater.setDepth(8);
      this.pits.push(crater);
    }
  }

  update(time: number): void {
    if (this.destroyed) {
      return;
    }

    this.shape.setFillStyle(
      time < this.flashUntil ? 0xd9edf8 : this.definition.color,
      1
    );
    this.updateVisualTransform(time);
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
    this.shadow.setPosition(x, y);
    this.highlight.setPosition(x, y);
    this.updatePitPositions(this.shape.rotation);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.shadow.destroy();
    this.shape.destroy();
    this.highlight.destroy();
    for (const pit of this.pits) {
      pit.destroy();
    }
  }

  get isDestroyed(): boolean {
    return this.destroyed;
  }

  private updateVisualTransform(time: number): void {
    const rotation = this.baseRotation + time * this.visualSpec.rotationSpeed;
    this.shape.setRotation(rotation);
    this.shadow.setRotation(rotation);
    this.highlight.setRotation(rotation);
    this.updatePitPositions(rotation);
  }

  private updatePitPositions(rotation: number): void {
    this.visualSpec.pits.forEach((pit, index) => {
      const rotated = rotatePoint(pit, rotation);
      this.pits[index].setPosition(this.shape.x + rotated.x, this.shape.y + rotated.y);
    });
  }
}

function rotatePoint(point: AsteroidPit, rotation: number): { x: number; y: number } {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos
  };
}
