import { expect, it } from "vitest";
import {
  BalanceTelemetry,
  formatAiBalanceReport,
  parseBalanceReport,
} from "../../src/game/dev/BalanceTelemetry";
import type { EnemyState } from "../../src/game/enemies/enemySimulation";
const enemy = (
  id: number,
  hp = 100,
  extra: Partial<EnemyState> = {},
): EnemyState => ({
  id,
  hp,
  maxHp: 100,
  kind: "grunt",
  lane: "center",
  offset01: 0,
  progress01: 0,
  phase: "moving",
  ...extra,
});
const state = (stageMs: number) => ({
  stageMs,
  level: 3,
  wallHp: 90,
  wallMaxHp: 100,
  enemies: 10,
  nearWall75: 4,
  nearWall90: 2,
  build: ["A"],
});
const growth = {
  kind: "basic-level",
  id: "burst",
  name: "Burst",
  level: 3,
  previousLevel: 1,
  nextLevel: 2,
  rarity: "rare",
};
it("captures stage-time timeline, rolling supply/pressure, lifetime and contribution", () => {
  const t = new BalanceTelemetry(true);
  t.update(state(0));
  t.spawn(enemy(1));
  t.spawn(enemy(2, 100, { elite: true }));
  t.setTime(5000);
  t.damage(enemy(1), enemy(1, 0), "Gauss");
  t.update(state(5000));
  const r = t.report();
  expect(r.metrics).toMatchObject({
    spawns: 2,
    spawnPerMin: 24,
    nearWall75: 4,
    nearWall90: 2,
  });
  expect(r.v2!.timeline5s).toHaveLength(1);
  expect(r.v2!.timeline5s[0]!.stageMs).toBe(5000);
  expect(r.v2!.enemyLifetime.Grunt).toEqual({
    count: 1,
    totalSeconds: 5,
    averageSeconds: 5,
  });
  expect(r.v2!.spawnKillPressure.byKind.Elite.spawns).toBe(1);
  expect(r.v2!.weaponContribution.Gauss.percent).toBe(100);
  t.update(state(36000));
  expect(t.report().metrics.spawns).toBe(0);
});
it("records all growth and matures bounded pre/post observations without late damage", () => {
  const t = new BalanceTelemetry(true);
  for (let s = 1; s <= 15; s++) {
    t.update(state(s * 1000));
    t.damage(enemy(s, 10), enemy(s, 0), "Gauss");
  }
  t.growth(growth);
  t.setTime(20000);
  t.damage(enemy(30, 300), enemy(30, 0), "Grenade");
  t.update(state(20000));
  t.setTime(30000);
  t.damage(enemy(40, 9000), enemy(40, 0), "Other");
  const v = t.report().v2!;
  expect(v.growthEvents[0]).toMatchObject({ ...growth, stageMs: 15000 });
  expect(v.powerSpikeObservations[0]).toMatchObject({
    pre: { dps: 10, kpm: 60, avgEnemies: 10, nearWall75: 4, nearWall90: 2 },
    post: { dps: 20, kpm: 4 },
  });
});
it("distinguishes boss combat/fight time and actual mechanics from HP thresholds", () => {
  const t = new BalanceTelemetry(true);
  const boss = {
    phase: "siege-charge",
    phaseRemainingMs: 1,
    interruptDamage: 0,
    reinforcementCalled: false,
    wallAttackRemainingMs: 0,
  } as const;
  t.setTime(1000);
  t.bossSpawn();
  t.setTime(5000);
  t.damage(
    enemy(1, 100, { boss }),
    enemy(1, 60, { boss: { ...boss, phase: "stagger" } }),
    "Gauss",
  );
  t.bossEvent("reinforcement");
  t.bossEvent("siege-charge", 2);
  t.setTime(10000);
  t.damage(enemy(1, 60, { boss }), enemy(1, 0, { boss }), "Grenade");
  const b = t.report().v2!.bossEvents;
  expect(b.combatTtk).toBe(5);
  expect(b.fightDuration).toBe(9);
  expect(b.counts).toMatchObject({
    spawn: 1,
    "first-hit": 1,
    "hp-65": 1,
    "hp-25": 1,
    "siege-interrupt": 1,
    reinforcement: 1,
    "siege-charge": 2,
    death: 1,
  });
  expect(b.counts["final-charge"]).toBeUndefined();
});
it("summarizes active performance and exports every AI section, validating v1 and v2", () => {
  const t = new BalanceTelemetry(true);
  t.performanceFrame({
    speed: 8,
    fps: 60,
    substeps: 4,
    realMs: 100,
    stageMs: 800,
  });
  t.performanceFrame({
    speed: 8,
    fps: 20,
    substeps: 8,
    realMs: 100,
    stageMs: 400,
  });
  const r = t.report();
  expect(r.v2!.performance).toMatchObject({
    averageFps: 40,
    minFps: 20,
    averageSubsteps: 6,
    maxSubsteps: 8,
    effectiveSpeed: 6,
  });
  const ai = JSON.parse(formatAiBalanceReport(r));
  for (const k of [
    "RunSummary",
    "FinalBuild",
    "Final30s",
    "WeaponContribution",
    "Timeline5s",
    "GrowthEvents",
    "PowerSpikeObservations",
    "SpawnKillPressure",
    "NearWallPressure",
    "EnemyLifetime",
    "EliteTTK",
    "BossEvents",
    "Performance",
  ])
    expect(ai).toHaveProperty(k);
  expect(parseBalanceReport(r)).toEqual(r);
  const { v2, ...v1 } = r;
  expect(parseBalanceReport(v1)).toEqual(v1);
  expect(
    parseBalanceReport({
      ...r,
      v2: { ...v2, performance: { ...v2!.performance, averageFps: NaN } },
    }),
  ).toBeNull();
});
it("bounds timeline, growth and pending observations while retaining lifetime aggregates", () => {
  const t = new BalanceTelemetry(true);
  for (let i = 0; i < 800; i++) {
    t.growth({ ...growth, id: String(i) });
    t.spawn(enemy(i));
    t.damage(enemy(i), enemy(i, 0), "Gauss");
  }
  for (let i = 1; i <= 700; i++) t.update(state(i * 5000));
  const v = t.report().v2!;
  expect(v.timeline5s.length).toBeLessThanOrEqual(512);
  expect(v.growthEvents.length).toBeLessThanOrEqual(256);
  expect(v.powerSpikeObservations.length).toBeLessThanOrEqual(256);
  expect(v.enemyLifetime.Grunt.count).toBe(800);
  expect((t as unknown as { alive: Map<number, unknown> }).alive.size).toBe(0);
});
it("counts the boss in total supply without mixing it into grunt lifetime", () => {
  const t = new BalanceTelemetry(true);
  const boss = { phase: "approach" } as NonNullable<EnemyState["boss"]>;
  t.spawn(enemy(99, 100, { boss }));
  t.spawn(enemy(99, 100, { boss }));
  t.setTime(5000);
  t.damage(enemy(99, 100, { boss }), enemy(99, 0, { boss }), "Gauss");
  expect(t.report().metrics).toMatchObject({ spawns: 1, kills: 1 });
  expect(t.report().v2!.enemyLifetime.Grunt.count).toBe(0);
  expect(t.report().v2!.spawnKillPressure.byKind.Grunt).toEqual({
    spawns: 0,
    kills: 0,
  });
});
it("retains all four expanded offered cards through the report boundary", () => {
  const t = new BalanceTelemetry(true);
  t.growth({
    ...growth,
    offered: Array.from({ length: 4 }, (_, i) => ({
      id: String(i),
      name: String(i),
      rarity: null,
    })),
  });
  const r = t.report();
  expect(r.v2!.growthEvents[0]!.offered).toHaveLength(4);
  expect(parseBalanceReport(r)).toEqual(r);
});
it("keeps every v2 entrypoint inert when disabled", () => {
  const t = new BalanceTelemetry(false);
  const before = t.report();
  t.spawn(enemy(1));
  t.growth(growth);
  t.bossEvent("siege-charge");
  t.performanceFrame({
    speed: 8,
    fps: 60,
    substeps: 8,
    realMs: 100,
    stageMs: 800,
  });
  t.update(state(5000));
  expect(t.report()).toEqual(before);
  const buffers = t as unknown as {
    alive: Map<number, unknown>;
    pendingGrowth: unknown[];
  };
  expect(buffers.alive.size).toBe(0);
  expect(buffers.pendingGrowth).toHaveLength(0);
});
