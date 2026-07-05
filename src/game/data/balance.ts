import type { ShipAttributes } from "../model/ShipBuild";

export const MAX_SHIPS_PER_PROFILE = 5;
export const ATTRIBUTE_TOTAL_MAX = 30;
export const ATTRIBUTE_VALUE_MAX = 10;
export const ATTRIBUTE_VALUE_MIN = 0;
export const HULL_GRID_SIZE = 16;
export const VIEWPORT_WIDTH = 1024;
export const VIEWPORT_HEIGHT = 640;

export const SHIP_ATTRIBUTE_KEYS = [
  "speed",
  "turning",
  "hull",
  "shield",
  "weapon",
  "turbo"
] as const satisfies ReadonlyArray<keyof ShipAttributes>;

export const ARENA_WIDTH = 2200;
export const ARENA_HEIGHT = 1400;
