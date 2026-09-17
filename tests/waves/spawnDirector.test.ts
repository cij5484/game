import { describe, expect, it } from "vitest";
import { SpawnDirector } from "../../src/game/waves/spawnDirector";

describe("horde spawn director", () => {
  it("starts populated, respects capacity and never banks blocked spawns", () => {
    const director = new SpawnDirector(() => 0.5);
    const initial = director.spawn(0);
    expect(initial).toHaveLength(12);
    expect(
      initial.every(
        (enemy) => enemy.progress01 > 0 && enemy.progress01 <= 0.35,
      ),
    ).toBe(true);
    expect(director.spawn(12)).toEqual([]);
    director.advance(director.timeToSpawnMs);
    expect(director.spawn(23)).toHaveLength(1);
    director.advance(director.timeToSpawnMs);
    expect(director.spawn(24)).toEqual([]);
    expect(director.timeToSpawnMs).toBe(3000);
    expect(director.spawn(0)).toEqual([]);
  });

  it("ramps the intensity while retaining short relief periods", () => {
    const director = new SpawnDirector();
    expect(director.settings).toMatchObject({
      stage: 0,
      phase: "pressure",
      batchSize: 3,
    });
    director.advance(20000);
    expect(director.settings).toMatchObject({
      phase: "relief",
      spawnIntervalMs: 5400,
      batchSize: 1,
    });
    director.advance(40000);
    expect(director.settings).toMatchObject({
      stage: 1,
      phase: "pressure",
      maxActiveEnemies: 36,
    });
    director.advance(120000);
    expect(director.settings).toMatchObject({
      stage: 3,
      spawnIntervalMs: 1200,
      batchSize: 6,
      maxActiveEnemies: 60,
    });
  });

  it("uses weighted enemy and lane selection with bounded lateral offsets", () => {
    for (const [random, kind, lane] of [
      [0, "grunt", "left"],
      [0.65, "runner", "center"],
      [0.99, "shield", "right"],
    ] as const) {
      const director = new SpawnDirector(() => random);
      const enemy = director.spawn(0)[0]!;
      expect(enemy.kind).toBe(kind);
      expect(enemy.lane).toBe(lane);
      expect(enemy.offset01).toBeGreaterThanOrEqual(0.12);
      expect(enemy.offset01).toBeLessThanOrEqual(0.88);
      director.advance(director.timeToSpawnMs);
      expect(director.spawn(0).every((next) => next.progress01 === 0)).toBe(
        true,
      );
    }
  });
});
