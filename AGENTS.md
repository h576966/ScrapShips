# AGENTS.md — Scrapships

## Project

Scrapships is a small local 1v1 spaceship-builder duel game.

Primary goals:

- Make a game that Niklas and his 8-year-old son can play on one computer.
- Focus on building and personalizing small "scrap" spaceships.
- Keep the first version simple, playable, and easy to extend.
- Use TypeScript + Phaser.
- Structure the code so Codex can safely add features in small steps.

## Tech assumptions

Use:

- TypeScript
- Phaser
- Vite
- Vitest for non-Phaser gameplay/model tests
- Browser localStorage for local save data
- JSON-compatible data models for player profiles and ships

Do not add backend, login, cloud sync, database, online multiplayer, matchmaking, or account systems unless explicitly requested later.

## Development principles

Prefer small, testable systems over large scene classes.

Keep Phaser scene code thin. Put reusable logic in plain TypeScript modules/services where possible.

Good candidates for plain TypeScript:

- player profile validation
- ship validation
- ship stat calculation
- movement stat derivation
- ramming/collision damage calculation
- weapon scaling, projectile expiration, mine timing, and geometric hit checks
- save/load serialization
- game mode state rules

Phaser scenes should mostly coordinate rendering, input, entity creation, and scene transitions.

## Game constraints

The first playable target is local 1v1 on one keyboard.

Default controls:

| Action | Player 1 | Player 2 |
|---|---:|---:|
| Rotate left | Q | O |
| Thrust / forward | W | P |
| Rotate right | E | Å |
| Fire | A | L |
| Brake / reverse | S | Ö |
| Turbo / gadget | D | Ä |

Important: Nordic keys may be browser/layout dependent. Implement controls through a key-binding config and avoid hardcoding scattered key checks. Add an input test/debug scene or overlay early.

## Save model constraints

- A player profile has a name, color/icon, active ship, and saved ships.
- Each player profile can have at most 5 ships.
- Profiles and ships are saved locally.
- Use localStorage first.
- JSON export/import can be added later.
- Avoid permanent power progression. Saved ships should not become stronger just because a profile has played longer.

## First game modes

Build in this order:

1. Duel
   - local 1v1
   - one shared arena
   - thrust, turning, shooting, collision, HP, round reset

2. Ship Garage / Builder
   - choose player
   - choose one of max 5 ships
   - create, duplicate, rename, delete ships
   - choose colors
   - allocate attributes
   - simple hull shape / pixel hull later

3. Simple Base Assault
   - each player has a base
   - bases have HP
   - base repair zone heals allied ships
   - destroyed base ends the match
   - drones/minions can be added later

4. Simple PvE / test mode
   - target drones
   - simple AI enemies
   - eventually co-op against an AI base

## Ship-building direction

Start with attributes and simple personalization.

Initial attributes:

- speed
- turning
- hull
- shield
- weapon
- turbo

Total attribute budget: 30 points.
Suggested max per attribute: 10.

Hull preset should affect mass and hitbox. Nose, wing, engine, and accent options are cosmetic for now.

Primary weapon behavior is config-driven in `src/game/data/weapons.ts`; do not duplicate projectile damage, speed, or cooldown fields in derived ship stats.

Do not introduce fixed ship classes like "Rammer", "Tank", or "Scout" as hard classes. Strategies should emerge from combinations of attributes, mass, hull shape, turbo, and weapons.

Cloak is not required. Prefer turbo, ramming, mines, repair, shields, and base mechanics before stealth.

## Style

Keep the game readable and child-playable, but not overly simplified.

Use short rounds and fast iteration:

build ship -> test -> duel -> adjust ship -> duel again

Prioritize visible feedback:

- hit flashes
- HP/shield bars
- boost effects
- collision feedback
- base damage feedback
- clear win/reset state

## Codex workflow

When implementing features:

1. Work in small vertical slices.
2. Add or update tests for pure TypeScript logic.
3. Avoid large rewrites unless necessary.
4. Keep code readable over clever.
5. Make minimal assumptions and document them.
6. Do not add dependencies unless they clearly reduce complexity.
7. Preserve the current product direction in this file.

Suggested verification commands once the project exists:

```bash
npm install
npm run dev
npm test
npm run build
```

If scripts differ, update this section.
