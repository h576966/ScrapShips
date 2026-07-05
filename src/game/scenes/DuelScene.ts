import Phaser from "phaser";
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH
} from "../data/balance";
import { ensureTwoPlayableProfiles } from "../data/defaultProfiles";
import { getWeaponDefinition } from "../data/weapons";
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
import { ArenaObjectSystem } from "../systems/ArenaObjectSystem";
import { DuelCombatSystem } from "../systems/DuelCombatSystem";
import { DuelEffects } from "../systems/DuelEffects";
import { SpaceBackground } from "../systems/SpaceBackground";
import {
  PLAYER_IDS,
  type DuelDebugApi,
  type ShipDebugSnapshot,
  type ShipMap
} from "../systems/DuelTypes";
import { InputSystem } from "../systems/InputSystem";

type DuelSlotSelection = {
  profileId: string;
  shipId: string;
};

export type DuelSceneData = Partial<Record<PlayerId, DuelSlotSelection>>;

declare global {
  interface Window {
    __scrapshipsDuelDebug?: DuelDebugApi;
  }
}

export class DuelScene extends Phaser.Scene {
  private inputSystem!: InputSystem;
  private effects!: DuelEffects;
  private background!: SpaceBackground;
  private arena!: ArenaObjectSystem;
  private combat!: DuelCombatSystem;
  private ships!: ShipMap;
  private messageText!: Phaser.GameObjects.Text;
  private debugText!: Phaser.GameObjects.Text;
  private duelData: DuelSceneData = {};
  private roundOver = false;
  private lastShipCollisionAt = 0;
  private previousGadgetPressed: Record<PlayerId, boolean> = { p1: false, p2: false };

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
    this.configureCamera();
    this.background = new SpaceBackground(this);

    const loadedProfiles = loadProfiles();
    const profiles = ensureTwoPlayableProfiles(loadedProfiles);
    if (!loadedProfiles || loadedProfiles.length < 2) {
      saveProfiles(profiles);
    }

    const playerOne = this.resolveDuelSlot("p1", profiles);
    const playerTwo = this.resolveDuelSlot("p2", profiles);

    this.inputSystem = new InputSystem(this);
    this.effects = new DuelEffects(this);
    this.ships = {
      p1: this.createShipEntity("p1", playerOne, {
        x: 320,
        y: ARENA_HEIGHT / 2,
        rotation: Math.PI / 2
      }),
      p2: this.createShipEntity("p2", playerTwo, {
        x: ARENA_WIDTH - 320,
        y: ARENA_HEIGHT / 2,
        rotation: -Math.PI / 2
      })
    };

    this.physics.add.collider(
      this.ships.p1.shape,
      this.ships.p2.shape,
      () => this.handleShipCollision(),
      undefined,
      this
    );

    this.arena = new ArenaObjectSystem(this, this.ships, this.effects);
    this.combat = new DuelCombatSystem(this, this.ships, this.arena, this.effects);
    this.arena.reset();

    this.createHud();
    this.installDebugHooks();
    this.input.keyboard?.on("keydown", this.onSystemKeyDown);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  update(time: number, delta: number): void {
    this.background.update(delta);
    this.arena.update(time);
    this.combat.update(time, delta);

    for (const playerId of PLAYER_IDS) {
      const ship = this.ships[playerId];
      const input = this.inputSystem.getPlayerState(playerId);
      const gadgetPressed = input.turbo;
      if (
        !this.roundOver &&
        ship.alive &&
        gadgetPressed &&
        !this.previousGadgetPressed[playerId]
      ) {
        this.combat.tryUseGadget(ship, time);
      }
      this.previousGadgetPressed[playerId] = gadgetPressed;

      const movementInput =
        ship.build.gadget === "turbo_burst" ? input : { ...input, turbo: false };
      ship.update(delta, movementInput, !this.roundOver, time);

      if (!this.roundOver && input.fire) {
        this.combat.firePrimaryWeapon(ship, time, delta);
      }
    }

    if (!this.roundOver) {
      this.arena.updateInteractions(time);
    }

    this.updateDebugText();
    this.checkWinState();
  }

  private createShipEntity(
    playerId: PlayerId,
    selection: { profile: PlayerProfile; ship: ShipBuild },
    spawn: { x: number; y: number; rotation: number }
  ): DuelShipEntity {
    return new DuelShipEntity(this, {
      playerId,
      label:
        `${selection.profile.name}: ${selection.ship.name}\n` +
        `${getWeaponDefinition(selection.ship.primaryWeapon).label} | ${selection.ship.gadget ?? "none"}`,
      build: selection.ship,
      stats: calculateShipStats(selection.ship),
      spawn
    });
  }

  private configureCamera(): void {
    const zoom = getDuelCameraZoom();
    this.cameras.main.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
  }

