import { describe, expect, it } from "vitest";
import {
  findHullPresetId,
  getHullPreset
} from "../src/game/data/hullPresets";
import { DEFAULT_SHIP_VISUAL } from "../src/game/data/shipVisualOptions";
import type { PlayerProfile } from "../src/game/model";
import { loadProfiles, saveProfiles } from "../src/game/services/SaveService";

describe("SaveService", () => {
  it("saves and loads valid profile data from storage", () => {
    const storage = makeStorage();
    const profiles = [makeProfile("profile-1")];

    expect(saveProfiles(profiles, storage)).toBe(true);

    expect(loadProfiles(storage)).toEqual(profiles);
  });

  it("migrates old saved ships to the default primary weapon", () => {
    const storage = makeStorage();
    const profile = makeProfile("profile-1");
    const legacyProfile = {
      ...profile,
      ships: profile.ships.map(({ primaryWeapon: _primaryWeapon, ...ship }) => ship)
    };
    storage.setItem("scrapships.profiles.v1", JSON.stringify([legacyProfile]));

    const loaded = loadProfiles(storage);

    expect(loaded?.[0].ships[0].primaryWeapon).toBe("bolt_cannon");
  });

  it("migrates invalid saved primary weapons to the default", () => {
    const storage = makeStorage();
    const profile = makeProfile("profile-1");
    const legacyProfile = {
      ...profile,
      ships: profile.ships.map((ship) => ({
        ...ship,
        primaryWeapon: "plasma"
      }))
    };
    storage.setItem("scrapships.profiles.v1", JSON.stringify([legacyProfile]));

    const loaded = loadProfiles(storage);

    expect(loaded?.[0].ships[0].primaryWeapon).toBe("bolt_cannon");
  });

  it("migrates legacy ships to default generated visual fields", () => {
    const storage = makeStorage();
    const profile = makeProfile("profile-1");
    const legacyProfile = {
      ...profile,
      ships: profile.ships.map(({ visual: _visual, ...ship }) => ship)
    };
    storage.setItem("scrapships.profiles.v1", JSON.stringify([legacyProfile]));

    const loaded = loadProfiles(storage);

    expect(loaded?.[0].ships[0].visual).toEqual(DEFAULT_SHIP_VISUAL);
  });

  it("migrates old 16x16 hull saves to the selected 17x17 preset", () => {
    const storage = makeStorage();
    const profile = makeProfile("profile-1");
    const legacyProfile = {
      ...profile,
      ships: profile.ships.map((ship) => ({
        ...ship,
        hullShape: {
          gridSize: 16,
          pixels: [
            { x: 7, y: 7 },
            { x: 8, y: 7 },
            { x: 7, y: 8 },
            { x: 8, y: 8 }
          ]
        },
        visual: {
          ...ship.visual,
          hullPreset: "raider"
        }
      }))
    };
    storage.setItem("scrapships.profiles.v1", JSON.stringify([legacyProfile]));

    const loaded = loadProfiles(storage);

    expect(loaded?.[0].ships[0].hullShape.gridSize).toBe(17);
    const loadedHull = loaded?.[0].ships[0].hullShape ?? getHullPreset("scrapper");
    expect(findHullPresetId(loadedHull)).toBe("raider");
  });

  it("migrates old mine gadgets to proximity mines", () => {
    const storage = makeStorage();
    const profile = makeProfile("profile-1");
    const legacyProfile = {
      ...profile,
      ships: profile.ships.map((ship) => ({
        ...ship,
        gadget: "mine"
      }))
    };
    storage.setItem("scrapships.profiles.v1", JSON.stringify([legacyProfile]));

    const loaded = loadProfiles(storage);

    expect(loaded?.[0].ships[0].gadget).toBe("proximity_mine");
  });

  it("persists selected weapon and renamed profile", () => {
    const storage = makeStorage();
    const profile = {
      ...makeProfile("profile-1"),
      name: "Captain Scrap",
      ships: [
        {
          ...makeProfile("profile-1").ships[0],
          primaryWeapon: "laser" as const
        }
      ]
    };

    expect(saveProfiles([profile], storage)).toBe(true);

    const loaded = loadProfiles(storage);
    expect(loaded?.[0].name).toBe("Captain Scrap");
    expect(loaded?.[0].ships[0].primaryWeapon).toBe("laser");
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
        hullShape: getHullPreset("scrapper"),
        attributes: {
          speed: 5,
          turning: 5,
          hull: 5,
          shield: 5,
          weapon: 5,
          turbo: 5
        },
        primaryWeapon: "bolt_cannon",
        visual: DEFAULT_SHIP_VISUAL,
        gadget: "turbo_burst"
      }
    ]
  };
}
