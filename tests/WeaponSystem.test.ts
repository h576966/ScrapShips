import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRIMARY_WEAPON,
  WEAPON_DEFINITIONS,
  getWeaponDefinition
} from "../src/game/data/weapons";
import {
  canFireWeapon,
  getLaserDamage,
  isProjectileExpired,
  laserIntersectsCircle,
  scaleWeaponCooldown,
  scaleWeaponDamage,
  segmentIntersectsCircle
} from "../src/game/systems/WeaponSystem";

describe("WeaponSystem", () => {
  it("defines valid primary weapon configs", () => {
    expect(DEFAULT_PRIMARY_WEAPON).toBe("bolt_cannon");
    expect(WEAPON_DEFINITIONS.map((weapon) => weapon.type).sort()).toEqual([
      "bolt_cannon",
      "laser",
      "rail_shot"
    ]);

    for (const weapon of WEAPON_DEFINITIONS) {
      expect(weapon.baseDamage).toBeGreaterThan(0);
      expect(weapon.range).toBeGreaterThan(0);
      if (weapon.mode === "projectile") {
        expect(weapon.cooldownMs).toBeGreaterThan(0);
        expect(weapon.projectileSpeed).toBeGreaterThan(0);
        expect(weapon.lifetimeMs).toBeGreaterThan(0);
      }
    }
  });

  it("expires projectiles by range and lifetime", () => {
    const bolt = getWeaponDefinition("bolt_cannon");

    expect(
      isProjectileExpired({
        originX: 0,
        originY: 0,
        currentX: bolt.range + 1,
        currentY: 0,
        createdAt: 0,
        now: 100,
        range: bolt.range,
        lifetimeMs: bolt.lifetimeMs
      })
    ).toBe(true);

    expect(
      isProjectileExpired({
        originX: 0,
        originY: 0,
        currentX: 10,
        currentY: 0,
        createdAt: 0,
        now: bolt.lifetimeMs + 1,
        range: bolt.range,
        lifetimeMs: bolt.lifetimeMs
      })
    ).toBe(true);
  });

  it("handles cooldown and damage scaling", () => {
    const rail = getWeaponDefinition("rail_shot");

    expect(canFireWeapon(500, 499)).toBe(false);
    expect(canFireWeapon(500, 500)).toBe(true);
    expect(scaleWeaponDamage(rail, 8)).toBeGreaterThan(rail.baseDamage);
    expect(scaleWeaponCooldown(rail, 8)).toBeLessThan(rail.cooldownMs);
  });

  it("checks laser line-circle intersection and DPS", () => {
    const laser = getWeaponDefinition("laser");

    expect(
      laserIntersectsCircle({
        originX: 0,
        originY: 0,
        angle: 0,
        range: laser.range,
        targetX: 80,
        targetY: 4,
        targetRadius: 12
      })
    ).toBe(true);

    expect(
      laserIntersectsCircle({
        originX: 0,
        originY: 0,
        angle: 0,
        range: laser.range,
        targetX: 220,
        targetY: 0,
        targetRadius: 12
      })
    ).toBe(false);

    expect(getLaserDamage(laser, 5, 1000)).toBeGreaterThan(laser.baseDamage);
  });

  it("checks projectile segment-circle intersection", () => {
    expect(
      segmentIntersectsCircle({
        startX: 0,
        startY: 0,
        endX: 120,
        endY: 0,
        targetX: 64,
        targetY: 8,
        targetRadius: 12
      })
    ).toBe(true);

    expect(
      segmentIntersectsCircle({
        startX: 0,
        startY: 0,
        endX: 120,
        endY: 0,
        targetX: 64,
        targetY: 30,
        targetRadius: 12
      })
    ).toBe(false);
  });
});
