# Scrapships — Game Design and Technical Starting Point

## One-sentence pitch

Scrapships is a local two-player spaceship-builder duel game where each player creates and saves small custom ships, allocates RPG-like attributes, and battles on one computer.

## Intended players

Primary use case:

- Niklas and his 8-year-old son playing together on one PC.
- Shared keyboard controls.
- Short matches.
- Strong focus on designing and personalizing ships.

Relevant taste references:

- Rocket League: short skill-based matches, boost/turbo, momentum, physical collisions.
- Minecraft: creative building/personalization, ownership of creations.
- League of Legends: base objective and simple ability/cooldown ideas, but not full MOBA complexity.
- Retro PC spaceship duel games such as Dueling Starships: simple arena duels and custom ship identity.

## Chosen stack

Use TypeScript + Phaser.

Reasoning:

- Works in browser.
- Good fit for quick local prototypes.
- Easy for Codex to work with.
- Familiar TypeScript ecosystem.
- Local keyboard 1v1 is feasible.
- Persistence can start with localStorage.

## Core loop

```text
Choose player
-> choose saved ship
-> edit ship attributes/color/shape
-> play short duel or base assault
-> adjust ship
-> play again
```

The ship-building loop is as important as the match itself.

## Current implemented foundation

The current playable prototype includes:

- Main Menu -> Garage -> Duel.
- Two local player profiles with selectable active ships.
- LocalStorage save/load with safe migration for older ships.
- Ship create, duplicate, rename, delete except last ship, and max 5 ships per profile.
- Builder controls for colors, attributes, hull preset, primary weapon, gadget, and generated visual details.
- Duel arena with a larger generated field, asteroids, pickups, HP/shield bars, hit feedback, and restart/garage shortcuts.
- Primary weapons configured in `src/game/data/weapons.ts`:
  - Laser: short-range continuous beam.
  - Bolt Cannon: medium-range repeated projectile.
  - Rail Shot: long-range precision projectile.
- Proximity mines as a gadget with cooldown, arming delay, lifetime, active mine cap, and explosion feedback.

Weapon projectile damage, cooldown, range, speed, and lifetime live in weapon definitions plus `WeaponSystem` scaling. `ShipStatsCalculator` is only responsible for derived movement, HP/shield, mass, and turbo stats.

## Player profiles

Each player profile should contain:

- id
- name
- color/icon
- activeShipId
- ships: max 5 saved ships

Rules:

- A profile can have at most 5 ships.
- A profile should always have at least one usable ship.
- Ships can be created, renamed, duplicated, deleted, and selected.
- Deleting the active ship should either be blocked or select another ship.
- No login/cloud in early versions.

## Ship model

Initial ship definition:

```ts
export type PlayerProfile = {
  id: string;
  name: string;
  color: string;
  activeShipId: string;
  ships: ShipBuild[];
};

export type ShipBuild = {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
  };
  hullShape: HullShape;
  attributes: ShipAttributes;
  primaryWeapon: WeaponType;
  visual: ShipVisualCustomization;
  gadget?: GadgetType;
};

export type ShipAttributes = {
  speed: number;
  turning: number;
  hull: number;
  shield: number;
  weapon: number;
  turbo: number;
};

export type HullShape = {
  gridSize: 16;
  pixels: Array<{ x: number; y: number }>;
};

export type WeaponType =
  | "laser"
  | "bolt_cannon"
  | "rail_shot";

export type GadgetType =
  | "none"
  | "proximity_mine"
  | "repair_pulse"
  | "turbo_burst";

export type ShipVisualCustomization = {
  hullPreset: "scrapper" | "needle" | "bulwark" | "raider";
  noseStyle: "sharp" | "blunt" | "split";
  wingStyle: "none" | "small_fins" | "swept_wings";
  engineStyle: "single" | "dual" | "wide";
  accentColor: string;
};
```

## Attribute budget

Suggested initial rules:

```text
Total attribute points: 30
Max per attribute: 10
Min per attribute: 0 or 1, depending on balance
```

Initial attributes:

| Attribute | Purpose |
|---|---|
| speed | acceleration / max movement speed |
| turning | rotation speed / handling |
| hull | ship HP |
| shield | shield HP / regeneration |
| weapon | scales configured primary weapon damage / cooldown |
| turbo | boost strength / boost recharge |

Mass should not be directly assigned by the player. It should be derived from the hull shape.

## Hull shape and mass

Early version:

- Hull shape is drawn or selected.
- More hull pixels = larger hitbox and more mass.
- More mass gives some survivability but reduces agility.
- Shape affects hitbox.
- Shape does not need advanced per-pixel damage in early versions.

Suggested derived values:

```text
mass = baseMass + hullPixelCount * massPerPixel
maxHp = baseHp + hullAttribute * hpPerPoint + hullPixelCount * hpPerPixel
acceleration = f(speedAttribute, mass)
turnRate = f(turningAttribute, mass)
```

## Ramming

Ramming should be a valid emergent strategy, not a hard class.

Suggested first model:

```text
ramDamage = relativeSpeed * attackerMass * ramFactor
selfDamage = ramDamage * selfDamageFactor
```

Rules:

- Both ships take collision damage.
- Turbo increases ramming threat.
- Shields absorb some impact.
- Very heavy ships should turn/accelerate worse.
- Base ramming damage should be reduced to avoid degenerate base rushing.

