import type { ShipBuild } from "./ShipBuild";

export type PlayerProfile = {
  id: string;
  name: string;
  color: string;
  activeShipId: string;
  ships: ShipBuild[];
};
