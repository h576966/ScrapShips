import { describe, expect, it } from "vitest";
import type { PlayerProfile, ShipBuild } from "../src/game/model";
import {
  createShip,
  deleteShip,
  duplicateShip,
  renameProfile,
  selectActiveShip,
  updateShipAttributes,
  updateShipColors,
  updateShipPrimaryWeapon,
  validatePlayerProfile
} from "../src/game/services/ProfileService";

describe("ProfileService", () => {
  it("rejects profiles with more than 5 ships", () => {
    const profile = makeProfile({
      ships: Array.from({ length: 6 }, (_, index) => makeShip(`ship-${index}`)),
      activeShipId: "ship-0"
    });

    expect(validatePlayerProfile(profile).valid).toBe(false);
    expect(validatePlayerProfile(profile).errors).toContain(
      "profile cannot have more than 5 ships"
    );
  });

  it("requires activeShipId to point to an existing ship", () => {
    const profile = makeProfile({
      ships: [makeShip("real-ship")],
      activeShipId: "missing-ship"
    });

    expect(validatePlayerProfile(profile).valid).toBe(false);
    expect(validatePlayerProfile(profile).errors).toContain(
      "activeShipId must point to an existing ship"
    );
  });

  it("creates a ship up to the max of 5", () => {
    const profile = makeProfile({
      ships: Array.from({ length: 4 }, (_, index) => makeShip(`ship-${index}`)),
      activeShipId: "ship-0"
    });

    const result = createShip(profile, "ship-4");

    expect(result.ok).toBe(true);
    expect(result.profile.ships).toHaveLength(5);
    expect(result.profile.activeShipId).toBe("ship-4");
  });

  it("prevents creating a ship beyond 5 ships", () => {
    const profile = makeProfile({
      ships: Array.from({ length: 5 }, (_, index) => makeShip(`ship-${index}`)),
      activeShipId: "ship-0"
    });

    const result = createShip(profile, "ship-5");

    expect(result.ok).toBe(false);
    expect(result.profile.ships).toHaveLength(5);
  });

  it("rejects creating a ship with a duplicate id", () => {
    const profile = makeProfile();

    const result = createShip(profile, "ship-1");

    expect(result.ok).toBe(false);
    expect(result.profile.ships).toHaveLength(1);
  });

  it("rejects duplicating a ship with a duplicate id", () => {
    const profile = makeProfile();

    const result = duplicateShip(profile, "ship-1", "ship-1");

    expect(result.ok).toBe(false);
    expect(result.profile.ships).toHaveLength(1);
  });

  it("deletes a non-last ship and keeps a valid active ship", () => {
    const profile = makeProfile({
      ships: [makeShip("ship-0"), makeShip("ship-1")],
      activeShipId: "ship-1"
    });

    const result = deleteShip(profile, "ship-1");

    expect(result.ok).toBe(true);
    expect(result.profile.ships.map((ship) => ship.id)).toEqual(["ship-0"]);
    expect(result.profile.activeShipId).toBe("ship-0");
  });

  it("prevents deleting the last ship", () => {
    const profile = makeProfile({
      ships: [makeShip("ship-0")],
      activeShipId: "ship-0"
    });

    const result = deleteShip(profile, "ship-0");

    expect(result.ok).toBe(false);
    expect(result.profile.ships).toHaveLength(1);
  });

  it("updates ship attributes while enforcing total <= 30", () => {
    const profile = makeProfile();
    const validAttributes = {
      speed: 6,
      turning: 5,
      hull: 5,
      shield: 5,
      weapon: 5,
      turbo: 4
    };
    const invalidAttributes = {
      speed: 6,
      turning: 6,
      hull: 6,
      shield: 6,
      weapon: 6,
      turbo: 1
    };

    const validResult = updateShipAttributes(profile, "ship-1", validAttributes);
    const invalidResult = updateShipAttributes(
      validResult.profile,
      "ship-1",
      invalidAttributes
    );

    expect(validResult.ok).toBe(true);
    expect(validResult.profile.ships[0].attributes.speed).toBe(6);
    expect(invalidResult.ok).toBe(false);
    expect(invalidResult.profile.ships[0].attributes).toEqual(validAttributes);
  });

  it("rejects invalid ship colors", () => {
    const profile = makeProfile();

    const result = updateShipColors(profile, "ship-1", {
      primary: "red",
      secondary: "#88ccff"
    });

    expect(result.ok).toBe(false);
    expect(result.profile.ships[0].colors.primary).toBe("#ffffff");
  });

  it("selects the active ship", () => {
    const profile = makeProfile({
      ships: [makeShip("ship-0"), makeShip("ship-1")],
      activeShipId: "ship-0"
    });

    const result = selectActiveShip(profile, "ship-1");

    expect(result.ok).toBe(true);
    expect(result.profile.activeShipId).toBe("ship-1");
  });

  it("renames a profile without changing active ship", () => {
    const profile = makeProfile();

    const result = renameProfile(profile, "Captain Scrap");

    expect(result.ok).toBe(true);
    expect(result.profile.name).toBe("Captain Scrap");
    expect(result.profile.activeShipId).toBe("ship-1");
  });

  it("updates primary weapon", () => {
    const profile = makeProfile();

    const result = updateShipPrimaryWeapon(profile, "ship-1", "rail_shot");

    expect(result.ok).toBe(true);
    expect(result.profile.ships[0].primaryWeapon).toBe("rail_shot");
  });
});

function makeProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  const ship = makeShip("ship-1");
  return {
    id: "profile-1",
    name: "Pilot",
    color: "#46a6ff",
    activeShipId: ship.id,
    ships: [ship],
    ...overrides
  };
}

function makeShip(id: string): ShipBuild {
  return {
    id,
    name: id,
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
    primaryWeapon: "bolt_cannon",
    gadget: "turbo_burst"
  };
}
