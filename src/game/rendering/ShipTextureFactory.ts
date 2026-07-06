import Phaser from "phaser";
import { HULL_CENTER_INDEX } from "../data/balance";
import type { ShipStats } from "../services/ShipStatsCalculator";
import type { ShipBuild } from "../model";
import {
  createShipVisualSpec,
  type ShipVisualCell,
  type ShipVisualSpec
} from "./ShipVisualFactory";

export type ShipTextureResult = {
  key: string;
  width: number;
  height: number;
  spec: ShipVisualSpec;
};

const TEXTURE_PADDING = 7;

export function createShipTextureKey(ship: ShipBuild): string {
  const signature = JSON.stringify({
    colors: ship.colors,
    hullShape: ship.hullShape,
    visual: ship.visual
  });
  return `scrapships.ship.${hashString(signature)}`;
}

export function createOrUpdateShipTexture(
  scene: Phaser.Scene,
  ship: ShipBuild,
  options: { stats?: ShipStats } = {}
): ShipTextureResult {
  const key = createShipTextureKey(ship);
  const spec = createShipVisualSpec(ship, { stats: options.stats });
  const width = Math.ceil(spec.bodyWidth + TEXTURE_PADDING * 2);
  const height = Math.ceil(spec.bodyHeight + TEXTURE_PADDING * 2);

  if (!scene.textures.exists(key)) {
    const graphics = scene.add.graphics();
    drawShipTexture(graphics, spec, ship, width, height);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }

  return { key, width, height, spec };
}

function drawShipTexture(
  graphics: Phaser.GameObjects.Graphics,
  spec: ShipVisualSpec,
  ship: ShipBuild,
  width: number,
  height: number
): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const colors = {
    primary: colorToNumber(ship.colors.primary, 0x46a6ff),
    secondary: colorToNumber(ship.colors.secondary, 0xc9e8ff),
    accent: colorToNumber(spec.visualStyle.accentColor, 0xffe08a)
  };

  for (const cell of spec.visualCells) {
    drawCellShadow(graphics, spec, cell, centerX, centerY);
  }
  for (const cell of spec.visualCells) {
    drawCell(graphics, spec, cell, colors, centerX, centerY);
  }

  graphics.fillStyle(0xffffff, 0.32);
  for (const cell of spec.visualCells.filter((candidate) => candidate.role === "primary")) {
    const position = getCellTexturePosition(spec, cell, centerX, centerY);
    graphics.fillRect(position.x + 1, position.y + 1, spec.cellSize - 2, 1);
  }

  const muzzleX = centerX + spec.muzzleLocalOffset.x;
  const muzzleY = centerY + spec.muzzleLocalOffset.y;
  graphics.fillStyle(colors.accent, 0.95);
  graphics.fillRect(muzzleX - 1, muzzleY - 2, 2, 4);
}

function drawCellShadow(
  graphics: Phaser.GameObjects.Graphics,
  spec: ShipVisualSpec,
  cell: ShipVisualCell,
  centerX: number,
  centerY: number
): void {
  const position = getCellTexturePosition(spec, cell, centerX, centerY);
  graphics.fillStyle(0x02060c, 0.78);
  graphics.fillRect(
    position.x - 1,
    position.y - 1,
    spec.cellSize + 2,
    spec.cellSize + 2
  );
}

function drawCell(
  graphics: Phaser.GameObjects.Graphics,
  spec: ShipVisualSpec,
  cell: ShipVisualCell,
  colors: { primary: number; secondary: number; accent: number },
  centerX: number,
  centerY: number
): void {
  const position = getCellTexturePosition(spec, cell, centerX, centerY);
  const color =
    cell.role === "accent"
      ? colors.accent
      : cell.role === "secondary"
        ? colors.secondary
        : colors.primary;
  graphics.fillStyle(color, cell.alpha);
  graphics.fillRect(position.x, position.y, spec.cellSize, spec.cellSize);
  graphics.lineStyle(1, 0x06101c, 0.46);
  graphics.strokeRect(position.x, position.y, spec.cellSize, spec.cellSize);
}

function getCellTexturePosition(
  spec: ShipVisualSpec,
  cell: ShipVisualCell,
  centerX: number,
  centerY: number
): { x: number; y: number } {
  return {
    x: centerX + (cell.x - HULL_CENTER_INDEX) * spec.cellSize - spec.cellSize / 2,
    y: centerY + (cell.y - HULL_CENTER_INDEX) * spec.cellSize - spec.cellSize / 2
  };
}

function colorToNumber(value: string | undefined, fallback: number): number {
  if (!value || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    return fallback;
  }

  return Number.parseInt(value.slice(1), 16);
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}
