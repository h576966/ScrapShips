import { describe, expect, it } from "vitest";
import { DEFAULT_SHIP_VISUAL } from "../src/game/data/shipVisualOptions";
import type { HullShape, ShipBuild } from "../src/game/model";
import {
  createShipVisualSpec,
  getShipPreviewStatLabels,
  renderShipPreviewSvg,
  resolveHullPixels
} from "../src/game/rendering/ShipVisualFactory";

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

    expect(spec.bodyPoints.length).toBeGreaterThan(0);
    expect(spec.cockpitPoints.length).toBeGreaterThan(0);
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
});

function makeShip(): ShipBuild {
  return {
    id: "ship-1",
    name: "Preview Ship",
    colors: {
      primary: "#46a6ff",
      secondary: "#c9e8ff"
    },
    hullShape: makeHull([
      { x: 7, y: 2 },
      { x: 8, y: 2 },
      { x: 6, y: 3 },
      { x: 7, y: 3 },
      { x: 8, y: 3 },
      { x: 9, y: 3 },
      { x: 7, y: 4 },
      { x: 8, y: 4 }
    ]),
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
    gadget: "turbo_burst"
  };
}

function makeHull(pixels: HullShape["pixels"]): HullShape {
  return {
    gridSize: 16,
    pixels: pixels.map((pixel) => ({ ...pixel }))
  };
}
