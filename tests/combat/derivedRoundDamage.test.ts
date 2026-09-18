import { expect, it } from "vitest";
import { primaryAttack } from "../../src/game/combat/primaryAttack";
import type { MarineGrowthState } from "../../src/game/data/marineGrowth";
import { primaryAttackBalance } from "../../src/game/data/primaryAttack";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";

const enemy = (id: number, progress01 = 0.8, offset01 = 0.5) => ({
  ...createPrototypeEnemy("grunt", "center", id, offset01),
  hp: 100000,
  progress01,
});
const growth: MarineGrowthState = {
  ranks: { burst: 1, multishot: 1, explosive: 1, penetration: 1, ricochet: 1 },
  quality: {},
  legendary: new Set(["explosive"]),
};
const attack = (roundIndex?: number, state = growth) => {
  const enemies = Array.from({ length: 30 }, (_, i) =>
    enemy(i + 1, 0.9 - Math.floor(i / 5) * 0.04, 0.1 + (i % 5) * 0.2),
  );
  return {
    enemies,
    result: primaryAttack(enemies[0]!, enemies, state.ranks, 10, {}, [], {
      growth: state,
      shotIndex: 99,
        ...(roundIndex === undefined ? {} : { roundIndex }),
      random: () => 0,
    }),
  };
};

it("scales every actual derived hit once before crit while omitted roundIndex stays first-shot compatible", () => {
  const first = attack(0),
    additional = attack(1),
    omitted = attack();
  expect(omitted.result).toEqual(first.result);
  expect(additional.result.hitIds).toEqual(first.result.hitIds);
  expect(additional.result.splashIds).toEqual(first.result.splashIds);
  first.enemies.forEach((enemy, i) => {
    const damage = enemy.hp - first.result.enemies[i]!.hp;
    expect(enemy.hp - additional.result.enemies[i]!.hp).toBeCloseTo(
      damage * 0.65,
    );
  });
  expect(
    first.result.hitIds.length + first.result.splashIds.length,
  ).toBeGreaterThan(1);
  expect(first.result.explosionIds.length).toBeLessThanOrEqual(
    primaryAttackBalance.roundSplashBudget,
  );
  expect(
    first.result.hitIds.length + first.result.splashIds.length,
  ).toBeLessThanOrEqual(primaryAttackBalance.roundTargetBudget);
});

it("high-level focused burst/multishot/explosive remains bounded without recursive generated rounds", () => {
  const combined: MarineGrowthState = {
    ranks: { burst: 100, multishot: 100, explosive: 100 },
    quality: {},
    branches: { burst: "a", multishot: "b", explosive: "b" },
    legendary: new Set(["burst", "explosive"]),
  };
  const result = attack(4, combined).result;
  expect(result.shotTargetIds).toHaveLength(6);
  expect(result.explosionIds.length).toBeLessThanOrEqual(
    primaryAttackBalance.roundSplashBudget,
  );
  expect(result.enemies).toHaveLength(30);
  expect(result.enemies.every((enemy) => Number.isFinite(enemy.hp))).toBe(true);
});
