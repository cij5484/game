import { expect, it, vi } from "vitest";
import {
  BalanceTelemetry,
  formatBalanceReport,
  readLastBalanceReport,
  parseBalanceReport,
  saveLastBalanceReport,
} from "../../src/game/dev/BalanceTelemetry";
import type { EnemyState } from "../../src/game/enemies/enemySimulation";

const enemy = (hp: number, extra: Partial<EnemyState> = {}): EnemyState => ({
  id: 1,
  hp,
  kind: "grunt",
  lane: "center",
  offset01: 0,
  progress01: 0,
  phase: "moving",
  ...extra,
});
const state = (stageMs: number, enemies = 10) => ({
  stageMs,
  enemies,
  level: 3,
  wallHp: 80,
  wallMaxHp: 100,
  build: ["점사 Lv1"],
});

it("counts actual shield/body losses, overkill, sources and kills using stage seconds", () => {
  const t = new BalanceTelemetry(true);
  t.setTime(10000);
  t.damage(enemy(5, { shieldHp: 3 }), enemy(-95, { shieldHp: 0 }), "Gauss");
  t.damage(enemy(4, { id: 2 }), enemy(0, { id: 2 }), "Drone");
  t.damage(enemy(0), enemy(-50), "Other");
  t.update(state(30000));
  expect(t.report().metrics).toMatchObject({
    totalDps: 12 / 30,
    kpm: 4,
    kills: 2,
  });
  expect(
    Object.values(t.report().metrics.sourceDps).reduce((a, b) => a + b),
  ).toBe(12 / 30);
  t.update(state(41000));
  expect(t.report().metrics.totalDps).toBe(0);
});

it("samples enemy pressure, deduplicates wall arrivals and measures actual wall loss", () => {
  const t = new BalanceTelemetry(true);
  t.update(state(1000, 4));
  t.wallReach(1);
  t.wallReach(1);
  t.wallDamage(10, -20);
  t.update(state(2000, 8));
  expect(t.report().metrics).toMatchObject({
    avgEnemies: 6,
    wallDamage: 10,
    wallReachPerMin: 30,
  });
  t.removeEnemy(1);
  t.wallReach(1);
  expect(t.report().metrics.wallReachPerMin).toBe(60);
});

it("measures elite and boss first-hit to death, excluding approach time", () => {
  const t = new BalanceTelemetry(true);
  t.setTime(10000);
  t.damage(enemy(10, { elite: true }), enemy(8, { elite: true }), "Gauss");
  t.setTime(14000);
  t.damage(enemy(8, { elite: true }), enemy(0, { elite: true }), "Grenade");
  const boss = { phase: "approach" } as unknown as NonNullable<
    EnemyState["boss"]
  >;
  t.setTime(20000);
  t.bossSpawn();
  t.setTime(30000);
  t.damage(enemy(10, { id: 2, boss }), enemy(8, { id: 2, boss }), "Missile");
  t.setTime(36000);
  t.damage(enemy(8, { id: 2, boss }), enemy(0, { id: 2, boss }), "Missile");
  expect(t.report().metrics).toMatchObject({ lastEliteTtk: 4, bossTtk: 6 });
  expect(t.report().eliteAverageTtk).toBe(4);
});

it("captures mod pre/post DPS, excludes hits after the post boundary and reports snapshots", () => {
  const t = new BalanceTelemetry(true);
  t.setTime(10000);
  t.damage(enemy(150), enemy(0), "Gauss");
  t.setTime(15000);
  t.acquireMod("burst", "점사");
  t.acquireMod("burst", "점사");
  t.setTime(20000);
  t.damage(enemy(300), enemy(0), "Gauss");
  t.setTime(31000);
  t.damage(enemy(1000), enemy(0), "Gauss");
  t.update(state(180000));
  const r = t.finish("victory");
  expect(r.modEvents).toHaveLength(1);
  expect(r.modEvents[0]).toMatchObject({
    preDps: 10,
    postDps: 20,
    deltaPercent: 100,
  });
  expect(r.snapshots.map((s) => s.label)).toEqual(["3:00", "Run 종료"]);
  expect(formatBalanceReport(r)).toContain("점사");
});

it("X1 and X4 produce identical telemetry for identical stage-time combat", () => {
  function run(speed: number) {
    const t = new BalanceTelemetry(true);
    for (
      let realMs = 1000 / speed;
      realMs <= 30000 / speed;
      realMs += 1000 / speed
    ) {
      t.setTime(realMs * speed);
      t.damage(enemy(10), enemy(0), "Gauss");
      t.update(state(realMs * speed));
    }
    return t.report();
  }
  expect(run(4)).toEqual(run(1));
});

it("keeps rolling data bounded and disabled telemetry inert", () => {
  const t = new BalanceTelemetry(true);
  for (let i = 1; i <= 2000; i++) {
    t.setTime(i * 1000);
    t.damage(enemy(1, { elite: true }), enemy(0, { elite: true }), "Gauss");
    t.update(state(i * 1000));
  }
  expect(t.report().eliteSamples.length).toBeLessThanOrEqual(256);
  expect(t.report().events.length).toBeLessThanOrEqual(256);
  expect(t.report().eliteSampleCount).toBe(2000);
  expect(t.report().metrics.totalDps).toBeCloseTo(1);
  // Inspect private buffer bounds without adding diagnostics to the gameplay API.
  const buffers = t as unknown as {
    buckets: unknown[];
    samples: unknown[];
    firstHit: Map<number, number>;
    reached: Set<number>;
  };
  expect(buffers.buckets.length).toBeLessThanOrEqual(30);
  expect(buffers.samples.length).toBeLessThanOrEqual(30);
  expect(buffers.firstHit.size).toBe(0);
  const off = new BalanceTelemetry(false);
  off.setTime(10000);
  off.damage(enemy(10), enemy(0), "Gauss");
  off.update(state(10000));
  off.acquireMod("x", "x");
  off.wallReach(1);
  off.wallDamage(10, 0);
  off.bossSpawn();
  expect(off.finish("victory").metrics.totalDps).toBe(0);
  expect(off.report().events).toEqual([]);
  expect(readLastBalanceReport()).toBeNull();
});

it("validates persisted/broadcast reports and tolerates unavailable storage", () => {
  const r = new BalanceTelemetry(true).report();
  expect(parseBalanceReport(r)).toEqual(r);
  for (const bad of [
    null,
    {},
    { ...r, metrics: {} },
    { ...r, build: [null] },
    { ...r, modEvents: [{ name: "x" }] },
    { ...r, eliteSamples: [NaN] },
    { ...r, events: Array(257).fill({}) },
  ])
    expect(parseBalanceReport(bad)).toBeNull();
  expect(() => saveLastBalanceReport(r)).not.toThrow();
});

it("defaults to disabled in production and never accesses persisted reports", () => {
  const storage = { getItem: vi.fn(), setItem: vi.fn() };
  vi.stubEnv("DEV", false);
  vi.stubGlobal("localStorage", storage);
  try {
    const t = new BalanceTelemetry();
    t.setTime(30000);
    t.damage(enemy(10), enemy(0), "Gauss");
    t.update(state(30000));
    saveLastBalanceReport(t.finish("victory"));
    expect(t.report().metrics.stageMs).toBe(0);
    expect(t.report().metrics.totalDps).toBe(0);
    expect(readLastBalanceReport()).toBeNull();
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  }
});
