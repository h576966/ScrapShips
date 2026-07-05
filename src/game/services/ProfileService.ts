import { MAX_SHIPS_PER_PROFILE } from "../data/balance";
import { getHullPreset } from "../data/hullPresets";
import { normalizeShipVisual } from "../data/shipVisualOptions";
import type {
  GadgetType,
  HullPresetId,
  HullShape,
  PlayerProfile,
  ShipAttributes,
  ShipBuild,
  ShipVisualCustomization,
  WeaponType
} from "../model";
import { validateShipBuild, type ValidationResult } from "./ShipValidator";

export type ProfileEditResult = {
  ok: boolean;
  profile: PlayerProfile;
  error?: string;
  ship?: ShipBuild;
};

export function validatePlayerProfile(profile: PlayerProfile): ValidationResult {
  const errors: string[] = [];

  if (!profile.id.trim()) {
    errors.push("profile id is required");
  }

  if (!profile.name.trim()) {
    errors.push("profile name is required");
  }

  if (!profile.color.trim()) {
    errors.push("profile color is required");
  }

  if (profile.ships.length === 0) {
    errors.push("profile must contain at least one ship");
  }

  if (profile.ships.length > MAX_SHIPS_PER_PROFILE) {
    errors.push(`profile cannot have more than ${MAX_SHIPS_PER_PROFILE} ships`);
  }

  const shipIds = new Set<string>();
  for (const ship of profile.ships) {
    if (shipIds.has(ship.id)) {
      errors.push(`duplicate ship id ${ship.id}`);
    }
    shipIds.add(ship.id);
    errors.push(...validateShipBuild(ship).errors);
  }

  if (!shipIds.has(profile.activeShipId)) {
    errors.push("activeShipId must point to an existing ship");
  }

  return { valid: errors.length === 0, errors };
}

export function getActiveShip(profile: PlayerProfile): ShipBuild | undefined {
  return profile.ships.find((ship) => ship.id === profile.activeShipId);
}

export function canAddShip(profile: PlayerProfile): boolean {
  return profile.ships.length < MAX_SHIPS_PER_PROFILE;
}

export function renameProfile(profile: PlayerProfile, name: string): ProfileEditResult {
  const trimmed = name.trim();
  const updated = {
    ...profile,
    name: trimmed || profile.name
  };
  const validation = validatePlayerProfile(updated);
  if (!validation.valid) {
    return { ok: false, profile, error: validation.errors[0] };
  }

  return { ok: true, profile: updated };
}

export function createShip(profile: PlayerProfile, id = makeId("ship")): ProfileEditResult {
  if (!canAddShip(profile)) {
    return {
      ok: false,
      profile,
      error: `profile cannot have more than ${MAX_SHIPS_PER_PROFILE} ships`
    };
  }

  const source = getActiveShip(profile) ?? profile.ships[0];
  if (!source) {
    return { ok: false, profile, error: "profile needs a ship to copy from" };
  }
  if (hasShipId(profile, id)) {
    return { ok: false, profile, error: "ship id already exists" };
  }

  const ship = {
    ...cloneShip(source),
    id,
    name: uniqueShipName(profile, "New Scrapship")
  };
  const updated = {
    ...profile,
    activeShipId: ship.id,
    ships: [...profile.ships, ship]
  };

  return { ok: true, profile: updated, ship };
}

export function duplicateShip(
  profile: PlayerProfile,
  shipId: string,
  id = makeId("ship")
): ProfileEditResult {
  if (!canAddShip(profile)) {
    return {
      ok: false,
      profile,
      error: `profile cannot have more than ${MAX_SHIPS_PER_PROFILE} ships`
    };
  }

  const source = profile.ships.find((ship) => ship.id === shipId);
  if (!source) {
    return { ok: false, profile, error: "ship not found" };
  }
  if (hasShipId(profile, id)) {
    return { ok: false, profile, error: "ship id already exists" };
  }

  const ship = {
    ...cloneShip(source),
    id,
    name: uniqueShipName(profile, `${source.name} Copy`)
  };
  const updated = {
    ...profile,
    activeShipId: ship.id,
    ships: [...profile.ships, ship]
  };

  return { ok: true, profile: updated, ship };
}

