import { describe, expect, it } from "vitest";
import { enemyConfigs } from "../../src/game/data/enemies";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { advanceEnemy } from "../../src/game/enemies/enemySimulation";

describe("spawn-time enemy growth", () => {
  it.each([
    [1, 1],
    [10, 1.2448],
    [20, 1.6688],
    [40, 2.9968],
    [60, 4.9648],
  ])(
    "applies character level %i to body and shield HP only at spawn",
    (level, multiplier) => {
      for (const kind of ["grunt", "runner", "shield"] as const) {
        for (const elite of [false, true]) {
          const base = createPrototypeEnemy(
            kind,
            "center",
            1,
            0.5,
            elite,
            600000,
          );
          const scaled = createPrototypeEnemy(
            kind,
            "center",
            1,
            0.5,
            elite,
            600000,
            level,
          );
          expect(scaled.hp).toBeCloseTo(base.hp * multiplier);
          expect(scaled.maxHp).toBe(scaled.hp);
          expect(scaled.speedMultiplier).toBe(base.speedMultiplier);
          if (kind === "shield") {
            expect(scaled.shieldHp).toBeCloseTo(base.shieldHp! * multiplier);
            expect(scaled.maxShieldHp).toBe(scaled.shieldHp);
          }
          expect(
            advanceEnemy(scaled, 1000, enemyConfigs[scaled.kind]).enemy.hp,
          ).toBe(scaled.hp);
        }
      }
    },
  );

  it.each([
    [-1000, 8, 0.0312],
    [0, 8, 0.0312],
    [600000, 8.4, 0.04008],
    [1200000, 8.8, 0.04896],
    [2400000, 8.8, 0.04896],
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
      1200000,
    );
    const nearWall = { ...enemy, progress01: 1 - 0.02448 };
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
      1200000,
    );
    const shield = createPrototypeEnemy(
      "shield",
      "right",
      2,
      0.5,
      false,
      1200000,
    );
    const elite = createPrototypeEnemy(
      "grunt",
      "center",
      3,
      0.5,
      true,
      1200000,
    );
    expect(runner.hp).toBeCloseTo(11);
    expect(shield.hp).toBeCloseTo(22);
    expect(elite.hp).toBeCloseTo(88);
    expect(elite.maxHp).toBeCloseTo(88);
    expect(elite.elite).toBe(true);
    expect(
      advanceEnemy(elite, 1000, enemyConfigs.runner).enemy.progress01,
    ).toBeCloseTo(0.11475);
    const eliteShield = createPrototypeEnemy(
      "shield",
      "center",
      5,
      0.5,
      true,
      1200000,
    );
    expect(
      advanceEnemy(eliteShield, 1000, enemyConfigs.shield).enemy.progress01,
    ).toBeCloseTo(0.03366);
    expect(
      advanceEnemy(runner, 1000, enemyConfigs.runner).enemy.progress01,
    ).toBeCloseTo(0.11475);
    expect(
      advanceEnemy(shield, 1000, enemyConfigs.shield).enemy.progress01,
    ).toBeCloseTo(0.03825);
    expect(createPrototypeEnemy("grunt", "left", 4).hp).toBe(8);
    expect(enemyConfigs.grunt.progressPerSecond).toBe(0.032);
  });
});
