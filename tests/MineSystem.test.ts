import { describe, expect, it } from "vitest";
import {
  PROXIMITY_MINE_DEFINITION,
  calculateMineDamage,
  canPlaceMine,
  isMineArmed,
  isMineExpired,
  shouldTriggerMine,
  type MineState
} from "../src/game/systems/MineSystem";

describe("MineSystem", () => {
  it("enforces cooldown and active mine cap", () => {
    expect(canPlaceMine(1000, 999, 0)).toBe(false);
    expect(canPlaceMine(1000, 1000, 0)).toBe(true);
    expect(
      canPlaceMine(
        0,
        1000,
        PROXIMITY_MINE_DEFINITION.maxActivePerPlayer
      )
    ).toBe(false);
  });

  it("arms after the configured delay", () => {
    const mine = makeMine(1000);

    expect(isMineArmed(mine, 1000 + PROXIMITY_MINE_DEFINITION.armingDelayMs - 1)).toBe(false);
    expect(isMineArmed(mine, 1000 + PROXIMITY_MINE_DEFINITION.armingDelayMs)).toBe(true);
  });

  it("expires after its lifetime", () => {
    const mine = makeMine(1000);

    expect(isMineExpired(mine, 1000 + PROXIMITY_MINE_DEFINITION.lifetimeMs - 1)).toBe(false);
    expect(isMineExpired(mine, 1000 + PROXIMITY_MINE_DEFINITION.lifetimeMs)).toBe(true);
  });

  it("does not trigger before arming and triggers on proximity after arming", () => {
    const mine = makeMine(1000);

    expect(
      shouldTriggerMine({
        mine,
        now: 1100,
        targetX: mine.x + 10,
        targetY: mine.y,
        targetRadius: 12
      })
    ).toBe(false);

    expect(
      shouldTriggerMine({
        mine,
        now: 1000 + PROXIMITY_MINE_DEFINITION.armingDelayMs,
        targetX: mine.x + PROXIMITY_MINE_DEFINITION.triggerRadius - 2,
        targetY: mine.y,
        targetRadius: 4
      })
    ).toBe(true);
  });

  it("applies explosion damage with distance falloff", () => {
    const centerDamage = calculateMineDamage(0);
    const edgeDamage = calculateMineDamage(PROXIMITY_MINE_DEFINITION.explosionRadius - 1);

    expect(centerDamage).toBe(PROXIMITY_MINE_DEFINITION.maxDamage);
    expect(edgeDamage).toBeGreaterThan(0);
    expect(edgeDamage).toBeLessThan(centerDamage);
    expect(calculateMineDamage(PROXIMITY_MINE_DEFINITION.explosionRadius + 1)).toBe(0);
  });
});

function makeMine(placedAt: number): MineState {
  return {
    ownerId: "p1",
    placedAt,
    x: 100,
    y: 120
  };
}
