import Phaser from "phaser";
import {
  ASTEROID_COLLISION_COOLDOWN_MS,
  ASTEROID_DEFINITIONS,
  ASTEROID_SPAWN_COUNT,
  PASSING_ASTEROID_DEFINITION,
  PASSING_ASTEROID_EXIT_MARGIN,
  createPassingAsteroidRoute,
  getAsteroidCollisionDamage,
  getPassingAsteroidCollisionDamage,
  getPassingAsteroidSpawnDelay
} from "../data/arenaObjects";
import { ARENA_HEIGHT, ARENA_WIDTH } from "../data/balance";
import { AsteroidEntity } from "../entities/AsteroidEntity";
import type { DuelShipEntity } from "../entities/DuelShipEntity";
import { PickupEntity } from "../entities/PickupEntity";
import type { Projectile } from "../entities/Projectile";
import {
  rollPickupDrop,
  type PickupType
} from "./PickupSystem";
import { segmentIntersectsCircle } from "./WeaponSystem";
import {
  PLAYER_IDS,
  type AsteroidDebugSnapshot,
  type PickupDebugSnapshot,
  type ShipMap
} from "./DuelTypes";
import { VisualEffectsSystem } from "./VisualEffectsSystem";

export class ArenaObjectSystem {
  private asteroids: AsteroidEntity[] = [];
  private pickups: PickupEntity[] = [];
  private asteroidCollisionReadyAt = { p1: 0, p2: 0 };
  private forcedNextPickupDrop: PickupType | undefined;
  private nextPassingAsteroidAt = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ships: ShipMap,
    private readonly effects: VisualEffectsSystem
  ) {}

  reset(): void {
    this.destroyPickups();
    this.destroyAsteroids();
    this.asteroidCollisionReadyAt = { p1: 0, p2: 0 };
    this.forcedNextPickupDrop = undefined;
    this.nextPassingAsteroidAt =
      this.scene.time.now + getPassingAsteroidSpawnDelay(Math.random);
    this.spawnAsteroids();
  }

  update(time: number, deltaMs: number): void {
    for (const asteroid of this.asteroids) {
      asteroid.update(time, deltaMs);
    }
    for (const pickup of this.pickups) {
      pickup.update(time);
    }
    this.spawnPassingAsteroidIfReady(time);
    this.pruneDestroyed();
  }

  updateInteractions(time: number): void {
    this.handleAsteroidShipCollisions(time);
    this.updatePickupCollection(time);
  }

  destroy(): void {
    this.destroyAsteroids();
    this.destroyPickups();
  }

  getAsteroids(): AsteroidEntity[] {
    return this.asteroids.filter((asteroid) => !asteroid.isDestroyed);
  }

  findAsteroidHit(projectile: Projectile): AsteroidEntity | undefined {
    let hit: AsteroidEntity | undefined;
    let hitDistance = Number.POSITIVE_INFINITY;

    for (const asteroid of this.getAsteroids()) {
      if (
        segmentIntersectsCircle({
          startX: projectile.previousX,
          startY: projectile.previousY,
          endX: projectile.sprite.x,
          endY: projectile.sprite.y,
          targetX: asteroid.shape.x,
          targetY: asteroid.shape.y,
          targetRadius: asteroid.getHitRadius() + projectile.weapon.projectileRadius
        })
      ) {
        const distance = Phaser.Math.Distance.Between(
          projectile.previousX,
          projectile.previousY,
          asteroid.shape.x,
          asteroid.shape.y
        );
        if (distance < hitDistance) {
          hit = asteroid;
          hitDistance = distance;
        }
      }
    }

    return hit;
  }

  damageAsteroid(asteroid: AsteroidEntity, amount: number, time: number): boolean {
    const x = asteroid.shape.x;
    const y = asteroid.shape.y;
    const destroyed = asteroid.takeDamage(amount, time);
    if (destroyed) {
      this.handleAsteroidDestroyed(asteroid, x, y);
    }

    return destroyed;
  }

  spawnPickup(
    type: PickupType,
    x: number,
    y: number,
    lifetimeMs?: number
  ): PickupEntity {
    const pickup = new PickupEntity(this.scene, {
      id: `pickup-${this.scene.time.now}-${this.pickups.length}`,
      type,
      x,
      y,
      createdAt: this.scene.time.now,
      lifetimeMs
    });
    this.pickups.push(pickup);
    return pickup;
  }

  forceNextPickupDrop(type: PickupType): void {
    this.forcedNextPickupDrop = type;
  }

  setAsteroidPose(id: string, x: number, y: number): void {
    this.asteroids.find((asteroid) => asteroid.id === id)?.setPosition(x, y);
  }

  setAsteroidHp(id: string, hp: number): void {
    const asteroid = this.asteroids.find((candidate) => candidate.id === id);
    if (asteroid) {
      asteroid.hp = Math.max(1, hp);
    }
  }

  damageAsteroidById(id: string, amount: number): void {
    const asteroid = this.asteroids.find((candidate) => candidate.id === id);
    if (asteroid) {
      this.damageAsteroid(asteroid, amount, this.scene.time.now);
    }
  }

  spawnPassingAsteroid(): AsteroidEntity {
    const route = createPassingAsteroidRoute(
      Math.random,
      ARENA_WIDTH,
      ARENA_HEIGHT,
      PASSING_ASTEROID_DEFINITION.radius
    );
    const asteroid = new AsteroidEntity(this.scene, {
      id: `passing-asteroid-${Math.round(this.scene.time.now)}-${this.asteroids.length}`,
      x: route.x,
      y: route.y,
      velocityX: route.velocityX,
      velocityY: route.velocityY,
      passing: true,
      definition: PASSING_ASTEROID_DEFINITION
    });
    this.asteroids.push(asteroid);
    return asteroid;
  }

  getAsteroidSnapshots(): AsteroidDebugSnapshot[] {
    return this.getAsteroids().map((asteroid) => ({
      id: asteroid.id,
      size: asteroid.definition.size,
      hp: asteroid.hp,
      x: asteroid.shape.x,
      y: asteroid.shape.y,
      radius: asteroid.getHitRadius()
    }));
  }

  getPickupSnapshots(): PickupDebugSnapshot[] {
    return this.pickups
      .filter((pickup) => !pickup.isDestroyed)
      .map((pickup) => ({
        id: pickup.id,
        type: pickup.type,
        x: pickup.x,
        y: pickup.y
      }));
  }

  get asteroidCount(): number {
    return this.getAsteroids().length;
  }

  get pickupCount(): number {
    return this.pickups.filter((pickup) => !pickup.isDestroyed).length;
  }

  private spawnAsteroids(): void {
    const count = Phaser.Math.Between(
      ASTEROID_SPAWN_COUNT.min,
      ASTEROID_SPAWN_COUNT.max
    );

    for (let i = 0; i < count; i += 1) {
      const definition = Phaser.Utils.Array.GetRandom([...ASTEROID_DEFINITIONS]);
      const position = this.findAsteroidSpawnPosition(definition.radius);
      this.asteroids.push(
        new AsteroidEntity(this.scene, {
          id: `asteroid-${this.scene.time.now}-${i}`,
          x: position.x,
          y: position.y,
          definition
        })
      );
    }
  }

  private spawnPassingAsteroidIfReady(time: number): void {
    if (time < this.nextPassingAsteroidAt) {
      return;
    }

    this.spawnPassingAsteroid();
    this.nextPassingAsteroidAt = time + getPassingAsteroidSpawnDelay(Math.random);
  }

  private findAsteroidSpawnPosition(radius: number): Phaser.Math.Vector2 {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const candidate = new Phaser.Math.Vector2(
        Phaser.Math.Between(120, ARENA_WIDTH - 120),
        Phaser.Math.Between(110, ARENA_HEIGHT - 90)
      );
      const clearOfShips = PLAYER_IDS.every(
        (playerId) =>
          Phaser.Math.Distance.Between(
            candidate.x,
            candidate.y,
            this.ships[playerId].shape.x,
            this.ships[playerId].shape.y
          ) > 155
      );
      const clearOfAsteroids = this.asteroids.every(
        (asteroid) =>
          Phaser.Math.Distance.Between(
            candidate.x,
            candidate.y,
            asteroid.shape.x,
            asteroid.shape.y
          ) >
          radius + asteroid.getHitRadius() + 34
      );

      if (clearOfShips && clearOfAsteroids) {
        return candidate;
      }
    }

    return new Phaser.Math.Vector2(
      Phaser.Math.Between(160, ARENA_WIDTH - 160),
      Phaser.Math.Between(120, ARENA_HEIGHT - 120)
    );
  }

  private handleAsteroidShipCollisions(time: number): void {
    for (const playerId of PLAYER_IDS) {
      if (time < this.asteroidCollisionReadyAt[playerId]) {
        continue;
      }

      const ship = this.ships[playerId];
      for (const asteroid of this.getAsteroids()) {
        const distance = Phaser.Math.Distance.Between(
          ship.shape.x,
          ship.shape.y,
          asteroid.shape.x,
          asteroid.shape.y
        );
        if (distance > ship.getHitRadius() + asteroid.getHitRadius()) {
          continue;
        }

        const damage = getAsteroidShipCollisionDamage(
          asteroid,
          ship.body.velocity.length()
        );
        ship.takeHullDamage(damage, time);
        this.knockShipAwayFromAsteroid(ship, asteroid);
        this.effects.createHullSparks(
          ship.shape.x,
          ship.shape.y,
          asteroid.definition.strokeColor
        );
        this.effects.createImpact(
          ship.shape.x,
          ship.shape.y,
          asteroid.definition.strokeColor
        );
        this.asteroidCollisionReadyAt[playerId] =
          time + ASTEROID_COLLISION_COOLDOWN_MS;
        break;
      }
    }
  }

  private knockShipAwayFromAsteroid(
    ship: DuelShipEntity,
    asteroid: AsteroidEntity
  ): void {
    const angle = Phaser.Math.Angle.Between(
      asteroid.shape.x,
      asteroid.shape.y,
      ship.shape.x,
      ship.shape.y
    );
    const passingPush = asteroid.isPassing ? 0.42 : 0;
    const asteroidVelocity = asteroid.getVelocity();
    ship.body.velocity.x =
      Math.cos(angle) * asteroid.definition.knockback +
      ship.body.velocity.x * 0.25 +
      asteroidVelocity.x * passingPush;
    ship.body.velocity.y =
      Math.sin(angle) * asteroid.definition.knockback +
      ship.body.velocity.y * 0.25 +
      asteroidVelocity.y * passingPush;
  }

  private updatePickupCollection(time: number): void {
    for (const pickup of this.pickups) {
      if (pickup.isDestroyed) {
        continue;
      }

      for (const playerId of PLAYER_IDS) {
        const ship = this.ships[playerId];
        const distance = Phaser.Math.Distance.Between(
          ship.shape.x,
          ship.shape.y,
          pickup.x,
          pickup.y
        );
        if (ship.alive && distance <= ship.getHitRadius() + pickup.radius) {
          ship.applyPickup(pickup.type, time);
          this.effects.createPickupCollect(pickup.x, pickup.y, pickup.type);
          pickup.destroy();
          break;
        }
      }
    }

    this.pruneDestroyed();
  }

  private handleAsteroidDestroyed(asteroid: AsteroidEntity, x: number, y: number): void {
    this.effects.createAsteroidBreak(x, y, asteroid.definition.strokeColor);
    const dropType = this.forcedNextPickupDrop ?? rollPickupDrop(Math.random());
    this.forcedNextPickupDrop = undefined;
    if (dropType) {
      this.spawnPickup(dropType, x, y);
    }
  }

  private destroyAsteroids(): void {
    for (const asteroid of this.asteroids) {
      asteroid.destroy();
    }
    this.asteroids = [];
  }

  private destroyPickups(): void {
    for (const pickup of this.pickups) {
      pickup.destroy();
    }
    this.pickups = [];
  }

  private pruneDestroyed(): void {
    for (const asteroid of this.asteroids) {
      if (
        asteroid.isPassing &&
        asteroid.isOutsideArena(
          ARENA_WIDTH,
          ARENA_HEIGHT,
          PASSING_ASTEROID_EXIT_MARGIN + asteroid.getHitRadius()
        )
      ) {
        asteroid.destroy();
      }
    }
    this.asteroids = this.asteroids.filter((asteroid) => !asteroid.isDestroyed);
    this.pickups = this.pickups.filter((pickup) => !pickup.isDestroyed);
  }
}

function getAsteroidShipCollisionDamage(
  asteroid: AsteroidEntity,
  shipSpeed: number
): number {
  if (!asteroid.isPassing) {
    return getAsteroidCollisionDamage(shipSpeed);
  }

  return getPassingAsteroidCollisionDamage(shipSpeed + asteroid.getSpeed());
}
