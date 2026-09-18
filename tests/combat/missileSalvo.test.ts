import { afterEach, expect, it, vi } from "vitest";
import {
  SpecialWeapons,
  type SpecialContext,
} from "../../src/game/combat/specialWeapons";
import { specialWeaponBalance as tune } from "../../src/game/data/specialWeaponBalance";
import type { SpecialWeaponState } from "../../src/game/data/specialWeapons";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { createSiegeBoss } from "../../src/game/enemies/siegeBoss";
import type { EnemyState } from "../../src/game/enemies/enemySimulation";

const initialTune = structuredClone(tune);
afterEach(() => {
  Object.assign(tune.missile, initialTune.missile);
  Object.assign(
    tune.missileBehavior,
    structuredClone(initialTune.missileBehavior),
  );
  tune.missileSpeed = initialTune.missileSpeed;
  tune.missileLifetimeMs = initialTune.missileLifetimeMs;
});
const enemy = (id: number, hp = 80) => ({
  ...createPrototypeEnemy("grunt", "center", id, 0.5),
  progress01: 0.1,
  hp,
});
const context = (
  enemies: readonly EnemyState[] = [enemy(1, 10000)],
  extra: Partial<SpecialWeaponState> = {},
): SpecialContext => ({
  weapons: [{ id: "missile", level: 1, quality: 0, ...extra }],
  growth: { ranks: {}, quality: {}, legendary: new Set() },
  enemies,
  focusId: null,
  random: () => 1,
});
const internals = (runtime: SpecialWeapons) =>
  runtime as unknown as {
    missiles: {
      id: number;
      targetId: number;
      x: number;
      y: number;
      damage: number;
      lifetime: number;
      retargets: number;
    }[];
    reservations: Map<number, number>;
    salvo: unknown;
  };

it("launches three rounds 270 combat ms apart, snapshots the salvo, and rolls one action", () => {
  const runtime = new SpecialWeapons();
  const ctx = {
    ...context(),
    relics: new Set<"capacitor">(["capacitor"]),
    random: vi.fn(() => 1),
  };
  runtime.advance(0, ctx);
  expect(runtime.activeUnitCount).toBe(1);
  expect(internals(runtime).reservations.get(1)).toBe(90);
  runtime.advance(269, ctx);
  expect(runtime.activeUnitCount).toBe(1);
  tune.missileBehavior.baseSalvoCount = 8;
  tune.missileBehavior.salvoIntervalMs = 1;
  tune.missile.damage = 1000;
  runtime.advance(1, ctx);
  expect(runtime.activeUnitCount).toBe(2);
  runtime.advance(270, ctx);
  expect(runtime.activeUnitCount).toBe(3);
  expect(internals(runtime).reservations.get(1)).toBe(270);
  expect(ctx.random).toHaveBeenCalledTimes(4);
});

it("reserves only launched damage, spreads covered focus targets, and permits shield and boss concentration", () => {
  const runtime = new SpecialWeapons();
  const ctx = { ...context([enemy(1), enemy(2), enemy(3)]), focusId: 1 };
  runtime.advance(0, ctx);
  expect([...internals(runtime).reservations.keys()]).toEqual([1]);
  runtime.advance(540, ctx);
  expect(internals(runtime).missiles.map((m) => m.targetId)).toEqual([1, 2, 3]);
  const shield = new SpecialWeapons();
  shield.advance(
    540,
    context([{ ...enemy(1, 80), shieldHp: 1000 } as ReturnType<typeof enemy>]),
  );
  expect(internals(shield).missiles.every((m) => m.targetId === 1)).toBe(true);
  expect(shield.activeUnitCount).toBe(3);
  const boss = new SpecialWeapons();
  const targets = [enemy(1, 10000), createSiegeBoss(2)];
  boss.advance(540, context(targets));
  expect(internals(boss).missiles.map((m) => m.targetId)).toEqual([2, 2, 2]);
});

