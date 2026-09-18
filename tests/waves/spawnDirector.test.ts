import { expect, it } from "vitest";
import { SpawnDirector } from "../../src/game/waves/spawnDirector";
import { hordeBalance } from "../../src/game/data/horde";
import { eliteBalance } from "../../src/game/data/elite";
import { runBalance } from "../../src/game/data/run";

it("starts with distant grunts, respects capacity and discards blocked spawn opportunities", () => {
  const d = new SpawnDirector(() => 0.5);
  const initial = d.spawn(0);
  expect(initial).toHaveLength(24);
  expect(
    initial.every(
      (e) => e.kind === "grunt" && e.progress01 >= 0.08 && e.progress01 <= 0.3,
    ),
  ).toBe(true);
  d.advance(d.timeToSpawnMs);
  expect(d.spawn(50)).toEqual([]);
  expect(d.timeToSpawnMs).toBeGreaterThan(0);
  d.advance(d.timeToSpawnMs);
  expect(d.spawn(48)).toHaveLength(1);
});
it("changes phase exactly, keeps both relief windows populated and delays shields", () => {
  const d = new SpawnDirector(() => 0.5);
  d.spawn(0);
  for (const stage of hordeBalance.stages.slice(1)) {
    d.advance(stage.atMs - d.elapsedMs);
    expect(d.settings.name).toBe(stage.name);
    const spawns = d.spawn(0);
    expect(spawns.length).toBeGreaterThan(0);
    if (stage.atMs < 360000)
      expect(spawns.every((e) => e.kind !== "shield")).toBe(true);
  }
  expect(
    hordeBalance.stages.filter((s) => s.phase === "relief").map((s) => s.atMs),
  ).toEqual([300000, 660000, 1140000]);
});
it("runs twenty minutes with five bounded elite windows and increasing replacement pressure", () => {
  let seed = 42;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const d = new SpawnDirector(random);
  const elites: { at: number; kind: string }[] = [];
  const counts = new Map<number, number>();
  while (d.elapsedMs < runBalance.durationMs) {
    const spawns = d.spawn(0);
    for (const e of spawns) {
      if (e.elite) elites.push({ at: d.elapsedMs, kind: e.kind });
      if (e.kind === "shield")
        expect(d.elapsedMs).toBeGreaterThanOrEqual(360000);
      expect(e.offset01).toBeGreaterThanOrEqual(0.12);
      expect(e.offset01).toBeLessThanOrEqual(0.88);
    }
    counts.set(
      d.settings.stage,
      (counts.get(d.settings.stage) ?? 0) + spawns.length,
    );
    expect(spawns.length).toBeLessThanOrEqual(d.settings.maxActiveEnemies);
    expect(d.timeToSpawnMs).toBeGreaterThan(0);
    d.advance(d.timeToSpawnMs);
  }
  expect(elites).toHaveLength(5);
  elites.forEach((e, i) => {
    expect(e.at).toBeGreaterThanOrEqual(eliteBalance.windows[i]![0]);
    expect(e.at).toBeLessThanOrEqual(eliteBalance.windows[i]![1]);
  });
  expect(elites.slice(0, 2).every((e) => e.kind === "runner")).toBe(true);
  expect((counts.get(9) ?? 0) / 60).toBeGreaterThan(
    ((counts.get(0) ?? 0) / 180) * 5,
  );
  expect(Math.max(...hordeBalance.stages.map((s) => s.maxActiveEnemies))).toBe(
    180,
  );
});
it("reserves room for elites and retries a full battlefield without a regular backlog", () => {
  const d = new SpawnDirector(() => 0.5);
  d.spawn(0);
  d.advance(270000);
  expect(d.spawn(70)).toEqual([]);
  d.advance(d.timeToSpawnMs);
  const retry = d.spawn(69);
  expect(retry).toHaveLength(1);
  expect(retry[0]).toMatchObject({ kind: "runner", elite: true });
  expect(d.timeToSpawnMs).toBeGreaterThan(0);
});
