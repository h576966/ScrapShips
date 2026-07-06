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
  gridSize: 17;
  pixels: HullPixel[];
};

export type GadgetType = "none" | "proximity_mine" | "repair_pulse" | "turbo_burst";

export type WeaponType = "laser" | "bolt_cannon" | "rail_shot";

export type HullPresetId = "scrapper" | "needle" | "bulwark" | "raider";

export type NoseStyle = "sharp" | "blunt" | "split";

export type WingStyle = "none" | "small_fins" | "swept_wings";

export type EngineStyle = "single" | "dual" | "wide";

export type ShipVisualCustomization = {
  hullPreset: HullPresetId;
  noseStyle: NoseStyle;
  wingStyle: WingStyle;
  engineStyle: EngineStyle;
  accentColor: string;
};

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
  visual: ShipVisualCustomization;
  gadget?: GadgetType;
};
