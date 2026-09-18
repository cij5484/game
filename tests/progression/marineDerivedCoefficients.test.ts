import { afterEach, expect, it } from "vitest";
import {
  deriveMarineWeaponConfig,
  getBurstRoundDamageFactor,
  marineModBalance,
  type MarineGrowthState,
} from "../../src/game/data/marineGrowth";
const initial = { ...marineModBalance };
afterEach(() => Object.assign(marineModBalance, initial));
const state = (quality: number): MarineGrowthState => ({
  ranks: { burst: quality, heavy: quality },
  quality: { burst: quality, heavy: quality },
  legendary: new Set(),
});
it("keeps first rounds at full damage and grows additional rounds from .65 to the configured cap", () => {
  expect(getBurstRoundDamageFactor(state(1), 0)).toBe(1);
  expect(getBurstRoundDamageFactor(state(1), 1)).toBe(0.65);
  expect(getBurstRoundDamageFactor(state(5), 2)).toBe(0.75);
  expect(getBurstRoundDamageFactor(state(100), 2)).toBe(1);
  marineModBalance.burstAdditionalRoundDamageFactor = 0.4;
  marineModBalance.burstAdditionalRoundDamagePerQuality = 0.1;
  marineModBalance.burstAdditionalRoundDamageMax = 0.7;
  expect(getBurstRoundDamageFactor(state(2), 1)).toBe(0.5);
  expect(getBurstRoundDamageFactor(state(20), 1)).toBe(0.7);
  expect(getBurstRoundDamageFactor(state(20), 0)).toBe(1);
});
it("uses runtime heavy cycle penalty coefficients", () => {
  const build = state(1);
  build.ranks.burst = 0;
  const before = deriveMarineWeaponConfig(build).shotIntervalMs;
  marineModBalance.heavyPenaltyBase = 2;
  marineModBalance.heavyPenaltyExtra = 0;
  expect(deriveMarineWeaponConfig(build).shotIntervalMs).toBeGreaterThan(
    before,
  );
  marineModBalance.heavyPenaltyExtra = 1;
  marineModBalance.heavyPenaltyQualityDecay = 0;
  const noDecay = deriveMarineWeaponConfig(build).shotIntervalMs;
  marineModBalance.heavyPenaltyQualityDecay = 1;
  expect(deriveMarineWeaponConfig(build).shotIntervalMs).toBeLessThan(noDecay);
});
