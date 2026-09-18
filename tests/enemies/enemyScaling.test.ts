import { describe, expect, it } from "vitest";
import { enemyConfigs } from "../../src/game/data/enemies";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { advanceEnemy } from "../../src/game/enemies/enemySimulation";

describe("spawn-time enemy growth", () => {
  it.each([
    [-1000, 8, 0.0208],
    [0, 8, 0.0208],
    [150000, 8.4, 0.02672],
    [300000, 8.8, 0.03264],
    [600000, 8.8, 0.03264],
  ])("gently scales a grunt spawned at %i ms", (elapsedMs, hp, speed) => {
    const enemy = createPrototypeEnemy(
      "grunt",
      "left",
      1,
      0.5,
      false,
      elapsedMs,
    );
    expect(enemy.hp).toBeCloseTo(hp);
    expect(enemy.maxHp).toBeCloseTo(hp);
    expect(
      advanceEnemy(enemy, 1000, enemyConfigs.grunt).enemy.progress01,
    ).toBeCloseTo(speed);
    expect(enemy.progress01).toBe(0);
  });

  it("retains spawn-time speed through frost, arrival and tick subdivision", () => {
    const enemy = createPrototypeEnemy(
      "grunt",
      "center",
      1,
      0.5,
      false,
      300000,
    );
    const nearWall = { ...enemy, progress01: 1 - 0.01632 };
    const whole = advanceEnemy(nearWall, 2000, enemyConfigs.grunt, 0.5);
    const first = advanceEnemy(nearWall, 500, enemyConfigs.grunt, 0.5);
    const second = advanceEnemy(first.enemy, 1500, enemyConfigs.grunt, 0.5);
    expect(whole.enemy.phase).toBe("attacking");
    expect(whole.wallTimeMs).toBeCloseTo(1000);
    expect(second.enemy).toEqual(whole.enemy);
    expect(first.wallTimeMs + second.wallTimeMs).toBeCloseTo(1000);
    expect(
      advanceEnemy(whole.enemy, 750, enemyConfigs.grunt, 0.5).wallTimeMs,
    ).toBe(750);
  });

  it("preserves runner, shield and elite differences without changing base configs", () => {
    const runner = createPrototypeEnemy(
      "runner",
      "left",
      1,
      0.5,
      false,
      300000,
    );
    const shield = createPrototypeEnemy(
      "shield",
      "right",
      2,
      0.5,
      false,
      300000,
    );
    const elite = createPrototypeEnemy("grunt", "center", 3, 0.5, true, 300000);
    expect(runner.hp).toBeCloseTo(22);
    expect(shield.hp).toBeCloseTo(66);
    expect(elite.hp).toBeCloseTo(35.2);
    expect(elite.maxHp).toBeCloseTo(35.2);
    expect(elite.elite).toBe(true);
    expect(
      advanceEnemy(runner, 1000, enemyConfigs.runner).enemy.progress01,
    ).toBeCloseTo(0.0816);
    expect(
      advanceEnemy(shield, 1000, enemyConfigs.shield).enemy.progress01,
    ).toBeCloseTo(0.0255);
    expect(createPrototypeEnemy("grunt", "left", 4).hp).toBe(8);
    expect(enemyConfigs.grunt.progressPerSecond).toBe(0.032);
  });
});
