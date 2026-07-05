import type { PlayerId } from "../input/bindings";

export type MineDefinition = {
  cooldownMs: number;
  armingDelayMs: number;
  lifetimeMs: number;
  triggerRadius: number;
  explosionRadius: number;
  maxDamage: number;
  maxActivePerPlayer: number;
  dropDistance: number;
};

export type MineState = {
  ownerId: PlayerId;
  placedAt: number;
  x: number;
  y: number;
};

export type MineTriggerInput = {
  mine: MineState;
  now: number;
  targetX: number;
  targetY: number;
  targetRadius: number;
  definition?: MineDefinition;
};

export const PROXIMITY_MINE_DEFINITION: MineDefinition = {
  cooldownMs: 10000,
  armingDelayMs: 1000,
  lifetimeMs: 26000,
  triggerRadius: 86,
  explosionRadius: 122,
  maxDamage: 28,
  maxActivePerPlayer: 2,
  dropDistance: 44
};

export function canPlaceMine(
  readyAt: number,
  now: number,
  activeMineCount: number,
  definition = PROXIMITY_MINE_DEFINITION
): boolean {
  return now >= readyAt && activeMineCount < definition.maxActivePerPlayer;
}

export function isMineArmed(
  mine: MineState,
  now: number,
  definition = PROXIMITY_MINE_DEFINITION
): boolean {
  return now - mine.placedAt >= definition.armingDelayMs;
}

export function isMineExpired(
  mine: MineState,
  now: number,
  definition = PROXIMITY_MINE_DEFINITION
): boolean {
  return now - mine.placedAt >= definition.lifetimeMs;
}

export function shouldTriggerMine(
  input: MineTriggerInput,
  definition = input.definition ?? PROXIMITY_MINE_DEFINITION
): boolean {
  if (!isMineArmed(input.mine, input.now, definition)) {
    return false;
  }

  const distance = Math.hypot(input.targetX - input.mine.x, input.targetY - input.mine.y);
  return distance <= definition.triggerRadius + input.targetRadius;
}

export function calculateMineDamage(
  distanceFromCenter: number,
  definition = PROXIMITY_MINE_DEFINITION
): number {
  if (distanceFromCenter > definition.explosionRadius) {
    return 0;
  }

  const falloff = 1 - distanceFromCenter / definition.explosionRadius;
  return round(definition.maxDamage * Math.max(0.35, falloff));
}

export function getMineCooldownRemainingMs(readyAt: number, now: number): number {
  return Math.max(0, readyAt - now);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
