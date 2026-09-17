import { describe, expect, it } from "vitest";
import { SpawnDirector } from "../../src/game/waves/spawnDirector";
import { hordeBalance } from "../../src/game/data/horde";
import { runBalance } from "../../src/game/data/run";

describe("five-minute encounter director", () => {
  it("starts with 45 visible grunts and sustains 60–80 capacity in the first 30 seconds", () => {
    const director = new SpawnDirector(() => 0.5);
    const initial = director.spawn(0);
    expect(initial).toHaveLength(45);
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
    expect(active).toBeLessThanOrEqual(80);
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
      batchSize: 3,
    });
    expect(director.spawn(120)).toEqual([]);
    director.advance(director.timeToSpawnMs);
    expect(director.spawn(0)).toHaveLength(3);
    expect(director.spawn(0)).toEqual([]);
  });

  it("reserves an elite slot at 60 seconds and retries capacity without backlog", () => {
    const director = new SpawnDirector(() => 0.5);
    director.spawn(0);
    director.advance(59000);
    expect(director.spawn(89).some((enemy) => enemy.elite)).toBe(false);
    director.advance(1000);
    const first = director.spawn(94);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      kind: "grunt",
      elite: true,
      progress01: 0,
    });
    director.advance(40000);
    expect(director.spawn(95)).toEqual([]);
    expect(director.timeToSpawnMs).toBeGreaterThan(0);
    director.advance(director.timeToSpawnMs);
    expect(director.spawn(94).filter((enemy) => enemy.elite)).toHaveLength(1);
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
      maxActiveEnemies: 120,
      batchSize: 12,
      spawnIntervalMs: 900,
    });
    expect(
      hordeBalance.stages.every((stage) => stage.atMs < runBalance.durationMs),
    ).toBe(true);
  });
});
