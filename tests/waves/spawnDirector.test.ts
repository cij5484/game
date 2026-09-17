import { describe, expect, it } from "vitest";
import { SpawnDirector } from "../../src/game/waves/spawnDirector";
import { hordeBalance } from "../../src/game/data/horde";
import { runBalance } from "../../src/game/data/run";

describe("five-minute encounter director", () => {
  it("starts with 65 visible grunts and keeps the early cap below late-run density", () => {
    const director = new SpawnDirector(() => 0.5);
    const initial = director.spawn(0);
    expect(initial).toHaveLength(65);
    expect(
      initial.every(
        (enemy) =>
          enemy.kind === "grunt" &&
          enemy.progress01 > 0 &&
          enemy.progress01 <= 0.45,
      ),
    ).toBe(true);
    let active = initial.length;
    while (director.elapsedMs + director.timeToSpawnMs < 30000) {
      director.advance(director.timeToSpawnMs);
      active += director.spawn(active).length;
    }
    expect(active).toBeGreaterThanOrEqual(60);
    expect(active).toBeLessThanOrEqual(90);
    expect(director.spawn(0)).toEqual([]);
  });

  it("changes encounter on the exact boundary and drops blocked spawn opportunities", () => {
    const director = new SpawnDirector();
    director.spawn(0);
    director.advance(29500);
    director.spawn(120);
    expect(director.timeToSpawnMs).toBe(500);
    director.advance(500);
    expect(director.settings).toMatchObject({
      phase: "relief",
      name: "BREATHING ROOM",
      batchSize: 10,
    });
    expect(director.spawn(120)).toEqual([]);
    director.advance(director.timeToSpawnMs);
    expect(director.spawn(0)).toHaveLength(10);
    expect(director.spawn(0)).toEqual([]);
  });

  it("reserves an elite slot at 60 seconds and retries capacity without backlog", () => {
    const director = new SpawnDirector(() => 0.5);
    director.spawn(0);
    director.advance(59000);
    expect(director.spawn(89).some((enemy) => enemy.elite)).toBe(false);
    director.advance(1000);
    const first = director.spawn(109);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      kind: "grunt",
      elite: true,
      progress01: 0,
    });
    director.advance(40000);
    expect(director.spawn(110)).toEqual([]);
    expect(director.timeToSpawnMs).toBeGreaterThan(0);
    director.advance(director.timeToSpawnMs);
    expect(director.spawn(109).filter((enemy) => enemy.elite)).toHaveLength(1);
  });

  it("uses named mixed pressure encounters ending in a 45-second maximum push", () => {
    expect(runBalance.durationMs).toBe(300000);
    const director = new SpawnDirector(() => 0.99);
    director.spawn(0);
    director.advance(60000);
    expect(director.spawn(0).some((enemy) => enemy.kind === "shield")).toBe(
      true,
    );
    director.advance(195000);
    expect(director.settings).toMatchObject({
      name: "FINAL PRESSURE",
      phase: "pressure",
      maxActiveEnemies: 160,
      batchSize: 30,
      spawnIntervalMs: 500,
    });
    expect(
      hordeBalance.stages.every((stage) => stage.atMs < runBalance.durationMs),
    ).toBe(true);
  });
});
