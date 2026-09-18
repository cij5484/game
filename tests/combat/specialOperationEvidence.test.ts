import { afterEach, expect, it, vi } from "vitest";
import {
  SpecialWeapons,
  type SpecialContext,
} from "../../src/game/combat/specialWeapons";
import { specialWeaponBalance as tune } from "../../src/game/data/specialWeaponBalance";
import type { SpecialWeaponState } from "../../src/game/data/specialWeapons";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";

const originalCount = tune.missileBehavior.baseSalvoCount;
afterEach(() => {
  tune.missileBehavior.baseSalvoCount = originalCount;
});
const enemy = (id: number, hp = 10000) => ({
  ...createPrototypeEnemy("grunt", "center", id, 0.5),
  hp,
  progress01: 0.1,
});
const context = (
  id: SpecialWeaponState["id"],
  extra: Partial<SpecialWeaponState> = {},
): SpecialContext => ({
  weapons: [{ id, level: 1, quality: 0, ...extra }],
  enemies: [enemy(1)],
  growth: { ranks: {}, quality: {}, legendary: new Set() },
  focusId: null,
  random: () => 0,
});

it("counts only successful lost-target redirects, monotonically, without counting failed redirects", () => {
  tune.missileBehavior.baseSalvoCount = 1;
  const run = new SpecialWeapons();
  const ctx = context("missile");
  run.advance(0, ctx);
  expect(run.totalRetargets).toBe(0);
  run.advance(0, { ...ctx, weapons: [], enemies: [enemy(2)] });
  expect(run.totalRetargets).toBe(1);
  run.advance(0, { ...ctx, weapons: [], enemies: [enemy(3)] });
  expect(run.totalRetargets).toBe(1);
  const failed = new SpecialWeapons();
  failed.advance(0, ctx);
  failed.advance(0, { ...ctx, weapons: [], enemies: [] });
  expect(failed.totalRetargets).toBe(0);
});

it("does not count tracking post-impact continuations as basic retargets", () => {
  tune.missileBehavior.baseSalvoCount = 1;
  for (const branch of ["a", "b"] as const) {
    const run = new SpecialWeapons();
    const ctx = {
      ...context("missile", { level: 10, tree: "tracking", branch }),
      enemies: [enemy(1, branch === "a" ? 1 : 10000), enemy(2)],
    };
    run.advance(0, ctx);
    const hit = run.advance(1600, { ...ctx, weapons: [] });
    expect(hit.effects.length).toBeGreaterThan(0);
    expect(run.totalRetargets).toBe(0);
  }
});

it.each(["grenade", "missile", "drone"] as const)(
  "records %s critical only on real HP or shield damage",
  (id) => {
    tune.missileBehavior.baseSalvoCount = 1;
    const ctx = context(id);
    const run = new SpecialWeapons();
    run.advance(0, ctx);
    expect(run.totalCriticalHits).toBe(id === "drone" ? 1 : 0);
    if (id !== "drone") {
      run.advance(2000, { ...ctx, weapons: [] });
      expect(run.totalCriticalHits).toBeGreaterThan(0);
    }
    const shield = new SpecialWeapons();
    shield.advance(2000, {
      ...ctx,
      enemies: [{ ...enemy(1), shieldHp: 10000 }],
    });
    expect(shield.totalCriticalHits).toBeGreaterThan(0);
    const immune = new SpecialWeapons();
    immune.advance(2000, {
      ...ctx,
      enemies: [{ ...enemy(1), incomingDamageMultiplier: 0 }],
    });
    expect(immune.totalCriticalHits).toBe(0);
  },
);

it("does not record a missed critical projectile or add random draws", () => {
  const run = new SpecialWeapons();
  const random = vi.fn(() => 0);
  const ctx = { ...context("grenade"), random };
  run.advance(0, ctx);
  expect(random).toHaveBeenCalledTimes(1);
  run.advance(2000, { ...ctx, weapons: [], enemies: [] });
  expect(run.totalCriticalHits).toBe(0);
  expect(random).toHaveBeenCalledTimes(1);
});

it("retains the grenade critical roll for delayed area damage", () => {
  const run = new SpecialWeapons();
  const random = vi.fn(() => 0);
  const ctx = {
    ...context("grenade", { transcendence: "aftershock" }),
    random,
  };
  run.advance(tune.grenadeFlightMs, {
    ...ctx,
    enemies: [{ ...enemy(1), incomingDamageMultiplier: 0 }],
  });
  expect(run.totalCriticalHits).toBe(0);
  run.advance(tune.grenadeBehavior.aftershock.delayMs, { ...ctx, weapons: [] });
  expect(run.totalCriticalHits).toBe(1);
  expect(random).toHaveBeenCalledTimes(1);
});
