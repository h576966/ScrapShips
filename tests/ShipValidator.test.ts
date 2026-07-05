import { describe, expect, it } from "vitest";
import type { ShipAttributes, ShipBuild } from "../src/game/model";
import {
  validateAttributes,
  validateShipBuild
} from "../src/game/services/ShipValidator";

describe("ShipValidator", () => {
  it("rejects attribute totals above 30", () => {
    const attributes: ShipAttributes = {
      speed: 6,
      turning: 6,
      hull: 6,
      shield: 6,
      weapon: 6,
      turbo: 1
    };

    expect(validateAttributes(attributes).valid).toBe(false);
    expect(validateAttributes(attributes).errors).toContain(
      "attribute total cannot exceed 30"
    );
  });

  it("rejects individual attributes above 10", () => {
    const attributes: ShipAttributes = {
      speed: 11,
      turning: 4,
      hull: 4,
      shield: 4,
      weapon: 4,
      turbo: 3
    };

    expect(validateAttributes(attributes).valid).toBe(false);
    expect(validateAttributes(attributes).errors).toContain("speed cannot exceed 10");
  });

  it("rejects non-hex ship colors", () => {
    const ship = makeShip({
      colors: {
        primary: "blue",
        secondary: "#88ccff"
      }
    });

    expect(validateShipBuild(ship).valid).toBe(false);
    expect(validateShipBuild(ship).errors).toContain(
      "primary color must be a 6-digit hex color"
    );
  });
});

function makeShip(overrides: Partial<ShipBuild> = {}): ShipBuild {
  return {
    id: "ship-1",
    name: "Ship",
    colors: {
      primary: "#ffffff",
      secondary: "#88ccff"
    },
    hullShape: {
      gridSize: 16,
      pixels: [
        { x: 7, y: 7 },
        { x: 8, y: 7 }
      ]
    },
    attributes: {
      speed: 5,
      turning: 5,
      hull: 5,
      shield: 5,
      weapon: 5,
      turbo: 5
    },
    ...overrides
  };
}
