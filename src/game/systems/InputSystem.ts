import Phaser from "phaser";
import {
  DEFAULT_PLAYER_BINDINGS,
  PLAYER_ACTIONS,
  bindingLayoutLabels,
  matchesAnyBinding,
  type PlayerAction,
  type PlayerId
} from "../input/bindings";

export type PlayerInputState = Record<PlayerAction, boolean>;

export class InputSystem {
  private readonly pressed = new Set<string>();
  private readonly onKeyDown = (event: KeyboardEvent) => this.handleKey(event, true);
  private readonly onKeyUp = (event: KeyboardEvent) => this.handleKey(event, false);
  private readonly onWindowBlur = () => this.pressed.clear();

  constructor(private readonly scene: Phaser.Scene) {
    scene.input.keyboard?.on("keydown", this.onKeyDown);
    scene.input.keyboard?.on("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onWindowBlur);
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKeyDown);
    this.scene.input.keyboard?.off("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onWindowBlur);
    this.pressed.clear();
  }

  isDown(playerId: PlayerId, action: PlayerAction): boolean {
    return this.pressed.has(actionKey(playerId, action));
  }

  getPlayerState(playerId: PlayerId): PlayerInputState {
    return PLAYER_ACTIONS.reduce((state, action) => {
      state[action] = this.isDown(playerId, action);
      return state;
    }, {} as PlayerInputState);
  }

  getDebugLines(): string[] {
    return (["p1", "p2"] as const).map((playerId) => {
      const down = PLAYER_ACTIONS.filter((action) => this.isDown(playerId, action));
      const pressedText = down.length > 0 ? down.join(", ") : "none";
      return `${playerId.toUpperCase()} keys: ${bindingLayoutLabels(playerId)} | down: ${pressedText}`;
    });
  }

  private handleKey(event: KeyboardEvent, isDown: boolean): void {
    for (const playerId of ["p1", "p2"] as const) {
      for (const action of PLAYER_ACTIONS) {
        const bindings = DEFAULT_PLAYER_BINDINGS[playerId][action];
        if (matchesAnyBinding(event, bindings)) {
          const key = actionKey(playerId, action);
          if (isDown) {
            this.pressed.add(key);
          } else {
            this.pressed.delete(key);
          }
        }
      }
    }
  }
}

function actionKey(playerId: PlayerId, action: PlayerAction): string {
  return `${playerId}:${action}`;
}
