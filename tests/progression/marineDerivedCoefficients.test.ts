import { afterEach, expect, it } from "vitest";
import {
  deriveMarineWeaponConfig,
  getBurstRoundDamageFactor,
  marineModBalance,
  incendiaryBalance,
  getIncendiaryStats,
  type MarineGrowthState,
} from "../../src/game/data/marineGrowth";
const initialBurn = { ...incendiaryBalance };
afterEach(() => Object.assign(incendiaryBalance, initialBurn));
const initial = { ...marineModBalance };
afterEach(() => Object.assign(marineModBalance, initial));
const state = (quality: number): MarineGrowthState => ({
  ranks: { burst: quality, incendiary: quality },
  quality: { burst: quality, incendiary: quality },
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
it("uses live burn tuning without changing the Gauss attack cycle", () => {
  const build = state(1);
  const before = deriveMarineWeaponConfig(build);
  expect(getIncendiaryStats(build).tickFactor).toBeCloseTo(0.035);
  incendiaryBalance.baseTickFactor = 0.05;
  incendiaryBalance.tickFactorPerQuality = 0.02;
  incendiaryBalance.durationMs = 4500;
  incendiaryBalance.baseMaxStacks = 3;
  expect(getIncendiaryStats(build)).toMatchObject({
    tickFactor: 0.07,
    durationMs: 4500,
    maxStacks: 3,
  });
  expect(deriveMarineWeaponConfig(build)).toEqual(before);
});
