import { describe, expect, it } from "vitest";
import { HULL_GRID_SIZE } from "../src/game/data/balance";
import { getHullPreset } from "../src/game/data/hullPresets";
import { DEFAULT_SHIP_VISUAL } from "../src/game/data/shipVisualOptions";
import type { HullShape, ShipBuild } from "../src/game/model";
import {
  calculateShipStats,
  getEffectiveShipAttributes
} from "../src/game/services/ShipStatsCalculator";

describe("ShipStatsCalculator", () => {
  it("returns higher mass for more hull pixels", () => {
    const small = calculateShipStats(makeShip(6));
    const large = calculateShipStats(makeShip(48));

    expect(large.mass).toBeGreaterThan(small.mass);
  });

  it("makes heavier ships less agile and slower with equal attributes", () => {
    const small = calculateShipStats(makeShip(6));
    const large = calculateShipStats(makeShip(48));

    expect(large.maxSpeed).toBeLessThan(small.maxSpeed);
    expect(large.turnRate).toBeLessThan(small.turnRate);
  });

  it("keeps weapon projectile tuning in weapon definitions instead of ship stats", () => {
    const stats = calculateShipStats(makeShip(12));

    expect(stats).not.toHaveProperty("projectileDamage");
    expect(stats).not.toHaveProperty("projectileSpeed");
    expect(stats).not.toHaveProperty("fireCooldownMs");
  });

  it("applies hull modifiers to effective attributes without mutating base values", () => {
    const ship = makePresetShip("needle");
    const effective = getEffectiveShipAttributes(ship);

    expect(effective.speed).toBe(6);
    expect(effective.hull).toBe(4);
    expect(ship.attributes.speed).toBe(5);
    expect(ship.attributes.hull).toBe(5);
  });

  it("calculates stats from effective hull-modified attributes", () => {
    const needle = makePresetShip("needle");
    const sameHullWithoutSpeedModifier = {
      ...needle,
      visual: {
        ...needle.visual,
        hullPreset: "scrapper" as const
      }
    };

    expect(calculateShipStats(needle).maxSpeed).toBeGreaterThan(
      calculateShipStats(sameHullWithoutSpeedModifier).maxSpeed
    );
  });
});

function makeShip(pixelCount: number): ShipBuild {
  return {
    id: `ship-${pixelCount}`,
    name: "Test Ship",
    colors: {
      primary: "#ffffff",
      secondary: "#88ccff"
    },
    hullShape: makeHull(pixelCount),
    attributes: {
      speed: 5,
      turning: 5,
      hull: 5,
      shield: 5,
      weapon: 5,
      turbo: 5
    },
    primaryWeapon: "bolt_cannon",
    visual: DEFAULT_SHIP_VISUAL
  };
}

function makeHull(pixelCount: number): HullShape {
  return {
    gridSize: HULL_GRID_SIZE,
    pixels: Array.from({ length: pixelCount }, (_, index) => ({
      x: index % HULL_GRID_SIZE,
      y: Math.floor(index / HULL_GRID_SIZE)
    }))
  };
}

function makePresetShip(hullPreset: ShipBuild["visual"]["hullPreset"]): ShipBuild {
  return {
    ...makeShip(24),
    hullShape: getHullPreset(hullPreset),
    visual: {
      ...DEFAULT_SHIP_VISUAL,
      hullPreset
    }
  };
}
