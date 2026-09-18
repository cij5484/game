import { expect, it } from "vitest";
import { primaryAttack } from "../../src/game/combat/primaryAttack";
import {
  getMarineStats,
  deriveMarineWeaponConfig,
  type MarineGrowthState,
  type MarineRanks,
} from "../../src/game/data/marineGrowth";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
const state = (ranks: MarineRanks): MarineGrowthState => ({
  ranks,
  quality: { ...ranks },
  legendary: new Set(),
});
const enemy = (id: number, progress01 = 0.8, offset01 = 0.5) => ({
  ...createPrototypeEnemy("grunt", "center", id, offset01),
  hp: 1000,
  maxHp: 1000,
  progress01,
});
const shoot = (
  growth: MarineGrowthState,
  enemies = [enemy(1), enemy(2, 0.7), enemy(3, 0.7, 0.8)],
) =>
  primaryAttack(enemies[0]!, enemies, growth.ranks, 10, {}, [], {
    shotIndex: 1,
    random: () => 1,
    growth,
    minTargetProgress01: getMarineStats(growth).minTargetProgress01,
  });
it("combines penetration with impact explosions without requiring a named synergy", () => {
  const result = shoot(state({ penetration: 2, explosive: 2 }));
  expect(result.hitIds).toContain(2);
  expect(result.explosionIds).toContain(2);
  expect(result.enemies[2]!.hp).toBeLessThan(1000);
});
it("ricochet seeks sideways living targets once, multishot uses distinct roots", () => {
  const enemies = [enemy(1), enemy(2, 0.79, 0.9), enemy(3, 0.78, 0.1)];
  const bounce = shoot(state({ ricochet: 2 }), enemies);
  expect(bounce.ricochetIds.length).toBeGreaterThan(0);
  expect(new Set(bounce.hitIds).size).toBe(bounce.hitIds.length);
  const multi = shoot(state({ multishot: 2 }), enemies);
  expect(multi.shotTargetIds.length).toBeGreaterThan(1);
  expect(new Set(multi.shotTargetIds).size).toBe(multi.shotTargetIds.length);
});
it("heavy increases damage and cycle yet composes with attack speed and timed burst", () => {
  const heavy = state({ heavy: 1, burst: 2 });
  expect(shoot(heavy).enemies[0]!.hp).toBeLessThan(
    shoot(state({})).enemies[0]!.hp,
  );
  const c = deriveMarineWeaponConfig(heavy);
  expect(c.burstRounds).toBeGreaterThan(1);
  expect(c.shotIntervalMs).toBeGreaterThan(800);
  expect(
    deriveMarineWeaponConfig(state({ heavy: 1, burst: 2, "attack-speed": 2 }))
      .shotIntervalMs,
  ).toBeLessThan(c.shotIntervalMs);
});
it("range changes valid roots and high quality actually changes damage without changing rank", () => {
  const enemies = [enemy(1, 0.5)];
  expect(shoot(state({}), enemies).hitIds).toEqual([]);
  const range = state({ range: 2 });
  range.quality.range = 0.09;
  expect(shoot(range, enemies).hitIds).toEqual([1]);
  const common = state({ "primary-damage": 1 });
  common.quality["primary-damage"] = 0.18;
  const rare = state({ "primary-damage": 1 });
  rare.quality["primary-damage"] = 0.3;
  expect(shoot(rare).enemies[0]!.hp).toBeLessThan(shoot(common).enemies[0]!.hp);
});

it("Legendary penetration makes an endpoint shockwave distinct from equal-quality normal penetration", () => {
  const ordinary = state({ penetration: 1 });
  ordinary.quality.penetration = 3.2;
  const legendary = {
    ...ordinary,
    legendary: new Set(["penetration"] as const),
  };
  expect(shoot(ordinary).enemies[2]!.hp).toBe(1000);
  expect(shoot(legendary).enemies[2]!.hp).toBeLessThan(1000);
});
it("Legendary explosion adds a bounded kill-triggered second impact ring", () => {
  const ordinary = state({ explosive: 1 });
  ordinary.quality.explosive = 3.2;
  const enemies = [
    enemy(1, 0.8, 0.5),
    { ...enemy(2, 0.8, 0.8), hp: 1 },
    enemy(3, 0.8, 1),
  ];
  const normal = shoot(ordinary, enemies);
  const legendary = shoot(
    { ...ordinary, legendary: new Set(["explosive"]) },
    enemies,
  );
  expect(normal.enemies[2]!.hp).toBe(1000);
  expect(legendary.enemies[2]!.hp).toBeLessThan(1000);
  expect(legendary.explosionIds).toContain(2);
});
