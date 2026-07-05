import type { PlayerProfile } from "../model";
import { validatePlayerProfile } from "./ProfileService";

const STORAGE_KEY = "scrapships.profiles.v1";

export function loadProfiles(storage = getBrowserStorage()): PlayerProfile[] | null {
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PlayerProfile[];
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.length > 0 &&
      parsed.every((profile) => validatePlayerProfile(profile).valid)
      ? parsed
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
