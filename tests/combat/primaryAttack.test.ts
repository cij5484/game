import { beforeEach, afterEach, vi, expect, it } from "vitest";
import {
  deriveWeaponConfig,
  primaryAttack,
} from "../../src/game/combat/primaryAttack";
import { gaussRifleBalance } from "../../src/game/data/weapons";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(1);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const enemy = (id: number, progress01: number, offset01 = 0.5) => ({
  ...createPrototypeEnemy("grunt", "center", id, offset01),
  progress01,
  hp: 100,
});
const pack = () =>
  Array.from({ length: 12 }, (_, i) => enemy(i + 1, 0.9 - i * 0.018));
const noCrit = { shotIndex: 1, random: () => 1 };
const crit = { shotIndex: 1, random: () => 0 };

it("common attack speed preserves three-round bursts and cannot add a kill relay", () => {
  expect(deriveWeaponConfig({ "attack-speed": 5 }).roundsPerBurst).toBe(3);
  expect(
    deriveWeaponConfig({ "attack-speed": 5 }).burstRecoveryMs,
  ).toBeLessThan(gaussRifleBalance.burstRecoveryMs);
  const enemies = pack().map((e) => ({ ...e, hp: 10 }));
  expect(
    primaryAttack(enemies[0]!, enemies, { "attack-speed": 5 }, 10).hitIds,
  ).toHaveLength(1);
});

it("penetration grows distinct hits, retention, and shield bypass without visual scale", () => {
  const enemies = pack();
  const low = primaryAttack(enemies[0]!, enemies, { penetration: 1 }, 10);
  const high = primaryAttack(enemies[0]!, enemies, { penetration: 5 }, 10);
  expect(low.hitIds).toHaveLength(2);
  expect(high.hitIds.length).toBeGreaterThan(low.hitIds.length);
  expect(high.enemies[1]!.hp).toBeLessThan(low.enemies[1]!.hp);
  const shield = { ...enemy(1, 0.9), kind: "shield" as const };
  expect(
    primaryAttack(shield, [shield], { penetration: 3 }, 10).enemies[0]!.hp,
  ).toBeLessThan(95);
  expect(
    primaryAttack(shield, [shield], {}, 10, {
      shieldBypass: 1,
      shieldDamageMultiplier: 1,
    }).enemies[0]!.hp,
  ).toBe(90);
});

it("ricochet level 3 forks while every round damages an enemy at most once", () => {
  const enemies = pack();
  const low = primaryAttack(enemies[0]!, enemies, { ricochet: 1 }, 10);
  const high = primaryAttack(enemies[0]!, enemies, { ricochet: 3 }, 10);
  expect(low.ricochetIds).toHaveLength(1);
  expect(high.ricochetIds.length).toBeGreaterThan(2);
  expect(new Set(high.hitIds).size).toBe(high.hitIds.length);
  expect(high.enemies.every((e) => e.hp >= 90)).toBe(true);
});

it("multishot selects simultaneous distinct roots inside its aim cone", () => {
  const enemies = [
    enemy(1, 0.6),
    enemy(2, 0.6, 0.1),
    enemy(3, 0.6, 0.9),
    enemy(4, 0.4),
  ];
  const result = primaryAttack(enemies[0]!, enemies, { multishot: 2 }, 10);
  expect(result.shotTargetIds.length).toBeGreaterThan(1);
  expect(new Set(result.shotTargetIds).size).toBe(result.shotTargetIds.length);
  expect(
    result.shotTargetIds.every(
      (id) => result.enemies.find((e) => e.id === id)!.hp < 100,
    ),
  ).toBe(true);
});

it("explosive impact and its capped secondary explosions affect nearby enemies", () => {
  const enemies = [
    enemy(1, 0.9),
    { ...enemy(2, 0.8, 0.7), hp: 5 },
    enemy(3, 0.72, 0.7),
    enemy(4, 0.88, 0.7),
  ];
  const low = primaryAttack(enemies[0]!, enemies, { explosive: 1 }, 10);
  const high = primaryAttack(enemies[0]!, enemies, { explosive: 5 }, 10);
  expect(low.splashIds).toContain(4);
  expect(high.splashIds).toContain(3);
  expect(high.enemies[2]!.hp).toBeLessThan(low.enemies[2]!.hp);
});

