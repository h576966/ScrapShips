import { describe, expect, it } from "vitest";
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  VIEWPORT_HEIGHT,
  VIEWPORT_WIDTH
} from "../src/game/data/balance";
import {
  ASTEROID_COLLISION_COOLDOWN_MS,
  ASTEROID_DEFINITIONS,
  ASTEROID_SPAWN_COUNT,
  PASSING_ASTEROID_DEFINITION,
  PASSING_ASTEROID_SPEED,
  createPassingAsteroidRoute,
  getAsteroidCollisionDamage,
  getPassingAsteroidCollisionDamage,
  getPassingAsteroidSpawnDelay
} from "../src/game/data/arenaObjects";
import {
  PICKUP_DEFINITIONS,
  applyCorrosiveDamageOverTime,
  applyPickupEffect,
  applyRepair,
  createEmptyShipEffects,
  expireTimedEffects,
  getDropTableTotal,
  getSpeedMultiplier,
  getTotalPickupChance,
  hasCorrosiveAmmo,
  tickDamageOverTime
} from "../src/game/systems/PickupSystem";
import { createAsteroidVisualSpec } from "../src/game/rendering/AsteroidVisualFactory";

describe("arena objects", () => {
  it("uses a duel arena larger than the viewport", () => {
    expect(ARENA_WIDTH).toBeGreaterThan(VIEWPORT_WIDTH);
    expect(ARENA_HEIGHT).toBeGreaterThan(VIEWPORT_HEIGHT);
    expect(ARENA_WIDTH).toBeGreaterThanOrEqual(2400);
    expect(ARENA_HEIGHT).toBeGreaterThanOrEqual(1500);
  });

  it("defines valid asteroid configs", () => {
    expect(ASTEROID_SPAWN_COUNT.min).toBeGreaterThanOrEqual(7);
    expect(ASTEROID_SPAWN_COUNT.max).toBeLessThanOrEqual(10);
    expect(ASTEROID_COLLISION_COOLDOWN_MS).toBeGreaterThan(0);

    for (const asteroid of [...ASTEROID_DEFINITIONS, PASSING_ASTEROID_DEFINITION]) {
      expect(asteroid.radius).toBeGreaterThan(0);
      expect(asteroid.maxHp).toBeGreaterThan(0);
      expect(asteroid.knockback).toBeGreaterThan(0);
    }
  });

  it("generates varied asteroid visuals with highlight and surface pits", () => {
    const small = createAsteroidVisualSpec(28, "small-rock");
    const large = createAsteroidVisualSpec(48, "large-rock");

    expect(small.points.length / 2).toBeGreaterThanOrEqual(11);
    expect(small.points.length / 2).toBeLessThanOrEqual(17);
    expect(small.highlightPoints.length).toBe(small.points.length);
    expect(small.shadowPoints.length).toBe(small.points.length);
    expect(small.pits.length).toBeGreaterThanOrEqual(3);
    expect(small.surfaceLines.length).toBeGreaterThanOrEqual(2);
    expect(large.points).not.toEqual(small.points);
    expect(Math.abs(small.rotationSpeed)).toBeGreaterThan(0);
  });

  it("bounds asteroid collision damage around 5 to 10", () => {
    expect(getAsteroidCollisionDamage(0)).toBe(5);
    expect(getAsteroidCollisionDamage(250)).toBeGreaterThan(5);
    expect(getAsteroidCollisionDamage(900)).toBe(10);
  });

  it("creates infrequent passing asteroid routes and stronger impact damage", () => {
    const route = createPassingAsteroidRoute(
      () => 0.25,
      ARENA_WIDTH,
      ARENA_HEIGHT,
      PASSING_ASTEROID_DEFINITION.radius
    );
    const speed = Math.hypot(route.velocityX, route.velocityY);

    expect(getPassingAsteroidSpawnDelay(() => 0)).toBeGreaterThanOrEqual(12000);
    expect(getPassingAsteroidSpawnDelay(() => 1)).toBeLessThanOrEqual(22000);
    expect(speed).toBeGreaterThanOrEqual(PASSING_ASTEROID_SPEED.min - 1);
    expect(speed).toBeLessThanOrEqual(PASSING_ASTEROID_SPEED.max + 1);
    expect(
      route.x < 0 ||
        route.x > ARENA_WIDTH ||
        route.y < 0 ||
        route.y > ARENA_HEIGHT
    ).toBe(true);
    expect(getPassingAsteroidCollisionDamage(speed)).toBeGreaterThan(
      getAsteroidCollisionDamage(speed)
    );
  });

  it("defines a 20 percent pickup chance with a complete drop table", () => {
    expect(getDropTableTotal()).toBe(1);
    expect(getTotalPickupChance()).toBe(0.2);
  });

  it("caps repair at max health", () => {
    expect(applyRepair(90, 100, 18)).toBe(100);
    expect(applyRepair(60, 100, 18)).toBe(78);
  });

  it("applies pickup effects and lets temporary effects expire", () => {
    const effects = createEmptyShipEffects();
    const speed = applyPickupEffect(70, 100, effects, "speed_boost", 1000);
    expect(speed.hp).toBe(70);
    expect(getSpeedMultiplier(speed.effects, 2000)).toBe(
      PICKUP_DEFINITIONS.speed_boost.speedMultiplier
    );

    const expired = expireTimedEffects(
      speed.effects,
      1000 + (PICKUP_DEFINITIONS.speed_boost.durationMs ?? 0) + 1
    );
    expect(getSpeedMultiplier(expired, 10000)).toBe(1);

    const corrosive = applyPickupEffect(70, 100, effects, "corrosive_ammo", 1000);
    expect(hasCorrosiveAmmo(corrosive.effects, 2000)).toBe(true);
  });

  it("uses one replaceable damage-over-time effect", () => {
    const first = applyCorrosiveDamageOverTime(createEmptyShipEffects(), 1000);
    const second = applyCorrosiveDamageOverTime(first, 1200);

    expect(second.damageOverTime?.endsAt).toBeGreaterThan(
      first.damageOverTime?.endsAt ?? 0
    );

    const tick = tickDamageOverTime(second, 1200 + (second.damageOverTime?.tickMs ?? 0));
    expect(tick.damage).toBeGreaterThan(0);

    const expired = tickDamageOverTime(
      tick.effects,
      1200 + (PICKUP_DEFINITIONS.corrosive_ammo.dotDurationMs ?? 0) + 1
    );
    expect(expired.effects.damageOverTime).toBeNull();
  });
});
