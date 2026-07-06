import { describe, expect, it } from "vitest";
import {
  ASSET_KEYS,
  PASSING_ASTEROID_VISUAL_CONFIG,
  PROJECTILE_VISUAL_CONFIG,
  SCRAPSHIPS_ASSET_MANIFEST,
  VISUAL_QUALITY_CONFIG
} from "../src/game/data/assets";

describe("visual asset config", () => {
  it("has unique asset keys with non-empty paths", () => {
    const keys = SCRAPSHIPS_ASSET_MANIFEST.map((asset) => asset.key);

    expect(new Set(keys).size).toBe(keys.length);
    for (const asset of SCRAPSHIPS_ASSET_MANIFEST) {
      expect(asset.key).toMatch(/^scrapships\./);
      expect(asset.path).toMatch(/^\/assets\/scrapships\/.+\.png$/);
      expect(asset.type).toBe("image");
    }
  });

  it("defines valid visual quality presets", () => {
    expect(Object.keys(VISUAL_QUALITY_CONFIG).sort()).toEqual([
      "high",
      "low",
      "medium"
    ]);

    for (const config of Object.values(VISUAL_QUALITY_CONFIG)) {
      expect(config.particleScale).toBeGreaterThan(0);
      expect(config.burstParticleLimit).toBeGreaterThan(0);
      expect(config.backgroundDustCount).toBeGreaterThan(0);
      expect(config.cameraShakeMultiplier).toBeGreaterThan(0);
    }
  });

  it("keeps projectile visual configs sane", () => {
    expect(PROJECTILE_VISUAL_CONFIG.bolt_cannon.textureKey).toBe(
      ASSET_KEYS.generated.projectiles.bolt
    );
    expect(PROJECTILE_VISUAL_CONFIG.rail_shot.textureKey).toBe(
      ASSET_KEYS.generated.projectiles.rail
    );

    for (const config of Object.values(PROJECTILE_VISUAL_CONFIG)) {
      expect(config.textureKey).toMatch(/^scrapships\./);
      expect(config.trailLifetimeMs).toBeGreaterThan(50);
      expect(config.impactLifetimeMs).toBeGreaterThan(50);
    }
  });

  it("keeps passing asteroid visuals visible but short-lived", () => {
    expect(PASSING_ASTEROID_VISUAL_CONFIG.trailAlpha).toBeGreaterThan(0);
    expect(PASSING_ASTEROID_VISUAL_CONFIG.trailAlpha).toBeLessThan(0.5);
    expect(PASSING_ASTEROID_VISUAL_CONFIG.trailLengthMultiplier).toBeGreaterThan(1);
    expect(PASSING_ASTEROID_VISUAL_CONFIG.warningLifetimeMs).toBeGreaterThan(100);
  });
});