it("base retarget turns from the current position once and frees invalid reservations", () => {
  const runtime = new SpecialWeapons();
  const ctx = context([enemy(1), enemy(2), enemy(3)]);
  runtime.advance(0, ctx);
  runtime.advance(100, { ...ctx, weapons: [] });
  const before = runtime.visuals[0]!;
  runtime.advance(10, { ...ctx, weapons: [], enemies: [enemy(2), enemy(3)] });
  const after = runtime.visuals[0]!;
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeCloseTo(6.8);
  expect(internals(runtime).reservations.has(1)).toBe(false);
  expect(internals(runtime).missiles[0]!.targetId).toBe(2);
  runtime.advance(0, { ...ctx, weapons: [], enemies: [enemy(3)] });
  expect(runtime.activeUnitCount).toBe(0);
  expect(internals(runtime).reservations.size).toBe(0);
});

it("releases reservations on impact, expiration, and loss of every target", () => {
  tune.missileBehavior.baseSalvoCount = 1;
  for (const exit of ["hit", "expire", "empty"] as const) {
    const runtime = new SpecialWeapons();
    const ctx = context();
    runtime.advance(0, ctx);
    if (exit === "expire") tune.missileSpeed = 0;
    const result = runtime.advance(exit === "expire" ? 6000 : 2000, {
      ...ctx,
      weapons: [],
      enemies: exit === "empty" ? [] : ctx.enemies,
    });
    expect(runtime.activeUnitCount).toBe(0);
    expect(internals(runtime).reservations.size).toBe(0);
    if (exit === "hit") expect(result.enemies[0]!.hp).toBe(9910);
  }
});

it("OFF ignores allocation reservations but retains bookkeeping for a live ON toggle", () => {
  const runtime = new SpecialWeapons();
  const ctx = context([enemy(1), enemy(2), enemy(3)]);
  tune.missileBehavior.damageReservation = false;
  runtime.advance(270, ctx);
  expect(internals(runtime).missiles.map((m) => m.targetId)).toEqual([1, 1]);
  expect(internals(runtime).reservations.get(1)).toBe(180);
  tune.missileBehavior.damageReservation = true;
  runtime.advance(270, ctx);
  expect(internals(runtime).missiles.map((m) => m.targetId)).toEqual([1, 1, 2]);
});

it("saturation grows 4/5/7 slots and swarm spreads while concentrated salvo stacks", () => {
  tune.missileSpeed = 0;
  for (const [level, branch, count] of [
    [3, undefined, 4],
    [6, "a", 5],
    [10, "a", 7],
  ] as const) {
    const runtime = new SpecialWeapons();
    runtime.advance(
      1620,
      context(
        Array.from({ length: 8 }, (_, i) => enemy(i, 10000)),
        { tree: "saturation", level, ...(branch ? { branch } : {}) },
      ),
    );
    expect(runtime.activeUnitCount).toBe(count);
    expect(
      new Set(internals(runtime).missiles.map((m) => m.targetId)).size,
    ).toBe(count);
  }
  const focused = new SpecialWeapons();
  focused.advance(
    1620,
    context([enemy(1, 10000), enemy(2, 10000)], {
      tree: "saturation",
      level: 10,
      branch: "b",
    }),
  );
  expect(internals(focused).missiles.map((m) => m.targetId)).toEqual([
    1, 1, 1, 1, 1, 1, 1,
  ]);
  const loneBoss = new SpecialWeapons();
  loneBoss.advance(
    1620,
    context([enemy(1, 10000)], { tree: "saturation", level: 10, branch: "a" }),
  );
  expect(loneBoss.activeUnitCount).toBe(7);
});

