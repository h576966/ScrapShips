import Phaser from "phaser";
import {
  getWeaponDefinition,
  isWeaponType,
  type WeaponDefinition,
  type WeaponType
} from "../data/weapons";
import { isGadgetType } from "../data/gadgets";
import type { AsteroidEntity } from "../entities/AsteroidEntity";
import type { DuelShipEntity } from "../entities/DuelShipEntity";
import type { PlayerId } from "../input/bindings";
import type { GadgetType } from "../model";
import { MineEntity } from "../entities/MineEntity";
import { Projectile } from "../entities/Projectile";
import { ArenaObjectSystem } from "./ArenaObjectSystem";
import {
  getOpponentId,
  PLAYER_IDS,
  type MineDebugSnapshot,
  type ProjectileDebugSnapshot,
  type ShipMap
} from "./DuelTypes";
import {
  PROXIMITY_MINE_DEFINITION,
  calculateMineDamage,
  canPlaceMine,
  getMineCooldownRemainingMs,
  shouldTriggerMine
} from "./MineSystem";
import {
  canFireWeapon,
  getLaserDamage,
  laserIntersectsCircle,
  scaleWeaponCooldown,
  scaleWeaponDamage,
  segmentIntersectsCircle
} from "./WeaponSystem";
import { VisualEffectsSystem } from "./VisualEffectsSystem";

export class DuelCombatSystem {
  private readonly laserGraphics: Phaser.GameObjects.Graphics;
  private readonly projectiles: Projectile[] = [];
  private readonly mines: MineEntity[] = [];
  private laserImpactReadyAt = { p1: 0, p2: 0 };
  private mineReadyAt = { p1: 0, p2: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ships: ShipMap,
    private readonly arena: ArenaObjectSystem,
    private readonly effects: VisualEffectsSystem
  ) {
    this.laserGraphics = scene.add.graphics();
    this.laserGraphics.setDepth(9);
  }

  update(time: number, delta: number): void {
    this.laserGraphics.clear();
    this.updateProjectiles(time, delta);
    this.updateMines(time);
  }

  firePrimaryWeapon(ship: DuelShipEntity, time: number, delta: number): void {
    const weapon = getWeaponDefinition(ship.build.primaryWeapon);

    if (weapon.mode === "continuous") {
      this.fireLaser(ship, weapon, time, delta);
      return;
    }

    if (canFireWeapon(ship.fireReadyAt, time)) {
      this.fireProjectile(ship, weapon, time);
    }
  }

  tryUseGadget(ship: DuelShipEntity, time: number): boolean {
    if (ship.build.gadget !== "proximity_mine") {
      return false;
    }

    return this.placeMine(ship, time);
  }

  reset(): void {
    this.laserImpactReadyAt = { p1: 0, p2: 0 };
    this.mineReadyAt = { p1: 0, p2: 0 };
    for (const projectile of this.projectiles) {
      projectile.destroy();
    }
    this.projectiles.length = 0;
    for (const mine of this.mines) {
      mine.destroy();
    }
    this.mines.length = 0;
    this.laserGraphics.clear();
  }

  destroy(): void {
    this.reset();
    this.laserGraphics.destroy();
  }

  setShipWeapon(playerId: PlayerId, weapon: WeaponType): void {
    if (isWeaponType(weapon)) {
      this.ships[playerId].build.primaryWeapon = weapon;
    }
  }

  setShipGadget(playerId: PlayerId, gadget: GadgetType): void {
    if (isGadgetType(gadget)) {
      this.ships[playerId].build.gadget = gadget;
    }
  }

  placeMineForPlayer(playerId: PlayerId, time: number): boolean {
    return this.placeMine(this.ships[playerId], time);
  }

  getProjectileSnapshots(): ProjectileDebugSnapshot[] {
    return this.projectiles
      .filter((projectile) => !projectile.isDestroyed)
      .map((projectile) => ({
        ownerId: projectile.ownerId,
        x: projectile.sprite.x,
        y: projectile.sprite.y
      }));
  }

  getMineSnapshots(time: number): MineDebugSnapshot[] {
    return this.mines
      .filter((mine) => !mine.isDestroyed)
      .map((mine) => ({
        ownerId: mine.ownerId,
        x: mine.core.x,
        y: mine.core.y,
        armed: mine.isArmed(time)
      }));
  }

  getGadgetStatusLines(time: number): string[] {
    return PLAYER_IDS.map((playerId) => {
      const ship = this.ships[playerId];
      if (ship.build.gadget !== "proximity_mine") {
        return `${playerId.toUpperCase()} gadget: ${ship.build.gadget ?? "none"}`;
      }

      const remaining = getMineCooldownRemainingMs(this.mineReadyAt[playerId], time);
      const active = this.getActiveMineCount(playerId);
      const cooldown = remaining > 0 ? `${Math.ceil(remaining / 1000)}s` : "ready";
      return `${playerId.toUpperCase()} mines: ${active}/${
        PROXIMITY_MINE_DEFINITION.maxActivePerPlayer
      } | ${cooldown}`;
    });
  }

