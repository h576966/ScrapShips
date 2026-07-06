import type { PlayerProfile, ShipBuild } from "../model";
import { HULL_GRID_SIZE } from "../data/balance";
import { migrateGadgetType } from "../data/gadgets";
import { findHullPresetId, getHullPreset } from "../data/hullPresets";
import { isHullPresetId, normalizeShipVisual } from "../data/shipVisualOptions";
import { DEFAULT_PRIMARY_WEAPON, isWeaponType } from "../data/weapons";
import { validatePlayerProfile } from "./ProfileService";

const STORAGE_KEY = "scrapships.profiles.v1";
type SavedShipCandidate = Partial<
  Omit<ShipBuild, "hullShape" | "primaryWeapon" | "visual">
> & {
  hullShape?: unknown;
  primaryWeapon?: unknown;
  gadget?: unknown;
  visual?: unknown;
};
type SavedProfileCandidate = Partial<Omit<PlayerProfile, "ships">> & {
  ships?: SavedShipCandidate[];
};

export function loadProfiles(storage = getBrowserStorage()): PlayerProfile[] | null {
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SavedProfileCandidate[];
    if (!Array.isArray(parsed)) {
      return null;
    }

    const migrated = migrateProfiles(parsed);
    return migrated.length > 0 &&
      migrated.every((profile) => validatePlayerProfile(profile).valid)
      ? migrated
      : null;
  } catch {
    return null;
  }
}

export function saveProfiles(
  profiles: PlayerProfile[],
  storage = getBrowserStorage()
): boolean {
  if (!storage) {
    return false;
  }

  if (!profiles.every((profile) => validatePlayerProfile(profile).valid)) {
    return false;
  }

  storage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  return true;
}

function getBrowserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function migrateProfiles(profiles: SavedProfileCandidate[]): PlayerProfile[] {
  return profiles.map((profile) => ({
    ...profile,
    ships: Array.isArray(profile.ships)
      ? profile.ships.map((ship) => migrateShip(ship))
      : []
  })) as PlayerProfile[];
}

function migrateShip(ship: SavedShipCandidate): SavedShipCandidate {
  const rawVisual = isObjectRecord(ship.visual) ? ship.visual : undefined;
  const fallbackHullPreset = getFallbackHullPreset(rawVisual, ship.hullShape);
  const visual = normalizeShipVisual(rawVisual, fallbackHullPreset);

  return {
    ...ship,
    hullShape: migrateHullShape(ship.hullShape, visual.hullPreset),
    primaryWeapon: isWeaponType(ship.primaryWeapon)
      ? ship.primaryWeapon
      : DEFAULT_PRIMARY_WEAPON,
    gadget: migrateGadgetType(ship.gadget),
    visual
  };
}

function isObjectRecord(value: unknown): value is Partial<ShipBuild["visual"]> {
  return typeof value === "object" && value !== null;
}

function getFallbackHullPreset(
  visual: Partial<ShipBuild["visual"]> | undefined,
  hullShape: unknown
) {
  if (isHullPresetId(visual?.hullPreset)) {
    return visual.hullPreset;
  }

  return isHullShapeRecord(hullShape) ? findHullPresetId(hullShape) : undefined;
}

function migrateHullShape(
  hullShape: unknown,
  presetId: ShipBuild["visual"]["hullPreset"]
) {
  if (isValidHullShape(hullShape)) {
    return {
      gridSize: HULL_GRID_SIZE,
      pixels: hullShape.pixels.map((pixel) => ({ x: pixel.x, y: pixel.y }))
    };
  }

  return getHullPreset(presetId);
}

function isHullShapeRecord(value: unknown): value is ShipBuild["hullShape"] {
  return (
    typeof value === "object" &&
    value !== null &&
    "gridSize" in value &&
    "pixels" in value &&
    Array.isArray((value as { pixels?: unknown }).pixels)
  );
}

function isValidHullShape(value: unknown): value is ShipBuild["hullShape"] {
  if (!isHullShapeRecord(value) || value.gridSize !== HULL_GRID_SIZE) {
    return false;
  }

  return value.pixels.length > 0 && value.pixels.every(isValidHullPixel);
}

function isValidHullPixel(pixel: unknown): pixel is { x: number; y: number } {
  if (typeof pixel !== "object" || pixel === null) {
    return false;
  }

  const candidate = pixel as { x?: unknown; y?: unknown };
  const { x, y } = candidate;
  return (
    typeof x === "number" &&
    typeof y === "number" &&
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    x < HULL_GRID_SIZE &&
    y >= 0 &&
    y < HULL_GRID_SIZE
  );
}