it("Hunter prioritizes dangerous targets and Tactical Hunter builds bounded hit pressure", () => {
  tune.missileBehavior.baseSalvoCount = 1;
  const runtime = new SpecialWeapons();
  const ctx = context(
    [
      {
        ...enemy(1, 10000),
        progress01: 1,
        kind: "shield",
        shieldHp: 0,
      } as ReturnType<typeof enemy>,
      enemy(2, 10000),
    ],
    { tree: "hunter", branch: "b", level: 10 },
  );
  runtime.advance(0, ctx);
  const first = runtime.advance(50, { ...ctx, weapons: [] });
  expect(10000 - first.enemies[0]!.hp).toBeCloseTo(153);
  const second = runtime.advance(4500, { ...ctx, enemies: first.enemies });
  expect(first.enemies[0]!.hp - second.enemies[0]!.hp).toBeCloseTo(198.9);
});

it("Emergency retarget adds multiple turns, a temporary speed boost and bounded lifetime recovery", () => {
  tune.missileBehavior.baseSalvoCount = 1;
  const runtime = new SpecialWeapons();
  const ctx = context([enemy(1), enemy(2)], {
    level: 15,
    transcendence: "emergency-retarget",
  });
  runtime.advance(0, ctx);
  runtime.advance(500, { ...ctx, weapons: [] });
  const before = runtime.visuals[0]!;
  runtime.advance(10, { ...ctx, weapons: [], enemies: [enemy(2)] });
  const after = runtime.visuals[0]!;
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeCloseTo(10.2);
  expect(internals(runtime).missiles[0]!.retargets).toBe(4);
  expect(internals(runtime).missiles[0]!.lifetime).toBeLessThanOrEqual(6000);
  expect(internals(runtime).missiles[0]!.lifetime).toBeGreaterThan(5500);
  tune.missileSpeed = 0;
  runtime.advance(10000, { ...ctx, weapons: [], enemies: [enemy(2)] });
  expect(runtime.activeUnitCount).toBe(0);
  expect(internals(runtime).reservations.size).toBe(0);
});

it("low developer cycle never queues overlapping unfinished salvos", () => {
  tune.missile.cycleMs = 180;
  tune.missileSpeed = 0;
  const runtime = new SpecialWeapons();
  const ctx = context();
  runtime.advance(0, ctx);
  runtime.advance(540, ctx);
  expect(runtime.activeUnitCount).toBe(3);
  runtime.advance(50, ctx);
  expect(runtime.activeUnitCount).toBe(4);
});

it("skips covered weak targets but chooses a newly arrived target at the delayed launch event", () => {
  const runtime = new SpecialWeapons();
  const ctx = context([enemy(1)]);
  runtime.advance(0, ctx);
  runtime.advance(270, { ...ctx, weapons: [] });
  expect(runtime.activeUnitCount).toBe(1);
  runtime.advance(270, { ...ctx, weapons: [], enemies: [enemy(1), enemy(2)] });
  expect(internals(runtime).missiles.map((m) => m.targetId)).toEqual([1, 2]);
  expect(internals(runtime).salvo).toBeUndefined();
});

it("Kill Chain relaunches a stronger shot while Chain Predator continues from the kill", () => {
  tune.missileBehavior.baseSalvoCount = 1;
  for (const [tree, multiplier] of [
    ["hunter", 1.25],
    ["tracking", 1.2],
  ] as const) {
    const runtime = new SpecialWeapons();
    const ctx = context([{ ...enemy(1, 1), progress01: 1 }, enemy(2, 10000)], {
      level: 10,
      tree,
      branch: "a",
    });
    runtime.advance(0, ctx);
    const id = runtime.visuals[0]!.id;
    const result = runtime.advance(50, { ...ctx, weapons: [] });
    expect(result.enemies[0]!.hp).toBe(0);
    expect(runtime.visuals[0]!.id === id).toBe(tree === "tracking");
    expect(internals(runtime).missiles[0]!.damage).toBeCloseTo(90 * multiplier);
    expect(internals(runtime).missiles[0]!.targetId).toBe(2);
    expect(internals(runtime).reservations.has(1)).toBe(false);
    expect(internals(runtime).reservations.get(2)).toBeGreaterThan(90);
    const finished = runtime.advance(2000, {
      ...ctx,
      weapons: [],
      enemies: result.enemies,
    });
    expect(finished.enemies[1]!.hp).toBeLessThan(10000 - 90);
    expect(internals(runtime).reservations.size).toBe(0);
  }
});