  get projectileCount(): number {
    return this.projectiles.filter((projectile) => !projectile.isDestroyed).length;
  }

  get mineCount(): number {
    return this.mines.filter((mine) => !mine.isDestroyed).length;
  }

  private fireProjectile(
    ship: DuelShipEntity,
    weapon: WeaponDefinition,
    time: number
  ): void {
    const muzzle = ship.getMuzzlePosition();
    const projectile = new Projectile(this.scene, {
      ownerId: ship.playerId,
      x: muzzle.x,
      y: muzzle.y,
      angle: ship.getFacingAngle(),
      damage: scaleWeaponDamage(weapon, ship.effectiveAttributes.weapon),
      weapon,
      createdAt: time,
      corrosive: ship.hasCorrosiveAmmo(time)
    });

    this.projectiles.push(projectile);
    this.effects.createMuzzleFlash(
      muzzle.x,
      muzzle.y,
      ship.getFacingAngle(),
      projectile.impactColor,
      weapon.type === "rail_shot" ? "rail_shot" : "bolt_cannon"
    );
    ship.markFired(time, scaleWeaponCooldown(weapon, ship.effectiveAttributes.weapon));
  }

  private placeMine(ship: DuelShipEntity, time: number): boolean {
    const activeCount = this.getActiveMineCount(ship.playerId);
    if (
      !canPlaceMine(
        this.mineReadyAt[ship.playerId],
        time,
        activeCount,
        PROXIMITY_MINE_DEFINITION
      )
    ) {
      return false;
    }

    const position = ship.getRearPosition(PROXIMITY_MINE_DEFINITION.dropDistance);
    this.mines.push(
      new MineEntity(this.scene, {
        ownerId: ship.playerId,
        x: position.x,
        y: position.y,
        placedAt: time,
        definition: PROXIMITY_MINE_DEFINITION
      })
    );
    this.mineReadyAt[ship.playerId] = time + PROXIMITY_MINE_DEFINITION.cooldownMs;
    return true;
  }

  private fireLaser(
    ship: DuelShipEntity,
    weapon: WeaponDefinition,
    time: number,
    delta: number
  ): void {
    const target = this.ships[getOpponentId(ship.playerId)];
    const muzzle = ship.getMuzzlePosition();
    const angle = ship.getFacingAngle();
    const endX = muzzle.x + Math.cos(angle) * weapon.range;
    const endY = muzzle.y + Math.sin(angle) * weapon.range;

    this.drawLaserBeam(muzzle.x, muzzle.y, endX, endY, weapon.color);
    this.damageAsteroidsWithLaser(ship, weapon, muzzle.x, muzzle.y, angle, time, delta);

    if (
      target.alive &&
      laserIntersectsCircle({
        originX: muzzle.x,
        originY: muzzle.y,
        angle,
        range: weapon.range,
        targetX: target.shape.x,
        targetY: target.shape.y,
        targetRadius: target.getHitRadius()
      })
    ) {
      const shieldBefore = target.shield;
      target.takeDamage(
        getLaserDamage(weapon, ship.effectiveAttributes.weapon, delta),
        time
      );
      if (time >= this.laserImpactReadyAt[ship.playerId]) {
        if (shieldBefore > 0) {
          this.effects.createShieldShimmer(
            target.shape.x,
            target.shape.y,
            target.getHitRadius()
          );
        } else {
          this.effects.createLaserImpact(target.shape.x, target.shape.y, weapon.color);
        }
        this.laserImpactReadyAt[ship.playerId] = time + 90;
      }
    }
  }

  private updateProjectiles(time: number, delta: number): void {
    for (const projectile of this.projectiles) {
      projectile.update(time, delta);
      if (projectile.isDestroyed) {
        continue;
      }

      if (projectile.shouldEmitTrail(time, projectile.weapon.type === "rail_shot" ? 42 : 58)) {
        this.effects.createProjectileTrail(
          projectile.sprite.x,
          projectile.sprite.y,
          projectile.sprite.rotation,
          projectile.impactColor,
          projectile.weapon.type === "rail_shot" ? "rail_shot" : "bolt_cannon"
        );
      }

      const asteroidHit = this.arena.findAsteroidHit(projectile);
      if (asteroidHit) {
        this.applyProjectileAsteroidHit(projectile, asteroidHit, time);
        continue;
      }

      const target = this.ships[getOpponentId(projectile.ownerId)];
      const hitDistance = target.getHitRadius() + projectile.weapon.projectileRadius;
      if (
        target.alive &&
        segmentIntersectsCircle({
          startX: projectile.previousX,
          startY: projectile.previousY,
          endX: projectile.sprite.x,
          endY: projectile.sprite.y,
          targetX: target.shape.x,
          targetY: target.shape.y,
          targetRadius: hitDistance
        })
      ) {
        this.applyProjectileHit(projectile, target, time);
      }
    }

    this.pruneDestroyed();
  }

