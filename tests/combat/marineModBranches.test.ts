import { expect, it } from "vitest";
import {
  deriveMarineWeaponConfig,
  getMarineStats,
  getIncendiaryStats,
  getMarineTraitEffects,
  marineTraitIds,
  type MarineGrowthState,
  type MarineTraitId,
} from "../../src/game/data/marineGrowth";
import { primaryAttack } from "../../src/game/combat/primaryAttack";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { GaussRifle } from "../../src/game/combat/gaussRifle";

const growth = (
  id: MarineTraitId,
  rank: number,
  branch?: "a" | "b",
): MarineGrowthState => ({
  ranks: { [id]: rank },
  quality: {},
  legendary: new Set(),
  branches: branch ? { [id]: branch } : {},
});
const enemy = (id: number, progress01 = 0.8, offset01 = 0.5) => ({
  ...createPrototypeEnemy("grunt", "center", id, offset01),
  hp: 100000,
  progress01,
});
const shoot = (state: MarineGrowthState, enemies = [enemy(1)]) =>
  primaryAttack(enemies[0]!, enemies, state.ranks, 10, {}, [], {
    growth: state,
    shotIndex: 1,
    random: () => 1,
  });

it("ignores branch flags below five and preserves the unbranched baseline", () => {
  for (const id of marineTraitIds)
    for (const branch of ["a", "b"] as const) {
      expect(getMarineTraitEffects(growth(id, 4, branch))).toEqual(
        getMarineTraitEffects(growth(id, 4)),
      );
      expect(getMarineStats(growth(id, 4, branch))).toEqual(
        getMarineStats(growth(id, 4)),
      );
      expect(deriveMarineWeaponConfig(growth(id, 4, branch))).toEqual(
        deriveMarineWeaponConfig(growth(id, 4)),
      );
    }
});

it("separates penetration count from retained damage and strengthens the completion", () => {
  const a = getMarineTraitEffects(growth("penetration", 10, "a"));
  const b = getMarineTraitEffects(growth("penetration", 10, "b"));
  expect(a.pierceCount).toBeGreaterThan(b.pierceCount);
  expect(b.pierceDamageRetention).toBeGreaterThan(a.pierceDamageRetention);
  expect(a.pierceCount).toBeGreaterThan(
    getMarineTraitEffects(growth("penetration", 9, "a")).pierceCount,
  );
  const line = Array.from({ length: 14 }, (_, i) =>
    enemy(i + 1, 0.9 - i * 0.04),
  );
  expect(
    shoot(growth("penetration", 10, "a"), line).hitIds.length,
  ).toBeGreaterThan(shoot(growth("penetration", 10, "b"), line).hitIds.length);
  expect(
    shoot(growth("penetration", 10, "b"), line).enemies[1]!.hp,
  ).toBeLessThan(shoot(growth("penetration", 10, "a"), line).enemies[1]!.hp);
});

it("separates ricochet reach and count from impact damage", () => {
  const a = getMarineTraitEffects(growth("ricochet", 10, "a"));
  const b = getMarineTraitEffects(growth("ricochet", 10, "b"));
  expect(a.bounceCount).toBeGreaterThan(b.bounceCount);
  expect(a.bounceRadiusBonus).toBeGreaterThan(b.bounceRadiusBonus);
  const targets = [enemy(1), enemy(2, 0.8, 0.9)];
  expect(
    shoot(growth("ricochet", 10, "b"), targets).enemies[1]!.hp,
  ).toBeLessThan(shoot(growth("ricochet", 10, "a"), targets).enemies[1]!.hp);
});

it("applies extra burst rounds versus faster real clock events and preserves legendary finisher", () => {
  const a = deriveMarineWeaponConfig(growth("burst", 10, "a"));
  const b = deriveMarineWeaponConfig(growth("burst", 10, "b"));
  expect(a.burstRounds).toBeGreaterThan(b.burstRounds!);
  expect(b.roundIntervalMs).toBeLessThan(a.roundIntervalMs!);
  const times = (config: typeof a) => {
    const result: number[] = [];
    new GaussRifle(config).advance(config.shotIntervalMs - 1, (time) => {
      result.push(time);
    });
    return result;
  };
  expect(times(a)).toHaveLength(a.burstRounds!);
  expect(times(b)[1]).toBeLessThan(times(a)[1]!);
  const legendary = {
    ...growth("burst", 10, "a"),
    legendary: new Set<MarineTraitId>(["burst"]),
  };
  expect(deriveMarineWeaponConfig(legendary).burstRounds).toBe(
    a.burstRounds! + 1,
  );
});

it("focused multishot stacks real auxiliary hits on a sole target while wide shots stay distinct", () => {
  const a = getMarineTraitEffects(growth("multishot", 10, "a"));
  const b = getMarineTraitEffects(growth("multishot", 10, "b"));
  expect(a.multishotTargets).toBeGreaterThan(b.multishotTargets);
  expect(a.multishotSpreadRadians).toBeGreaterThan(b.multishotSpreadRadians);
  const focused = shoot(growth("multishot", 10, "b"));
  expect(focused.shotTargetIds).toHaveLength(b.multishotTargets + 1);
  expect(focused.hitIds).toEqual([1]);
  expect(100000 - focused.enemies[0]!.hp).toBeCloseTo(
    10 * (1 + b.multishotTargets * b.multishotDamageFactor),
  );
  expect(shoot(growth("multishot", 10, "a")).shotTargetIds).toEqual([1]);
});

