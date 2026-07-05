import type { WeaponDefinition } from "../data/weapons";

export type ProjectileExpirationInput = {
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
  createdAt: number;
  now: number;
  range: number;
  lifetimeMs: number;
};

export type LaserHitInput = {
  originX: number;
  originY: number;
  angle: number;
  range: number;
  targetX: number;
  targetY: number;
  targetRadius: number;
};

export type SegmentCircleHitInput = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  targetX: number;
  targetY: number;
  targetRadius: number;
};

export function scaleWeaponDamage(
  weapon: WeaponDefinition,
  weaponAttribute: number
): number {
  return round(weapon.baseDamage * (1 + weaponAttribute * 0.07));
}

export function scaleWeaponCooldown(
  weapon: WeaponDefinition,
  weaponAttribute: number
): number {
  if (weapon.mode === "continuous") {
    return 0;
  }

  return Math.max(120, Math.round(weapon.cooldownMs * (1 - weaponAttribute * 0.018)));
}

export function canFireWeapon(readyAt: number, now: number): boolean {
  return now >= readyAt;
}

export function getLaserDamage(
  weapon: WeaponDefinition,
  weaponAttribute: number,
  deltaMs: number
): number {
  if (weapon.mode !== "continuous") {
    return 0;
  }

  return round((scaleWeaponDamage(weapon, weaponAttribute) * deltaMs) / 1000);
}

export function isProjectileExpired(input: ProjectileExpirationInput): boolean {
  const distance = Math.hypot(input.currentX - input.originX, input.currentY - input.originY);
  return distance >= input.range || input.now - input.createdAt >= input.lifetimeMs;
}

export function laserIntersectsCircle(input: LaserHitInput): boolean {
  const dirX = Math.cos(input.angle);
  const dirY = Math.sin(input.angle);
  const toTargetX = input.targetX - input.originX;
  const toTargetY = input.targetY - input.originY;
  const projection = toTargetX * dirX + toTargetY * dirY;

  if (projection < 0 || projection > input.range) {
    return false;
  }

  const closestX = input.originX + dirX * projection;
  const closestY = input.originY + dirY * projection;
  const distance = Math.hypot(input.targetX - closestX, input.targetY - closestY);

  return distance <= input.targetRadius;
}

export function segmentIntersectsCircle(input: SegmentCircleHitInput): boolean {
  const deltaX = input.endX - input.startX;
  const deltaY = input.endY - input.startY;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;

  if (lengthSquared === 0) {
    return (
      Math.hypot(input.targetX - input.startX, input.targetY - input.startY) <=
      input.targetRadius
    );
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((input.targetX - input.startX) * deltaX +
        (input.targetY - input.startY) * deltaY) /
        lengthSquared
    )
  );
  const closestX = input.startX + deltaX * projection;
  const closestY = input.startY + deltaY * projection;

  return Math.hypot(input.targetX - closestX, input.targetY - closestY) <= input.targetRadius;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
