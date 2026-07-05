# ScrapShips

ScrapShips is a local two-player spaceship-builder duel game built with TypeScript, Vite, Phaser, and Vitest.

The current prototype supports two players on one keyboard, local saved profiles, a ship garage/builder, and a playable duel arena.

## Run

```bash
npm install
npm run dev
npm test
npm run build
```

## Controls

| Action | Player 1 | Player 2 |
|---|---:|---:|
| Turbo / gadget | Q | Å |
| Thrust / forward | W | P |
| Fire | E | O |
| Rotate left | A | L |
| Brake / reverse | S | Ö |
| Rotate right | D | Ä |
| Restart round | R | R |
| Return to Garage | G | G |

Nordic keys can vary by browser/layout; bindings live in `src/game/input/bindings.ts`.

## Current Features

- Main Menu -> Garage -> Duel flow.
- Two local profiles with saved ships in `localStorage`.
- Create, duplicate, rename, delete except last ship, and cap at 5 ships per profile.
- Ship builder for colors, attributes, hull preset, primary weapon, gadget, and generated visual details.
- Primary weapons:
  - Laser: short-range continuous beam.
  - Bolt Cannon: medium-range all-round projectile.
  - Rail Shot: long-range precision projectile.
- Gadgets:
  - Turbo burst movement boost.
  - Proximity mine with cooldown, arming delay, lifetime, and active mine cap.
- Larger generated duel arena with static zoomed-out camera, asteroids, pickups, hit feedback, HP/shield bars, and layered star background.

## Code Shape

- Ship/profile model and validation live under `src/game/model` and `src/game/services`.
- Derived movement, HP, shield, mass, and turbo stats live in `ShipStatsCalculator`.
- Weapon projectile damage, speed, cooldown, range, and lifetime live in `src/game/data/weapons.ts` and `WeaponSystem`.
- Phaser-facing duel responsibilities are split between `DuelScene`, `DuelCombatSystem`, `ArenaObjectSystem`, `DuelEffects`, and entity classes.

## Non-Goals For Now

No backend, login, online multiplayer, external art assets, asset pipeline, or full pixel editor yet.
