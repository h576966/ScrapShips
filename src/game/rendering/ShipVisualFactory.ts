import { HULL_GRID_SIZE } from "../data/balance";
import {
  findHullPresetId,
  getHullPreset,
  getHullVisualByPreset,
  type HullVisual
} from "../data/hullPresets";
import { normalizeShipVisual } from "../data/shipVisualOptions";
import type {
  HullPixel,
  HullPresetId,
  HullShape,
  ShipBuild,
  ShipVisualCustomization
} from "../model";
import {
  calculateShipStats,
  type ShipStats
} from "../services/ShipStatsCalculator";

export type LegacyHullPreviewPreset = "small" | "medium" | "wide" | "heavy";
export type HullPreviewReference = HullShape | HullPresetId | LegacyHullPreviewPreset;

export type StyleDetailPolygon = {
  points: number[];
  colorRole: "secondary" | "accent";
  alpha: number;
};

export type ShipVisualSpec = {
  visual: HullVisual;
  visualStyle: ShipVisualCustomization;
  visualScale: number;
  bodyPoints: number[];
  cockpitPoints: number[];
  stripePoints: number[];
  detailPolygons: StyleDetailPolygon[];
  hullPixels: HullPixel[];
  noseDistance: number;
  tailDistance: number;
  halfWidth: number;
};

export type ShipPreviewStatLabel = {
  label: string;
  value: string;
};

const PRESET_ALIASES: Record<LegacyHullPreviewPreset, HullPresetId> = {
  small: "needle",
  medium: "scrapper",
  wide: "raider",
  heavy: "bulwark"
};

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function createShipVisualSpec(
  ship: ShipBuild,
  options: { stats?: ShipStats; visualScale?: number } = {}
): ShipVisualSpec {
  const stats = options.stats ?? calculateShipStats(ship);
  const visualStyle = normalizeShipVisual(
    ship.visual,
    findHullPresetId(ship.hullShape)
  );
  const visual = getHullVisualByPreset(visualStyle.hullPreset);
  const visualScale = options.visualScale ?? getShipVisualScale(stats.hullPixelCount);
  const noseDistance = (visual.bodyHeight / 2) * visualScale;
  const tailDistance = (visual.bodyHeight / 2) * visualScale;
  const halfWidth = (visual.bodyWidth / 2) * visualScale;

  return {
    visual,
    visualStyle,
    visualScale,
    bodyPoints: scalePoints(visual.points, visualScale),
    cockpitPoints: scalePoints(visual.cockpit, visualScale),
    stripePoints: scalePoints(visual.stripe, visualScale),
    detailPolygons: createStyleDetailPolygons(visual, visualScale, visualStyle),
    hullPixels: resolveHullPixels(ship.hullShape),
    noseDistance,
    tailDistance,
    halfWidth
  };
}

export function getShipVisualScale(hullPixelCount: number): number {
  return clamp(0.78 + Math.sqrt(hullPixelCount) / 10, 0.92, 1.65);
}

export function resolveHullPixels(reference: HullPreviewReference): HullPixel[] {
  if (typeof reference === "string") {
    const presetId = isLegacyHullPreviewPreset(reference)
      ? PRESET_ALIASES[reference]
      : reference;
    return clonePixels(getHullPreset(presetId).pixels);
  }

  if (Array.isArray(reference.pixels) && reference.pixels.length > 0) {
    return clonePixels(reference.pixels);
  }

  return clonePixels(getHullPreset("scrapper").pixels);
}

