import { expect, it } from "vitest";
import { primaryAttack } from "../../src/game/combat/primaryAttack";
import {
  propagateTraitDeaths,
  tickTraitStatuses,
  WeaponHeat,
} from "../../src/game/combat/traitCombat";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import type { EnemyState } from "../../src/game/enemies/enemySimulation";
import { advanceEnemy } from "../../src/game/enemies/enemySimulation";
import { enemyConfigs } from "../../src/game/data/enemies";

const enemy = (id: number): EnemyState => ({
  ...createPrototypeEnemy("grunt", "center", id, 0.5),
  progress01: 0.8,
  hp: 100,
  maxHp: 100,
});

it("burn deals only elapsed active duration and expires even across a long frame", () => {
  const target = enemy(1);
  const shot = primaryAttack(target, [target], { incendiary: 1 }, 10, {}, [], {
    shotIndex: 1,
    random: () => 1,
  });
  const half = tickTraitStatuses(shot.enemies, 500);
  expect(half.enemies[0]!.hp).toBeLessThan(90);
  const expired = tickTraitStatuses(half.enemies, 10000);
  const after = tickTraitStatuses(expired.enemies, 10000);
  expect(after.enemies[0]!.hp).toBe(expired.enemies[0]!.hp);
  expect(after.enemies[0]!.burn).toBeUndefined();
});

it("burn death spreads within target and depth caps for every death source", () => {
  const enemies = Array.from({ length: 300 }, (_, i) => enemy(i + 1));
  const shot = primaryAttack(enemies[0]!, enemies, { incendiary: 5 }, 1);
  const dead = { ...shot.enemies[0]!, hp: 0 };
  const spread = propagateTraitDeaths(shot.enemies.slice(1), [dead], {
    incendiary: 5,
  });
  expect(spread.burnIds.length).toBeGreaterThan(0);
  expect(spread.burnIds.length).toBeLessThanOrEqual(4);
  const terminal = {
    ...dead,
    burn: { ...dead.burn!, depth: dead.burn!.maxDepth },
  };
  expect(
    propagateTraitDeaths(enemies.slice(1), [terminal], { incendiary: 5 })
      .burnIds,
  ).toEqual([]);
});

it("mark transfer prefers the nearby enemy closest to the wall", () => {
  const dead = { ...enemy(1), hp: 0, markStacks: 4 };
  const result = propagateTraitDeaths(
    [enemy(2), { ...enemy(3), progress01: 0.86 }],
    [dead],
    { marking: 4 },
  );
  expect(result.markIds).toEqual([3]);
  expect(result.enemies[1]!.markStacks).toBeGreaterThan(0);
});

it("suppression is local, expires and never slows enemies to zero", () => {
  const held = {
    ...enemy(1),
    suppressionMs: 700,
    suppressionSlow: 0.45,
    suppressionImmunityMs: 2400,
  };
  const normal = advanceEnemy(enemy(2), 100, enemyConfigs.grunt).enemy;
  const suppressed = advanceEnemy(held, 100, enemyConfigs.grunt).enemy;
  expect(suppressed.progress01).toBeGreaterThan(held.progress01);
  expect(suppressed.progress01).toBeLessThan(normal.progress01);
  const expired = tickTraitStatuses([held], 2500).enemies[0]!;
  expect(expired.suppressionMs).toBe(0);
  expect(expired.suppressionImmunityMs).toBe(0);
});

it("heat rewards sustained fire, locks on overheat and recovers without shooting", () => {
  const heat = new WeaponHeat();
  for (let i = 0; i < 5; i++) {
    heat.fire({ overheat: 5 });
    heat.tick(80, { overheat: 5 });
  }
  expect(heat.damageMultiplier({ overheat: 5 })).toBeGreaterThan(1);
  for (let i = 0; i < 30 && !heat.locked; i++) heat.fire({ overheat: 5 });
  expect(heat.locked).toBe(true);
  expect(heat.fire({ overheat: 5 })).toBe(false);
  heat.tick(4000, { overheat: 5 });
  expect(heat.locked).toBe(false);
  expect(heat.ratio).toBe(0);
  expect(heat.fire({ overheat: 5 })).toBe(true);
});

it("rest and Frost cooling reward heat management; unowned heat does nothing", () => {
  const heat = new WeaponHeat();
  heat.fire({});
  expect(heat.heat).toBe(0);
  for (let i = 0; i < 4; i++) heat.fire({ overheat: 1 });
  const hot = heat.heat;
  heat.tick(1500, { overheat: 1 });
  expect(heat.heat).toBeLessThan(hot);
  heat.cool(100);
  expect(heat.ratio).toBe(0);
});
