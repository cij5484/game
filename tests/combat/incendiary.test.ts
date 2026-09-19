import { expect, it } from "vitest";
import { Incendiary } from "../../src/game/combat/incendiary";
import { getIncendiaryStats } from "../../src/game/data/marineGrowth";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import type { EnemyState } from "../../src/game/enemies/enemySimulation";

const enemy = (id: number, progress01 = 0.8) => ({
  ...createPrototypeEnemy("grunt", "center", id, 0.5),
  progress01,
  hp: 100,
  maxHp: 100,
});
const stats = {
  tickMs: 500,
  durationMs: 3000,
  maxStacks: 2,
  tickFactor: 0.035,
  spreadTargets: 0,
  spreadRadius: 0,
  transferStacks: 1,
  spreadFactor: 0.7,
  overheatMultiplier: 1,
};
const spreading = { ...stats, spreadTargets: 2, spreadRadius: 90 };

it("Lv1 gives six delayed ticks and removes expired, absent and dead states", () => {
  const burn = new Incendiary(),
    enemies = [enemy(1), enemy(2)];
  burn.ignite(1, 3.5, stats);
  expect(burn.advance(0, enemies).enemies).toBe(enemies);
  const early = burn.advance(499, enemies);
  expect(early.enemies).toBe(enemies);
  const first = burn.advance(1, early.enemies);
  expect(first.enemies[0]!.hp).toBe(96.5);
  expect(first.enemies[1]).toBe(enemies[1]);
  expect(burn.advance(2500, first.enemies).enemies[0]!.hp).toBe(79);
  expect(burn.size).toBe(0);
  burn.ignite(1, 1, stats);
  burn.ignite(2, 1, stats);
  burn.advance(0, [{ ...enemies[0]!, hp: 0 }]);
  expect(burn.size).toBe(0);
});

it("refresh caps stacks, retains strongest damage, and cannot postpone a pending tick", () => {
  const burn = new Incendiary();
  burn.ignite(1, 4, stats);
  burn.advance(400, [enemy(1)]);
  burn.ignite(1, 2, stats);
  burn.ignite(1, 1, stats);
  const result = burn.advance(100, [enemy(1)]);
  expect(result.enemies[0]!.hp).toBe(92);
  expect(burn.advance(2900, result.enemies).enemies[0]!.hp).toBe(52);
  expect(burn.size).toBe(0);
});

it("uses simulation time once, including X8 and paused steps", () => {
  const fast = new Incendiary(),
    slow = new Incendiary();
  fast.ignite(1, 2, stats);
  slow.ignite(1, 2, stats);
  const enemies = [enemy(1)];
  let stepped: readonly EnemyState[] = enemies;
  for (let i = 0; i < 8; i++) stepped = slow.advance(125, stepped).enemies;
  expect(fast.advance(125 * 8, enemies).enemies).toEqual(stepped);
  expect(fast.advance(0, stepped).enemies).toBe(stepped);
});

it("ticks use primary shield and protection damage with no extra hit mechanics", () => {
  const burn = new Incendiary();
  burn.ignite(1, 10, stats);
  const result = burn.advance(1000, [
    { ...enemy(1), shieldHp: 7, incomingDamageMultiplier: 0.5 },
    enemy(2),
  ]);
  expect(result.enemies[0]!.shieldHp).toBe(0);
  expect(result.enemies[0]!.hp).toBe(97);
  expect(result.enemies[1]!.hp).toBe(100);
  expect(result.hitIds).toEqual([1]);
  expect(result.killIds).toEqual([]);
});

it("A death spread selects nearest targets deterministically and transfers one weaker stack", () => {
  const burn = new Incendiary(),
    source = enemy(1);
  burn.ignite(1, 10, spreading);
  const survivors = [
    enemy(4, 0.84),
    enemy(3, 0.82),
    enemy(2, 0.82),
    enemy(5, 0.99),
  ];
  burn.processDeaths([{ ...source, hp: 0 }], survivors);
  expect(burn.size).toBe(2);
  expect(burn.has(1)).toBe(false);
  const result = burn.advance(500, survivors);
  expect(result.hitIds.sort()).toEqual([2, 3]);
  expect(result.enemies.find((e) => e.id === 2)!.hp).toBe(93);
});

