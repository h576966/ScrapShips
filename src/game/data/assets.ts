import type Phaser from "phaser";

export type VisualQualityPreset = "low" | "medium" | "high";

export type ScrapshipsAsset = {
  key: string;
  path: string;
  type: "image";
};

export const ASSET_KEYS = {
  particles: {
    circle: "scrapships.particle.circle",
    muzzle: "scrapships.particle.muzzle",
    smoke: "scrapships.particle.smoke",
    spark: "scrapships.particle.spark",
    star: "scrapships.particle.star",
    trace: "scrapships.particle.trace"
  },
  pixelShmup: {
    tileA: "scrapships.pixelShmup.tileA",
    tileB: "scrapships.pixelShmup.tileB"
  },
  generated: {
    projectiles: {
      bolt: "scrapships.generated.projectile.bolt",
      rail: "scrapships.generated.projectile.rail",
      corrosive: "scrapships.generated.projectile.corrosive"
    },
    background: {
      dust: "scrapships.generated.background.dust"
    }
  }
} as const;

export const SCRAPSHIPS_ASSET_MANIFEST: readonly ScrapshipsAsset[] = [
  {
    key: ASSET_KEYS.particles.circle,
    path: "/assets/scrapships/kenney-particle-pack/circle_05.png",
    type: "image"
  },
  {
    key: ASSET_KEYS.particles.muzzle,
    path: "/assets/scrapships/kenney-particle-pack/muzzle_02.png",
    type: "image"
  },
  {
    key: ASSET_KEYS.particles.smoke,
    path: "/assets/scrapships/kenney-particle-pack/smoke_03.png",
    type: "image"
  },
  {
    key: ASSET_KEYS.particles.spark,
    path: "/assets/scrapships/kenney-particle-pack/spark_05.png",
    type: "image"
  },
  {
    key: ASSET_KEYS.particles.star,
    path: "/assets/scrapships/kenney-particle-pack/star_06.png",
    type: "image"
  },
  {
    key: ASSET_KEYS.particles.trace,
    path: "/assets/scrapships/kenney-particle-pack/trace_06.png",
    type: "image"
  },
  {
    key: ASSET_KEYS.pixelShmup.tileA,
    path: "/assets/scrapships/kenney-pixel-shmup/tile_0036.png",
    type: "image"
  },
  {
    key: ASSET_KEYS.pixelShmup.tileB,
    path: "/assets/scrapships/kenney-pixel-shmup/tile_0037.png",
    type: "image"
  }
] as const;

export const VISUAL_QUALITY_CONFIG: Record<
  VisualQualityPreset,
  {
    particleScale: number;
    burstParticleLimit: number;
    backgroundDustCount: number;
    cameraShakeMultiplier: number;
  }
> = {
  low: {
    particleScale: 0.65,
    burstParticleLimit: 6,
    backgroundDustCount: 18,
    cameraShakeMultiplier: 0.6
  },
  medium: {
    particleScale: 0.85,
    burstParticleLimit: 10,
    backgroundDustCount: 34,
    cameraShakeMultiplier: 1
  },
  high: {
    particleScale: 1,
    burstParticleLimit: 16,
    backgroundDustCount: 54,
    cameraShakeMultiplier: 1.15
  }
};

export const PROJECTILE_VISUAL_CONFIG = {
  bolt_cannon: {
    textureKey: ASSET_KEYS.generated.projectiles.bolt,
    trailLifetimeMs: 140,
    impactLifetimeMs: 170
  },
  rail_shot: {
    textureKey: ASSET_KEYS.generated.projectiles.rail,
    trailLifetimeMs: 210,
    impactLifetimeMs: 190
  },
  corrosive: {
    textureKey: ASSET_KEYS.generated.projectiles.corrosive,
    trailLifetimeMs: 220,
    impactLifetimeMs: 210
  }
} as const;

export const PASSING_ASTEROID_VISUAL_CONFIG = {
  trailAlpha: 0.16,
  trailLengthMultiplier: 2.9,
  warningLifetimeMs: 480
} as const;

export function loadScrapshipsAssets(scene: Phaser.Scene): void {
  for (const asset of SCRAPSHIPS_ASSET_MANIFEST) {
    if (!scene.textures.exists(asset.key)) {
      scene.load.image(asset.key, asset.path);
    }
  }
}

export function getVisualQualityConfig(preset: VisualQualityPreset = "medium") {
  return VISUAL_QUALITY_CONFIG[preset];
}
