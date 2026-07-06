export type AsteroidSize = "small" | "medium" | "large" | "passing";

export type AsteroidDefinition = {
  size: AsteroidSize;
  radius: number;
  maxHp: number;
  color: number;
  strokeColor: number;
  knockback: number;
};

export type PassingAsteroidRoute = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
};

export const ASTEROID_SPAWN_COUNT = {
  min: 7,
  max: 10
} as const;

export const ASTEROID_COLLISION_COOLDOWN_MS = 650;

export const PASSING_ASTEROID_SPAWN_DELAY_MS = {
  min: 12000,
  max: 22000
} as const;

export const PASSING_ASTEROID_SPEED = {
  min: 310,
  max: 430
} as const;

export const PASSING_ASTEROID_EXIT_MARGIN = 170;

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

export const PASSING_ASTEROID_DEFINITION: AsteroidDefinition = {
  size: "passing",
  radius: 34,
  maxHp: 88,
  color: 0x665d55,
  strokeColor: 0xc1b2a3,
  knockback: 330
};

export function getAsteroidCollisionDamage(relativeSpeed: number): number {
  const speedDamage = 5 + Math.max(0, relativeSpeed) / 90;
  return round(Math.min(10, Math.max(5, speedDamage)));
}

export function getPassingAsteroidCollisionDamage(relativeSpeed: number): number {
  const speedDamage = 12 + Math.max(0, relativeSpeed) / 70;
  return round(Math.min(26, Math.max(14, speedDamage)));
}

export function getPassingAsteroidSpawnDelay(random: () => number): number {
  return Math.round(
    randomRange(
      PASSING_ASTEROID_SPAWN_DELAY_MS.min,
      PASSING_ASTEROID_SPAWN_DELAY_MS.max,
      random
    )
  );
}

export function createPassingAsteroidRoute(
  random: () => number,
  arenaWidth: number,
  arenaHeight: number,
  radius: number
): PassingAsteroidRoute {
  const margin = PASSING_ASTEROID_EXIT_MARGIN + radius;
  const side = Math.floor(random() * 4);
  const speed = randomRange(PASSING_ASTEROID_SPEED.min, PASSING_ASTEROID_SPEED.max, random);
  const start = getEdgePoint(side, arenaWidth, arenaHeight, margin, random);
  const end = getEdgePoint((side + 2) % 4, arenaWidth, arenaHeight, margin, random);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    x: round(start.x),
    y: round(start.y),
    velocityX: round((dx / length) * speed),
    velocityY: round((dy / length) * speed)
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function randomRange(min: number, max: number, random: () => number): number {
  return min + (max - min) * random();
}

function getEdgePoint(
  side: number,
  arenaWidth: number,
  arenaHeight: number,
  margin: number,
  random: () => number
): { x: number; y: number } {
  if (side === 0) {
    return {
      x: -margin,
      y: randomRange(120, arenaHeight - 120, random)
    };
  }
  if (side === 1) {
    return {
      x: randomRange(160, arenaWidth - 160, random),
      y: -margin
    };
  }
  if (side === 2) {
    return {
      x: arenaWidth + margin,
      y: randomRange(120, arenaHeight - 120, random)
    };
  }

  return {
    x: randomRange(160, arenaWidth - 160, random),
    y: arenaHeight + margin
  };
}
