import { HULL_CENTER_INDEX, HULL_GRID_SIZE } from "../data/balance";
import { findHullPresetId, getHullPreset } from "../data/hullPresets";
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
  getEffectiveShipAttributes,
  type ShipStats
} from "../services/ShipStatsCalculator";

export type LegacyHullPreviewPreset = "small" | "medium" | "wide" | "heavy";
export type HullPreviewReference = HullShape | HullPresetId | LegacyHullPreviewPreset;
export type ShipVisualCellRole = "primary" | "secondary" | "accent";

export type ShipVisualCell = {
  x: number;
  y: number;
  role: ShipVisualCellRole;
  alpha: number;
};

export type ShipVisualBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
};

export type ShipVisualSpec = {
  visualStyle: ShipVisualCustomization;
  visualScale: number;
  cellSize: number;
  hullPixels: HullPixel[];
  visualCells: ShipVisualCell[];
  bounds: ShipVisualBounds;
  muzzleGridPoint: { x: number; y: number };
  muzzleLocalOffset: { x: number; y: number };
  muzzleDistance: number;
  noseDistance: number;
  tailDistance: number;
  halfWidth: number;
  bodyWidth: number;
  bodyHeight: number;
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
const SHIP_CELL_SIZE = 4;

export function createShipVisualSpec(
  ship: ShipBuild,
  options: { stats?: ShipStats; visualScale?: number } = {}
): ShipVisualSpec {
  const stats = options.stats ?? calculateShipStats(ship);
  const visualStyle = normalizeShipVisual(
    ship.visual,
    findHullPresetId(ship.hullShape)
  );
  const visualScale = options.visualScale ?? getShipVisualScale(stats.hullPixelCount);
  const cellSize = SHIP_CELL_SIZE * visualScale;
  const hullPixels = resolveHullPixels(visualStyle.hullPreset);
  const visualCells = createVisualCells(hullPixels, visualStyle);
  const bounds = calculateCellBounds(visualCells);
  const noseDistance = (HULL_CENTER_INDEX - bounds.minY + 0.5) * cellSize;
  const tailDistance = (bounds.maxY - HULL_CENTER_INDEX + 0.5) * cellSize;
  const halfWidth =
    Math.max(
      HULL_CENTER_INDEX - bounds.minX + 0.5,
      bounds.maxX - HULL_CENTER_INDEX + 0.5
    ) * cellSize;
  const muzzleGridPoint = getCenteredMuzzleGridPoint(visualCells);
  const muzzleLocalOffset = gridPointToLocalOffset(muzzleGridPoint, cellSize);

  return {
    visualStyle,
    visualScale,
    cellSize,
    hullPixels,
    visualCells,
    bounds,
    muzzleGridPoint,
    muzzleLocalOffset,
    muzzleDistance: -muzzleLocalOffset.y,
    noseDistance,
    tailDistance,
    halfWidth,
    bodyWidth: halfWidth * 2,
    bodyHeight: noseDistance + tailDistance
  };
}

export function getShipVisualScale(_hullPixelCount: number): number {
  return 1;
}

export function calculateShipHitRadius(input: {
  width: number;
  height: number;
}): number {
  const narrowAwareRadius = input.width * 0.28 + input.height * 0.15;
  const areaRadius = Math.sqrt(input.width * input.height) * 0.34;
  return round(clamp(Math.max(narrowAwareRadius, areaRadius), 13, 38));
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
  const spec = createShipVisualSpec(ship);
  const primary = sanitizeHexColor(ship.colors.primary, "#46a6ff");
  const secondary = sanitizeHexColor(ship.colors.secondary, "#c9e8ff");
  const accent = sanitizeHexColor(spec.visualStyle.accentColor, "#ffe08a");
  const cellSize = Math.floor(
    Math.min((width - 42) / HULL_GRID_SIZE, (height - 30) / HULL_GRID_SIZE)
  );
  const gridWidth = cellSize * HULL_GRID_SIZE;
  const offsetX = Math.round((width - gridWidth) / 2);
  const offsetY = Math.round((height - gridWidth) / 2) + 4;
  const centerX = offsetX + (HULL_CENTER_INDEX + 0.5) * cellSize;
  const centerY = offsetY + (HULL_CENTER_INDEX + 0.5) * cellSize;
  const muzzleX = centerX + (spec.muzzleGridPoint.x - HULL_CENTER_INDEX) * cellSize;
  const muzzleY = centerY + (spec.muzzleGridPoint.y - HULL_CENTER_INDEX) * cellSize;
  const pixelRects = spec.visualCells
    .map((cell) =>
      renderSvgCell(cell, {
        offsetX,
        offsetY,
        cellSize,
        primary,
        secondary,
        accent
      })
    )
    .join("");

  return `
    <svg class="ship-preview-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Ship preview">
      <rect x="0" y="0" width="${width}" height="${height}" rx="8" fill="#081421" />
      <g opacity="0.16">
        <line x1="${offsetX}" y1="${offsetY}" x2="${offsetX + gridWidth}" y2="${offsetY}" stroke="#7890aa" />
        <line x1="${offsetX}" y1="${offsetY + gridWidth}" x2="${offsetX + gridWidth}" y2="${offsetY + gridWidth}" stroke="#7890aa" />
        <line x1="${offsetX}" y1="${offsetY}" x2="${offsetX}" y2="${offsetY + gridWidth}" stroke="#7890aa" />
        <line x1="${offsetX + gridWidth}" y1="${offsetY}" x2="${offsetX + gridWidth}" y2="${offsetY + gridWidth}" stroke="#7890aa" />
      </g>
      <line x1="${centerX}" y1="${offsetY}" x2="${centerX}" y2="${offsetY + gridWidth}" stroke="${accent}" stroke-width="1" stroke-dasharray="3 5" opacity="0.24" />
      <g filter="drop-shadow(0 2px 4px rgba(0,0,0,0.55))">
        ${pixelRects}
        <circle cx="${muzzleX}" cy="${muzzleY}" r="3" fill="${accent}" stroke="#050910" stroke-width="1" opacity="0.9" />
      </g>
    </svg>
  `;
}

export function getShipPreviewStatLabels(ship: ShipBuild): ShipPreviewStatLabel[] {
  const stats = calculateShipStats(ship);
  const effective = getEffectiveShipAttributes(ship);
  return [
    { label: "Mass", value: String(stats.mass) },
    { label: "Hull HP", value: String(stats.maxHp) },
    { label: "Accel / Speed", value: `${stats.acceleration} / ${stats.maxSpeed}` },
    { label: "Turning", value: String(stats.turnRate) },
    { label: "Shield", value: String(stats.maxShield) },
    { label: "Weapon", value: String(effective.weapon) },
    { label: "Turbo", value: `${stats.turboAcceleration} / ${stats.turboMaxSpeed}` }
  ];
}

function createVisualCells(
  hullPixels: readonly HullPixel[],
  style: ShipVisualCustomization
): ShipVisualCell[] {
  const cells = new Map<string, ShipVisualCell>();
  const setCell = (x: number, y: number, role: ShipVisualCellRole, alpha = 1) => {
    if (!isInGrid(x, y)) {
      return;
    }

    const key = `${x}:${y}`;
    const current = cells.get(key);
    if (!current || rolePriority(role) >= rolePriority(current.role)) {
      cells.set(key, { x, y, role, alpha });
    }
  };

  for (const pixel of hullPixels) {
    setCell(pixel.x, pixel.y, "primary", 1);
  }

  addNoseCells(hullPixels, style.noseStyle, setCell);
  addCockpitCells(hullPixels, setCell);
  addWingCells(hullPixels, style.wingStyle, setCell);
  addEngineCells(hullPixels, style.engineStyle, setCell);

  return Array.from(cells.values()).sort((a, b) => a.y - b.y || a.x - b.x);
}

function addNoseCells(
  hullPixels: readonly HullPixel[],
  style: ShipVisualCustomization["noseStyle"],
  setCell: (x: number, y: number, role: ShipVisualCellRole, alpha?: number) => void
): void {
  const frontY = getFrontCenterY(hullPixels);

  if (style === "blunt") {
    for (let x = HULL_CENTER_INDEX - 1; x <= HULL_CENTER_INDEX + 1; x += 1) {
      setCell(x, frontY + 1, "accent", 0.9);
    }
    return;
  }

  if (style === "split") {
    setCell(HULL_CENTER_INDEX, frontY, "secondary", 0.95);
    setCell(HULL_CENTER_INDEX - 1, frontY + 1, "accent", 0.95);
    setCell(HULL_CENTER_INDEX + 1, frontY + 1, "accent", 0.95);
    return;
  }

  setCell(HULL_CENTER_INDEX, frontY, "accent", 0.95);
  setCell(HULL_CENTER_INDEX, frontY + 1, "accent", 0.86);
}

function addCockpitCells(
  hullPixels: readonly HullPixel[],
  setCell: (x: number, y: number, role: ShipVisualCellRole, alpha?: number) => void
): void {
  const minY = Math.min(...hullPixels.map((pixel) => pixel.y));
  const cockpitY = clamp(Math.round(minY + 5), 3, 9);
  setCell(HULL_CENTER_INDEX, cockpitY, "secondary", 0.95);
  setCell(HULL_CENTER_INDEX - 1, cockpitY + 1, "secondary", 0.8);
  setCell(HULL_CENTER_INDEX + 1, cockpitY + 1, "secondary", 0.8);
  setCell(HULL_CENTER_INDEX, cockpitY + 2, "accent", 0.72);
}

function addWingCells(
  hullPixels: readonly HullPixel[],
  style: ShipVisualCustomization["wingStyle"],
  setCell: (x: number, y: number, role: ShipVisualCellRole, alpha?: number) => void
): void {
  if (style === "none") {
    return;
  }

  const rows = style === "swept_wings" ? [9, 10, 11, 12, 13] : [10, 11, 12];
  for (const y of rows) {
    const row = hullPixels.filter((pixel) => pixel.y === y);
    if (row.length === 0) {
      continue;
    }

    const minX = Math.min(...row.map((pixel) => pixel.x));
    const maxX = Math.max(...row.map((pixel) => pixel.x));
    const reach = style === "swept_wings" ? Math.max(1, y - 9) : 1;
    setCell(minX - reach, y, "secondary", 0.78);
    setCell(maxX + reach, y, "secondary", 0.78);
    if (style === "swept_wings" && y >= 11) {
      setCell(minX - reach - 1, y + 1, "secondary", 0.68);
      setCell(maxX + reach + 1, y + 1, "secondary", 0.68);
    }
  }
}

function addEngineCells(
  hullPixels: readonly HullPixel[],
  style: ShipVisualCustomization["engineStyle"],
  setCell: (x: number, y: number, role: ShipVisualCellRole, alpha?: number) => void
): void {
  const tailY = Math.max(...hullPixels.map((pixel) => pixel.y));
  const engineY = Math.min(HULL_GRID_SIZE - 1, tailY + 1);

  if (style === "single") {
    setCell(HULL_CENTER_INDEX, engineY, "accent", 0.85);
    return;
  }

  if (style === "wide") {
    for (let x = HULL_CENTER_INDEX - 2; x <= HULL_CENTER_INDEX + 2; x += 1) {
      setCell(x, engineY, "accent", 0.78);
    }
    return;
  }

  setCell(HULL_CENTER_INDEX - 1, engineY, "accent", 0.84);
  setCell(HULL_CENTER_INDEX + 1, engineY, "accent", 0.84);
}

function calculateCellBounds(cells: readonly ShipVisualCell[]): ShipVisualBounds {
  const minX = Math.min(...cells.map((cell) => cell.x));
  const maxX = Math.max(...cells.map((cell) => cell.x));
  const minY = Math.min(...cells.map((cell) => cell.y));
  const maxY = Math.max(...cells.map((cell) => cell.y));

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

function getCenteredMuzzleGridPoint(cells: readonly ShipVisualCell[]): {
  x: number;
  y: number;
} {
  const frontCenterY = Math.min(
    ...cells
      .filter((cell) => cell.x === HULL_CENTER_INDEX)
      .map((cell) => cell.y)
  );

  return {
    x: HULL_CENTER_INDEX,
    y: frontCenterY - 0.72
  };
}

function gridPointToLocalOffset(
  point: { x: number; y: number },
  cellSize: number
): { x: number; y: number } {
  return {
    x: round((point.x - HULL_CENTER_INDEX) * cellSize),
    y: round((point.y - HULL_CENTER_INDEX) * cellSize)
  };
}

function getFrontCenterY(hullPixels: readonly HullPixel[]): number {
  const centerPixels = hullPixels.filter((pixel) => pixel.x === HULL_CENTER_INDEX);
  if (centerPixels.length > 0) {
    return Math.min(...centerPixels.map((pixel) => pixel.y));
  }

  return Math.min(...hullPixels.map((pixel) => pixel.y));
}

function renderSvgCell(
  cell: ShipVisualCell,
  options: {
    offsetX: number;
    offsetY: number;
    cellSize: number;
    primary: string;
    secondary: string;
    accent: string;
  }
): string {
  const color =
    cell.role === "accent"
      ? options.accent
      : cell.role === "secondary"
        ? options.secondary
        : options.primary;
  return `<rect x="${options.offsetX + cell.x * options.cellSize}" y="${
    options.offsetY + cell.y * options.cellSize
  }" width="${options.cellSize}" height="${options.cellSize}" rx="1" fill="${color}" fill-opacity="${
    cell.alpha
  }" stroke="#050910" stroke-opacity="0.52" stroke-width="1" />`;
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

function isInGrid(x: number, y: number): boolean {
  return x >= 0 && x < HULL_GRID_SIZE && y >= 0 && y < HULL_GRID_SIZE;
}

function rolePriority(role: ShipVisualCellRole): number {
  return role === "accent" ? 3 : role === "secondary" ? 2 : 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