  private updateMines(time: number): void {
    for (const mine of this.mines) {
      mine.update(time);
      if (mine.isDestroyed) {
        continue;
      }

      const target = this.ships[getOpponentId(mine.ownerId)];
      if (
        target.alive &&
        shouldTriggerMine({
          mine: mine.getState(),
          now: time,
          targetX: target.shape.x,
          targetY: target.shape.y,
          targetRadius: target.getHitRadius(),
          definition: mine.definition
        })
      ) {
        this.explodeMine(mine, time);
      }
    }

    this.pruneDestroyed();
  }

  private explodeMine(mine: MineEntity, time: number): void {
    const state = mine.getState();
    this.effects.createMineExplosion(
      state.x,
      state.y,
      0xffd05f,
      mine.definition.explosionRadius
    );

    for (const playerId of PLAYER_IDS) {
      const ship = this.ships[playerId];
      if (!ship.alive) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        state.x,
        state.y,
        ship.shape.x,
        ship.shape.y
      );
      const damage = calculateMineDamage(distance, mine.definition);
      if (damage > 0) {
        this.damageShipWithFeedback(
          ship,
          damage,
          time,
          ship.shape.x,
          ship.shape.y,
          0xffd05f
        );
      }
    }

    for (const asteroid of this.arena.getAsteroids()) {
      const distance = Phaser.Math.Distance.Between(
        state.x,
        state.y,
        asteroid.shape.x,
        asteroid.shape.y
      );
      const damage = calculateMineDamage(distance, mine.definition);
      if (damage > 0) {
        this.arena.damageAsteroid(asteroid, damage, time);
      }
    }

    mine.destroy();
    this.scene.cameras.main.shake(120, 0.005);
  }

  private applyProjectileAsteroidHit(
    projectile: Projectile,
    asteroid: AsteroidEntity,
    time: number
  ): void {
    this.arena.damageAsteroid(asteroid, projectile.damage, time);
    this.effects.createImpact(
      projectile.sprite.x,
      projectile.sprite.y,
      projectile.impactColor
    );
    projectile.destroy();
  }

  private damageAsteroidsWithLaser(
    ship: DuelShipEntity,
    weapon: WeaponDefinition,
    originX: number,
    originY: number,
    angle: number,
    time: number,
    delta: number
  ): void {
    const damage = getLaserDamage(weapon, ship.effectiveAttributes.weapon, delta);
    for (const asteroid of this.arena.getAsteroids()) {
      if (
        laserIntersectsCircle({
          originX,
          originY,
          angle,
          range: weapon.range,
          targetX: asteroid.shape.x,
          targetY: asteroid.shape.y,
          targetRadius: asteroid.getHitRadius()
        })
      ) {
        const x = asteroid.shape.x;
        const y = asteroid.shape.y;
        this.arena.damageAsteroid(asteroid, damage, time);
        if (time >= this.laserImpactReadyAt[ship.playerId]) {
          this.effects.createLaserImpact(x, y, weapon.color);
          this.laserImpactReadyAt[ship.playerId] = time + 90;
        }
      }
    }
  }

  private applyProjectileHit(
    projectile: Projectile,
    target: DuelShipEntity,
    time: number
  ): void {
    if (projectile.isDestroyed) {
      return;
    }

    this.damageShipWithFeedback(
      target,
      projectile.damage,
      time,
      projectile.sprite.x,
      projectile.sprite.y,
      projectile.impactColor
    );
    if (projectile.corrosive) {
      target.applyCorrosiveDamageOverTime(time);
    }
    this.effects.createImpact(
      projectile.sprite.x,
      projectile.sprite.y,
      projectile.impactColor
    );
    projectile.destroy();
    this.scene.cameras.main.shake(80, 0.003);
  }

  private pruneDestroyed(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      if (this.projectiles[i].isDestroyed) {
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.mines.length - 1; i >= 0; i -= 1) {
      if (this.mines[i].isDestroyed) {
        this.mines.splice(i, 1);
      }
    }
  }

  private getActiveMineCount(playerId: PlayerId): number {
    return this.mines.filter(
      (mine) => mine.ownerId === playerId && !mine.isDestroyed
    ).length;
  }

  private drawLaserBeam(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: number
  ): void {
    const layers = [
      { width: 9, alpha: 0.14 },
      { width: 5, alpha: 0.32 },
      { width: 2, alpha: 0.94 }
    ];
    for (const layer of layers) {
      this.laserGraphics.lineStyle(layer.width, color, layer.alpha);
      this.laserGraphics.beginPath();
      this.laserGraphics.moveTo(startX, startY);
      this.laserGraphics.lineTo(endX, endY);
      this.laserGraphics.strokePath();
    }
  }

  private damageShipWithFeedback(
    ship: DuelShipEntity,
    damage: number,
    time: number,
    impactX: number,
    impactY: number,
    color: number
  ): void {
    const shieldBefore = ship.shield;
    ship.takeDamage(damage, time);
    if (shieldBefore > 0) {
      this.effects.createShieldShimmer(ship.shape.x, ship.shape.y, ship.getHitRadius());
      return;
    }

    this.effects.createHullSparks(impactX, impactY, color);
  }
}