export function renderShipPreviewSvg(
  ship: ShipBuild,
  options: { width?: number; height?: number } = {}
): string {
  const width = options.width ?? 248;
  const height = options.height ?? 170;
  const pixels = resolveHullPixels(ship.hullShape);
  const primary = sanitizeHexColor(ship.colors.primary, "#46a6ff");
  const secondary = sanitizeHexColor(ship.colors.secondary, "#c9e8ff");
  const accent = sanitizeHexColor(ship.visual?.accentColor, "#ffe08a");
  const cellSize = Math.floor(Math.min((width - 42) / HULL_GRID_SIZE, (height - 30) / HULL_GRID_SIZE));
  const gridWidth = cellSize * HULL_GRID_SIZE;
  const offsetX = Math.round((width - gridWidth) / 2);
  const offsetY = Math.round((height - gridWidth) / 2) + 4;
  const pixelRects = pixels
    .map(
      (pixel) =>
        `<rect x="${offsetX + pixel.x * cellSize}" y="${
          offsetY + pixel.y * cellSize
        }" width="${cellSize}" height="${cellSize}" rx="1" fill="${primary}" stroke="${secondary}" stroke-width="1" />`
    )
    .join("");
  const noseX = offsetX + cellSize * 7.5;
  const noseY = offsetY + cellSize * 1.05;
  const cockpitX = offsetX + cellSize * 7.5;
  const cockpitY = offsetY + cellSize * 6.4;

  return `
    <svg class="ship-preview-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Ship preview">
      <rect x="0" y="0" width="${width}" height="${height}" rx="8" fill="#081421" />
      <g opacity="0.16">
        <line x1="${offsetX}" y1="${offsetY}" x2="${offsetX + gridWidth}" y2="${offsetY}" stroke="#7890aa" />
        <line x1="${offsetX}" y1="${offsetY + gridWidth}" x2="${offsetX + gridWidth}" y2="${offsetY + gridWidth}" stroke="#7890aa" />
        <line x1="${offsetX}" y1="${offsetY}" x2="${offsetX}" y2="${offsetY + gridWidth}" stroke="#7890aa" />
        <line x1="${offsetX + gridWidth}" y1="${offsetY}" x2="${offsetX + gridWidth}" y2="${offsetY + gridWidth}" stroke="#7890aa" />
      </g>
      <g filter="drop-shadow(0 2px 4px rgba(0,0,0,0.55))">
        ${pixelRects}
        <polygon points="${noseX},${noseY - cellSize * 0.9} ${
          noseX + cellSize * 1.1
        },${noseY + cellSize * 1.2} ${noseX - cellSize * 1.1},${
          noseY + cellSize * 1.2
        }" fill="${accent}" stroke="#050910" stroke-width="1.5" />
        <polygon points="${cockpitX},${cockpitY - cellSize * 1.0} ${
          cockpitX + cellSize * 0.8
        },${cockpitY + cellSize * 0.75} ${cockpitX - cellSize * 0.8},${
          cockpitY + cellSize * 0.75
        }" fill="${secondary}" opacity="0.9" />
      </g>
    </svg>
  `;
}

export function getShipPreviewStatLabels(ship: ShipBuild): ShipPreviewStatLabel[] {
  const stats = calculateShipStats(ship);
  return [
    { label: "Mass", value: String(stats.mass) },
    { label: "Hull HP", value: String(stats.maxHp) },
    { label: "Accel / Speed", value: `${stats.acceleration} / ${stats.maxSpeed}` },
    { label: "Turning", value: String(stats.turnRate) },
    { label: "Shield", value: String(stats.maxShield) },
    { label: "Weapon", value: String(ship.attributes.weapon) },
    { label: "Turbo", value: `${stats.turboAcceleration} / ${stats.turboMaxSpeed}` }
  ];
}

export function scalePoints(points: number[], scale: number): number[] {
  return points.map((value) => value * scale);
}

export function createStyleDetailPolygons(
  visual: HullVisual,
  scale: number,
  style: ShipVisualCustomization
): StyleDetailPolygon[] {
  const halfWidth = visual.bodyWidth / 2;
  const noseY = -visual.bodyHeight / 2;
  const tailY = visual.bodyHeight / 2;
  const details: StyleDetailPolygon[] = [];

  details.push(...createNoseDetails(style.noseStyle, noseY));
  details.push(...createWingDetails(style.wingStyle, halfWidth));
  details.push(...createEngineDetails(style.engineStyle, halfWidth, tailY));

  return details.map((detail) => ({
    ...detail,
    points: scalePoints(detail.points, scale)
  }));
}