it("critical RNG produces crit damage, level 3 shock and level 5 echo only on critical hits", () => {
  const enemies = pack();
  const normal = primaryAttack(
    enemies[0]!,
    enemies,
    { critical: 5 },
    10,
    {},
    [],
    noCrit,
  );
  const boosted = primaryAttack(
    enemies[0]!,
    enemies,
    { critical: 5 },
    10,
    {},
    [],
    crit,
  );
  expect(normal.criticalIds).toHaveLength(0);
  expect(boosted.criticalIds).toContain(1);
  expect(boosted.enemies[0]!.hp).toBeLessThan(normal.enemies[0]!.hp);
  expect(boosted.splashIds.length).toBeGreaterThan(0);
  expect(boosted.ricochetIds.length).toBeGreaterThan(0);
});

it("three trait synergies change explosion sites, critical bounces and periodic root shots", () => {
  const enemies = pack();
  const plain = primaryAttack(
    enemies[0]!,
    enemies,
    { ricochet: 1 },
    10,
    {},
    [],
    crit,
  );
  const lethal = primaryAttack(
    enemies[0]!,
    enemies,
    { ricochet: 1, critical: 1 },
    10,
    {},
    [],
    crit,
  );
  expect(lethal.ricochetIds.length).toBe(plain.ricochetIds.length + 2);
  expect(lethal.criticalIds).toEqual(lethal.hitIds);
  const volley = [
    enemy(1, 0.6),
    enemy(2, 0.6, 0.1),
    enemy(3, 0.6, 0.9),
    enemy(4, 0.5, 0.1),
    enemy(5, 0.5, 0.9),
  ];
  const first = primaryAttack(
    volley[0]!,
    volley,
    { "attack-speed": 3, multishot: 1 },
    10,
    {},
    [],
    noCrit,
  );
  const fourth = primaryAttack(
    volley[0]!,
    volley,
    { "attack-speed": 3, multishot: 1 },
    10,
    {},
    [],
    { ...noCrit, shotIndex: 4 },
  );
  expect(fourth.shotTargetIds.length).toBe(first.shotTargetIds.length + 2);
  const line = [enemy(1, 0.95), enemy(2, 0.75), enemy(3, 0.75, 0.7)];
  const deep = primaryAttack(
    line[0]!,
    line,
    { penetration: 1, explosive: 1 },
    10,
  );
  expect(deep.splashIds).toContain(3);
  expect(deep.explosionIds).toEqual([1, 2]);
});

it("legendary bonuses and migrated Hyper Gauss retain their behavior", () => {
  const enemies = pack();
  const standard = primaryAttack(enemies[0]!, enemies, { penetration: 4 }, 10);
  const hyper = primaryAttack(
    enemies[0]!,
    enemies,
    { penetration: 4 },
    10,
    {},
    ["hyper-gauss"],
  );
  expect(hyper.hitIds.length).toBeGreaterThan(standard.hitIds.length);
  const lowHp = enemies.map((e) => ({ ...e, hp: 10 }));
  expect(
    primaryAttack(
      lowHp[0]!,
      lowHp,
      { "attack-speed": 4, "rapid-overdrive": 1 },
      10,
    ).hitIds,
  ).toHaveLength(4);
  expect(
    primaryAttack(
      enemies[0]!,
      enemies,
      { penetration: 4, "siege-lance": 1 },
      10,
    ).enemies[1]!.hp,
  ).toBe(90);
  expect(
    primaryAttack(
      enemies[0]!,
      enemies,
      { ricochet: 4, "ricochet-cascade": 1 },
      10,
    ).ricochetIds.length,
  ).toBeGreaterThan(
    primaryAttack(enemies[0]!, enemies, { ricochet: 4 }, 10).ricochetIds.length,
  );
});

