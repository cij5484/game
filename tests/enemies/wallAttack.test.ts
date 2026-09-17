import { describe, expect, it } from "vitest";
import { advanceWallAttack } from "../../src/game/enemies/wallAttack";
import { applyWallDamage, createRunState } from "../../src/game/model/runState";

const config = { wallAttackIntervalMs: 1000, wallAttackDamage: 5 };

describe("wall attacks", () => {
  it("waits a full interval and carries the remainder into later ticks", () => {
    expect(advanceWallAttack(0, 0, config)).toEqual({
      elapsedMs: 0,
      damage: 0,
    });
    const first = advanceWallAttack(0, 600, config);
    expect(first).toEqual({ elapsedMs: 600, damage: 0 });
    expect(advanceWallAttack(first.elapsedMs, 500, config)).toEqual({
      elapsedMs: 100,
      damage: 5,
    });
    expect(advanceWallAttack(100, 900, config)).toEqual({
      elapsedMs: 0,
      damage: 5,
    });
  });

  it("counts every complete interval in a long frame", () => {
    expect(advanceWallAttack(250, 3000, config)).toEqual({
      elapsedMs: 250,
      damage: 15,
    });
    expect(
      advanceWallAttack(0, 1600, {
        wallAttackIntervalMs: 750,
        wallAttackDamage: 3,
      }),
    ).toEqual({ elapsedMs: 100, damage: 6 });
  });

  it("does not tick for nonpositive wall time", () => {
    expect(advanceWallAttack(600, -100, config)).toEqual({
      elapsedMs: 600,
      damage: 0,
    });
    expect(advanceWallAttack(600, 0, config)).toEqual({
      elapsedMs: 600,
      damage: 0,
    });
  });

  it.each([0, -1, NaN, Infinity])(
    "rejects invalid interval %s",
    (wallAttackIntervalMs) => {
      expect(() =>
        advanceWallAttack(0, 1000, { ...config, wallAttackIntervalMs }),
      ).toThrow(RangeError);
    },
  );
});

describe("wall run state", () => {
  it("applies damage without mutating the previous state", () => {
    const state = createRunState(20);
    expect(applyWallDamage(state, 5)).toEqual({
      wallHp: 15,
      elapsedMs: 0,
      status: "running",
    });
    expect(state).toEqual({ wallHp: 20, status: "running", elapsedMs: 0 });
    expect(applyWallDamage(state, -5)).toEqual(state);
  });

  it("clamps lethal damage to zero and never revives a failed run", () => {
    const failed = applyWallDamage(createRunState(20), 25);
    expect(failed).toEqual({ wallHp: 0, status: "failed", elapsedMs: 0 });
    expect(applyWallDamage(failed, -20)).toEqual(failed);
    expect(applyWallDamage(failed, 10)).toEqual(failed);
    expect(applyWallDamage(createRunState(20), 20)).toEqual(failed);
    expect(createRunState(0)).toEqual(failed);
  });
});
