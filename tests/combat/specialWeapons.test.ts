import { expect, it, vi } from "vitest";
import { SpecialWeapons } from "../../src/game/combat/specialWeapons";
import { getSpecialWeaponStats } from "../../src/game/data/specialWeaponBalance";
import type { SpecialWeaponState } from "../../src/game/data/specialWeapons";
import type { MarineGrowthState } from "../../src/game/data/marineGrowth";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { combatPosition } from "../../src/game/battlefield/combatGeometry";
import type { PrototypeRelicId } from "../../src/game/data/highroll";
import { PrototypeSynergies } from "../../src/game/combat/prototypeSynergies";
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
it("keeps input snapshots when specials are idle or projectiles only move", () => {
  const idle = new SpecialWeapons();
  const ctx = context([]);
  Object.freeze(ctx.enemies);
  Object.freeze(ctx.enemies[0]);
  expect(idle.advance(50, ctx).enemies).toBe(ctx.enemies);
  expect(idle.onPrimary(1, ctx).enemies).toBe(ctx.enemies);
  const missiles = new SpecialWeapons();
  const flight = { ...ctx, weapons: [weapon("missile")] };
  expect(missiles.advance(0, flight).enemies).toBe(ctx.enemies);
  expect(missiles.advance(50, flight).enemies).toBe(ctx.enemies);
  const drones = new SpecialWeapons();
  const firing = { ...ctx, weapons: [weapon("drone")] };
  const hit = drones.advance(0, firing);
  expect(hit.enemies).not.toBe(ctx.enemies);
  expect(hit.enemies[0]!.hp).toBeLessThan(ctx.enemies[0]!.hp);
  expect(drones.advance(50, { ...firing, enemies: hit.enemies }).enemies).toBe(
    hit.enemies,
  );
});

it("counts only visible active units without creating visual snapshots", () => {
  const runtime = new SpecialWeapons();
  expect(runtime.activeUnitCount).toBe(0);
  const ctx = context([
    weapon("grenade", { level: 20, overclock: "barrage" }),
    weapon("missile"),
    weapon("drone"),
  ]);
  runtime.advance(0, ctx);
  expect(runtime.activeUnitCount).toBe(runtime.visuals.length);
  runtime.advance(200, ctx);
  expect(runtime.activeUnitCount).toBe(runtime.visuals.length);
});

it("synchronized drones stop hitting a killed primary target and preserve other references", () => {
  const runtime = new SpecialWeapons();
  const ctx = context(
    [
      weapon("drone", {
        level: 20,
        tree: "squadron",
        branch: "b",
        overclock: "synchronization",
      }),
    ],
    [{ ...enemy(1), hp: 1 }, enemy(2)],
  );
  const result = runtime.onPrimary(1, ctx);
  expect(result.effects).toHaveLength(1);
  expect(result.enemies[0]!.hp).toBe(0);
  expect(result.enemies[1]).toBe(ctx.enemies[1]);
  expect(ctx.enemies[0]!.hp).toBe(1);
});

it("saturation adds four carpet submunitions and three swarm missiles", () => {
  const synergy = new PrototypeSynergies();
  synergy.active.add("saturation");
  synergy.registerHits(Array.from({ length: 8 }, (_, i) => i));
  const grenades = new SpecialWeapons();
  const carpet = weapon("grenade", { level: 10, tree: "cluster", branch: "a" });
  const result = grenades.advance(2000, { ...context([carpet]), synergy });
  expect(
    result.effects.filter((effect) => effect.weapon === "grenade"),
  ).toHaveLength(14);
  const missiles = new SpecialWeapons();
  const salvo = missiles.advance(2430, {
    ...context(
      [weapon("missile", { level: 10, tree: "saturation", branch: "a" })],
      Array.from({ length: 10 }, (_, i) => enemy(i)),
    ),
    synergy,
  });
  expect(missiles.visuals.length + salvo.effects.length).toBe(10);
});

it("singularity creates a kill zone that draws and boosts Gatling fire", () => {
  const synergy = new PrototypeSynergies();
  synergy.active.add("kill-zone");
  const runtime = new SpecialWeapons();
  const grenade = weapon("grenade", {
    level: 10,
    tree: "tactical",
    branch: "a",
  });
  const initial = runtime.advance(900, { ...context([grenade]), synergy });
  expect(synergy.inKillZone(initial.enemies[0]!)).toBe(true);
  const targets = [initial.enemies[0]!, { ...enemy(2, 0.95), elite: true }];
  const gatling = weapon("drone", { level: 10, tree: "gunship", branch: "a" });
  const ordinary = new SpecialWeapons().advance(0, {
    ...context([gatling], targets),
    focusId: 1,
  });
  const boosted = new SpecialWeapons().advance(0, {
    ...context([gatling], targets),
    synergy,
  });
  expect(targets[0]!.hp - boosted.enemies[0]!.hp).toBeCloseTo(
    (targets[0]!.hp - ordinary.enemies[0]!.hp) * 1.45,
  );
  expect(boosted.enemies[1]!.hp).toBe(1000);
});
it("overcharge rolls once for a whole triple throw and snapshots its damage", () => {
  const run = () => {
    const runtime = new SpecialWeapons();
    const random = vi.fn().mockReturnValueOnce(0).mockReturnValue(1);
    const ctx = {
      ...context([weapon("grenade", { level: 20, overclock: "triple" })]),
      relics: new Set<PrototypeRelicId>(["capacitor"]),
      random,
    };
    runtime.advance(0, ctx);
    expect(random).toHaveBeenCalledTimes(4);
    return runtime.advance(900, {
      ...ctx,
      weapons: [],
      relics: new Set<PrototypeRelicId>(),
      random: () => 1,
    }).enemies[0]!.hp;
  };
  const plain = new SpecialWeapons();
  const ctx = context([weapon("grenade", { level: 20, overclock: "triple" })]);
  const base = plain.advance(900, ctx).enemies[0]!.hp;
  expect(1000 - run()).toBeCloseTo((1000 - base) * 2);
});

