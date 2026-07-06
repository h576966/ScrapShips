import {
  ATTRIBUTE_VALUE_MAX,
  ATTRIBUTE_VALUE_MIN,
  SHIP_ATTRIBUTE_KEYS
} from "../data/balance";
import {
  findHullPresetId,
  getHullPresetModifier,
  type HullAttributeModifier
} from "../data/hullPresets";
import { normalizeShipVisual } from "../data/shipVisualOptions";
import type { HullPresetId, ShipAttributes, ShipBuild } from "../model";

export type ShipStats = {
  hullPixelCount: number;
  mass: number;
  maxHp: number;
  maxShield: number;
  acceleration: number;
  maxSpeed: number;
  turnRate: number;
  turboAcceleration: number;
  turboMaxSpeed: number;
};

export function calculateShipStats(ship: ShipBuild): ShipStats {
  const attributes = getEffectiveShipAttributes(ship);
  const hullPixelCount = ship.hullShape.pixels.length;
  const mass = round(8 + hullPixelCount * 0.4);
  const speedPenalty = 1 + hullPixelCount * 0.01;
  const handlingPenalty = 1 + hullPixelCount * 0.018;

  const maxSpeed = round((185 + attributes.speed * 24) / speedPenalty);
  const acceleration = round((155 + attributes.speed * 28) / speedPenalty);
  const turnRate = round((2.6 + attributes.turning * 0.22) / handlingPenalty);

  return {
    hullPixelCount,
    mass,
    maxHp: round(70 + attributes.hull * 12 + hullPixelCount * 1.2),
    maxShield: round(attributes.shield * 10),
    acceleration,
    maxSpeed,
    turnRate,
    turboAcceleration: round((220 + attributes.turbo * 34) / speedPenalty),
    turboMaxSpeed: round(maxSpeed + (65 + attributes.turbo * 12) / speedPenalty)
  };
}

export function getEffectiveShipAttributes(ship: ShipBuild): ShipAttributes {
  const modifier = getHullAttributeModifierForShip(ship);

  return SHIP_ATTRIBUTE_KEYS.reduce((attributes, key) => {
    attributes[key] = clampAttribute(ship.attributes[key] + (modifier[key] ?? 0));
    return attributes;
  }, {} as ShipAttributes);
}

export function getHullAttributeModifierForShip(
  ship: ShipBuild
): HullAttributeModifier {
  return getHullPresetModifier(getShipHullPresetId(ship));
}

export function getShipHullPresetId(ship: ShipBuild): HullPresetId {
  return normalizeShipVisual(ship.visual, findHullPresetId(ship.hullShape)).hullPreset;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function clampAttribute(value: number): number {
  return Math.max(ATTRIBUTE_VALUE_MIN, Math.min(ATTRIBUTE_VALUE_MAX, value));
}
