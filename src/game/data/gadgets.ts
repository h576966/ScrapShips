import type { GadgetType } from "../model";

export type GadgetOption = {
  value: GadgetType;
  label: string;
};

export const GADGET_OPTIONS: readonly GadgetOption[] = [
  { value: "none", label: "None" },
  { value: "proximity_mine", label: "Proximity mine" },
  { value: "repair_pulse", label: "Repair pulse" },
  { value: "turbo_burst", label: "Turbo burst" }
];

export function isGadgetType(value: unknown): value is GadgetType {
  return GADGET_OPTIONS.some((gadget) => gadget.value === value);
}

export function migrateGadgetType(value: unknown): GadgetType | undefined {
  if (value === "mine") {
    return "proximity_mine";
  }

  return isGadgetType(value) ? value : undefined;
}