it("A completion spreads two stacks, and burn deaths chain only in later death waves", () => {
  const burn = new Incendiary();
  const a10 = {
    ...spreading,
    spreadTargets: 4,
    spreadRadius: 140,
    transferStacks: 2,
    spreadFactor: 0.9,
  };
  burn.ignite(1, 10, a10);
  burn.processDeaths([{ ...enemy(1), hp: 0 }], [{ ...enemy(2), hp: 1 }]);
  expect(burn.size).toBe(1);
  const result = burn.advance(500, [{ ...enemy(2), hp: 1 }, enemy(3)]);
  expect(result.killIds).toEqual([2]);
  expect(result.enemies[1]!.hp).toBe(100);
  burn.processDeaths([result.enemies[0]!], [result.enemies[1]!]);
  expect(burn.has(2)).toBe(false);
  expect(burn.advance(500, [result.enemies[1]!]).enemies[0]!.hp).toBeCloseTo(
    83.8,
  );
});

it("a lethal last tick still spreads and dead waves are consumed only once", () => {
  const burn = new Incendiary();
  burn.ignite(1, 1, spreading);
  const result = burn.advance(3000, [{ ...enemy(1), hp: 6 }, enemy(2)]);
  expect(result.killIds).toEqual([1]);
  burn.processDeaths([result.enemies[0]!], [result.enemies[1]!]);
  burn.processDeaths([result.enemies[0]!], [result.enemies[1]!]);
  expect(burn.advance(500, [result.enemies[1]!]).enemies[0]!.hp).toBeCloseTo(
    99.3,
  );
});

it("B completion caps at six stacks and overheats only at the cap", () => {
  const burn = new Incendiary(),
    b10 = { ...stats, maxStacks: 6, overheatMultiplier: 1.6 };
  for (let i = 0; i < 5; i++) burn.ignite(1, 1, b10);
  const first = burn.advance(500, [enemy(1)]);
  expect(first.enemies[0]!.hp).toBe(95);
  burn.ignite(1, 1, b10);
  burn.ignite(1, 1, b10);
  expect(burn.advance(500, first.enemies).enemies[0]!.hp).toBeCloseTo(85.4);
});

it("runtime growth provides the default Lv1 burn values", () => {
  const tuning = getIncendiaryStats({
    ranks: { incendiary: 1 },
    quality: { incendiary: 1 },
    legendary: new Set(),
  });
  expect(tuning.tickFactor).toBeCloseTo(0.035);
  expect(tuning).toMatchObject({ tickMs: 500, durationMs: 3000, maxStacks: 2 });
});

it("an older action snapshot cannot weaken an existing completed burn", () => {
  const burn = new Incendiary();
  const strong = {
    ...spreading,
    maxStacks: 6,
    overheatMultiplier: 1.6,
    spreadTargets: 4,
    spreadRadius: 140,
    transferStacks: 2,
    spreadFactor: 0.9,
  };
  for (let i = 0; i < 6; i++) burn.ignite(1, 2, strong);
  burn.ignite(1, 1, { ...stats, tickMs: 1000, durationMs: 1000, maxStacks: 5 });
  const first = burn.advance(500, [enemy(1)]);
  expect(first.enemies[0]!.hp).toBeCloseTo(80.8);
  const later = burn.advance(2000, first.enemies);
  expect(later.enemies[0]!.hp).toBeCloseTo(4);
  expect(burn.has(1)).toBe(true);
  const survivors = [
    enemy(2, 0.9),
    enemy(3, 0.9),
    enemy(4, 0.9),
    enemy(5, 0.9),
  ];
  burn.processDeaths([{ ...later.enemies[0]!, hp: 0 }], survivors);
  const spread = burn.advance(500, survivors);
  expect(spread.hitIds).toEqual([2, 3, 4, 5]);
  expect(spread.enemies[0]!.hp).toBeCloseTo(96.4);
});
