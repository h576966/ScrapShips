import Phaser from "phaser";
import {
  getWeaponDefinition,
  isWeaponType,
  type WeaponDefinition,
  type WeaponType
} from "../data/weapons";
import type { AsteroidEntity } from "../entities/AsteroidEntity";
import type { DuelShipEntity } from "../entities/DuelShipEntity";
import type { PlayerId } from "../input/bindings";
import { Projectile } from "../entities/Projectile";
import { ArenaObjectSystem } from "./ArenaObjectSystem";
import { DuelEffects } from "./DuelEffects";
import {
  getOpponentId,
  type ProjectileDebugSnapshot,
  type ShipMap
} from "./DuelTypes";
import {
  canFireWeapon,
  getLaserDamage,
  laserIntersectsCircle,
  scaleWeaponCooldown,
  scaleWeaponDamage,
  segmentIntersectsCircle
} from "./WeaponSystem";

export class DuelCombatSystem {
  private readonly laserGraphics: Phaser.GameObjects.Graphics;
  private readonly projectiles: Projectile[] = [];
  private laserImpactReadyAt = { p1: 0, p2: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly ships: ShipMap,
    private readonly arena: ArenaObjectSystem,
    private readonly effects: DuelEffects
  ) {
    this.laserGraphics = scene.add.graphics();
    this.laserGraphics.setDepth(9);
  }

  update(time: number, delta: number): void {
    this.laserGraphics.clear();
    this.updateProjectiles(time, delta);
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

  reset(): void {
    this.laserImpactReadyAt = { p1: 0, p2: 0 };
    for (const projectile of this.projectiles) {
      projectile.destroy();
    }
    this.projectiles.length = 0;
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

  getProjectileSnapshots(): ProjectileDebugSnapshot[] {
    return this.projectiles
      .filter((projectile) => !projectile.isDestroyed)
      .map((projectile) => ({
        ownerId: projectile.ownerId,
        x: projectile.sprite.x,
        y: projectile.sprite.y
      }));
  }

  get projectileCount(): number {
    return this.projectiles.filter((projectile) => !projectile.isDestroyed).length;
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
      damage: scaleWeaponDamage(weapon, ship.build.attributes.weapon),
      weapon,
      createdAt: time,
      corrosive: ship.hasCorrosiveAmmo(time)
    });

    this.projectiles.push(projectile);
    ship.markFired(time, scaleWeaponCooldown(weapon, ship.build.attributes.weapon));
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

    this.laserGraphics.lineStyle(3, weapon.color, 0.85);
    this.laserGraphics.beginPath();
    this.laserGraphics.moveTo(muzzle.x, muzzle.y);
    this.laserGraphics.lineTo(endX, endY);
    this.laserGraphics.strokePath();
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
      target.takeDamage(getLaserDamage(weapon, ship.build.attributes.weapon, delta), time);
      if (time >= this.laserImpactReadyAt[ship.playerId]) {
        this.effects.createImpact(target.shape.x, target.shape.y, weapon.color);
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
    const damage = getLaserDamage(weapon, ship.build.attributes.weapon, delta);
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
          this.effects.createImpact(x, y, weapon.color);
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

    target.takeDamage(projectile.damage, time);
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
  }
}