function createNoseDetails(
  style: ShipVisualCustomization["noseStyle"],
  noseY: number
): StyleDetailPolygon[] {
  if (style === "blunt") {
    return [
      {
        points: [-6, noseY + 5, 6, noseY + 5, 5, noseY + 12, -5, noseY + 12],
        colorRole: "accent",
        alpha: 0.75
      }
    ];
  }

  if (style === "split") {
    return [
      {
        points: [-2, noseY + 2, -10, noseY + 13, -2, noseY + 12],
        colorRole: "accent",
        alpha: 0.8
      },
      {
        points: [2, noseY + 2, 10, noseY + 13, 2, noseY + 12],
        colorRole: "accent",
        alpha: 0.8
      }
    ];
  }

  return [
    {
      points: [0, noseY - 1, 5, noseY + 10, -5, noseY + 10],
      colorRole: "accent",
      alpha: 0.72
    }
  ];
}

function createWingDetails(
  style: ShipVisualCustomization["wingStyle"],
  halfWidth: number
): StyleDetailPolygon[] {
  if (style === "none") {
    return [];
  }

  const reach = style === "swept_wings" ? 16 : 8;
  const forwardY = style === "swept_wings" ? -4 : 4;
  const backY = style === "swept_wings" ? 20 : 16;
  const innerY = style === "swept_wings" ? 12 : 13;

  return [
    {
      points: [
        halfWidth * 0.48,
        forwardY,
        halfWidth + reach,
        backY,
        halfWidth * 0.2,
        innerY
      ],
      colorRole: "secondary",
      alpha: 0.68
    },
    {
      points: [
        -halfWidth * 0.48,
        forwardY,
        -halfWidth - reach,
        backY,
        -halfWidth * 0.2,
        innerY
      ],
      colorRole: "secondary",
      alpha: 0.68
    }
  ];
}

function createEngineDetails(
  style: ShipVisualCustomization["engineStyle"],
  halfWidth: number,
  tailY: number
): StyleDetailPolygon[] {
  if (style === "single") {
    return [
      {
        points: [-5, tailY - 4, 5, tailY - 4, 6, tailY + 3, -6, tailY + 3],
        colorRole: "accent",
        alpha: 0.75
      }
    ];
  }

  if (style === "wide") {
    return [
      {
        points: [
          -halfWidth * 0.68,
          tailY - 4,
          halfWidth * 0.68,
          tailY - 4,
          halfWidth * 0.58,
          tailY + 3,
          -halfWidth * 0.58,
          tailY + 3
        ],
        colorRole: "accent",
        alpha: 0.72
      }
    ];
  }

  return [
    {
      points: [
        -halfWidth * 0.46,
        tailY - 4,
        -halfWidth * 0.16,
        tailY - 4,
        -halfWidth * 0.12,
        tailY + 3,
        -halfWidth * 0.5,
        tailY + 3
      ],
      colorRole: "accent",
      alpha: 0.75
    },
    {
      points: [
        halfWidth * 0.16,
        tailY - 4,
        halfWidth * 0.46,
        tailY - 4,
        halfWidth * 0.5,
        tailY + 3,
        halfWidth * 0.12,
        tailY + 3
      ],
      colorRole: "accent",
      alpha: 0.75
    }
  ];
}

function clonePixels(pixels: readonly HullPixel[]): HullPixel[] {
  return pixels.map((pixel) => ({ x: pixel.x, y: pixel.y }));
}

function sanitizeHexColor(value: string | undefined, fallback: string): string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value)
    ? value
    : fallback;
}

function isLegacyHullPreviewPreset(value: string): value is LegacyHullPreviewPreset {
  return value === "small" || value === "medium" || value === "wide" || value === "heavy";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
