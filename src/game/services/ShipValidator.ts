import {
  ATTRIBUTE_TOTAL_MAX,
  ATTRIBUTE_VALUE_MAX,
  ATTRIBUTE_VALUE_MIN,
  HULL_GRID_SIZE,
  SHIP_ATTRIBUTE_KEYS
} from "../data/balance";
import type { GadgetType, HullShape, ShipAttributes, ShipBuild } from "../model";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

const GADGET_TYPES: readonly GadgetType[] = [
  "none",
  "mine",
  "repair_pulse",
  "turbo_burst"
];
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function getAttributeTotal(attributes: ShipAttributes): number {
  return SHIP_ATTRIBUTE_KEYS.reduce((total, key) => total + attributes[key], 0);
}

export function validateAttributes(attributes: ShipAttributes): ValidationResult {
  const errors: string[] = [];

  for (const key of SHIP_ATTRIBUTE_KEYS) {
    const value = attributes[key];
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      errors.push(`${key} must be an integer`);
      continue;
    }

    if (value < ATTRIBUTE_VALUE_MIN) {
      errors.push(`${key} cannot be below ${ATTRIBUTE_VALUE_MIN}`);
    }

    if (value > ATTRIBUTE_VALUE_MAX) {
      errors.push(`${key} cannot exceed ${ATTRIBUTE_VALUE_MAX}`);
    }
  }

  const total = getAttributeTotal(attributes);
  if (total > ATTRIBUTE_TOTAL_MAX) {
    errors.push(`attribute total cannot exceed ${ATTRIBUTE_TOTAL_MAX}`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateHullShape(hullShape: HullShape): ValidationResult {
  const errors: string[] = [];

  if (hullShape.gridSize !== HULL_GRID_SIZE) {
    errors.push(`hull grid size must be ${HULL_GRID_SIZE}`);
  }

  if (hullShape.pixels.length === 0) {
    errors.push("hull must contain at least one pixel");
  }

  const seen = new Set<string>();
  for (const pixel of hullShape.pixels) {
    const inBounds =
      Number.isInteger(pixel.x) &&
      Number.isInteger(pixel.y) &&
      pixel.x >= 0 &&
      pixel.x < HULL_GRID_SIZE &&
      pixel.y >= 0 &&
      pixel.y < HULL_GRID_SIZE;

    if (!inBounds) {
      errors.push(`hull pixel ${pixel.x},${pixel.y} is outside the grid`);
      continue;
    }

    const key = `${pixel.x}:${pixel.y}`;
    if (seen.has(key)) {
      errors.push(`hull pixel ${pixel.x},${pixel.y} is duplicated`);
    }
    seen.add(key);
  }

  return { valid: errors.length === 0, errors };
}

export function validateShipBuild(ship: ShipBuild): ValidationResult {
  const errors: string[] = [];

  if (!ship.id.trim()) {
    errors.push("ship id is required");
  }

  if (!ship.name.trim()) {
    errors.push("ship name is required");
  }

  if (!HEX_COLOR_PATTERN.test(ship.colors.primary)) {
    errors.push("primary color must be a 6-digit hex color");
  }

  if (!HEX_COLOR_PATTERN.test(ship.colors.secondary)) {
    errors.push("secondary color must be a 6-digit hex color");
  }

  const attributes = validateAttributes(ship.attributes);
  errors.push(...attributes.errors);

  const hull = validateHullShape(ship.hullShape);
  errors.push(...hull.errors);

  if (ship.gadget !== undefined && !GADGET_TYPES.includes(ship.gadget)) {
    errors.push("ship gadget is not supported");
  }

  return { valid: errors.length === 0, errors };
}
