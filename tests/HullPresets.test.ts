import { describe, expect, it } from "vitest";
import { HULL_CENTER_INDEX, HULL_GRID_SIZE } from "../src/game/data/balance";
import {
  HULL_PRESETS,
  getHullModifierSummary,
  getHullPresetModifier
} from "../src/game/data/hullPresets";

describe("hull presets", () => {
  it("uses 17x17 centered hull masks with in-bounds pixels", () => {
    for (const preset of HULL_PRESETS) {
      const hull = preset.hullShape;
      expect(hull.gridSize).toBe(17);
      expect(hull.pixels.length).toBeGreaterThan(24);
      expect(hull.pixels.length).toBeLessThan(170);
      expect(hull.pixels.some((pixel) => pixel.x === HULL_CENTER_INDEX)).toBe(true);

      const frontY = Math.min(...hull.pixels.map((pixel) => pixel.y));
      expect(
        hull.pixels.some(
          (pixel) => pixel.x === HULL_CENTER_INDEX && pixel.y === frontY
        )
      ).toBe(true);

      const seen = new Set<string>();
      for (const pixel of hull.pixels) {
        expect(pixel.x).toBeGreaterThanOrEqual(0);
        expect(pixel.x).toBeLessThan(HULL_GRID_SIZE);
        expect(pixel.y).toBeGreaterThanOrEqual(0);
        expect(pixel.y).toBeLessThan(HULL_GRID_SIZE);
        const key = `${pixel.x}:${pixel.y}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });

  it("defines the intended small attribute trade-offs", () => {
    expect(getHullPresetModifier("scrapper")).toEqual({ weapon: 1, turbo: -1 });
    expect(getHullPresetModifier("needle")).toEqual({ speed: 1, hull: -1 });
    expect(getHullPresetModifier("bulwark")).toEqual({ hull: 1, turning: -1 });
    expect(getHullPresetModifier("raider")).toEqual({ turbo: 1, shield: -1 });
  });

  it("formats visible modifier summaries for the builder", () => {
    expect(getHullModifierSummary("scrapper")).toBe("Weapon +1, Turbo -1");
    expect(getHullModifierSummary("needle")).toBe("Speed +1, Hull -1");
  });
});
