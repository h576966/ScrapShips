import type { ShipBuild } from "../model";
import { makeArrowHull, makeDiamondHull } from "./hullPresets";
import { DEFAULT_SHIP_VISUAL } from "./shipVisualOptions";

export const defaultShipOne: ShipBuild = {
  id: "p1-scrapper",
  name: "Blue Scrapper",
  colors: {
    primary: "#46a6ff",
    secondary: "#c9e8ff"
  },
  hullShape: makeDiamondHull(),
  attributes: {
    speed: 5,
    turning: 5,
    hull: 5,
    shield: 4,
    weapon: 6,
    turbo: 5
  },
  visual: {
    ...DEFAULT_SHIP_VISUAL,
    hullPreset: "scrapper",
    noseStyle: "sharp",
    wingStyle: "small_fins",
    engineStyle: "dual",
    accentColor: "#ffe08a"
  },
  primaryWeapon: "bolt_cannon",
  gadget: "turbo_burst"
};

export const defaultShipTwo: ShipBuild = {
  id: "p2-bolter",
  name: "Red Bolter",
  colors: {
    primary: "#ff5a5f",
    secondary: "#ffd1d1"
  },
  hullShape: makeArrowHull(),
  attributes: {
    speed: 6,
    turning: 5,
    hull: 4,
    shield: 4,
    weapon: 6,
    turbo: 5
  },
  visual: {
    ...DEFAULT_SHIP_VISUAL,
    hullPreset: "raider",
    noseStyle: "split",
    wingStyle: "swept_wings",
    engineStyle: "wide",
    accentColor: "#ffd166"
  },
  primaryWeapon: "bolt_cannon",
  gadget: "turbo_burst"
};