it("missile swarm has one capacitor roll while each synchronized drone shot is an action", () => {
  const missiles = new SpecialWeapons();
  const random = vi.fn(() => 1);
  const swarm = weapon("missile", {
    level: 10,
    tree: "saturation",
    branch: "a",
  });
  const salvo = missiles.advance(1620, {
    ...context(
      [swarm],
      Array.from({ length: 10 }, (_, i) => enemy(i)),
    ),
    relics: new Set<PrototypeRelicId>(["capacitor"]),
    random,
  });
  expect(missiles.visuals.length + salvo.effects.length).toBe(7);
  expect(random).toHaveBeenCalledTimes(8);
  const drones = new SpecialWeapons();
  random.mockClear();
  const ctx = {
    ...context([
      weapon("drone", {
        level: 20,
        tree: "squadron",
        branch: "b",
        overclock: "synchronization",
      }),
    ]),
    relics: new Set<PrototypeRelicId>(["capacitor"]),
    random,
  };
  drones.onPrimary(1, ctx);
  expect(random).toHaveBeenCalledTimes(drones.visuals.length * 2);
});

it("loader shortens grenade cooldown and precision and impact affect a shield hit", () => {
  const runtime = new SpecialWeapons();
  const ctx = {
    ...context([weapon("grenade")]),
    relics: new Set<PrototypeRelicId>(["loader"]),
  };
  runtime.advance(0, ctx);
  runtime.advance(
    getSpecialWeaponStats(ctx.weapons[0]!, growth).cycleMs * 0.8,
    ctx,
  );
  expect(runtime.visuals.some((v) => v.kind === "grenade")).toBe(true);
  const drone = new SpecialWeapons();
  const target = { ...enemy(1), shieldHp: 1000 };
  const hit = drone.advance(0, {
    ...context([weapon("drone")], [target]),
    relics: new Set<PrototypeRelicId>(["precision", "impact"]),
    random: () => 0.1,
  });
  expect(hit.enemies[0]!.shieldHp).toBeCloseTo(
    1000 - getSpecialWeaponStats(weapon("drone"), growth).damage * 1.75,
  );
  expect(hit.enemies[0]!.progress01).toBeCloseTo(0.175);
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
it("missile indices follow reordered snapshots and removed targets retarget in array order", () => {
  const runtime = new SpecialWeapons();
  const ctx = {
    ...context(
      [weapon("missile", { level: 15, transcendence: "emergency-retarget" })],
      [enemy(1, 0.2), enemy(2, 0.8), enemy(3, 0.8)],
    ),
    focusId: 1,
  };
  runtime.advance(0, ctx);
  const reordered = [ctx.enemies[2]!, ctx.enemies[0]!, ctx.enemies[1]!];
  expect(
    runtime.advance(50, { ...ctx, weapons: [], enemies: reordered }).enemies,
  ).toBe(reordered);
  const remaining = [reordered[0]!, reordered[2]!];
  const result = runtime.advance(1000, {
    ...ctx,
    weapons: [],
    enemies: remaining,
  });
  expect(result.enemies[0]!.hp).toBeLessThan(1000);
  expect(result.enemies[1]).toBe(remaining[1]);
  expect(remaining.every((target) => target.hp === 1000)).toBe(true);
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
  expect(result.enemies.filter((e) => e.hp === 0)).toHaveLength(10);
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
    for (let i = 0; i < 50; i++) {
      if (runtime.advance(10, { ...ctx, weapons: [] }).effects.length) break;
    }
    return { id, visual: runtime.visuals[0]! };
  };
  const hunter = launch("hunter"),
    tracking = launch("tracking");
  expect(hunter.visual.id).not.toBe(hunter.id);
  expect(hunter.visual.y).toBe(1075);
  expect(tracking.visual.id).toBe(tracking.id);
  expect(tracking.visual.y).toBeCloseTo(860);
});

it("M6 base grenade launches every 5.2 real seconds at X1 combat tempo", () => {
  const runtime = new SpecialWeapons();
  const ctx = context([weapon("grenade")]);
  runtime.advance(0, ctx);
  expect(runtime.visuals.filter((v) => v.kind === "grenade")).toHaveLength(1);
  runtime.advance(5199 * 1.5, ctx);
  expect(runtime.visuals.filter((v) => v.kind === "grenade")).toHaveLength(0);
  runtime.advance(1 * 1.5, ctx);
  expect(runtime.visuals.filter((v) => v.kind === "grenade")).toHaveLength(1);
});
