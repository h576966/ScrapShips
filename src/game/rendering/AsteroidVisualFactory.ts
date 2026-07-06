export type AsteroidPit = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
};

export type AsteroidSurfaceLine = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  alpha: number;
};

export type AsteroidVisualSpec = {
  points: number[];
  shadowPoints: number[];
  highlightPoints: number[];
  pits: AsteroidPit[];
  surfaceLines: AsteroidSurfaceLine[];
  rotationSpeed: number;
};

export function createAsteroidVisualSpec(
  radius: number,
  seed: string
): AsteroidVisualSpec {
  const random = createSeededRandom(seed);
  const vertexCount = 11 + Math.floor(random() * 7);
  const ridgeOne = 0.08 + random() * 0.09;
  const ridgeTwo = 0.04 + random() * 0.07;
  const ridgePhase = random() * Math.PI * 2;
  const points: number[] = [];

  for (let index = 0; index < vertexCount; index += 1) {
    const angle =
      (Math.PI * 2 * index) / vertexCount + (random() - 0.5) * 0.18;
    const ridge =
      Math.sin(angle * 3 + ridgePhase) * ridgeOne +
      Math.cos(angle * 5 - ridgePhase) * ridgeTwo;
    const jaggedRadius = radius * (0.72 + random() * 0.44 + ridge);
    points.push(
      round(Math.cos(angle) * jaggedRadius),
      round(Math.sin(angle) * jaggedRadius)
    );
  }

  return {
    points,
    shadowPoints: scalePoints(points, 0.86, 0.1, 0.14),
    highlightPoints: scalePoints(points, 0.48, -0.24, -0.24),
    pits: createPits(radius, random),
    surfaceLines: createSurfaceLines(radius, random),
    rotationSpeed: (random() > 0.5 ? 1 : -1) * (0.00008 + random() * 0.00018)
  };
}

function createPits(radius: number, random: () => number): AsteroidPit[] {
  const pitCount = 3 + Math.floor(random() * 3);
  return Array.from({ length: pitCount }, () => {
    const angle = random() * Math.PI * 2;
    const distance = radius * (0.12 + random() * 0.48);
    return {
      x: round(Math.cos(angle) * distance),
      y: round(Math.sin(angle) * distance),
      radius: round(radius * (0.055 + random() * 0.065)),
      alpha: round(0.18 + random() * 0.18)
    };
  });
}

function createSurfaceLines(
  radius: number,
  random: () => number
): AsteroidSurfaceLine[] {
  const lineCount = 2 + Math.floor(random() * 3);
  return Array.from({ length: lineCount }, () => {
    const angle = random() * Math.PI * 2;
    const length = radius * (0.16 + random() * 0.18);
    const centerDistance = radius * (0.12 + random() * 0.42);
    const centerX = Math.cos(angle) * centerDistance;
    const centerY = Math.sin(angle) * centerDistance;
    const lineAngle = angle + Math.PI / 2 + (random() - 0.5) * 0.9;
    const dx = Math.cos(lineAngle) * length;
    const dy = Math.sin(lineAngle) * length;

    return {
      startX: round(centerX - dx),
      startY: round(centerY - dy),
      endX: round(centerX + dx),
      endY: round(centerY + dy),
      alpha: round(0.16 + random() * 0.18)
    };
  });
}

function scalePoints(
  points: readonly number[],
  scale: number,
  offsetX: number,
  offsetY: number
): number[] {
  const scaled: number[] = [];
  for (let index = 0; index < points.length; index += 2) {
    scaled.push(
      round(points[index] * scale + offsetX * Math.abs(points[index])),
      round(points[index + 1] * scale + offsetY * Math.abs(points[index + 1]))
    );
  }
  return scaled;
}

function createSeededRandom(seed: string): () => number {
  let state = hashString(seed);
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
