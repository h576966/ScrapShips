import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAYER_BINDINGS,
  SYSTEM_BINDINGS,
  bindingLayoutLabels,
  bindingLabels,
  matchesAnyBinding
} from "../src/game/input/bindings";

function keyEvent(code: string, key: string): KeyboardEvent {
  return { code, key } as KeyboardEvent;
}

describe("input bindings", () => {
  it("uses the current shared-keyboard layout for both players", () => {
    expect(bindingLabels(DEFAULT_PLAYER_BINDINGS.p1.turbo)).toBe("Q");
    expect(bindingLabels(DEFAULT_PLAYER_BINDINGS.p1.thrust)).toBe("W");
    expect(bindingLabels(DEFAULT_PLAYER_BINDINGS.p1.fire)).toBe("E");
    expect(bindingLabels(DEFAULT_PLAYER_BINDINGS.p1.rotateLeft)).toBe("A");
    expect(bindingLabels(DEFAULT_PLAYER_BINDINGS.p1.brake)).toBe("S");
    expect(bindingLabels(DEFAULT_PLAYER_BINDINGS.p1.rotateRight)).toBe("D");

    expect(bindingLabels(DEFAULT_PLAYER_BINDINGS.p2.fire)).toBe("O");
    expect(bindingLabels(DEFAULT_PLAYER_BINDINGS.p2.thrust)).toBe("P");
    expect(bindingLabels(DEFAULT_PLAYER_BINDINGS.p2.turbo)).toBe("Å");
    expect(bindingLabels(DEFAULT_PLAYER_BINDINGS.p2.rotateLeft)).toBe("L");
    expect(bindingLabels(DEFAULT_PLAYER_BINDINGS.p2.brake)).toBe("Ö");
    expect(bindingLabels(DEFAULT_PLAYER_BINDINGS.p2.rotateRight)).toBe("Ä");
  });

  it("formats the physical debug rows from centralized bindings", () => {
    expect(bindingLayoutLabels("p1")).toBe("Q W E / A S D");
    expect(bindingLayoutLabels("p2")).toBe("O P Å / L Ö Ä");
  });

  it("keeps code and key fallbacks for layout-dependent Nordic keys", () => {
    expect(
      matchesAnyBinding(
        keyEvent("BracketLeft", "["),
        DEFAULT_PLAYER_BINDINGS.p2.turbo
      )
    ).toBe(true);
    expect(
      matchesAnyBinding(
        keyEvent("KeyX", "å"),
        DEFAULT_PLAYER_BINDINGS.p2.turbo
      )
    ).toBe(true);

    expect(
      matchesAnyBinding(
        keyEvent("Semicolon", ";"),
        DEFAULT_PLAYER_BINDINGS.p2.brake
      )
    ).toBe(true);
    expect(
      matchesAnyBinding(
        keyEvent("KeyX", "ö"),
        DEFAULT_PLAYER_BINDINGS.p2.brake
      )
    ).toBe(true);

    expect(
      matchesAnyBinding(
        keyEvent("Quote", "'"),
        DEFAULT_PLAYER_BINDINGS.p2.rotateRight
      )
    ).toBe(true);
    expect(
      matchesAnyBinding(
        keyEvent("KeyX", "ä"),
        DEFAULT_PLAYER_BINDINGS.p2.rotateRight
      )
    ).toBe(true);
  });

  it("binds turning to A/D and L/Ä", () => {
    expect(
      matchesAnyBinding(keyEvent("KeyA", "a"), DEFAULT_PLAYER_BINDINGS.p1.rotateLeft)
    ).toBe(true);
    expect(
      matchesAnyBinding(keyEvent("KeyD", "d"), DEFAULT_PLAYER_BINDINGS.p1.rotateRight)
    ).toBe(true);
    expect(
      matchesAnyBinding(keyEvent("KeyL", "l"), DEFAULT_PLAYER_BINDINGS.p2.rotateLeft)
    ).toBe(true);
    expect(
      matchesAnyBinding(keyEvent("Quote", "'"), DEFAULT_PLAYER_BINDINGS.p2.rotateRight)
    ).toBe(true);
  });

  it("keeps H reserved for the hitbox debug overlay", () => {
    expect(bindingLabels(SYSTEM_BINDINGS.toggleHitboxDebug)).toBe("H");
    expect(
      matchesAnyBinding(keyEvent("KeyH", "h"), SYSTEM_BINDINGS.toggleHitboxDebug)
    ).toBe(true);
  });
});
