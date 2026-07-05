import type { GadgetType } from "../model";

export const GADGET_OPTIONS: readonly GadgetType[] = [
  "none",
  "mine",
  "repair_pulse",
  "turbo_burst"
];

export function isGadgetType(value: unknown): value is GadgetType {
  return GADGET_OPTIONS.some((gadget) => gadget === value);
}
