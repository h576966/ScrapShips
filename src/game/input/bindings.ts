export type PlayerId = "p1" | "p2";

export type PlayerAction =
  | "rotateLeft"
  | "thrust"
  | "rotateRight"
  | "fire"
  | "brake"
  | "turbo";

export type KeyBinding = {
  label: string;
  code?: string;
  key?: string;
};

export const PLAYER_ACTIONS: readonly PlayerAction[] = [
  "rotateLeft",
  "thrust",
  "rotateRight",
  "fire",
  "brake",
  "turbo"
];

export const DEFAULT_PLAYER_BINDINGS: Record<
  PlayerId,
  Record<PlayerAction, readonly KeyBinding[]>
> = {
  p1: {
    rotateLeft: [{ label: "Q", code: "KeyQ", key: "q" }],
    thrust: [{ label: "W", code: "KeyW", key: "w" }],
    rotateRight: [{ label: "E", code: "KeyE", key: "e" }],
    fire: [{ label: "A", code: "KeyA", key: "a" }],
    brake: [{ label: "S", code: "KeyS", key: "s" }],
    turbo: [{ label: "D", code: "KeyD", key: "d" }]
  },
  p2: {
    rotateLeft: [{ label: "O", code: "KeyO", key: "o" }],
    thrust: [{ label: "P", code: "KeyP", key: "p" }],
    rotateRight: [{ label: "Å", code: "BracketLeft", key: "å" }],
    fire: [{ label: "L", code: "KeyL", key: "l" }],
    brake: [{ label: "Ö", code: "Semicolon", key: "ö" }],
    turbo: [{ label: "Ä", code: "Quote", key: "ä" }]
  }
};

export const SYSTEM_BINDINGS = {
  restartRound: [{ label: "R", code: "KeyR", key: "r" }],
  returnToGarage: [{ label: "G", code: "KeyG", key: "g" }]
} as const;

export function matchesAnyBinding(
  event: KeyboardEvent,
  bindings: readonly KeyBinding[]
): boolean {
  return bindings.some((binding) => matchesBinding(event, binding));
}

export function bindingLabels(bindings: readonly KeyBinding[]): string {
  return bindings.map((binding) => binding.label).join("/");
}

function matchesBinding(event: KeyboardEvent, binding: KeyBinding): boolean {
  const eventKey = event.key.toLowerCase();
  return event.code === binding.code || eventKey === binding.key?.toLowerCase();
}
