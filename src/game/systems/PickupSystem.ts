export type PickupType = "repair" | "speed_boost" | "corrosive_ammo";

export type PickupDefinition = {
  type: PickupType;
  label: string;
  color: number;
  radius: number;
  despawnMs: number;
  repairAmount?: number;
  durationMs?: number;
  speedMultiplier?: number;
  dotDamage?: number;
  dotDurationMs?: number;
  dotTickMs?: number;
};

export type PickupDropEntry = {
  type: PickupType | "none";
  chance: number;
};

export type DamageOverTimeState = {
  endsAt: number;
  nextTickAt: number;
  tickDamage: number;
  tickMs: number;
};

export type ShipEffectState = {
  speedBoostUntil: number;
  corrosiveAmmoUntil: number;
  damageOverTime: DamageOverTimeState | null;
};

export const PICKUP_DEFINITIONS: Record<PickupType, PickupDefinition> = {
  repair: {
    type: "repair",
    label: "Repair",
    color: 0x5cff82,
    radius: 11,
    despawnMs: 10000,
    repairAmount: 18
  },
  speed_boost: {
    type: "speed_boost",
    label: "Speed Boost",
    color: 0x7dd3ff,
    radius: 11,
    despawnMs: 10000,
    durationMs: 7000,
    speedMultiplier: 1.24
  },
  corrosive_ammo: {
    type: "corrosive_ammo",
    label: "Corrosive Ammo",
    color: 0xb8ff5a,
    radius: 11,
    despawnMs: 10000,
    durationMs: 9000,
    dotDamage: 18,
    dotDurationMs: 3200,
    dotTickMs: 800
  }
};

export const PICKUP_DROP_TABLE: readonly PickupDropEntry[] = [
  { type: "none", chance: 0.8 },
  { type: "repair", chance: 0.08 },
  { type: "speed_boost", chance: 0.06 },
  { type: "corrosive_ammo", chance: 0.06 }
];

export const CORROSIVE_PROJECTILE_COLOR = 0xb8ff5a;

export function createEmptyShipEffects(): ShipEffectState {
  return {
    speedBoostUntil: 0,
    corrosiveAmmoUntil: 0,
    damageOverTime: null
  };
}

export function rollPickupDrop(roll: number): PickupType | undefined {
  let threshold = 0;
  for (const entry of PICKUP_DROP_TABLE) {
    threshold += entry.chance;
    if (roll < threshold) {
      return entry.type === "none" ? undefined : entry.type;
    }
  }

  return undefined;
}

export function getTotalPickupChance(): number {
  return round(
    PICKUP_DROP_TABLE.filter((entry) => entry.type !== "none").reduce(
      (total, entry) => total + entry.chance,
      0
    )
  );
}

export function getDropTableTotal(): number {
  return round(PICKUP_DROP_TABLE.reduce((total, entry) => total + entry.chance, 0));
}

export function applyRepair(hp: number, maxHp: number, amount: number): number {
  return Math.min(maxHp, hp + amount);
}

export function applyPickupEffect(
  hp: number,
  maxHp: number,
  effects: ShipEffectState,
  pickupType: PickupType,
  now: number
): { hp: number; effects: ShipEffectState } {
  const definition = PICKUP_DEFINITIONS[pickupType];
  const updated = { ...effects };
  let updatedHp = hp;

  if (pickupType === "repair") {
    updatedHp = applyRepair(hp, maxHp, definition.repairAmount ?? 0);
  } else if (pickupType === "speed_boost") {
    updated.speedBoostUntil = Math.max(
      effects.speedBoostUntil,
      now + (definition.durationMs ?? 0)
    );
  } else if (pickupType === "corrosive_ammo") {
    updated.corrosiveAmmoUntil = Math.max(
      effects.corrosiveAmmoUntil,
      now + (definition.durationMs ?? 0)
    );
  }

  return { hp: updatedHp, effects: updated };
}

export function getSpeedMultiplier(effects: ShipEffectState, now: number): number {
  return effects.speedBoostUntil > now
    ? PICKUP_DEFINITIONS.speed_boost.speedMultiplier ?? 1
    : 1;
}

export function hasCorrosiveAmmo(effects: ShipEffectState, now: number): boolean {
  return effects.corrosiveAmmoUntil > now;
}

export function applyCorrosiveDamageOverTime(
  effects: ShipEffectState,
  now: number
): ShipEffectState {
  const definition = PICKUP_DEFINITIONS.corrosive_ammo;
  const totalDamage = definition.dotDamage ?? 0;
  const tickMs = definition.dotTickMs ?? 1000;
  const durationMs = definition.dotDurationMs ?? 0;
  const tickCount = Math.max(1, Math.ceil(durationMs / tickMs));

  return {
    ...effects,
    damageOverTime: {
      endsAt: now + durationMs,
      nextTickAt: now + tickMs,
      tickDamage: round(totalDamage / tickCount),
      tickMs
    }
  };
}

export function tickDamageOverTime(
  effects: ShipEffectState,
  now: number
): { effects: ShipEffectState; damage: number } {
  const dot = effects.damageOverTime;
  if (!dot || now >= dot.endsAt) {
    return {
      effects: { ...effects, damageOverTime: null },
      damage: 0
    };
  }

  if (now < dot.nextTickAt) {
    return { effects, damage: 0 };
  }

  return {
    effects: {
      ...effects,
      damageOverTime: {
        ...dot,
        nextTickAt: dot.nextTickAt + dot.tickMs
      }
    },
    damage: dot.tickDamage
  };
}

export function expireTimedEffects(
  effects: ShipEffectState,
  now: number
): ShipEffectState {
  return {
    speedBoostUntil: effects.speedBoostUntil > now ? effects.speedBoostUntil : 0,
    corrosiveAmmoUntil: effects.corrosiveAmmoUntil > now ? effects.corrosiveAmmoUntil : 0,
    damageOverTime:
      effects.damageOverTime && effects.damageOverTime.endsAt > now
        ? effects.damageOverTime
        : null
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
