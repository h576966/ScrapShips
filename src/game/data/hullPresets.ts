import type { HullShape } from "../model";

export type HullPresetId = "small" | "medium" | "wide" | "heavy";

export type HullPreset = {
  id: HullPresetId;
  label: string;
  hullShape: HullShape;
};

export const HULL_PRESETS: readonly HullPreset[] = [
  {
    id: "small",
    label: "Small",
    hullShape: makeRectHull(5, 5, 6, 6)
  },
  {
    id: "medium",
    label: "Medium",
    hullShape: makeDiamondHull()
  },
  {
    id: "wide",
    label: "Wide",
    hullShape: makeRectHull(2, 5, 12, 7)
  },
  {
    id: "heavy",
    label: "Heavy",
    hullShape: makeRectHull(3, 2, 10, 12)
  }
];

export function getHullPreset(id: HullPresetId): HullShape {
  return cloneHull(HULL_PRESETS.find((preset) => preset.id === id)?.hullShape ?? HULL_PRESETS[1].hullShape);
}

export function findHullPresetId(hullShape: HullShape): HullPresetId | undefined {
  const target = pixelKey(hullShape);
  return HULL_PRESETS.find((preset) => pixelKey(preset.hullShape) === target)?.id;
}

export function makeDiamondHull(): HullShape {
  const pixels = [];
  const center = 7.5;

  for (let y = 2; y <= 13; y += 1) {
    for (let x = 3; x <= 12; x += 1) {
      if (Math.abs(x - center) + Math.abs(y - center) <= 5.5) {
        pixels.push({ x, y });
      }
    }
  }

  return { gridSize: 16, pixels };
}

export function makeArrowHull(): HullShape {
  const pixels = [];

  for (let y = 1; y <= 13; y += 1) {
    const halfWidth = y < 8 ? y : Math.max(2, 14 - y);
    for (let x = 8 - halfWidth; x <= 7 + halfWidth; x += 1) {
      pixels.push({ x, y });
    }
  }

  return { gridSize: 16, pixels };
}

function makeRectHull(xStart: number, yStart: number, width: number, height: number): HullShape {
  const pixels = [];

  for (let y = yStart; y < yStart + height; y += 1) {
    for (let x = xStart; x < xStart + width; x += 1) {
      pixels.push({ x, y });
    }
  }

  return { gridSize: 16, pixels };
}

function cloneHull(hullShape: HullShape): HullShape {
  return {
    gridSize: 16,
    pixels: hullShape.pixels.map((pixel) => ({ ...pixel }))
  };
}

function pixelKey(hullShape: HullShape): string {
  return hullShape.pixels
    .map((pixel) => `${pixel.x}:${pixel.y}`)
    .sort()
    .join("|");
}
