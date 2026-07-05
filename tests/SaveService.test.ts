import { describe, expect, it } from "vitest";
import type { PlayerProfile } from "../src/game/model";
import { loadProfiles, saveProfiles } from "../src/game/services/SaveService";

describe("SaveService", () => {
  it("saves and loads valid profile data from storage", () => {
    const storage = makeStorage();
    const profiles = [makeProfile("profile-1")];

    expect(saveProfiles(profiles, storage)).toBe(true);

    expect(loadProfiles(storage)).toEqual(profiles);
  });

  it("does not overwrite existing storage with invalid profile data", () => {
    const storage = makeStorage();
    const validProfiles = [makeProfile("profile-1")];
    const invalidProfiles = [
      {
        ...makeProfile("profile-2"),
        activeShipId: "missing-ship"
      }
    ];

    expect(saveProfiles(validProfiles, storage)).toBe(true);
    expect(saveProfiles(invalidProfiles, storage)).toBe(false);

    expect(loadProfiles(storage)).toEqual(validProfiles);
  });

  it("returns null for invalid saved profile data", () => {
    const storage = makeStorage();
    storage.setItem("scrapships.profiles.v1", JSON.stringify([]));

    expect(loadProfiles(storage)).toBeNull();
  });
});

function makeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => data.delete(key),
    setItem: (key: string, value: string) => data.set(key, value)
  };
}

function makeProfile(id: string): PlayerProfile {
  return {
    id,
    name: "Pilot",
    color: "#46a6ff",
    activeShipId: "ship-1",
    ships: [
      {
        id: "ship-1",
        name: "Ship",
        colors: {
          primary: "#ffffff",
          secondary: "#88ccff"
        },
        hullShape: {
          gridSize: 16,
          pixels: [
            { x: 7, y: 7 },
            { x: 8, y: 7 },
            { x: 7, y: 8 },
            { x: 8, y: 8 }
          ]
        },
        attributes: {
          speed: 5,
          turning: 5,
          hull: 5,
          shield: 5,
          weapon: 5,
          turbo: 5
        },
        gadget: "turbo_burst"
      }
    ]
  };
}
