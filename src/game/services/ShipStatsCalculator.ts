import type { ShipBuild } from "../model";

export type ShipStats = {
  hullPixelCount: number;
  mass: number;
  maxHp: number;
  maxShield: number;
  acceleration: number;
  maxSpeed: number;
  turnRate: number;
  projectileDamage: number;
  projectileSpeed: number;
  fireCooldownMs: number;
  turboAcceleration: number;
  turboMaxSpeed: number;
};

export function calculateShipStats(ship: ShipBuild): ShipStats {
  const attributes = ship.attributes;
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
    projectileDamage: round(8 + attributes.weapon * 3),
    projectileSpeed: round(380 + attributes.weapon * 9),
    fireCooldownMs: Math.max(180, 520 - attributes.weapon * 30),
    turboAcceleration: round((220 + attributes.turbo * 34) / speedPenalty),
    turboMaxSpeed: round(maxSpeed + (65 + attributes.turbo * 12) / speedPenalty)
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
