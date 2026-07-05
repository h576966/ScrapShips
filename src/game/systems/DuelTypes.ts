import type { WeaponType } from "../data/weapons";
import type { DuelShipEntity } from "../entities/DuelShipEntity";
import type { PlayerId } from "../input/bindings";
import type { PickupType } from "./PickupSystem";

export const PLAYER_IDS = ["p1", "p2"] as const satisfies readonly PlayerId[];

export type ShipMap = Record<PlayerId, DuelShipEntity>;

export type ShipDebugSnapshot = {
  hp: number;
  shield: number;
  weapon: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  speedBoostActive: boolean;
  corrosiveAmmoActive: boolean;
  damageOverTimeActive: boolean;
};

export type ProjectileDebugSnapshot = {
  ownerId: PlayerId;
  x: number;
  y: number;
};

export type AsteroidDebugSnapshot = {
  id: string;
  size: string;
  hp: number;
  x: number;
  y: number;
  radius: number;
};

export type PickupDebugSnapshot = {
  id: string;
  type: PickupType;
  x: number;
  y: number;
};

export type DuelDebugSnapshot = {
  projectileCount: number;
  asteroidCount: number;
  pickupCount: number;
  roundOver: boolean;
  p1: ShipDebugSnapshot;
  p2: ShipDebugSnapshot;
  projectiles: ProjectileDebugSnapshot[];
  asteroids: AsteroidDebugSnapshot[];
  pickups: PickupDebugSnapshot[];
};

export type DuelDebugApi = {
  getSnapshot: () => DuelDebugSnapshot;
  setShipPose: (playerId: PlayerId, x: number, y: number, rotation: number) => void;
  setShipVelocity: (playerId: PlayerId, x: number, y: number) => void;
  setShipWeapon: (playerId: PlayerId, weapon: WeaponType) => void;
  damageShip: (playerId: PlayerId, amount: number) => void;
  setAsteroidPose: (id: string, x: number, y: number) => void;
  setAsteroidHp: (id: string, hp: number) => void;
  damageAsteroid: (id: string, amount: number) => void;
  forceNextPickupDrop: (type: PickupType) => void;
  spawnPickup: (type: PickupType, x: number, y: number, lifetimeMs?: number) => string;
};

export function getOpponentId(playerId: PlayerId): PlayerId {
  return playerId === "p1" ? "p2" : "p1";
}