## Gadgets

Cloak is not required and should not be prioritized.

Implemented/near-term gadgets:

1. Proximity mine
2. Repair pulse
3. Turbo burst

Gadgets should be optional and simple. The same sixth key is used for turbo/gadget:

- `turbo_burst` keeps the existing movement boost behavior.
- `proximity_mine` places a mine behind the ship, then recharges slowly.
- Mines arm after a short delay, trigger on enemy proximity, expire after a long lifetime, and are capped per player.
- `repair_pulse` is reserved in the model but not yet implemented as an active combat ability.

## Primary weapons

Ships have one primary weapon selected in Garage.

Current primary weapons:

| Weapon | Role |
|---|---|
| Laser | short-range continuous beam, reliable up close |
| Bolt Cannon | default medium-range projectile |
| Rail Shot | long-range, fast, slower-cooldown projectile |

Weapon definitions are config-driven. Keep range, damage, cooldown, projectile speed, lifetime, and visual style in `src/game/data/weapons.ts`; use pure helpers in `WeaponSystem` for scaling, cooldown checks, projectile expiration, beam hit checks, and centerline spawn math.

## Controls

Default keyboard layout:

```text
Player 1:
Q W E
A S D

Player 2:
O P Å
L Ö Ä
```

Mapping:

| Action | Player 1 | Player 2 |
|---|---:|---:|
| Turbo / gadget | Q | Å |
| Thrust / forward | W | P |
| Fire | E | O |
| Rotate left | A | L |
| Brake / reverse | S | Ö |
| Rotate right | D | Ä |

Bottom-row outer keys are used for turning so each player keeps thrust/brake in the middle column. Add a key test screen or debug overlay early because shared-keyboard ghosting and Nordic key handling can vary.

## Game modes

### Duel mode

First technical target.

Rules:

- Two ships spawn on opposite sides.
- Shared larger arena, no split screen.
- Static zoomed-out camera keeps both ships visible.
- UI text is fixed to the screen/camera rather than world coordinates.
- Ships can thrust, turn, brake, shoot, collide, take damage, and die.
- Projectile weapons spawn from the ship nose/centerline.
- Laser starts from the ship nose/centerline.
- Asteroids spawn across the arena and avoid starting too close to ships.
- Winner is the last ship alive.
- Round reset after win.

This should be implemented before Base Assault even if Base Assault is the desired long-term main mode.

### Base Assault mode

Longer-term main mode, but keep it simple.

Version 1:

- Player 1 base on left.
- Player 2 base on right.
- Each base has HP.
- A ship can heal slowly inside its own repair radius.
- If a ship dies, it respawns at its base after a short delay.
- Destroying the enemy base wins.

Version 2:

- Bases spawn small drones/minions.
- Drones move toward enemy base.
- Drones shoot weakly or collide.
- Keep drone AI deterministic and simple.

### PvE / test mode

Add after the duel loop is fun.

Initial PvE:

- target drones
- simple moving enemies
- asteroid field
- survival timer

Later:

- two-player co-op against an AI base
- simple solar-system map / educational campaign layer

## Visual direction

Keep visuals simple:

- pixel-art style
- readable ships
- clear colored outlines per player
- dark space background
- layered star background with subtle drift
- visible projectiles
- visible mines and explosion rings
- visible shield/HP bars
- visible base repair radius
- simple explosion/hit effects

The first version can use simple generated rectangles/polygons before real art.

Current ship visuals are generated polygons. Hull presets affect hull pixels/mass and silhouette. Nose, wing, engine, and accent color options are cosmetic for now and should remain lightweight unless there is a clear gameplay reason to make them mechanical.

## Recommended repo structure

```text
src/
  main.ts
  game/
    scenes/
      MainMenuScene.ts
      GarageScene.ts
      DuelScene.ts
    entities/
      DuelShipEntity.ts
      Projectile.ts
      MineEntity.ts
      AsteroidEntity.ts
      PickupEntity.ts
    systems/
      InputSystem.ts
      DuelCombatSystem.ts
      ArenaObjectSystem.ts
      DuelEffects.ts
      WeaponSystem.ts
      MineSystem.ts
      PickupSystem.ts
      SpaceBackground.ts
    model/
      PlayerProfile.ts
      ShipBuild.ts
    services/
      SaveService.ts
      ProfileService.ts
      ShipStatsCalculator.ts
      ShipValidator.ts
    data/
      weapons.ts
      gadgets.ts
      hullPresets.ts
      shipVisualOptions.ts
      arenaObjects.ts
      defaultProfiles.ts
      defaultShips.ts
      balance.ts
tests/
  ProfileService.test.ts
  ShipValidator.test.ts
  ShipStatsCalculator.test.ts
  SaveService.test.ts
  WeaponSystem.test.ts
  MineSystem.test.ts
  ArenaObjects.test.ts
```

## First success definition

The first successful version is:

```text
Two local players can choose profiles, choose saved ships, play a short 1v1 duel on the same keyboard, and want to play another round.
```

The second success definition is:

```text
The players can edit ships through attributes/color/shape and feel that different designs play differently.
```

The third success definition is:

```text
The same ships can be used in a simple Base Assault mode with bases, repair zones, respawn, and base HP.
```
