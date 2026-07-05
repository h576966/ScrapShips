import { describe, expect, it } from "vitest";
import { DEFAULT_SHIP_VISUAL } from "../src/game/data/shipVisualOptions";
import type { HullShape, ShipBuild } from "../src/game/model";
import { calculateShipStats } from "../src/game/services/ShipStatsCalculator";

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
    gridSize: 16,
    pixels: Array.from({ length: pixelCount }, (_, index) => ({
      x: index % 16,
      y: Math.floor(index / 16)
    }))
  };
}
