# CODEX_PROMPT_01.md — Initial implementation prompt

Use this as the first prompt to Codex in the empty `ScrapShips` repository.

---

You are working in a new public repository named `ScrapShips`.

Create the initial playable foundation for a TypeScript + Phaser local two-player spaceship duel game.

Read and follow `AGENTS.md` and `SCRAPSHIPS_DESIGN.md`.

## Goal

Create a minimal but playable local 1v1 duel prototype.

The prototype should run in the browser and support two players on one keyboard.

Do not implement the full ship builder yet. However, create the data model and validation needed for player profiles and saved ships.

## Tech requirements

Use:

- Vite
- TypeScript
- Phaser 3
- Vitest

Set up standard npm scripts:

```bash
npm run dev
npm test
npm run build
```

Add simple lint/format tooling only if it does not slow down the first playable prototype.

## Required gameplay

Implement one shared arena with two ships.

Each ship must be able to:

- rotate left/right
- thrust forward
- brake/reverse
- fire a basic projectile
- use turbo/boost or a placeholder special action
- take damage
- be destroyed
- respawn/reset between rounds

Add a simple round state:

- Player 1 wins if Player 2 ship HP reaches 0.
- Player 2 wins if Player 1 ship HP reaches 0.
- Show a simple win message.
- Allow pressing a key to restart the round.

## Controls

Default controls:

| Action | Player 1 | Player 2 |
|---|---:|---:|
| Turbo / gadget | Q | Å |
| Thrust / forward | W | P |
| Fire | E | O |
| Rotate left | A | L |
| Brake / reverse | S | Ö |
| Rotate right | D | Ä |

Important:

- Put controls in a key-binding config.
- Do not scatter raw key checks throughout the code.
- Nordic keys may be browser/layout dependent, so keep the mapping easy to change.
- Bottom-row outer keys are used for turning.
- Add a simple input test scene or debug overlay if practical.

## Required data model

Create TypeScript types for:

```ts
PlayerProfile
ShipBuild
ShipAttributes
HullShape
GadgetType
```

Rules:

- Each profile has max 5 ships.
- A profile must have an activeShipId that exists.
- A ship has a name, colors, hull shape, attributes, and optional gadget.
- Attribute total must not exceed 30.
- Attribute max should be 10.
- Hull shape should support a 16x16 grid and a list of hull pixels.

Implement validation functions for these rules.

## Required tests

Use Vitest to test pure TypeScript logic.

At minimum add tests for:

- a profile cannot have more than 5 ships
- activeShipId must point to an existing ship
- attribute total cannot exceed 30
- individual attributes cannot exceed 10
- ship stat calculation returns higher mass for more hull pixels
- ship stat calculation makes heavier ships less agile or slower

## Architecture requirements

Keep Phaser scene code reasonably thin.

Put pure logic in services/modules such as:

- ProfileService
- ShipValidator
- ShipStatsCalculator
- Input bindings/config
- basic balance constants

A suggested structure is in `SCRAPSHIPS_DESIGN.md`.

## Visual requirements

Use simple placeholder visuals:

- dark space background
- two colored triangular or pixel-like ships
- basic bullets
- HP bars
- optional simple boost effect

Do not spend time on polished art.

## Explicit non-goals for this first task

Do not implement yet:

- full ship builder UI
- Base Assault
- drones
- PvE
- online multiplayer
- backend
- login
- database
- asset pipeline
- advanced pixel art editor
- advanced physics/damage model

## Done when

The task is done when:

1. `npm install` works.
2. `npm run dev` starts the game.
3. `npm test` runs and passes.
4. `npm run build` succeeds.
5. Two local players can move, shoot, damage each other, and restart a round.
6. The profile/ship model and validation tests exist and pass.

After completing, summarize:

- files created
- important design decisions
- how to run the game
- what to implement next
