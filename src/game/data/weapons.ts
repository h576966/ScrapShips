export type WeaponType = "laser" | "bolt_cannon" | "rail_shot";

export type WeaponMode = "continuous" | "projectile";

export type WeaponDefinition = {
  type: WeaponType;
  label: string;
  mode: WeaponMode;
  role: string;
  difficulty: string;
  baseDamage: number;
  range: number;
  cooldownMs: number;
  projectileSpeed: number;
  lifetimeMs: number;
  projectileRadius: number;
  color: number;
};

export const DEFAULT_PRIMARY_WEAPON: WeaponType = "bolt_cannon";

export const WEAPON_DEFINITIONS: readonly WeaponDefinition[] = [
  {
    type: "laser",
    label: "Laser",
    mode: "continuous",
    role: "Close-range beam",
    difficulty: "Easy up close",
    baseDamage: 24,
    range: 145,
    cooldownMs: 0,
    projectileSpeed: 0,
    lifetimeMs: 0,
    projectileRadius: 5,
    color: 0x79f2ff
  },
  {
    type: "bolt_cannon",
    label: "Bolt Cannon",
    mode: "projectile",
    role: "All-round shot",
    difficulty: "Reliable",
    baseDamage: 19,
    range: 430,
    cooldownMs: 360,
    projectileSpeed: 430,
    lifetimeMs: 1150,
    projectileRadius: 5,
    color: 0xfff08a
  },
  {
    type: "rail_shot",
    label: "Rail Shot",
    mode: "projectile",
    role: "Long-range precision",
    difficulty: "Aiming matters",
    baseDamage: 38,
    range: 760,
    cooldownMs: 880,
    projectileSpeed: 760,
    lifetimeMs: 1250,
    projectileRadius: 3,
    color: 0xd9f3ff
  }
];

export function isWeaponType(value: unknown): value is WeaponType {
  return WEAPON_DEFINITIONS.some((weapon) => weapon.type === value);
}

export function getWeaponDefinition(type: WeaponType): WeaponDefinition {
  return (
    WEAPON_DEFINITIONS.find((weapon) => weapon.type === type) ??
    WEAPON_DEFINITIONS[1]
  );
}
