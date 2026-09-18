import { expect, it } from "vitest";
import {
  deriveMarineWeaponConfig,
  getMarineStats,
  type MarineGrowthState,
} from "../../src/game/data/marineGrowth";
import { getSpecialWeaponStats } from "../../src/game/data/specialWeaponBalance";
import { primaryAttack } from "../../src/game/combat/primaryAttack";
import { SpecialWeapons } from "../../src/game/combat/specialWeapons";
import { suppressiveBarrage } from "../../src/game/combat/barrage";
import type { MetaModifiers } from "../../src/game/data/meta";
import type { EnemyState } from "../../src/game/enemies/enemySimulation";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { createSiegeBoss } from "../../src/game/enemies/siegeBoss";

const neutral: MetaModifiers = {
  primaryDamageMultiplier: 1,
  primarySpeedMultiplier: 1,
  specialDamageMultiplier: 1,
  specialCycleMultiplier: 1,
  wallHpMultiplier: 1,
  criticalChanceBonus: 0,
  criticalMultiplierBonus: 0,
  eliteBossDamageMultiplier: 1,
  wallDamageMultiplier: 1,
  xpMultiplier: 1,
  rangeMultiplier: 1,
};
const growth = (meta?: Readonly<MetaModifiers>): MarineGrowthState => ({
  ranks: {},
  quality: {},
  legendary: new Set(),
  ...(meta ? { meta } : {}),
});
const enemy = (id: number): EnemyState => ({
  ...createPrototypeEnemy("grunt", "center", id, 0.5),
  hp: 10000,
  maxHp: 10000,
  progress01: 0.8,
});
const shoot = (
  state: MarineGrowthState,
  enemies: readonly EnemyState[],
  random = () => 1,
) =>
  primaryAttack(enemies[0]!, enemies, state.ranks, 10, {}, [], {
    growth: state,
    shotIndex: 1,
    random,
  });

it("neutral meta is identical to the existing no-meta weapon formulas", () => {
  const plain = growth(),
    empty = growth(neutral);
  expect(getMarineStats(empty)).toEqual(getMarineStats(plain));
  expect(deriveMarineWeaponConfig(empty)).toEqual(
    deriveMarineWeaponConfig(plain),
  );
  for (const id of ["grenade", "missile", "drone"] as const)
    expect(getSpecialWeaponStats({ id, level: 1, quality: 0 }, empty)).toEqual(
      getSpecialWeaponStats({ id, level: 1, quality: 0 }, plain),
    );
  expect(shoot(empty, [enemy(1)])).toEqual(shoot(plain, [enemy(1)]));
});

it("meta multiplies Run primary growth and rate, and scales baseline range coverage", () => {
  const state = growth({
    ...neutral,
    primaryDamageMultiplier: 2,
    primarySpeedMultiplier: 2,
    rangeMultiplier: 1.6,
  });
  state.ranks = { "primary-damage": 1, "attack-speed": 1 };
  state.quality = { "primary-damage": 0.5, "attack-speed": 1 };
  expect(getMarineStats(state).primaryDamageMultiplier).toBe(3);
  expect(getMarineStats(state).attackSpeedMultiplier).toBe(4);
  expect(deriveMarineWeaponConfig(state).shotIntervalMs).toBe(200);
  expect(getMarineStats(state).minTargetProgress01).toBeCloseTo(0.28);
  state.ranks.range = 1;
  state.quality.range = 0.01;
  expect(getMarineStats(state).minTargetProgress01).toBeCloseTo(0.27);
  const fast = growth({ ...neutral, primarySpeedMultiplier: 1e6 });
  expect(deriveMarineWeaponConfig(fast).shotIntervalMs).toBe(100);
});

it("meta crit adds probability and multiplier to both basic and special attacks with a safe cap", () => {
  const state = growth({
    ...neutral,
    criticalChanceBonus: 0.4,
    criticalMultiplierBonus: 2.1,
  });
  expect(getMarineStats(state).criticalChance).toBeCloseTo(0.45);
  expect(getMarineStats(state).criticalMultiplier).toBeCloseTo(3.85);
  expect(
    10000 - shoot(state, [enemy(1)], () => 0.4).enemies[0]!.hp,
  ).toBeCloseTo(38.5);
  const drone = new SpecialWeapons();
  const result = drone.advance(0, {
    weapons: [{ id: "drone", level: 1, quality: 0 }],
    growth: state,
    enemies: [enemy(1)],
    focusId: null,
    random: () => 0.4,
  });
  expect(10000 - result.enemies[0]!.hp).toBeCloseTo(92.4);
  const capped = growth({ ...neutral, criticalChanceBonus: 10 });
  expect(getMarineStats(capped).criticalChance).toBe(1);
  expect(
    getSpecialWeaponStats({ id: "missile", level: 1, quality: 0 }, capped)
      .criticalChance,
  ).toBe(1);
});

