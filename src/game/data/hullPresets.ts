import { HULL_GRID_SIZE, SHIP_ATTRIBUTE_KEYS } from "./balance";
import type { HullPresetId, HullShape, ShipAttributes } from "../model";

export type HullAttributeModifier = Partial<Record<keyof ShipAttributes, number>>;

export type HullPreset = {
  id: HullPresetId;
  label: string;
  hullShape: HullShape;
  modifier: HullAttributeModifier;
};

type HullSegment = {
  y: number;
  from: number;
  to: number;
};

export const HULL_PRESETS: readonly HullPreset[] = [
  {
    id: "scrapper",
    label: "Scrapper",
    hullShape: makeScrapperHull(),
    modifier: { weapon: 1, turbo: -1 }
  },
  {
    id: "needle",
    label: "Needle",
    hullShape: makeNeedleHull(),
    modifier: { speed: 1, hull: -1 }
  },
  {
    id: "bulwark",
    label: "Bulwark",
    hullShape: makeBulwarkHull(),
    modifier: { hull: 1, turning: -1 }
  },
  {
    id: "raider",
    label: "Raider",
    hullShape: makeRaiderHull(),
    modifier: { turbo: 1, shield: -1 }
  }
];

export function getHullPreset(id: HullPresetId): HullShape {
  return cloneHull(getHullPresetDefinition(id).hullShape);
}

export function getHullPresetDefinition(id: HullPresetId): HullPreset {
  return HULL_PRESETS.find((preset) => preset.id === id) ?? HULL_PRESETS[0];
}

export function getHullPresetModifier(id: HullPresetId): HullAttributeModifier {
  return { ...getHullPresetDefinition(id).modifier };
}

export function getHullModifierSummary(id: HullPresetId): string {
  const modifier = getHullPresetModifier(id);
  return SHIP_ATTRIBUTE_KEYS.flatMap((attribute) => {
    const value = modifier[attribute] ?? 0;
    return value === 0 ? [] : `${capitalize(attribute)} ${formatModifierValue(value)}`;
  }).join(", ");
}

export function formatModifierValue(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function findHullPresetId(hullShape: HullShape): HullPresetId | undefined {
  const target = pixelKey(hullShape);
  return HULL_PRESETS.find((preset) => pixelKey(preset.hullShape) === target)?.id;
}

export function makeScrapperHull(): HullShape {
  return makeHullFromSegments([
    segment(1, 8, 8),
    segment(2, 7, 9),
    segment(3, 6, 10),
    segment(4, 5, 11),
    segment(5, 4, 12),
    segment(6, 4, 12),
    segment(7, 3, 13),
    segment(8, 4, 12),
    segment(9, 4, 12),
    segment(10, 5, 11),
    segment(11, 4, 6),
    segment(11, 8, 8),
    segment(11, 10, 12),
    segment(12, 5, 11),
    segment(13, 6, 7),
    segment(13, 9, 10)
  ]);
}

export function makeNeedleHull(): HullShape {
  return makeHullFromSegments([
    segment(0, 8, 8),
    segment(1, 8, 8),
    segment(2, 7, 9),
    segment(3, 7, 9),
    segment(4, 7, 9),
    segment(5, 7, 9),
    segment(6, 6, 10),
    segment(7, 7, 9),
    segment(8, 7, 9),
    segment(9, 7, 9),
    segment(10, 7, 9),
    segment(11, 6, 10),
    segment(12, 7, 9),
    segment(13, 7, 9),
    segment(14, 7, 9),
    segment(15, 6, 7),
    segment(15, 9, 10)
  ]);
}

export function makeBulwarkHull(): HullShape {
  return makeHullFromSegments([
    segment(1, 8, 8),
    segment(2, 6, 10),
    segment(3, 4, 12),
    segment(4, 3, 13),
    segment(5, 2, 14),
    segment(6, 2, 14),
    segment(7, 1, 15),
    segment(8, 1, 15),
    segment(9, 2, 14),
    segment(10, 2, 14),
    segment(11, 3, 13),
    segment(12, 4, 12),
    segment(13, 5, 11),
    segment(14, 3, 5),
    segment(14, 7, 9),
    segment(14, 11, 13),
    segment(15, 4, 5),
    segment(15, 11, 12)
  ]);
}

export function makeRaiderHull(): HullShape {
  return makeHullFromSegments([
    segment(1, 8, 8),
    segment(2, 7, 9),
    segment(3, 6, 10),
    segment(4, 5, 11),
    segment(5, 4, 12),
    segment(6, 3, 13),
    segment(7, 2, 14),
    segment(8, 1, 15),
    segment(9, 0, 16),
    segment(10, 4, 12),
    segment(11, 5, 11),
    segment(12, 4, 6),
    segment(12, 8, 8),
    segment(12, 10, 12),
    segment(13, 3, 5),
    segment(13, 11, 13),
    segment(14, 2, 4),
    segment(14, 12, 14),
    segment(15, 1, 2),
    segment(15, 14, 15)
  ]);
}

export const makeDiamondHull = makeScrapperHull;
export const makeArrowHull = makeRaiderHull;

function segment(y: number, from: number, to: number): HullSegment {
  return { y, from, to };
}

function makeHullFromSegments(segments: readonly HullSegment[]): HullShape {
  const pixels = new Map<string, { x: number; y: number }>();

  for (const { y, from, to } of segments) {
    for (let x = from; x <= to; x += 1) {
      pixels.set(`${x}:${y}`, { x, y });
    }
  }

  return {
    gridSize: HULL_GRID_SIZE,
    pixels: Array.from(pixels.values()).sort((a, b) => a.y - b.y || a.x - b.x)
  };
}

function cloneHull(hullShape: HullShape): HullShape {
  return {
    gridSize: HULL_GRID_SIZE,
    pixels: hullShape.pixels.map((pixel) => ({ ...pixel }))
  };
}

function pixelKey(hullShape: HullShape): string {
  return `${hullShape.gridSize}|${hullShape.pixels
    .map((pixel) => `${pixel.x}:${pixel.y}`)
    .sort()
    .join("|")}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
