import Phaser from "phaser";
import { ARENA_HEIGHT, ARENA_WIDTH } from "../data/balance";
import { ensureTwoPlayableProfiles } from "../data/defaultProfiles";
import { Projectile } from "../entities/Projectile";
import { DuelShipEntity } from "../entities/DuelShipEntity";
import {
  DEFAULT_PLAYER_BINDINGS,
  SYSTEM_BINDINGS,
  bindingLabels,
  matchesAnyBinding,
  type PlayerId
} from "../input/bindings";
import type { PlayerProfile, ShipBuild } from "../model";
import { getActiveShip } from "../services/ProfileService";
import { loadProfiles, saveProfiles } from "../services/SaveService";
import { calculateShipStats } from "../services/ShipStatsCalculator";
import { InputSystem } from "../systems/InputSystem";

type ShipMap = Record<PlayerId, DuelShipEntity>;
type DuelSlotSelection = {
  profileId: string;
  shipId: string;
};

export type DuelSceneData = Partial<Record<PlayerId, DuelSlotSelection>>;

export class DuelScene extends Phaser.Scene {
  private inputSystem!: InputSystem;
  private ships!: ShipMap;
  private projectiles: Projectile[] = [];
  private projectileGroup!: Phaser.Physics.Arcade.Group;
  private messageText!: Phaser.GameObjects.Text;
  private debugText!: Phaser.GameObjects.Text;
  private duelData: DuelSceneData = {};
  private roundOver = false;
  private lastShipCollisionAt = 0;

  private readonly onSystemKeyDown = (event: KeyboardEvent) => {
    if (matchesAnyBinding(event, SYSTEM_BINDINGS.restartRound)) {
      this.resetRound();
    } else if (matchesAnyBinding(event, SYSTEM_BINDINGS.returnToGarage)) {
      this.scene.start("GarageScene");
    }
  };

  constructor() {
    super("DuelScene");
  }

  init(data: DuelSceneData): void {
    this.duelData = data ?? {};
  }