it("special meta damage and cycle combine with Run growth while retaining cycle floors", () => {
  const state = growth({
    ...neutral,
    specialDamageMultiplier: 2,
    specialCycleMultiplier: 0.4,
  });
  state.ranks = { "primary-damage": 1, "attack-speed": 1 };
  state.quality = { "primary-damage": 0.5, "attack-speed": 1 };
  const stats = getSpecialWeaponStats(
    { id: "missile", level: 1, quality: 0 },
    state,
  );
  expect(stats.damage).toBe(270);
  expect(stats.cycleMs).toBeCloseTo((4500 / 1.7) * 0.4);
  const fast = growth({ ...neutral, specialCycleMultiplier: 0.000001 });
  expect(
    getSpecialWeaponStats({ id: "missile", level: 1, quality: 0 }, fast)
      .cycleMs,
  ).toBe(180);
});

it("Elite and Boss bonuses apply exactly once across primary direct, ricochet and splash damage", () => {
  const enemies = [
    enemy(1),
    { ...enemy(2), elite: true, offset01: 0.6, shieldHp: 10000 },
    { ...createSiegeBoss(3), hp: 10000, progress01: 0.8, offset01: 0.7 },
  ];
  const plain = growth();
  plain.ranks = { ricochet: 1, explosive: 1 };
  plain.quality = { ricochet: 1, explosive: 1 };
  const boosted = {
    ...plain,
    meta: { ...neutral, eliteBossDamageMultiplier: 3 },
  };
  const normal = shoot(plain, enemies),
    meta = shoot(boosted, enemies);
  expect(meta.enemies[0]!.hp).toBe(normal.enemies[0]!.hp);
  for (const index of [1, 2]) {
    const remaining = (e: EnemyState) => e.hp + (e.shieldHp ?? 0);
    const baseDamage =
      remaining(enemies[index]!) - remaining(normal.enemies[index]!);
    expect(baseDamage).toBeGreaterThan(0);
    expect(
      remaining(enemies[index]!) - remaining(meta.enemies[index]!),
    ).toBeCloseTo(baseDamage * 3);
  }
});

it("Elite and Boss bonuses apply once to grenade areas, missiles, drones and Ultimate", () => {
  const enemies = [
    { ...enemy(1), elite: true },
    { ...createSiegeBoss(2), hp: 10000, progress01: 0.8 },
  ];
  for (const id of ["grenade", "missile", "drone"] as const) {
    const run = (meta?: MetaModifiers) =>
      new SpecialWeapons().advance(900, {
        weapons: [{ id, level: 1, quality: 0 }],
        growth: growth(meta),
        enemies,
        focusId: null,
        random: () => 1,
      });
    const normal = run(),
      boosted = run({ ...neutral, eliteBossDamageMultiplier: 2 });
    const normalDamage = enemies.reduce(
      (sum, e, i) => sum + e.hp - normal.enemies[i]!.hp,
      0,
    );
    const boostedDamage = enemies.reduce(
      (sum, e, i) => sum + e.hp - boosted.enemies[i]!.hp,
      0,
    );
    expect(normalDamage).toBeGreaterThan(0);
    expect(boostedDamage).toBeCloseTo(normalDamage * 2);
  }
  const pack = [enemy(0), ...enemies];
  const result = suppressiveBarrage(pack, {
    ...neutral,
    eliteBossDamageMultiplier: 2,
    primaryDamageMultiplier: 4,
    specialDamageMultiplier: 4,
  });
  expect(result.enemies.map((e, i) => pack[i]!.hp - e.hp)).toEqual([
    140, 280, 280,
  ]);
});

it("missile reservations include the Elite multiplier before allocating delayed rounds", () => {
  const runtime = new SpecialWeapons();
  const enemies = [{ ...enemy(1), hp: 150, elite: true }, enemy(2)];
  const result = runtime.advance(270, {
    weapons: [{ id: "missile", level: 1, quality: 0 }],
    growth: growth({ ...neutral, eliteBossDamageMultiplier: 2 }),
    enemies,
    focusId: 1,
    random: () => 1,
  });
  expect(result.enemies).toBe(enemies);
  const missiles = (runtime as unknown as { missiles: { targetId: number }[] })
    .missiles;
  expect(missiles.map((m) => m.targetId)).toEqual([1, 2]);
});
