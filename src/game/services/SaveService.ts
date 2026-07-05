import type { PlayerProfile, ShipBuild } from "../model";
import { migrateGadgetType } from "../data/gadgets";
import { findHullPresetId } from "../data/hullPresets";
import { normalizeShipVisual } from "../data/shipVisualOptions";
import { DEFAULT_PRIMARY_WEAPON, isWeaponType } from "../data/weapons";
import { validatePlayerProfile } from "./ProfileService";

const STORAGE_KEY = "scrapships.profiles.v1";
type SavedShipCandidate = Partial<Omit<ShipBuild, "primaryWeapon">> & {
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
  const fallbackHullPreset =
    ship.hullShape && typeof ship.hullShape === "object"
      ? findHullPresetId(ship.hullShape)
      : undefined;

  return {
    ...ship,
    primaryWeapon: isWeaponType(ship.primaryWeapon)
      ? ship.primaryWeapon
      : DEFAULT_PRIMARY_WEAPON,
    gadget: migrateGadgetType(ship.gadget),
    visual: normalizeShipVisual(
      isObjectRecord(ship.visual) ? ship.visual : undefined,
      fallbackHullPreset
    )
  };
}

function isObjectRecord(value: unknown): value is Partial<ShipBuild["visual"]> {
  return typeof value === "object" && value !== null;
}
