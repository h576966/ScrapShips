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
- Ship builder for colors, base attributes, 17x17 centered hull presets, primary weapon, gadget, and generated pixel-cell visual details.
- Pixel-art runtime visuals use a small CC0 Kenney asset subset plus generated textures derived from each saved ship build.
- Primary weapons:
  - Laser: short-range continuous beam.
  - Bolt Cannon: medium-range all-round projectile.
  - Rail Shot: long-range precision projectile.
- Gadgets:
  - Turbo burst movement boost.
  - Proximity mine with cooldown, arming delay, lifetime, and active mine cap.
- Larger generated duel arena with static zoomed-out camera, improved asteroids, infrequent passing asteroid hazards, pickups, weapon effects, HP/shield bars, and layered pixel-art space background.

## Code Shape

- Ship/profile model and validation live under `src/game/model` and `src/game/services`.
- Derived movement, HP, shield, mass, effective hull-modified attributes, and turbo stats live in `ShipStatsCalculator`.
- Weapon projectile damage, speed, cooldown, range, and lifetime live in `src/game/data/weapons.ts` and `WeaponSystem`.
- `BootScene` preloads curated assets and generated visual textures before the menu.
- Phaser-facing duel responsibilities are split between `DuelScene`, `DuelCombatSystem`, `ArenaObjectSystem`, `VisualEffectsSystem`, and entity classes.
- In-game custom ship visuals are baked from `ShipVisualSpec` through `ShipTextureFactory`; the Garage SVG preview uses the same visual spec.
- In dev builds, press `H` in Duel to inspect ship body bounds, center, muzzle point, and weapon hit radius.

## Non-Goals For Now

No backend, login, online multiplayer, large asset pipeline, or full pixel editor yet.
