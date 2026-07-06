import { describe, expect, it } from "vitest";
import { HULL_CENTER_INDEX, HULL_GRID_SIZE } from "../src/game/data/balance";
import { getHullPreset } from "../src/game/data/hullPresets";
import { DEFAULT_SHIP_VISUAL } from "../src/game/data/shipVisualOptions";
import type { HullShape, ShipBuild } from "../src/game/model";
import {
  calculateShipHitRadius,
  createShipVisualSpec,
  getShipPreviewStatLabels,
  renderShipPreviewSvg,
  resolveHullPixels
} from "../src/game/rendering/ShipVisualFactory";
import { createShipTextureKey } from "../src/game/rendering/ShipTextureFactory";

describe("ShipVisualFactory", () => {
  it("resolves hull pixels from existing hull data without sharing references", () => {
    const hull = makeHull([
      { x: 7, y: 2 },
      { x: 8, y: 2 }
    ]);
    const pixels = resolveHullPixels(hull);

    expect(pixels).toEqual(hull.pixels);
    expect(pixels).not.toBe(hull.pixels);
    pixels[0].x = 0;
    expect(hull.pixels[0].x).toBe(7);
  });

  it("resolves simple preview preset aliases to pixel hulls", () => {
    expect(resolveHullPixels("small").length).toBeGreaterThan(0);
    expect(resolveHullPixels("medium").length).toBeGreaterThan(0);
    expect(resolveHullPixels("wide").length).toBeGreaterThan(0);
    expect(resolveHullPixels("heavy").length).toBeGreaterThan(0);
  });

  it("builds visual specs and stat labels from ShipBuild data", () => {
    const ship = makeShip();
    const spec = createShipVisualSpec(ship);
    const labels = getShipPreviewStatLabels(ship);

    expect(spec.visualCells.length).toBeGreaterThan(spec.hullPixels.length);
    expect(spec.visualCells.some((cell) => cell.role === "secondary")).toBe(true);
    expect(spec.visualCells.some((cell) => cell.role === "accent")).toBe(true);
    expect(spec.muzzleDistance).toBeGreaterThan(0);
    expect(spec.hullPixels).toHaveLength(ship.hullShape.pixels.length);
    expect(labels.map((label) => label.label)).toEqual([
      "Mass",
      "Hull HP",
      "Accel / Speed",
      "Turning",
      "Shield",
      "Weapon",
      "Turbo"
    ]);
  });

  it("renders an SVG preview without mutating the ship build", () => {
    const ship = makeShip();
    const before = JSON.stringify(ship);
    const svg = renderShipPreviewSvg(ship);

    expect(svg).toContain("<svg");
    expect(svg).toContain(ship.colors.primary);
    expect(svg).toContain(ship.colors.secondary);
    expect(JSON.stringify(ship)).toBe(before);
  });

  it("creates stable ship texture keys from visual identity", () => {
    const ship = makeShip();
    const before = JSON.stringify(ship);
    const sameKey = createShipTextureKey(makeShip());
    const colorKey = createShipTextureKey(
      makeShip({ colors: { primary: "#ff6666", secondary: "#c9e8ff" } })
    );
    const hullKey = createShipTextureKey(
      makeShip({
        hullShape: getHullPreset("needle"),
        visual: { ...DEFAULT_SHIP_VISUAL, hullPreset: "needle" }
      })
    );

    expect(createShipTextureKey(ship)).toBe(sameKey);
    expect(colorKey).not.toBe(sameKey);
    expect(hullKey).not.toBe(sameKey);
    expect(JSON.stringify(ship)).toBe(before);
  });

  it("uses the shared visual spec so silhouette options affect the preview", () => {
    const compact = makeShip({
      visual: {
        ...DEFAULT_SHIP_VISUAL,
        wingStyle: "none",
        engineStyle: "single"
      }
    });
    const wide = makeShip({
      visual: {
        ...DEFAULT_SHIP_VISUAL,
        wingStyle: "swept_wings",
        engineStyle: "wide"
      }
    });

    expect(renderShipPreviewSvg(compact)).not.toBe(renderShipPreviewSvg(wide));
    expect(createShipVisualSpec(wide).visualCells.length).toBeGreaterThan(
      createShipVisualSpec(compact).visualCells.length
    );
  });

  it("centers the muzzle on x=8 for every hull preset", () => {
    for (const hullPreset of ["scrapper", "needle", "bulwark", "raider"] as const) {
      const spec = createShipVisualSpec(
        makeShip({
          hullShape: getHullPreset(hullPreset),
          visual: { ...DEFAULT_SHIP_VISUAL, hullPreset }
        })
      );

      expect(spec.muzzleGridPoint.x).toBe(HULL_CENTER_INDEX);
      expect(spec.muzzleLocalOffset.x).toBe(0);
      expect(spec.muzzleDistance).toBeGreaterThan(0);
    }
  });

  it("changes muzzle distance by hull preset without lateral drift", () => {
    const needle = createShipVisualSpec(
      makeShip({
        hullShape: getHullPreset("needle"),
        visual: { ...DEFAULT_SHIP_VISUAL, hullPreset: "needle" }
      })
    );
    const bulwark = createShipVisualSpec(
      makeShip({
        hullShape: getHullPreset("bulwark"),
        visual: { ...DEFAULT_SHIP_VISUAL, hullPreset: "bulwark" }
      })
    );

    expect(needle.muzzleLocalOffset.x).toBe(0);
    expect(bulwark.muzzleLocalOffset.x).toBe(0);
    expect(needle.muzzleDistance).not.toBe(bulwark.muzzleDistance);
  });

  it("keeps narrow hulls easier to hit than tiny ships but smaller than bulwarks", () => {
    const needle = createShipVisualSpec(
      makeShip({
        hullShape: getHullPreset("needle"),
        visual: { ...DEFAULT_SHIP_VISUAL, hullPreset: "needle" }
      })
    );
    const bulwark = createShipVisualSpec(
      makeShip({
        hullShape: getHullPreset("bulwark"),
        visual: { ...DEFAULT_SHIP_VISUAL, hullPreset: "bulwark" }
      })
    );

    const needleRadius = calculateShipHitRadius({
      width: needle.halfWidth * 2,
      height: needle.noseDistance + needle.tailDistance
    });
    const bulwarkRadius = calculateShipHitRadius({
      width: bulwark.halfWidth * 2,
      height: bulwark.noseDistance + bulwark.tailDistance
    });

    expect(needleRadius).toBeGreaterThan(14);
    expect(bulwarkRadius).toBeGreaterThan(needleRadius);
  });
});

function makeShip(overrides: Partial<ShipBuild> = {}): ShipBuild {
  return {
    id: "ship-1",
    name: "Preview Ship",
    colors: {
      primary: "#46a6ff",
      secondary: "#c9e8ff"
    },
    hullShape: getHullPreset("scrapper"),
    attributes: {
      speed: 5,
      turning: 5,
      hull: 5,
      shield: 5,
      weapon: 5,
      turbo: 5
    },
    primaryWeapon: "bolt_cannon",
    visual: DEFAULT_SHIP_VISUAL,
    gadget: "turbo_burst",
    ...overrides
  };
}

function makeHull(pixels: HullShape["pixels"]): HullShape {
  return {
    gridSize: HULL_GRID_SIZE,
    pixels: pixels.map((pixel) => ({ ...pixel }))
  };
}