export function deleteShip(profile: PlayerProfile, shipId: string): ProfileEditResult {
  if (profile.ships.length <= 1) {
    return { ok: false, profile, error: "cannot delete the last ship" };
  }

  const ship = profile.ships.find((candidate) => candidate.id === shipId);
  if (!ship) {
    return { ok: false, profile, error: "ship not found" };
  }

  const ships = profile.ships.filter((candidate) => candidate.id !== shipId);
  const activeShipId =
    profile.activeShipId === shipId ? ships[0].id : profile.activeShipId;

  return { ok: true, profile: { ...profile, activeShipId, ships }, ship };
}

export function selectActiveShip(profile: PlayerProfile, shipId: string): ProfileEditResult {
  const ship = profile.ships.find((candidate) => candidate.id === shipId);
  if (!ship) {
    return { ok: false, profile, error: "ship not found" };
  }

  return { ok: true, profile: { ...profile, activeShipId: shipId }, ship };
}

export function renameShip(
  profile: PlayerProfile,
  shipId: string,
  name: string
): ProfileEditResult {
  return updateShip(profile, shipId, (ship) => ({
    ...ship,
    name: name.trim() || ship.name
  }));
}

export function updateShipColors(
  profile: PlayerProfile,
  shipId: string,
  colors: ShipBuild["colors"]
): ProfileEditResult {
  return updateShip(profile, shipId, (ship) => ({ ...ship, colors }));
}

export function updateShipAttributes(
  profile: PlayerProfile,
  shipId: string,
  attributes: ShipAttributes
): ProfileEditResult {
  return updateShip(profile, shipId, (ship) => ({ ...ship, attributes }));
}

export function updateShipGadget(
  profile: PlayerProfile,
  shipId: string,
  gadget: GadgetType
): ProfileEditResult {
  return updateShip(profile, shipId, (ship) => ({ ...ship, gadget }));
}

export function updateShipPrimaryWeapon(
  profile: PlayerProfile,
  shipId: string,
  primaryWeapon: WeaponType
): ProfileEditResult {
  return updateShip(profile, shipId, (ship) => ({ ...ship, primaryWeapon }));
}

export function updateShipHullShape(
  profile: PlayerProfile,
  shipId: string,
  hullShape: HullShape
): ProfileEditResult {
  return updateShip(profile, shipId, (ship) => ({ ...ship, hullShape }));
}

export function updateShipHullPreset(
  profile: PlayerProfile,
  shipId: string,
  presetId: HullPresetId
): ProfileEditResult {
  return updateShip(profile, shipId, (ship) => ({
    ...ship,
    hullShape: getHullPreset(presetId),
    visual: {
      ...normalizeShipVisual(ship.visual),
      hullPreset: presetId
    }
  }));
}

export function updateShipVisual(
  profile: PlayerProfile,
  shipId: string,
  visual: Partial<ShipVisualCustomization>
): ProfileEditResult {
  return updateShip(profile, shipId, (ship) => ({
    ...ship,
    visual: {
      ...normalizeShipVisual(ship.visual),
      ...visual
    }
  }));
}

function updateShip(
  profile: PlayerProfile,
  shipId: string,
  updater: (ship: ShipBuild) => ShipBuild
): ProfileEditResult {
  const current = profile.ships.find((ship) => ship.id === shipId);
  if (!current) {
    return { ok: false, profile, error: "ship not found" };
  }

  const updatedShip = updater(cloneShip(current));
  const validation = validateShipBuild(updatedShip);
  if (!validation.valid) {
    return { ok: false, profile, error: validation.errors[0] };
  }

  const updated = {
    ...profile,
    ships: profile.ships.map((ship) => (ship.id === shipId ? updatedShip : ship))
  };

  return { ok: true, profile: updated, ship: updatedShip };
}

function cloneShip(ship: ShipBuild): ShipBuild {
  return JSON.parse(JSON.stringify(ship)) as ShipBuild;
}

function uniqueShipName(profile: PlayerProfile, baseName: string): string {
  const names = new Set(profile.ships.map((ship) => ship.name));
  if (!names.has(baseName)) {
    return baseName;
  }

  let suffix = 2;
  while (names.has(`${baseName} ${suffix}`)) {
    suffix += 1;
  }

  return `${baseName} ${suffix}`;
}

function hasShipId(profile: PlayerProfile, shipId: string): boolean {
  return profile.ships.some((ship) => ship.id === shipId);
}

function makeId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
