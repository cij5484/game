import { expect, it } from "vitest";
import { SpecialWeapons } from "../../src/game/combat/specialWeapons";
import { getSpecialWeaponStats } from "../../src/game/data/specialWeaponBalance";
import type { SpecialWeaponState } from "../../src/game/data/specialWeapons";
import type { MarineGrowthState } from "../../src/game/data/marineGrowth";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { combatPosition } from "../../src/game/battlefield/combatGeometry";
const growth: MarineGrowthState = {
  ranks: {},
  quality: {},
  legendary: new Set(),
};
const enemy = (id: number, progress01 = 0.2, offset01 = 0.5) => ({
  ...createPrototypeEnemy("grunt", "center", id, offset01),
  hp: 1000,
  progress01,
});
const weapon = (
  id: SpecialWeaponState["id"],
  extra: Partial<SpecialWeaponState> = {},
): SpecialWeaponState => ({ id, level: 1, quality: 0, ...extra });
const context = (weapons: SpecialWeaponState[], enemies = [enemy(1)]) => ({
  weapons,
  enemies,
  growth,
  focusId: null,
  random: () => 1,
});
it("grenades fly to the dense remote group and damage a space, not the focus", () => {
  const runtime = new SpecialWeapons();
  const ctx = {
    ...context([weapon("grenade")], [enemy(1), enemy(2, 0.22), enemy(3, 0.9)]),
    focusId: 3,
  };
  expect(runtime.advance(0, ctx).effects).toEqual([]);
  expect(runtime.visuals[0]?.kind).toBe("grenade");
  const result = runtime.advance(900, ctx);
  expect(result.enemies[0]!.hp).toBeLessThan(1000);
  expect(result.enemies[1]!.hp).toBeLessThan(1000);
  expect(result.enemies[2]!.hp).toBe(1000);
});
it("missiles move visibly toward focus and reacquire a dead target with emergency retarget", () => {
  const runtime = new SpecialWeapons();
  const ctx = {
    ...context(
      [weapon("missile", { level: 15, transcendence: "emergency-retarget" })],
      [enemy(1), enemy(2, 0.8)],
    ),
    focusId: 1,
  };
  runtime.advance(0, ctx);
  const firstY = runtime.visuals[0]!.y;
  runtime.advance(100, ctx);
  expect(runtime.visuals[0]!.y).toBeLessThan(firstY);
  const result = runtime.advance(1800, {
    ...ctx,
    enemies: [{ ...enemy(1), hp: 0 }, enemy(2, 0.8)],
  });
  expect(result.enemies[1]!.hp).toBeLessThan(1000);
});
it("drones persist and synchronization only fires from primary events", () => {
  const runtime = new SpecialWeapons();
  const ctx = context([
    weapon("drone", { level: 20, overclock: "synchronization" }),
  ]);
  const result = runtime.advance(0, ctx);
  const units = runtime.visuals.map((unit) => unit.id);
  const synced = runtime.onPrimary(1, { ...ctx, enemies: result.enemies });
  expect(synced.enemies[0]!.hp).toBeLessThan(result.enemies[0]!.hp);
  runtime.advance(100, { ...ctx, enemies: synced.enemies });
  expect(runtime.visuals.map((unit) => unit.id)).toEqual(units);
});
it("painter boosts Gauss temporarily and expiry uses simulation time", () => {
  const runtime = new SpecialWeapons();
  const ctx = context([
    weapon("drone", { level: 15, transcendence: "target-painter" }),
  ]);
  runtime.advance(0, ctx);
  expect(runtime.gaussDamageMultiplier(1)).toBeGreaterThan(1);
  runtime.advance(0, { ...ctx, weapons: [] });
  expect(runtime.gaussDamageMultiplier(1)).toBeGreaterThan(1);
  runtime.advance(2500, { ...ctx, weapons: [] });
  expect(runtime.gaussDamageMultiplier(1)).toBe(1);
});
it("common stats and rarity quality affect specials without Gauss-only traits", () => {
  const base = getSpecialWeaponStats(weapon("grenade"), growth);
  const boosted = getSpecialWeaponStats(
    weapon("grenade", { level: 2, quality: 3.2 }),
    {
      ...growth,
      ranks: { "primary-damage": 1, "attack-speed": 1, "crit-chance": 1 },
    },
  );
  expect(boosted.damage).toBeGreaterThan(base.damage);
  expect(boosted.cycleMs).toBeLessThan(base.cycleMs);
  expect(boosted.criticalChance).toBeGreaterThan(base.criticalChance);
  expect(
    getSpecialWeaponStats(weapon("grenade"), {
      ...growth,
      ranks: { heavy: 5, burst: 5 },
    }).damage,
  ).toBe(base.damage);
});
it("triple throw is simultaneous while barrage releases grenades over time", () => {
  const triple = new SpecialWeapons(),
    barrage = new SpecialWeapons();
  const tripleContext = context([
    weapon("grenade", { level: 20, overclock: "triple" }),
  ]);
  const barrageContext = context([
    weapon("grenade", { level: 20, overclock: "barrage" }),
  ]);
  triple.advance(0, tripleContext);
  barrage.advance(0, barrageContext);
  expect(triple.visuals).toHaveLength(3);
  expect(barrage.visuals).toHaveLength(1);
  barrage.advance(200, barrageContext);
  expect(barrage.visuals).toHaveLength(2);
});
it("gravity moves logical enemy positions and its persistent field expires", () => {
  const runtime = new SpecialWeapons();
  const ctx = context(
    [weapon("grenade", { level: 10, tree: "tactical", branch: "a" })],
    [enemy(1, 0.2, 0.5), enemy(2, 0.22, 0.7)],
  );
  const result = runtime.advance(900, ctx);
  expect(combatPosition(result.enemies[0]!)).not.toEqual(
    combatPosition(ctx.enemies[0]!),
  );
  expect(result.effects.some((e) => e.kind === "pull")).toBe(true);
  const finished = runtime.advance(3500, {
    ...ctx,
    weapons: [],
    enemies: result.enemies,
  });
  const quiet = runtime.advance(500, {
    ...ctx,
    weapons: [],
    enemies: finished.enemies,
  });
  expect(quiet.effects).toEqual([]);
});
it("immortal missiles chain kills with a finite lifetime", () => {
  const runtime = new SpecialWeapons();
  const ctx = context(
    [weapon("missile", { level: 20, overclock: "immortal" })],
    Array.from({ length: 10 }, (_, i) => ({ ...enemy(i, 0.8), hp: 1 })),
  );
  runtime.advance(0, ctx);
  const result = runtime.advance(2000, { ...ctx, weapons: [] });
  expect(result.enemies.filter((e) => e.hp === 0)).toHaveLength(7);
  runtime.advance(7000, { ...ctx, weapons: [], enemies: result.enemies });
  expect(runtime.visuals).toEqual([]);
});
it("no-target cycles stay ready and special hits respect personal shields", () => {
  const runtime = new SpecialWeapons();
  const ctx = context([weapon("drone")], []);
  runtime.advance(2000, ctx);
  const result = runtime.advance(0, {
    ...ctx,
    enemies: [{ ...enemy(1), shieldHp: 100 }],
  });
  expect(result.enemies[0]!.shieldHp).toBeLessThan(100);
  expect(result.enemies[0]!.hp).toBe(1000);
});
it("Wolfpack shares one target even when drones are nearer different enemies", () => {
  const runtime = new SpecialWeapons();
  const ctx = context(
    [weapon("drone", { level: 10, tree: "squadron", branch: "b" })],
    [
      { ...enemy(1, 0.8), lane: "left" },
      { ...enemy(2, 0.8), lane: "right" },
    ],
  );
  const result = runtime.advance(0, ctx);
  expect(result.enemies.filter((e) => e.hp < 1000)).toHaveLength(1);
});
it("Smart Fuse changes aim without jumping the grenade position", () => {
  const runtime = new SpecialWeapons();
  const ctx = context([
    weapon("grenade", { level: 15, transcendence: "smart-fuse" }),
  ]);
  runtime.advance(500, ctx);
  const before = runtime.visuals[0]!;
  runtime.advance(10, { ...ctx, enemies: [enemy(2, 0.85)] });
  const after = runtime.visuals[0]!;
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(20);
});
it("Hunter launches a new missile on a kill while Chain Predator continues from impact", () => {
  const launch = (tree: string) => {
    const runtime = new SpecialWeapons();
    const ctx = context(
      [weapon("missile", { level: 10, tree, branch: "a" })],
      [{ ...enemy(1, 0.8), hp: 1, kind: "runner" }, enemy(2, 0.2)],
    );
    runtime.advance(0, ctx);
    const id = runtime.visuals[0]!.id;
    runtime.advance(500, { ...ctx, weapons: [] });
    return { id, visual: runtime.visuals[0]! };
  };
  const hunter = launch("hunter"),
    tracking = launch("tracking");
  expect(hunter.visual.id).not.toBe(hunter.id);
  expect(hunter.visual.y).toBe(1075);
  expect(tracking.visual.id).toBe(tracking.id);
  expect(tracking.visual.y).toBeCloseTo(860);
});
