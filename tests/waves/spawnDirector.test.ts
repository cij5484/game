import { describe, expect, it } from "vitest";
import { SpawnDirector } from "../../src/game/waves/spawnDirector";

describe("horde spawn director", () => {
  it("starts with 30 visible grunts and reaches 40–50 in the first 30 seconds without kills", () => {
    const director = new SpawnDirector(() => 0.5);
    const initial = director.spawn(0);
    expect(initial).toHaveLength(30);
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
      const batch = director.spawn(active);
      expect(
        batch.every((enemy) => !enemy.elite && enemy.kind !== "shield"),
      ).toBe(true);
      active += batch.length;
    }
    expect(active).toBeGreaterThanOrEqual(40);
    expect(active).toBeLessThanOrEqual(50);
    expect(director.spawn(0)).toEqual([]);
  });

  it("reserves room for the first elite at 60s and retries full capacity without a backlog", () => {
    const director = new SpawnDirector(() => 0.5);
    director.spawn(0);
    director.advance(59000);
    expect(director.spawn(69).some((enemy) => enemy.elite)).toBe(false);
    director.advance(1000);
    const first = director.spawn(69);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      kind: "grunt",
      elite: true,
      progress01: 0,
    });
    director.advance(25000);
    expect(director.spawn(70)).toEqual([]);
    expect(director.timeToSpawnMs).toBeGreaterThan(0);
    director.advance(director.timeToSpawnMs);
    expect(director.spawn(69).filter((enemy) => enemy.elite)).toHaveLength(1);
    expect(director.spawn(0)).toEqual([]);
  });

  it("ramps density to 80 while retaining relief periods", () => {
    const director = new SpawnDirector();
    expect(director.settings).toMatchObject({
      stage: 0,
      phase: "pressure",
      batchSize: 4,
      maxActiveEnemies: 50,
    });
    director.advance(20000);
    expect(director.settings).toMatchObject({
      phase: "relief",
      spawnIntervalMs: 3600,
      batchSize: 2,
    });
    director.advance(10000);
    expect(director.settings).toMatchObject({ stage: 1, maxActiveEnemies: 60 });
    director.advance(30000);
    expect(director.settings).toMatchObject({ stage: 2, maxActiveEnemies: 70 });
    director.advance(60000);
    expect(director.settings).toMatchObject({
      stage: 3,
      spawnIntervalMs: 1400,
      batchSize: 7,
      maxActiveEnemies: 80,
    });
  });

  it("introduces enemy mixes by stage with weighted lanes and bounded offsets", () => {
    for (const [time, random, kind, lane] of [
      [2000, 0.89, "grunt", "right"],
      [2000, 0.95, "runner", "right"],
      [30000, 0.8, "runner", "right"],
      [30000, 0.99, "shield", "right"],
      [60000, 0.65, "runner", "center"],
      [60000, 0.99, "shield", "right"],
    ] as const) {
      const director = new SpawnDirector(() => random);
      director.spawn(0);
      director.advance(time);
      const enemy = director.spawn(0).find((enemy) => !enemy.elite)!;
      expect(enemy.kind).toBe(kind);
      expect(enemy.lane).toBe(lane);
      expect(enemy.offset01).toBeGreaterThanOrEqual(0.12);
      expect(enemy.offset01).toBeLessThanOrEqual(0.88);
      expect(enemy.progress01).toBe(0);
    }
  });
});