it("separates explosion radius from damage without removing legendary chaining", () => {
  const a = getMarineTraitEffects(growth("explosive", 10, "a"));
  const b = getMarineTraitEffects(growth("explosive", 10, "b"));
  expect(a.explosionRadius).toBeGreaterThan(b.explosionRadius);
  expect(b.explosionDamageFactor).toBeGreaterThan(a.explosionDamageFactor);
  expect(a.explosionRadius).toBeLessThanOrEqual(130);
  const state = {
    ...growth("explosive", 10, "b"),
    legendary: new Set<MarineTraitId>(["explosive"]),
  };
  expect(getMarineTraitEffects(state).explosionChainTargets).toBe(2);
});

it("incendiary branches separate spreading from focused stacks without changing direct Gauss stats", () => {
  const base = getIncendiaryStats(growth("incendiary", 1));
  expect(base).toMatchObject({
    tickMs: 500,
    durationMs: 3000,
    maxStacks: 2,
    spreadTargets: 0,
    overheatMultiplier: 1,
  });
  expect(base.tickFactor).toBeCloseTo(0.035);
  expect(getIncendiaryStats(growth("incendiary", 0)).tickFactor).toBe(0);
  for (const branch of ["a", "b"] as const)
    expect(getIncendiaryStats(growth("incendiary", 4, branch))).toEqual(
      getIncendiaryStats(growth("incendiary", 4)),
    );
  expect(getIncendiaryStats(growth("incendiary", 5, "a"))).toMatchObject({
    spreadTargets: 2,
    spreadRadius: 90,
    transferStacks: 1,
    spreadFactor: 0.7,
  });
  expect(getIncendiaryStats(growth("incendiary", 10, "a"))).toMatchObject({
    spreadTargets: 4,
    spreadRadius: 140,
    transferStacks: 2,
    spreadFactor: 0.9,
  });
  expect(getIncendiaryStats(growth("incendiary", 7, "a")).spreadRadius).toBe(
    110,
  );
  expect(getIncendiaryStats(growth("incendiary", 5, "b"))).toMatchObject({
    maxStacks: 4,
    overheatMultiplier: 1,
  });
  expect(getIncendiaryStats(growth("incendiary", 10, "b"))).toMatchObject({
    maxStacks: 6,
    overheatMultiplier: 1.6,
  });
  for (const branch of ["a", "b"] as const) {
    const ten = growth("incendiary", 10, branch);
    expect(getMarineStats(ten)).toEqual(
      getMarineStats(growth("incendiary", 0)),
    );
    expect(deriveMarineWeaponConfig(ten)).toEqual(
      deriveMarineWeaponConfig(growth("incendiary", 0)),
    );
    expect(
      getIncendiaryStats(growth("incendiary", 11, branch)).tickFactor,
    ).toBeGreaterThan(getIncendiaryStats(ten).tickFactor);
    expect(
      getIncendiaryStats({ ...ten, legendary: new Set(["incendiary"]) }),
    ).toEqual(getIncendiaryStats(ten));
  }
});

it("keeps branch work bounded while post-ten quality mastery continues", () => {
  const high: MarineGrowthState = {
    ranks: Object.fromEntries(marineTraitIds.map((id) => [id, 1000])),
    quality: {},
    legendary: new Set(["burst"]),
    branches: Object.fromEntries(
      marineTraitIds.map((id) => [id, "a" as const]),
    ),
  };
  const effects = getMarineTraitEffects(high);
  expect(effects.pierceCount).toBeLessThanOrEqual(12);
  expect(effects.bounceCount).toBeLessThanOrEqual(10);
  expect(effects.multishotTargets).toBeLessThanOrEqual(8);
  expect(effects.explosionRadius).toBeLessThanOrEqual(130);
  expect(deriveMarineWeaponConfig(high).burstRounds).toBeLessThanOrEqual(8);
  for (const id of [
    "penetration",
    "ricochet",
    "multishot",
    "explosive",
  ] as const) {
    const ten = getMarineTraitEffects(growth(id, 10, "a"));
    const eleven = getMarineTraitEffects(growth(id, 11, "a"));
    const stat = {
      penetration: "shieldBypass",
      ricochet: "bounceDamageRetention",
      multishot: "multishotDamageFactor",
      explosive: "explosionDamageFactor",
    } as const;
    expect(eleven[stat[id]]).toBeGreaterThan(ten[stat[id]]);
  }
});

it("explosive A completion improves capped high-quality splash without enlarging its role", () => {
  const before = { ...growth("explosive", 9, "a"), quality: { explosive: 30 } };
  const after = { ...before, ranks: { explosive: 10 } };
  const nine = getMarineTraitEffects(before),
    ten = getMarineTraitEffects(after);
  expect(nine.explosionRadius).toBe(130);
  expect(ten.explosionRadius).toBe(130);
  expect(ten.explosionDamageFactor).toBeCloseTo(
    nine.explosionDamageFactor * 1.1,
  );
});
