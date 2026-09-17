import { describe, expect, it } from "vitest";
import { Burst } from "../../src/game/combat/burst";
import { burstBalance } from "../../src/game/data/burst";

describe("Burst", () => {
  it("charges from combat results, requires manual activation, and cannot recharge in rhythm", () => {
    const burst = new Burst();
    expect(burst.activate()).toBe(false);
    burst.credit({ hits: 10, kills: 2, eliteKills: 1 });
    expect(burst.gauge).toBeCloseTo(6.36);
    burst.credit({ eliteKills: 20 });
    expect(burst.gauge).toBe(burstBalance.gaugeMax);
    expect(burst.ready).toBe(true);
    expect(burst.phase).toBe("idle");
    expect(burst.activate()).toBe(true);
    expect(burst.activate()).toBe(false);
    burst.credit({ kills: 200 });
    expect(burst.gauge).toBe(0);
  });

  it("grades five beats in real time and completes exactly once", () => {
    const burst = new Burst();
    burst.credit({ eliteKills: 20 });
    burst.activate();
    burst.advance(500);
    expect(burst.tap()).toBe("PERFECT");
    burst.advance(580);
    expect(burst.tap()).toBe("GOOD");
    burst.advance(420);
    expect(burst.tap()).toBe("PERFECT");
    burst.advance(500);
    expect(burst.tap()).toBe("PERFECT");
    burst.advance(500);
    expect(burst.tap()).toBe("PERFECT");
    expect(burst.advance(499)).toBeNull();
    expect(burst.advance(1)).toEqual({
      score: 0.9,
      grades: ["PERFECT", "GOOD", "PERFECT", "PERFECT", "PERFECT"],
    });
    expect(burst.phase).toBe("idle");
    expect(burst.advance(1000)).toBeNull();
    expect(burst.tap()).toBeNull();
  });

  it("consumes premature taps as misses, expires untouched beats, and still completes at zero score", () => {
    const spam = new Burst();
    spam.credit({ eliteKills: 20 });
    spam.activate();
    expect(spam.tap()).toBe("MISS");
    expect(spam.tap()).toBe("MISS");
    expect(spam.tap()).toBe("MISS");
    expect(spam.tap()).toBe("MISS");
    expect(spam.tap()).toBe("MISS");
    expect(spam.tap()).toBeNull();
    expect(spam.advance(3000)?.score).toBe(0);
    spam.credit({ eliteKills: 20 });
    spam.activate();
    spam.advance(651);
    expect(spam.beatIndex).toBe(1);
    expect(spam.grades).toEqual(["MISS"]);
    expect(spam.advance(5000)).toEqual({
      score: 0,
      grades: ["MISS", "MISS", "MISS", "MISS", "MISS"],
    });
  });

  it("includes grading boundaries, expires only beyond GOOD, and ignores non-finite input", () => {
    const burst = new Burst();
    burst.credit({ kills: Infinity, hits: NaN, eliteKills: -5 });
    expect(burst.gauge).toBe(0);
    burst.credit({ eliteKills: 20 });
    burst.activate();
    burst.advance(Infinity);
    expect(burst.elapsedMs).toBe(0);
    burst.advance(570);
    expect(burst.tap()).toBe("PERFECT");
    burst.advance(580);
    expect(burst.beatIndex).toBe(1);
    expect(burst.tap()).toBe("GOOD");
    burst.advance(501);
    expect(burst.beatIndex).toBe(3);
    expect(burst.grades).toEqual(["PERFECT", "GOOD", "MISS"]);
  });

  it("limits dense combat credit using gameplay time without a saved-event backlog", () => {
    const burst = new Burst();
    burst.credit({ hits: 10000, kills: 10000 });
    expect(burst.gauge).toBe(3);
    burst.credit({ kills: 10000 });
    burst.advance(60000);
    burst.advanceCharge(Infinity);
    burst.advanceCharge(-1000);
    expect(burst.gauge).toBe(3);
    burst.advanceCharge(1000);
    expect(burst.gauge).toBe(3);
    burst.credit({ hits: 10000 });
    expect(burst.gauge).toBeCloseTo(3.45);
    burst.advanceCharge(60000);
    burst.credit({ kills: 10000, eliteKills: 1 });
    expect(burst.gauge).toBeCloseTo(12.45);
    burst.credit({ eliteKills: 20 });
    expect(burst.ready).toBe(true);
    burst.advanceCharge(60000);
    expect(burst.gauge).toBe(100);
    burst.activate();
    burst.advanceCharge(60000);
    burst.credit({ eliteKills: 20 });
    expect(burst.gauge).toBe(0);
  });

  it("bounds five-minute charge even with unlimited horde kills and seven elite bonuses", () => {
    const burst = new Burst();
    let activations = 0;
    burst.credit({ kills: 10000 });
    for (let second = 1; second <= 300; second++) {
      burst.advanceCharge(1000);
      burst.credit({ hits: 10000, kills: 10000 });
      if (second >= 60 && (second - 60) % 40 === 0) {
        burst.credit({ eliteKills: 1 });
      }
      if (burst.activate()) {
        activations++;
        burst.advance(3000);
      }
    }
    expect(activations).toBe(1);
    expect(activations * 100 + burst.gauge).toBeLessThanOrEqual(180.000001);
  });
});
