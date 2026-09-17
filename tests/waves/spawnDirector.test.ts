import { describe, expect, it } from "vitest";
import { SpawnDirector } from "../../src/game/waves/spawnDirector";
import { hordeBalance } from "../../src/game/data/horde";
import { runBalance } from "../../src/game/data/run";

describe("five-minute encounter director", () => {
  it("starts with 48 visible grunts and fills the early horde while reserving an elite slot", () => {
    const director = new SpawnDirector(() => 0.5);
    const initial = director.spawn(0);
    expect(initial).toHaveLength(48);
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
    expect(active).toBe(71);
    expect(director.spawn(0)).toEqual([]);
  });

  it("changes encounter on the exact boundary and drops blocked spawn opportunities", () => {
    const director = new SpawnDirector();
    director.spawn(0);
    director.advance(29500);
    director.spawn(130);
    expect(director.timeToSpawnMs).toBe(500);
    director.advance(500);
    expect(director.settings).toMatchObject({
      phase: "relief",
      name: "BREATHING ROOM",
      batchSize: 5,
    });
    expect(director.spawn(130)).toEqual([]);
    director.advance(director.timeToSpawnMs);
    expect(director.spawn(0)).toHaveLength(5);
    expect(director.spawn(0)).toEqual([]);
  });

  it("reserves an elite slot at 60 seconds and retries capacity without backlog", () => {
    const director = new SpawnDirector(() => 0.5);
    director.spawn(0);
    director.advance(59000);
    expect(director.spawn(83).some((enemy) => enemy.elite)).toBe(false);
    director.advance(1000);
    const first = director.spawn(89);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      kind: "grunt",
      elite: true,
      progress01: 0,
    });
    director.advance(40000);
    expect(director.spawn(105)).toEqual([]);
    expect(director.timeToSpawnMs).toBeGreaterThan(0);
    director.advance(director.timeToSpawnMs);
    expect(director.spawn(104).filter((enemy) => enemy.elite)).toHaveLength(1);
  });

  it("keeps raising late-run capacity and replacement pressure through the last 15 seconds", () => {
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
      maxActiveEnemies: 170,
      batchSize: 20,
      spawnIntervalMs: 850,
    });
    director.advance(30000);
    expect(director.settings.maxActiveEnemies).toBe(180);
    const final = director.spawn(165);
    expect(final).toHaveLength(14);
    director.advance(director.timeToSpawnMs);
    expect(director.spawn(0)).toHaveLength(24);
    expect(director.timeToSpawnMs).toBe(800);
    expect(
      hordeBalance.stages.every((stage) => stage.atMs < runBalance.durationMs),
    ).toBe(true);
  });

  it("keeps relief populated and returns to pressure after eight seconds", () => {
    const director = new SpawnDirector(() => 0.5);
    director.spawn(0);
    for (const atMs of [30000, 90000, 165000, 210000]) {
      director.advance(atMs - director.elapsedMs);
      expect(director.settings.phase).toBe("relief");
      expect(director.spawn(0).length).toBeGreaterThanOrEqual(3);
      director.advance(8000);
      expect(director.settings.phase).toBe("pressure");
    }
  });
});
