import { expect, it } from "vitest";
import { siegeBossBalance as tune } from "../../src/game/data/boss";
import {
  advanceSiegeBoss,
  createSiegeBoss,
} from "../../src/game/enemies/siegeBoss";
import {
  applyEffectDamage,
  applyPrimaryDamage,
  shieldProtection,
} from "../../src/game/combat/damage";
import { applyImpact } from "../../src/game/combat/actionRelics";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";

const chargingBoss = () =>
  advanceSiegeBoss(
    { ...createSiegeBoss(1), progress01: tune.siegeProgress01 },
    1,
  ).enemy;

it("approaches into Gauss range, telegraphs and repeatedly damages the wall on failed interrupts", () => {
  const initial = createSiegeBoss(1);
  expect(advanceSiegeBoss(initial, 0).enemy).toBe(initial);
  const approach = advanceSiegeBoss(initial, 1000);
  expect(approach.enemy.progress01).toBeGreaterThan(0);
  expect(approach.enemy.offset01).not.toBe(initial.offset01);
  expect(approach.enemy.lane).toBe("center");
  expect(approach.enemy.boss?.phase).toBe("approach");
  const charging = chargingBoss();
  expect(charging.progress01).toBeGreaterThan(0.55);
  expect(charging.boss?.phase).toBe("siege-charge");
  const full = advanceSiegeBoss(charging, tune.chargeMs * 2 + 500);
  const first = advanceSiegeBoss(charging, tune.chargeMs - 1);
  const second = advanceSiegeBoss(first.enemy, tune.chargeMs + 501);
  expect(full.wallDamage).toBe(tune.siegeWallDamage * 2);
  expect(second.wallDamage + first.wallDamage).toBe(full.wallDamage);
  expect(second.enemy).toEqual(full.enemy);
});

it("body damage from primary and effect hits interrupts the charge then opens a temporary vulnerable window", () => {
  const charging = chargingBoss();
  const primary = applyPrimaryDamage(charging, tune.interruptDamage / 2);
  expect(primary.hp).toBe(charging.hp - tune.interruptDamage / 2);
  expect(primary.boss?.phase).toBe("siege-charge");
  const interrupted = applyEffectDamage(primary, tune.interruptDamage / 2);
  expect(interrupted.boss?.phase).toBe("stagger");
  expect(applyPrimaryDamage(interrupted, 100).hp).toBe(
    interrupted.hp - 100 * tune.vulnerableMultiplier,
  );
  const recovery = advanceSiegeBoss(interrupted, tune.staggerMs);
  expect(recovery.wallDamage).toBe(0);
  expect(recovery.enemy.boss?.phase).toBe("approach");
  expect(applyEffectDamage(recovery.enemy, 100).hp).toBe(
    recovery.enemy.hp - 100,
  );
  const dead = applyPrimaryDamage(charging, charging.hp);
  expect(dead.hp).toBe(0);
  expect(advanceSiegeBoss(dead, tune.chargeMs * 2).wallDamage).toBe(0);
});

it("calls reinforcement once and changes low HP into a faster rush with repeated wall hits", () => {
  const boss = createSiegeBoss(1);
  const hurt = { ...boss, hp: boss.hp * tune.reinforcementHpRatio };
  const call = advanceSiegeBoss(hurt, 1);
  expect(call.reinforcement).toBe(true);
  expect(advanceSiegeBoss(call.enemy, 1000).reinforcement).toBe(false);
  const low = {
    ...call.enemy,
    hp: boss.hp * tune.finalHpRatio,
    progress01: 0.9,
  };
  const rush = advanceSiegeBoss(low, 1000);
  expect(rush.enemy.boss?.phase).toBe("final-charge");
  expect(rush.enemy.progress01).toBeGreaterThan(
    low.progress01 + tune.approachSpeed,
  );
  const atWall = { ...rush.enemy, progress01: 1 };
  const full = advanceSiegeBoss(atWall, tune.finalWallIntervalMs * 2 + 100);
  const half = advanceSiegeBoss(atWall, tune.finalWallIntervalMs + 50);
  const split = advanceSiegeBoss(half.enemy, tune.finalWallIntervalMs + 50);
  expect(full.wallDamage).toBe(tune.finalWallDamage * 2);
  expect(half.wallDamage + split.wallDamage).toBe(full.wallDamage);
  expect(split.enemy).toEqual(full.enemy);
});

it("ignores shield protection and weak knockback without blocking body damage", () => {
  const boss = { ...createSiegeBoss(1), progress01: 0.6 };
  const guard = {
    ...createPrototypeEnemy("shield", "center", 2, 0.5, true),
    progress01: 0.61,
  };
  const protectedBoss = shieldProtection([boss, guard])[0]!;
  expect(protectedBoss.protectedBy).toBeUndefined();
  const hit = applyPrimaryDamage(protectedBoss, 100);
  expect(hit.hp).toBe(boss.hp - 100);
  expect(
    applyImpact([boss], [hit], new Set(["impact"]), () => 0)[0]!.progress01,
  ).toBe(boss.progress01);
});

it("observes actual boss mechanics without changing combat results", () => {
  const events: string[] = [];
  const watch = (kind: string) => events.push(kind);
  const initial = { ...createSiegeBoss(10), progress01: tune.siegeProgress01 };
  const observed = advanceSiegeBoss(initial, tune.chargeMs * 2 + 1, watch);
  expect(observed).toEqual(advanceSiegeBoss(initial, tune.chargeMs * 2 + 1));
  expect(events).toEqual([
    "siege-charge",
    "wall-hit",
    "siege-charge",
    "wall-hit",
    "siege-charge",
  ]);
  events.length = 0;
  const low = { ...createSiegeBoss(11), hp: tune.hp * 0.25, progress01: 1 };
  const rush = advanceSiegeBoss(low, tune.finalWallIntervalMs * 2, watch);
  expect(rush).toEqual(advanceSiegeBoss(low, tune.finalWallIntervalMs * 2));
  expect(events).toEqual([
    "reinforcement",
    "final-charge",
    "wall-hit",
    "wall-hit",
  ]);
  events.length = 0;
  advanceSiegeBoss({ ...low, hp: 0 }, 10000, watch);
  expect(events).toEqual([]);
});
