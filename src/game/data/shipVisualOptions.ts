import type {
  EngineStyle,
  HullPresetId,
  NoseStyle,
  ShipVisualCustomization,
  WingStyle
} from "../model";

export type VisualOption<T extends string> = {
  value: T;
  label: string;
};

export const NOSE_STYLE_OPTIONS: readonly VisualOption<NoseStyle>[] = [
  { value: "sharp", label: "Sharp" },
  { value: "blunt", label: "Blunt" },
  { value: "split", label: "Split" }
];

export const WING_STYLE_OPTIONS: readonly VisualOption<WingStyle>[] = [
  { value: "none", label: "None" },
  { value: "small_fins", label: "Small fins" },
  { value: "swept_wings", label: "Swept wings" }
];

export const ENGINE_STYLE_OPTIONS: readonly VisualOption<EngineStyle>[] = [
  { value: "single", label: "Single" },
  { value: "dual", label: "Dual" },
  { value: "wide", label: "Wide" }
];

export const DEFAULT_SHIP_VISUAL: ShipVisualCustomization = {
  hullPreset: "scrapper",
  noseStyle: "sharp",
  wingStyle: "small_fins",
  engineStyle: "dual",
  accentColor: "#ffe08a"
};

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isNoseStyle(value: unknown): value is NoseStyle {
  return NOSE_STYLE_OPTIONS.some((option) => option.value === value);
}

export function isWingStyle(value: unknown): value is WingStyle {
  return WING_STYLE_OPTIONS.some((option) => option.value === value);
}

export function isEngineStyle(value: unknown): value is EngineStyle {
  return ENGINE_STYLE_OPTIONS.some((option) => option.value === value);
}

export function isHullPresetId(value: unknown): value is HullPresetId {
  return (
    value === "scrapper" ||
    value === "needle" ||
    value === "bulwark" ||
    value === "raider"
  );
}

export function normalizeShipVisual(
  visual: Partial<ShipVisualCustomization> | undefined,
  fallbackHullPreset: HullPresetId = DEFAULT_SHIP_VISUAL.hullPreset
): ShipVisualCustomization {
  return {
    hullPreset: isHullPresetId(visual?.hullPreset)
      ? visual.hullPreset
      : fallbackHullPreset,
    noseStyle: isNoseStyle(visual?.noseStyle)
      ? visual.noseStyle
      : DEFAULT_SHIP_VISUAL.noseStyle,
    wingStyle: isWingStyle(visual?.wingStyle)
      ? visual.wingStyle
      : DEFAULT_SHIP_VISUAL.wingStyle,
    engineStyle: isEngineStyle(visual?.engineStyle)
      ? visual.engineStyle
      : DEFAULT_SHIP_VISUAL.engineStyle,
    accentColor:
      typeof visual?.accentColor === "string" &&
      HEX_COLOR_PATTERN.test(visual.accentColor)
        ? visual.accentColor
        : DEFAULT_SHIP_VISUAL.accentColor
  };
}
