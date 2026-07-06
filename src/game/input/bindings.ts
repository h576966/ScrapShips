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
  // Bottom-row outer keys are used for turning so each player keeps thrust/brake in the middle column.
  p1: {
    rotateLeft: [{ label: "A", code: "KeyA", key: "a" }],
    thrust: [{ label: "W", code: "KeyW", key: "w" }],
    rotateRight: [{ label: "D", code: "KeyD", key: "d" }],
    fire: [{ label: "E", code: "KeyE", key: "e" }],
    brake: [{ label: "S", code: "KeyS", key: "s" }],
    turbo: [{ label: "Q", code: "KeyQ", key: "q" }]
  },
  p2: {
    rotateLeft: [{ label: "L", code: "KeyL", key: "l" }],
    thrust: [{ label: "P", code: "KeyP", key: "p" }],
    rotateRight: [{ label: "Ä", code: "Quote", key: "ä" }],
    fire: [{ label: "O", code: "KeyO", key: "o" }],
    brake: [{ label: "Ö", code: "Semicolon", key: "ö" }],
    turbo: [{ label: "Å", code: "BracketLeft", key: "å" }]
  }
};

export const DEFAULT_PLAYER_BINDING_ROWS: Record<
  PlayerId,
  readonly (readonly PlayerAction[])[]
> = {
  p1: [
    ["turbo", "thrust", "fire"],
    ["rotateLeft", "brake", "rotateRight"]
  ],
  p2: [
    ["fire", "thrust", "turbo"],
    ["rotateLeft", "brake", "rotateRight"]
  ]
};

export const SYSTEM_BINDINGS = {
  restartRound: [{ label: "R", code: "KeyR", key: "r" }],
  returnToGarage: [{ label: "G", code: "KeyG", key: "g" }],
  toggleHitboxDebug: [{ label: "H", code: "KeyH", key: "h" }]
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

export function bindingLayoutLabels(playerId: PlayerId): string {
  const bindings = DEFAULT_PLAYER_BINDINGS[playerId];
  return DEFAULT_PLAYER_BINDING_ROWS[playerId]
    .map((row) => row.map((action) => bindingLabels(bindings[action])).join(" "))
    .join(" / ");
}

function matchesBinding(event: KeyboardEvent, binding: KeyBinding): boolean {
  const eventKey = event.key.toLowerCase();
  return event.code === binding.code || eventKey === binding.key?.toLowerCase();
}
