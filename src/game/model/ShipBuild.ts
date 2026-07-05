export type ShipAttributes = {
  speed: number;
  turning: number;
  hull: number;
  shield: number;
  weapon: number;
  turbo: number;
};

export type HullPixel = {
  x: number;
  y: number;
};

export type HullShape = {
  gridSize: 16;
  pixels: HullPixel[];
};

export type GadgetType = "none" | "mine" | "repair_pulse" | "turbo_burst";

export type WeaponType = "laser" | "bolt_cannon" | "rail_shot";

export type ShipBuild = {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
  };
  hullShape: HullShape;
  attributes: ShipAttributes;
  primaryWeapon: WeaponType;
  gadget?: GadgetType;
};