  create(): void {
    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.createBackground();

    const loadedProfiles = loadProfiles();
    const profiles = ensureTwoPlayableProfiles(loadedProfiles);
    if (!loadedProfiles || loadedProfiles.length < 2) {
      saveProfiles(profiles);
    }

    const playerOne = this.resolveDuelSlot("p1", profiles);
    const playerTwo = this.resolveDuelSlot("p2", profiles);

    this.inputSystem = new InputSystem(this);
    this.projectileGroup = this.physics.add.group();

    this.ships = {
      p1: new DuelShipEntity(this, {
        playerId: "p1",
        label: `${playerOne.profile.name}: ${playerOne.ship.name}\nGadget: ${playerOne.ship.gadget ?? "none"}`,
        build: playerOne.ship,
        stats: calculateShipStats(playerOne.ship),
        spawn: { x: 220, y: ARENA_HEIGHT / 2, rotation: Math.PI / 2 }
      }),
      p2: new DuelShipEntity(this, {
        playerId: "p2",
        label: `${playerTwo.profile.name}: ${playerTwo.ship.name}\nGadget: ${playerTwo.ship.gadget ?? "none"}`,
        build: playerTwo.ship,
        stats: calculateShipStats(playerTwo.ship),
        spawn: { x: ARENA_WIDTH - 220, y: ARENA_HEIGHT / 2, rotation: -Math.PI / 2 }
      })
    };

    this.physics.add.collider(
      this.ships.p1.shape,
      this.ships.p2.shape,
      () => this.handleShipCollision(),
      undefined,
      this
    );

    this.physics.add.overlap(this.projectileGroup, this.ships.p1.shape, (projectile) =>
      this.handleProjectileHit(projectile as Phaser.GameObjects.Arc, this.ships.p1)
    );
    this.physics.add.overlap(this.projectileGroup, this.ships.p2.shape, (projectile) =>
      this.handleProjectileHit(projectile as Phaser.GameObjects.Arc, this.ships.p2)
    );

    this.createHud();
    this.input.keyboard?.on("keydown", this.onSystemKeyDown);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  update(time: number, delta: number): void {
    this.updateProjectiles(time);

    for (const playerId of ["p1", "p2"] as const) {
      const ship = this.ships[playerId];
      const input = this.inputSystem.getPlayerState(playerId);
      ship.update(delta, input, !this.roundOver, time);

      if (!this.roundOver && input.fire && ship.canFire(time)) {
        this.fireProjectile(ship, time);
      }
    }

    this.updateDebugText();
    this.checkWinState();
  }

  private createBackground(): void {
    this.add.rectangle(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, ARENA_WIDTH, ARENA_HEIGHT, 0x07111c);

    for (let i = 0; i < 90; i += 1) {
      const x = Phaser.Math.Between(8, ARENA_WIDTH - 8);
      const y = Phaser.Math.Between(8, ARENA_HEIGHT - 8);
      const alpha = Phaser.Math.FloatBetween(0.25, 0.9);
      this.add.circle(x, y, Phaser.Math.Between(1, 2), 0xffffff, alpha);
    }

    const border = this.add.rectangle(
      ARENA_WIDTH / 2,
      ARENA_HEIGHT / 2,
      ARENA_WIDTH - 24,
      ARENA_HEIGHT - 24
    );
    border.setStrokeStyle(2, 0x1a3654, 0.9);
  }

  private createHud(): void {
    const p1 = DEFAULT_PLAYER_BINDINGS.p1;
    const p2 = DEFAULT_PLAYER_BINDINGS.p2;
    const controls =
      `P1 ${bindingLabels(p1.rotateLeft)}/${bindingLabels(p1.thrust)}/${bindingLabels(p1.rotateRight)} move, ${bindingLabels(p1.fire)} fire, ${bindingLabels(p1.brake)} brake, ${bindingLabels(p1.turbo)} turbo\n` +
      `P2 ${bindingLabels(p2.rotateLeft)}/${bindingLabels(p2.thrust)}/${bindingLabels(p2.rotateRight)} move, ${bindingLabels(p2.fire)} fire, ${bindingLabels(p2.brake)} brake, ${bindingLabels(p2.turbo)} turbo | R restart | G garage`;

    this.add.text(18, 16, controls, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#dbeaff",
      lineSpacing: 4
    });

    this.messageText = this.add.text(ARENA_WIDTH / 2, 86, "", {
      fontFamily: "monospace",
      fontSize: "28px",
      color: "#ffffff",
      backgroundColor: "#0d1724",
      padding: { x: 18, y: 10 }
    });
    this.messageText.setOrigin(0.5);
    this.messageText.setDepth(40);
    this.messageText.setVisible(false);

    this.debugText = this.add.text(18, ARENA_HEIGHT - 54, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#9fb6d0"
    });
    this.debugText.setDepth(40);
  }

  private fireProjectile(ship: DuelShipEntity, time: number): void {
    const muzzle = ship.getMuzzlePosition();
    const projectile = new Projectile(
      this,
      ship.playerId,
      muzzle.x,
      muzzle.y,
      ship.getFacingAngle(),
      ship.stats.projectileSpeed,
      ship.stats.projectileDamage,
      ship.playerId === "p1" ? 0x99ddff : 0xffb0b4,
      time
    );

    this.projectileGroup.add(projectile.sprite);
    this.projectiles.push(projectile);
    ship.markFired(time);
  }

  private handleProjectileHit(
    projectileObject: Phaser.GameObjects.Arc,
    target: DuelShipEntity
  ): void {
    const projectile = projectileObject.getData("projectile") as Projectile | undefined;
    if (!projectile || projectile.ownerId === target.playerId || projectile.isDestroyed) {
      return;
    }

    target.takeDamage(projectile.damage, this.time.now);
    projectile.destroy();
    this.cameras.main.shake(80, 0.003);
  }

  private handleShipCollision(): void {
    const time = this.time.now;
    if (time - this.lastShipCollisionAt < 300 || this.roundOver) {
      return;
    }

    const p1Body = this.ships.p1.body;
    const p2Body = this.ships.p2.body;
    const relativeSpeed = Phaser.Math.Distance.Between(
      p1Body.velocity.x,
      p1Body.velocity.y,
      p2Body.velocity.x,
      p2Body.velocity.y
    );

    if (relativeSpeed < 90) {
      return;
    }

    this.lastShipCollisionAt = time;
    const damageToP1 = Math.min(24, relativeSpeed * 0.025 * (this.ships.p2.stats.mass / 20));
    const damageToP2 = Math.min(24, relativeSpeed * 0.025 * (this.ships.p1.stats.mass / 20));
    this.ships.p1.takeDamage(damageToP1, time);
    this.ships.p2.takeDamage(damageToP2, time);
    this.cameras.main.shake(110, 0.005);
  }

  private updateProjectiles(time: number): void {
    for (const projectile of this.projectiles) {
      projectile.update(time);
    }

    this.projectiles = this.projectiles.filter((projectile) => !projectile.isDestroyed);
  }

  private checkWinState(): void {
    if (this.roundOver) {
      return;
    }

    if (!this.ships.p1.alive) {
      this.endRound("Player 2 wins");
    } else if (!this.ships.p2.alive) {
      this.endRound("Player 1 wins");
    }
  }

  private endRound(message: string): void {
    this.roundOver = true;
    this.ships.p1.body.setVelocity(0, 0);
    this.ships.p2.body.setVelocity(0, 0);
    this.messageText.setText(`${message}\nPress R to restart or G for garage`);
    this.messageText.setVisible(true);
  }

  private resetRound(): void {
    this.roundOver = false;
    this.lastShipCollisionAt = 0;
    this.messageText.setVisible(false);
    this.projectiles.forEach((projectile) => projectile.destroy());
    this.projectiles = [];
    this.ships.p1.reset(220, ARENA_HEIGHT / 2, Math.PI / 2);
    this.ships.p2.reset(ARENA_WIDTH - 220, ARENA_HEIGHT / 2, -Math.PI / 2);
  }

  private updateDebugText(): void {
    this.debugText.setText(this.inputSystem.getDebugLines().join("\n"));
  }

  private resolveDuelSlot(
    playerId: PlayerId,
    profiles: PlayerProfile[]
  ): { profile: PlayerProfile; ship: ShipBuild } {
    const fallbackIndex = playerId === "p1" ? 0 : 1;
    const selection = this.duelData[playerId];
    const profile =
      profiles.find((candidate) => candidate.id === selection?.profileId) ??
      profiles[fallbackIndex] ??
      profiles[0];
    const ship =
      profile.ships.find((candidate) => candidate.id === selection?.shipId) ??
      getActiveShip(profile) ??
      profile.ships[0];

    return { profile, ship };
  }

  private shutdown(): void {
    this.inputSystem.destroy();
    this.input.keyboard?.off("keydown", this.onSystemKeyDown);
    for (const projectile of this.projectiles) {
      projectile.destroy();
    }
    this.projectiles = [];
  }
}
