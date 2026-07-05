import Phaser from "phaser";
import type { PlayerId } from "../input/bindings";
import type { ShipBuild } from "../model";
import type { ShipStats } from "../services/ShipStatsCalculator";
import type { PlayerInputState } from "../systems/InputSystem";

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
  readonly shape: Phaser.GameObjects.Triangle;

  private readonly boostFlame: Phaser.GameObjects.Triangle;
  private readonly nameLabel: Phaser.GameObjects.Text;
  private readonly hpBarBack: Phaser.GameObjects.Rectangle;
  private readonly hpBar: Phaser.GameObjects.Rectangle;
  private readonly shieldBar: Phaser.GameObjects.Rectangle;
  private readonly primaryColor: number;
  private readonly secondaryColor: number;
  private readonly muzzleDistance: number;
  private readonly flameDistance: number;
  private readonly hudOffset: number;
  private hitFlashUntil = 0;

  hp: number;
  shield: number;

  private fireReadyAt = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    options: DuelShipOptions
  ) {
    this.playerId = options.playerId;
    this.build = options.build;
    this.stats = options.stats;
    this.primaryColor = colorToNumber(options.build.colors.primary);
    this.secondaryColor = colorToNumber(options.build.colors.secondary);
    this.hp = options.stats.maxHp;
    this.shield = options.stats.maxShield;
    const visualScale = Phaser.Math.Clamp(
      0.78 + Math.sqrt(options.stats.hullPixelCount) / 10,
      0.92,
      1.65
    );
    const noseLength = 19 * visualScale;
    const tailLength = 15 * visualScale;
    const halfWidth = 15 * visualScale;
    this.muzzleDistance = noseLength + 6;
    this.flameDistance = tailLength + 9;
    this.hudOffset = noseLength + 32;

    this.boostFlame = scene.add.triangle(0, 0, 0, 12, -7, -7, 7, -7, 0xffc44d);
    this.boostFlame.setBlendMode(Phaser.BlendModes.ADD);
    this.boostFlame.setDepth(5);

    this.shape = scene.add.triangle(
      options.spawn.x,
      options.spawn.y,
      0,
      -noseLength,
      halfWidth,
      tailLength,
      -halfWidth,
      tailLength,
      this.primaryColor
    );
    this.shape.setStrokeStyle(2, this.secondaryColor);
    this.shape.setDepth(10);
    scene.physics.add.existing(this.shape);

    const body = this.body;
    body.setAllowGravity(false);
    body.setCollideWorldBounds(true);
    body.setBounce(0.9, 0.9);
    body.setSize(halfWidth * 2, noseLength + tailLength);
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
    this.shape.setActive(true).setVisible(true);
    this.boostFlame.setVisible(false);
    this.body.enable = true;
    this.body.reset(x, y);
    this.body.setVelocity(0, 0);
    this.shape.setRotation(rotation);
    this.updateHud();
  }

  update(deltaMs: number, input: PlayerInputState, canMove: boolean, time: number): void {
    if (!this.alive) {
      this.body.setVelocity(0, 0);
      this.boostFlame.setVisible(false);
      this.updateHud();
      return;
    }

    if (canMove) {
      this.updateMovement(deltaMs, input);
    }

    const flash = time < this.hitFlashUntil;
    this.shape.setFillStyle(flash ? 0xffffff : this.primaryColor);
    this.updateBoostFlame(input.thrust || input.turbo);
    this.updateHud();
  }

  canFire(time: number): boolean {
    return this.alive && time >= this.fireReadyAt;
  }

  markFired(time: number): void {
    this.fireReadyAt = time + this.stats.fireCooldownMs;
  }

  takeDamage(amount: number, time: number): void {
    if (!this.alive) {
      return;
    }

    const absorbed = Math.min(this.shield, amount);
    this.shield -= absorbed;
    this.hp = Math.max(0, this.hp - (amount - absorbed));
    this.hitFlashUntil = time + 90;

    if (!this.alive) {
      this.body.enable = false;
      this.shape.setVisible(false);
      this.boostFlame.setVisible(false);
    }
  }

  getFacingAngle(): number {
    return this.shape.rotation - Math.PI / 2;
  }

  getMuzzlePosition(): Phaser.Math.Vector2 {
    const angle = this.getFacingAngle();
    return new Phaser.Math.Vector2(
      this.shape.x + Math.cos(angle) * this.muzzleDistance,
      this.shape.y + Math.sin(angle) * this.muzzleDistance
    );
  }

  destroy(): void {
    this.shape.destroy();
    this.boostFlame.destroy();
    this.nameLabel.destroy();
    this.hpBarBack.destroy();
    this.hpBar.destroy();
    this.shieldBar.destroy();
  }

  private updateMovement(deltaMs: number, input: PlayerInputState): void {
    const dt = deltaMs / 1000;
    const rotationStep = this.stats.turnRate * dt;

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
      (input.thrust ? this.stats.acceleration : 0) +
      (input.turbo ? this.stats.turboAcceleration : 0) -
      (input.brake ? this.stats.acceleration * 0.65 : 0);

    this.body.velocity.x += forwardX * force * dt;
    this.body.velocity.y += forwardY * force * dt;

    this.body.velocity.scale(input.thrust || input.brake || input.turbo ? 0.995 : 0.988);

    const maxSpeed = input.turbo ? this.stats.turboMaxSpeed : this.stats.maxSpeed;
    if (this.body.velocity.length() > maxSpeed) {
      this.body.velocity.setLength(maxSpeed);
    }
  }

  private updateBoostFlame(active: boolean): void {
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