  private createHud(): void {
    const p1 = DEFAULT_PLAYER_BINDINGS.p1;
    const p2 = DEFAULT_PLAYER_BINDINGS.p2;
    const controls =
      `P1 ${bindingLabels(p1.rotateLeft)}/${bindingLabels(p1.thrust)}/${bindingLabels(p1.rotateRight)} move, ${bindingLabels(p1.fire)} fire, ${bindingLabels(p1.brake)} brake, ${bindingLabels(p1.turbo)} turbo\n` +
      `P2 ${bindingLabels(p2.rotateLeft)}/${bindingLabels(p2.thrust)}/${bindingLabels(p2.rotateRight)} move, ${bindingLabels(p2.fire)} fire, ${bindingLabels(p2.brake)} brake, ${bindingLabels(p2.turbo)} turbo | R restart | G garage`;

    this.createFixedText(18, 16, controls, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#dbeaff",
      lineSpacing: 4
    });

    this.messageText = this.createFixedText(VIEWPORT_WIDTH / 2, 86, "", {
      fontFamily: "monospace",
      fontSize: "28px",
      color: "#ffffff",
      backgroundColor: "#0d1724",
      padding: { x: 18, y: 10 }
    });
    this.messageText.setOrigin(0.5);
    this.messageText.setDepth(40);
    this.messageText.setVisible(false);

    this.debugText = this.createFixedText(18, VIEWPORT_HEIGHT - 58, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#9fb6d0"
    });
    this.debugText.setDepth(40);
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
    this.combat.reset();
    this.previousGadgetPressed = { p1: false, p2: false };
    this.ships.p1.reset(320, ARENA_HEIGHT / 2, Math.PI / 2);
    this.ships.p2.reset(ARENA_WIDTH - 320, ARENA_HEIGHT / 2, -Math.PI / 2);
    this.arena.reset();
  }

  private updateDebugText(): void {
    this.debugText.setText(
      [
        ...this.inputSystem.getDebugLines(),
        ...this.combat.getGadgetStatusLines(this.time.now)
      ].join("\n")
    );
  }

  private createFixedText(
    screenX: number,
    screenY: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Text {
    const zoom = getDuelCameraZoom();
    return this.add
      .text(screenX / zoom, screenY / zoom, text, style)
      .setScrollFactor(0)
      .setScale(1 / zoom);
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
    this.combat.destroy();
    this.arena.destroy();
    this.background.destroy();
    if (import.meta.env.DEV) {
      delete window.__scrapshipsDuelDebug;
    }
  }

  private installDebugHooks(): void {
    if (!import.meta.env.DEV) {
      return;
    }

    window.__scrapshipsDuelDebug = {
      getSnapshot: () => ({
        projectileCount: this.combat.projectileCount,
        mineCount: this.combat.mineCount,
        asteroidCount: this.arena.asteroidCount,
        pickupCount: this.arena.pickupCount,
        roundOver: this.roundOver,
        p1: this.getShipDebugSnapshot("p1"),
        p2: this.getShipDebugSnapshot("p2"),
        projectiles: this.combat.getProjectileSnapshots(),
        mines: this.combat.getMineSnapshots(this.time.now),
        asteroids: this.arena.getAsteroidSnapshots(),
        pickups: this.arena.getPickupSnapshots()
      }),
      setShipPose: (playerId, x, y, rotation) => {
        const ship = this.ships[playerId];
        ship.body.reset(x, y);
        ship.body.setVelocity(0, 0);
        ship.shape.setRotation(rotation);
      },
      setShipVelocity: (playerId, x, y) => {
        this.ships[playerId].body.setVelocity(x, y);
      },
      setShipWeapon: (playerId, weapon) => {
        this.combat.setShipWeapon(playerId, weapon);
      },
      setShipGadget: (playerId, gadget) => {
        this.combat.setShipGadget(playerId, gadget);
      },
      placeMine: (playerId) => this.combat.placeMineForPlayer(playerId, this.time.now),
      damageShip: (playerId, amount) => {
        this.ships[playerId].takeDamage(amount, this.time.now);
      },
      setAsteroidPose: (id, x, y) => {
        this.arena.setAsteroidPose(id, x, y);
      },
      setAsteroidHp: (id, hp) => {
        this.arena.setAsteroidHp(id, hp);
      },
      damageAsteroid: (id, amount) => {
        this.arena.damageAsteroidById(id, amount);
      },
      forceNextPickupDrop: (type) => {
        this.arena.forceNextPickupDrop(type);
      },
      spawnPickup: (type, x, y, lifetimeMs) =>
        this.arena.spawnPickup(type, x, y, lifetimeMs).id
    };
  }

  private getShipDebugSnapshot(playerId: PlayerId): ShipDebugSnapshot {
    const ship = this.ships[playerId];
    return {
      hp: ship.hp,
      shield: ship.shield,
      weapon: ship.build.primaryWeapon,
      x: ship.shape.x,
      y: ship.shape.y,
      velocityX: ship.body.velocity.x,
      velocityY: ship.body.velocity.y,
      ...ship.getEffectSnapshot(this.time.now)
    };
  }
}

function getDuelCameraZoom(): number {
  return Math.min(VIEWPORT_WIDTH / ARENA_WIDTH, VIEWPORT_HEIGHT / ARENA_HEIGHT);
}
