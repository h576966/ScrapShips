import type { HullPresetId, HullShape } from "../model";

export type HullPreset = {
  id: HullPresetId;
  label: string;
  hullShape: HullShape;
  visual: HullVisual;
};

export type HullVisual = {
  points: number[];
  cockpit: number[];
  stripe: number[];
  bodyWidth: number;
  bodyHeight: number;
};

export const HULL_PRESETS: readonly HullPreset[] = [
  {
    id: "scrapper",
    label: "Scrapper",
    hullShape: makeScrapperHull(),
    visual: {
      points: [0, -22, 17, 14, 7, 21, 0, 15, -7, 21, -17, 14],
      cockpit: [0, -10, 6, 3, -6, 3],
      stripe: [-8, 11, 0, 16, 8, 11],
      bodyWidth: 34,
      bodyHeight: 43
    }
  },
  {
    id: "needle",
    label: "Needle",
    hullShape: makeNeedleHull(),
    visual: {
      points: [0, -28, 10, 18, 0, 24, -10, 18],
      cockpit: [0, -14, 4, 0, -4, 0],
      stripe: [-4, 9, 0, 17, 4, 9],
      bodyWidth: 22,
      bodyHeight: 52
    }
  },
  {
    id: "bulwark",
    label: "Bulwark",
    hullShape: makeBulwarkHull(),
    visual: {
      points: [0, -21, 24, 2, 21, 22, 8, 18, 0, 24, -8, 18, -21, 22, -24, 2],
      cockpit: [0, -9, 8, 5, -8, 5],
      stripe: [-15, 13, 0, 20, 15, 13],
      bodyWidth: 48,
      bodyHeight: 45
    }
  },
  {
    id: "raider",
    label: "Raider",
    hullShape: makeRaiderHull(),
    visual: {
      points: [0, -24, 19, 13, 9, 11, 14, 24, 0, 16, -14, 24, -9, 11, -19, 13],
      cockpit: [0, -11, 6, 2, -6, 2],
      stripe: [-10, 11, 0, 16, 10, 11],
      bodyWidth: 38,
      bodyHeight: 48
    }
  }
];

export function getHullPreset(id: HullPresetId): HullShape {
  return cloneHull(
    HULL_PRESETS.find((preset) => preset.id === id)?.hullShape ??
      HULL_PRESETS[0].hullShape
  );
}

export function findHullPresetId(hullShape: HullShape): HullPresetId | undefined {
  const target = pixelKey(hullShape);
  return HULL_PRESETS.find((preset) => pixelKey(preset.hullShape) === target)?.id;
}

export function getHullVisual(hullShape: HullShape): HullVisual {
  return (
    HULL_PRESETS.find((preset) => preset.id === findHullPresetId(hullShape))?.visual ??
    HULL_PRESETS[0].visual
  );
}

export function getHullVisualByPreset(id: HullPresetId): HullVisual {
  return HULL_PRESETS.find((preset) => preset.id === id)?.visual ?? HULL_PRESETS[0].visual;
}

export function makeScrapperHull(): HullShape {
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

export function makeNeedleHull(): HullShape {
  const pixels = [];

  for (let y = 1; y <= 14; y += 1) {
    const halfWidth = y < 9 ? Math.max(1, Math.floor(y / 3)) : 2;
    for (let x = 8 - halfWidth; x <= 7 + halfWidth; x += 1) {
      pixels.push({ x, y });
    }
  }

  return { gridSize: 16, pixels };
}

export function makeBulwarkHull(): HullShape {
  return makeRectHull(2, 3, 12, 11);
}

export function makeRaiderHull(): HullShape {
  const pixels = [];

  for (let y = 2; y <= 14; y += 1) {
    const halfWidth = y < 8 ? y - 1 : Math.max(4, 15 - y);
    for (let x = 8 - halfWidth; x <= 7 + halfWidth; x += 1) {
      if (y < 10 || x < 7 || x > 8 || y > 12) {
        pixels.push({ x, y });
      }
    }
  }

  return { gridSize: 16, pixels };
}

export const makeDiamondHull = makeScrapperHull;
export const makeArrowHull = makeRaiderHull;

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
