import { expect, it } from "vitest";
import { SpawnDirector } from "../../src/game/waves/spawnDirector";
import { hordeBalance } from "../../src/game/data/horde";
import { eliteBalance } from "../../src/game/data/elite";
import { runBalance } from "../../src/game/data/run";

it("starts with distant grunts, respects capacity and discards blocked spawn opportunities", () => {
  const d = new SpawnDirector(() => 0.5);
  const initial = d.spawn(0);
  expect(initial).toHaveLength(36);
  expect(
    initial
      .slice(0, 3)
      .every((e) => e.progress01 >= 0.43 && e.progress01 <= 0.445),
  ).toBe(true);
  expect(
    initial
      .slice(3)
      .every(
        (e) =>
          e.kind === "grunt" && e.progress01 >= 0.08 && e.progress01 <= 0.3,
      ),
  ).toBe(true);
  d.advance(d.timeToSpawnMs);
  expect(d.spawn(175)).toEqual([]);
  expect(d.timeToSpawnMs).toBeGreaterThan(0);
  d.advance(d.timeToSpawnMs);
  expect(d.spawn(173)).toHaveLength(1);
});
it("spreads the first three enemies across lanes even with identical random rolls", () => {
  const d = new SpawnDirector(() => 0.5);
  const initial = d.spawn(0);
  expect(new Set(initial.slice(0, 3).map((enemy) => enemy.lane)).size).toBe(3);
  d.advance(d.timeToSpawnMs);
  const batch = d.spawn(0);
  expect(new Set(batch.slice(0, 3).map((enemy) => enemy.lane)).size).toBe(3);
});
it("changes phase exactly and steadily raises supply and active capacity", () => {
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
  for (let i = 1; i < hordeBalance.stages.length; i++) {
    const previous = hordeBalance.stages[i - 1]!;
    const next = hordeBalance.stages[i]!;
    expect(next.batchSize / next.spawnIntervalMs).toBeGreaterThan(
      previous.batchSize / previous.spawnIntervalMs,
    );
    expect(next.maxActiveEnemies).toBeGreaterThanOrEqual(
      previous.maxActiveEnemies,
    );
  }
  expect(hordeBalance.stages.at(-1)!.atMs / runBalance.combatTempo).toBe(
    19 * 60000,
  );
});
it("keeps five bounded elite windows without simulating a full run", () => {
  const d = new SpawnDirector(() => 0.5);
  d.spawn(0);
  for (const [index, [start, end]] of eliteBalance.windows.entries()) {
    const at = (start + end) / 2;
    d.advance(at - d.elapsedMs);
    const spawns = d.spawn(0);
    const elites = spawns.filter((e) => e.elite);
    expect(elites).toHaveLength(1);
    if (index < 2) expect(elites[0]!.kind).toBe("runner");
    for (const e of spawns) {
      expect(e.offset01).toBeGreaterThanOrEqual(0.12);
      expect(e.offset01).toBeLessThanOrEqual(0.88);
    }
    expect(spawns.length).toBeLessThanOrEqual(d.settings.maxActiveEnemies);
    expect(d.timeToSpawnMs).toBeGreaterThan(0);
  }
});
it("fills the late horde to a finite 700-enemy ceiling without a spawn backlog", () => {
  const d = new SpawnDirector(() => 0.5);
  d.spawn(0);
  d.advance(hordeBalance.stages.at(-1)!.atMs);
  let active = 0;
  for (let batch = 0; batch < 12; batch++) {
    active += d.spawn(active).length;
    expect(active).toBeLessThanOrEqual(d.settings.maxActiveEnemies);
    // Direct jump leaves five due elite events; drain those before advancing.
    expect(d.timeToSpawnMs).toBeGreaterThanOrEqual(0);
    d.advance(d.timeToSpawnMs);
  }
  expect(active).toBeGreaterThanOrEqual(699);
  expect(active).toBeLessThanOrEqual(700);
  // A cleared screen receives one current batch, never all missed batches.
  expect(d.spawn(0).length).toBeLessThanOrEqual(98);
});
it("reserves room for elites and retries a full battlefield without a regular backlog", () => {
  const d = new SpawnDirector(() => 0.5);
  d.spawn(0);
  d.advance(270000);
  expect(d.spawn(250)).toEqual([]);
  d.advance(d.timeToSpawnMs);
  const retry = d.spawn(249);
  expect(retry).toHaveLength(1);
  expect(retry[0]).toMatchObject({ kind: "runner", elite: true });
  expect(d.timeToSpawnMs).toBeGreaterThan(0);
});
