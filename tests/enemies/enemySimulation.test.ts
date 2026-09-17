import { describe, expect, it } from "vitest";
import { enemyConfigs } from "../../src/game/data/enemies";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { advanceEnemy } from "../../src/game/enemies/enemySimulation";

describe("enemy simulation", () => {
  it("freezes movement and wall attack time, then resumes only after thaw", () => {
    const enemy = {
      ...createPrototypeEnemy("grunt", "left", 1),
      frozenMs: 1500,
    };
    expect(advanceEnemy(enemy, 1000, enemyConfigs.grunt).enemy.progress01).toBe(
      0,
    );
    expect(
      advanceEnemy(enemy, 2000, enemyConfigs.grunt).enemy.progress01,
    ).toBeCloseTo(0.02);
    const atWall = { ...enemy, progress01: 1 };
    expect(advanceEnemy(atWall, 2000, enemyConfigs.grunt).wallTimeMs).toBe(500);
  });
  it.each(["grunt", "runner", "shield"] as const)(
    "moves %s at its configured speed without mutating its spawn",
    (kind) => {
      const enemy = createPrototypeEnemy(kind, "left", 7);
      expect(enemy).toEqual({
        id: 7,
        hp: enemyConfigs[kind].hp,
        frozenMs: 0,
        kind,
        lane: "left",
        offset01: 0.5,
        progress01: 0,
        phase: "moving",
      });
      const result = advanceEnemy(enemy, 2000, enemyConfigs[kind]);
      expect(result.enemy.progress01).toBeCloseTo(
        enemyConfigs[kind].progressPerSecond * 2,
      );
      expect(result.enemy.phase).toBe("moving");
      expect(result.wallTimeMs).toBe(0);
      expect(enemy.progress01).toBe(0);
    },
  );

  it("clamps at the wall and counts only time after arrival, independent of tick subdivision", () => {
    const enemy = createPrototypeEnemy("grunt", "right", 8, 0.2);
    const config = enemyConfigs.grunt;
    const arrival = advanceEnemy(enemy, 25000, config);
    expect(arrival.enemy).toEqual({
      ...enemy,
      progress01: 1,
      phase: "attacking",
    });
    expect(arrival.wallTimeMs).toBe(0);
    const whole = advanceEnemy(enemy, 30000, config);
    const before = advanceEnemy(enemy, 20000, config);
    const after = advanceEnemy(before.enemy, 10000, config);
    expect(whole.enemy).toEqual(arrival.enemy);
    expect(whole.wallTimeMs).toBe(5000);
    expect(after.enemy).toEqual(whole.enemy);
    expect(before.wallTimeMs + after.wallTimeMs).toBeCloseTo(whole.wallTimeMs);
    expect(advanceEnemy(arrival.enemy, 750, config).wallTimeMs).toBe(750);
  });

  it("does not move or accumulate wall time for nonpositive delta or zero movement speed", () => {
    const enemy = createPrototypeEnemy("runner", "center", 9);
    for (const deltaMs of [0, -10]) {
      expect(advanceEnemy(enemy, deltaMs, enemyConfigs.runner)).toEqual({
        enemy,
        wallTimeMs: 0,
      });
      const atWall = { ...enemy, progress01: 1, phase: "attacking" as const };
      expect(advanceEnemy(atWall, deltaMs, enemyConfigs.runner)).toEqual({
        enemy: atWall,
        wallTimeMs: 0,
      });
    }
    expect(
      advanceEnemy(enemy, 10000, {
        ...enemyConfigs.runner,
        progressPerSecond: 0,
      }),
    ).toEqual({ enemy, wallTimeMs: 0 });
  });
});
