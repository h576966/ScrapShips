export type AsteroidSize = "small" | "medium" | "large";

export type AsteroidDefinition = {
  size: AsteroidSize;
  radius: number;
  maxHp: number;
  color: number;
  strokeColor: number;
  knockback: number;
};

export const ASTEROID_SPAWN_COUNT = {
  min: 5,
  max: 8
} as const;

export const ASTEROID_COLLISION_COOLDOWN_MS = 650;

export const ASTEROID_DEFINITIONS: readonly AsteroidDefinition[] = [
  {
    size: "small",
    radius: 23,
    maxHp: 42,
    color: 0x6d7480,
    strokeColor: 0xa9b0ba,
    knockback: 185
  },
  {
    size: "medium",
    radius: 31,
    maxHp: 68,
    color: 0x59616d,
    strokeColor: 0x9da6b2,
    knockback: 215
  },
  {
    size: "large",
    radius: 39,
    maxHp: 96,
    color: 0x4e5661,
    strokeColor: 0x909aa7,
    knockback: 245
  }
];

export function getAsteroidCollisionDamage(relativeSpeed: number): number {
  const speedDamage = 5 + Math.max(0, relativeSpeed) / 90;
  return round(Math.min(10, Math.max(5, speedDamage)));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