it("common damage and speed work without owning a trait and base crits need no trait", () => {
  const target = enemy(1, 0.9);
  expect(
    primaryAttack(target, [target], { "primary-damage": 1 }, 10, {}, [], noCrit)
      .enemies[0]!.hp,
  ).toBeCloseTo(88.5);
  expect(deriveWeaponConfig({ "attack-speed": 5 }).roundIntervalMs).toBeCloseTo(
    gaussRifleBalance.roundIntervalMs / 1.3,
  );
  expect(deriveWeaponConfig({ "attack-speed": 5 }).burstRecoveryMs).toBeCloseTo(
    gaussRifleBalance.burstRecoveryMs / 1.3,
  );
  const plain = primaryAttack(target, [target], {}, 10, {}, [], crit);
  expect(plain.criticalIds).toEqual([1]);
  expect(plain.enemies[0]!.hp).toBe(82.5);
  expect(
    primaryAttack(target, [target], { "crit-chance": 1 }, 10, {}, [], {
      shotIndex: 1,
      random: () => 0.08,
    }).enemies[0]!.hp,
  ).toBe(82.5);
});

it("split creates one bounded secondary generation and grows its target count", () => {
  const enemies = pack();
  const low = primaryAttack(
    enemies[0]!,
    enemies,
    { split: 1 },
    10,
    {},
    [],
    noCrit,
  );
  const high = primaryAttack(
    enemies[0]!,
    enemies,
    { split: 5 },
    10,
    {},
    [],
    noCrit,
  );
  expect(low.hitIds).toHaveLength(2);
  expect(high.hitIds).toHaveLength(4);
  expect(high.shotTargetIds).toEqual([1]);
  expect(high.enemies[1]!.hp).toBeLessThan(low.enemies[1]!.hp);
});

it("heavy adds primary damage, physical pushback and high-level impact splash", () => {
  const enemies = pack();
  const low = primaryAttack(
    enemies[0]!,
    enemies,
    { heavy: 1 },
    10,
    {},
    [],
    noCrit,
  );
  const high = primaryAttack(
    enemies[0]!,
    enemies,
    { heavy: 3 },
    10,
    {},
    [],
    noCrit,
  );
  expect(low.enemies[0]!.hp).toBeLessThan(90);
  expect(low.enemies[0]!.progress01).toBeLessThan(enemies[0]!.progress01);
  expect(high.splashIds.length).toBeGreaterThan(0);
});

it("execution finishes low-health primary targets but does not execute secondary splash", () => {
  const enemies = [
    { ...enemy(1, 0.9), hp: 8 },
    { ...enemy(2, 0.88), hp: 8 },
  ];
  expect(
    primaryAttack(enemies[0]!, enemies, { execution: 1 }, 1, {}, [], noCrit)
      .enemies[0]!.hp,
  ).toBe(7);
  const high = primaryAttack(
    enemies[0]!,
    enemies,
    { execution: 5 },
    1,
    {},
    [],
    noCrit,
  );
  expect(high.enemies[0]!.hp).toBe(0);
  expect(high.enemies[1]!.hp).toBeGreaterThan(0);
  expect(high.splashIds).toContain(2);
});

it("relic damage and resonance amplify the existing bounded primary effects", () => {
  const enemies = pack();
  const ranks = { ricochet: 1, critical: 1 };
  const standard = primaryAttack(enemies[0]!, enemies, ranks, 10, {}, [], crit);
  const resonant = primaryAttack(
    enemies[0]!,
    enemies,
    ranks,
    10,
    { damageMultiplier: 1.5 },
    [],
    { ...crit, synergyMultiplier: 1.5 },
  );
  expect(resonant.enemies[0]!.hp).toBeCloseTo(100 - 10 * 1.75 * 1.5);
  expect(resonant.ricochetIds).toHaveLength(standard.ricochetIds.length + 1);
  expect(new Set(resonant.hitIds).size).toBe(resonant.hitIds.length);
});

it("execution uses the enemy spawn maximum HP after time and elite scaling", () => {
  const scaled = { ...enemy(1, 0.9), elite: true, hp: 21, maxHp: 162 };
  expect(
    primaryAttack(scaled, [scaled], { execution: 2 }, 1, {}, [], noCrit)
      .enemies[0]!.hp,
  ).toBe(0);
});
