import type { PlayerProfile } from "../model";
import { defaultShipOne, defaultShipTwo } from "./defaultShips";

export const defaultProfiles: PlayerProfile[] = [
  {
    id: "player-1",
    name: "Player 1",
    color: "#46a6ff",
    activeShipId: defaultShipOne.id,
    ships: [defaultShipOne]
  },
  {
    id: "player-2",
    name: "Player 2",
    color: "#ff5a5f",
    activeShipId: defaultShipTwo.id,
    ships: [defaultShipTwo]
  }
];

export function createDefaultProfiles(): PlayerProfile[] {
  return cloneProfiles(defaultProfiles);
}

export function ensureTwoPlayableProfiles(
  profiles: PlayerProfile[] | null
): PlayerProfile[] {
  const playableProfiles = profiles ? cloneProfiles(profiles) : [];
  const existingIds = new Set(playableProfiles.map((profile) => profile.id));

  for (const defaultProfile of createDefaultProfiles()) {
    if (playableProfiles.length >= 2) {
      break;
    }

    if (!existingIds.has(defaultProfile.id)) {
      playableProfiles.push(defaultProfile);
      existingIds.add(defaultProfile.id);
    }
  }

  return playableProfiles.length >= 2 ? playableProfiles : createDefaultProfiles();
}

function cloneProfiles(profiles: PlayerProfile[]): PlayerProfile[] {
  return JSON.parse(JSON.stringify(profiles)) as PlayerProfile[];
}