it("Phoenix repeats from the impact point with a delay and a finite Lv6/Lv10 hit budget", () => {
  tune.missileBehavior.baseSalvoCount = 1;
  for (const [level, hits] of [
    [6, 3],
    [10, 5],
  ] as const) {
    const runtime = new SpecialWeapons();
    const ctx = context([{ ...enemy(1, 10000), progress01: 1 }], {
      level,
      tree: "tracking",
      branch: "b",
    });
    runtime.advance(0, ctx);
    const id = runtime.visuals[0]!.id;
    const first = runtime.advance(50, { ...ctx, weapons: [] });
    expect(first.effects).toHaveLength(1);
    expect(runtime.visuals[0]).toMatchObject({ id, x: 324, y: 1075 });
    const waiting = runtime.advance(100, {
      ...ctx,
      weapons: [],
      enemies: first.enemies,
    });
    expect(waiting.effects).toHaveLength(0);
    const rest = runtime.advance(2000, {
      ...ctx,
      weapons: [],
      enemies: waiting.enemies,
    });
    expect(rest.effects).toHaveLength(hits - 1);
    expect(runtime.activeUnitCount).toBe(0);
    expect(internals(runtime).reservations.size).toBe(0);
  }
});

it("Overclocks separate hunting speed/damage, network target count and immortal persistent hits", () => {
  const hunter = new SpecialWeapons();
  const ctx = context([{ ...enemy(1, 10000), elite: true }], {
    level: 20,
    overclock: "hunting",
  });
  hunter.advance(0, ctx);
  const before = hunter.visuals[0]!;
  hunter.advance(100, { ...ctx, weapons: [] });
  const after = hunter.visuals[0]!;
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeCloseTo(85);
  expect(internals(hunter).reservations.get(1)).toBe(135);
  expect(internals(hunter).missiles[0]!.retargets).toBe(3);

  tune.missileSpeed = 0;
  const network = new SpecialWeapons();
  network.advance(
    1350,
    context(
      Array.from({ length: 8 }, (_, i) => enemy(i, 10000)),
      { level: 20, overclock: "network" },
    ),
  );
  expect(network.activeUnitCount).toBe(6);
  expect(new Set(internals(network).missiles.map((m) => m.targetId)).size).toBe(
    6,
  );

  tune.missileSpeed = 680;
  tune.missileBehavior.baseSalvoCount = 1;
  const immortal = new SpecialWeapons();
  const immortalContext = context([{ ...enemy(1, 10000), progress01: 1 }], {
    level: 20,
    overclock: "immortal",
  });
  immortal.advance(0, immortalContext);
  expect(internals(immortal).missiles[0]!.lifetime).toBe(12000);
  const result = immortal.advance(2500, { ...immortalContext, weapons: [] });
  expect(result.effects).toHaveLength(8);
  expect(result.enemies[0]!.hp).toBe(9280);
  expect(immortal.activeUnitCount).toBe(0);
  expect(internals(immortal).reservations.size).toBe(0);
});

it("the emergency speed boost expires without resetting on normal flight frames", () => {
  tune.missileBehavior.baseSalvoCount = 1;
  const runtime = new SpecialWeapons();
  const ctx = context([enemy(1), enemy(2)], {
    level: 15,
    transcendence: "emergency-retarget",
  });
  runtime.advance(0, ctx);
  const retarget = { ...ctx, weapons: [], enemies: [enemy(2)] };
  runtime.advance(450, retarget);
  const before = runtime.visuals[0]!;
  runtime.advance(100, retarget);
  const after = runtime.visuals[0]!;
  expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeCloseTo(68);
});
