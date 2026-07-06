import Phaser from "phaser";
import { PASSING_ASTEROID_VISUAL_CONFIG } from "../data/assets";
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
  velocityX?: number;
  velocityY?: number;
  passing?: boolean;
};

export class AsteroidEntity {
  readonly id: string;
  readonly definition: AsteroidDefinition;
  readonly shape: Phaser.GameObjects.Polygon;

  hp: number;
  private readonly visualSpec: AsteroidVisualSpec;
  private readonly shadow: Phaser.GameObjects.Polygon;
  private readonly highlight: Phaser.GameObjects.Polygon;
  private readonly crackGraphics: Phaser.GameObjects.Graphics;
  private readonly trailGraphics: Phaser.GameObjects.Graphics;
  private readonly warningRing?: Phaser.GameObjects.Arc;
  private readonly pits: Phaser.GameObjects.Arc[] = [];
  private readonly baseRotation: number;
  private readonly velocityX: number;
  private readonly velocityY: number;
  private readonly passing: boolean;
  private destroyed = false;
  private flashUntil = 0;

  constructor(scene: Phaser.Scene, options: AsteroidOptions) {
    this.id = options.id;
    this.definition = options.definition;
    this.hp = options.definition.maxHp;
    this.velocityX = options.velocityX ?? 0;
    this.velocityY = options.velocityY ?? 0;
    this.passing = options.passing ?? false;
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

    this.crackGraphics = scene.add.graphics();
    this.crackGraphics.setDepth(8);
    this.trailGraphics = scene.add.graphics();
    this.trailGraphics.setDepth(5);

    if (this.passing) {
      this.warningRing = scene.add.circle(
        options.x,
        options.y,
        options.definition.radius + 9
      );
      this.warningRing.setStrokeStyle(2, 0xffd38a, 0.46);
      this.warningRing.setDepth(9);
      this.warningRing.setBlendMode(Phaser.BlendModes.ADD);
    }

    for (const pit of this.visualSpec.pits) {
      const crater = scene.add.circle(options.x + pit.x, options.y + pit.y, pit.radius);
      crater.setFillStyle(0x101821, pit.alpha);
      crater.setStrokeStyle(1, options.definition.strokeColor, 0.18);
      crater.setDepth(8);
      this.pits.push(crater);
    }
  }

  update(time: number, deltaMs: number): void {
    if (this.destroyed) {
      return;
    }

    this.updatePosition(deltaMs);
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

  getSpeed(): number {
    return Math.hypot(this.velocityX, this.velocityY);
  }

  getVelocity(): { x: number; y: number } {
    return {
      x: this.velocityX,
      y: this.velocityY
    };
  }

  get isPassing(): boolean {
    return this.passing;
  }

  isOutsideArena(arenaWidth: number, arenaHeight: number, margin: number): boolean {
    return (
      this.shape.x < -margin ||
      this.shape.x > arenaWidth + margin ||
      this.shape.y < -margin ||
      this.shape.y > arenaHeight + margin
    );
  }

  setPosition(x: number, y: number): void {
    this.shape.setPosition(x, y);
    this.shadow.setPosition(x, y);
    this.highlight.setPosition(x, y);
    this.warningRing?.setPosition(x, y);
    this.updatePitPositions(this.shape.rotation);
    this.updateSurfaceLines(this.shape.rotation);
    this.updateMotionTrail();
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.shadow.destroy();
    this.shape.destroy();
    this.highlight.destroy();
    this.crackGraphics.destroy();
    this.trailGraphics.destroy();
    this.warningRing?.destroy();
    for (const pit of this.pits) {
      pit.destroy();
    }
  }

  get isDestroyed(): boolean {
    return this.destroyed;
  }

  private updatePosition(deltaMs: number): void {
    if (this.velocityX === 0 && this.velocityY === 0) {
      return;
    }

    const dt = deltaMs / 1000;
    this.setPosition(
      this.shape.x + this.velocityX * dt,
      this.shape.y + this.velocityY * dt
    );
  }

  private updateVisualTransform(time: number): void {
    const rotation = this.baseRotation + time * this.visualSpec.rotationSpeed;
    this.shape.setRotation(rotation);
    this.shadow.setRotation(rotation);
    this.highlight.setRotation(rotation);
    if (this.warningRing) {
      const pulse = 1 + Math.sin(time / 90) * 0.04;
      this.warningRing.setScale(pulse);
      this.warningRing.setAlpha(0.25 + Math.sin(time / 120) * 0.12);
    }
    this.updatePitPositions(rotation);
    this.updateSurfaceLines(rotation);
    this.updateMotionTrail();
  }

  private updatePitPositions(rotation: number): void {
    this.visualSpec.pits.forEach((pit, index) => {
      const rotated = rotatePoint(pit, rotation);
      this.pits[index].setPosition(this.shape.x + rotated.x, this.shape.y + rotated.y);
    });
  }

  private updateSurfaceLines(rotation: number): void {
    this.crackGraphics.clear();
    for (const line of this.visualSpec.surfaceLines) {
      const start = rotateSurfaceLinePoint(line.startX, line.startY, rotation);
      const end = rotateSurfaceLinePoint(line.endX, line.endY, rotation);
      this.crackGraphics.lineStyle(1, 0x111923, line.alpha);
      this.crackGraphics.lineBetween(
        this.shape.x + start.x,
        this.shape.y + start.y,
        this.shape.x + end.x,
        this.shape.y + end.y
      );
    }
  }

  private updateMotionTrail(): void {
    this.trailGraphics.clear();
    if (!this.passing || this.getSpeed() <= 0) {
      return;
    }

    const angle = Math.atan2(this.velocityY, this.velocityX);
    const radius = this.definition.radius;
    const rearX = this.shape.x - Math.cos(angle) * radius * 0.55;
    const rearY = this.shape.y - Math.sin(angle) * radius * 0.55;
    const tailX =
      this.shape.x -
      Math.cos(angle) * radius * PASSING_ASTEROID_VISUAL_CONFIG.trailLengthMultiplier;
    const tailY =
      this.shape.y -
      Math.sin(angle) * radius * PASSING_ASTEROID_VISUAL_CONFIG.trailLengthMultiplier;
    const sideX = Math.cos(angle + Math.PI / 2) * radius * 0.42;
    const sideY = Math.sin(angle + Math.PI / 2) * radius * 0.42;

    this.trailGraphics.fillStyle(
      this.definition.strokeColor,
      PASSING_ASTEROID_VISUAL_CONFIG.trailAlpha
    );
    this.trailGraphics.beginPath();
    this.trailGraphics.moveTo(rearX + sideX, rearY + sideY);
    this.trailGraphics.lineTo(tailX, tailY);
    this.trailGraphics.lineTo(rearX - sideX, rearY - sideY);
    this.trailGraphics.closePath();
    this.trailGraphics.fillPath();
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

function rotateSurfaceLinePoint(
  x: number,
  y: number,
  rotation: number
): { x: number; y: number } {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos
  };
}
