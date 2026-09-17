import { describe, expect, it } from "vitest";
import { Burst } from "../../src/game/combat/burst";

describe("instant character ultimate gauge", () => {
  it("requires full charge, consumes it once, and immediately returns to charging", () => {
    const burst = new Burst();
    expect(burst.activate()).toBe(false);
    burst.credit({ hits: 10, kills: 2, eliteKills: 1 });
    expect(burst.gauge).toBeCloseTo(6.36);
    burst.credit({ eliteKills: 20 });
    expect(burst.ready).toBe(true);
    expect(burst.gauge).toBe(100);
    expect(burst.activate()).toBe(true);
    expect(burst.gauge).toBe(0);
    expect(burst.ready).toBe(false);
    expect(burst.activate()).toBe(false);
    burst.credit({ eliteKills: 1 });
    expect(burst.gauge).toBe(6);
  });

  it("rejects invalid credit and never converts elapsed time directly into gauge", () => {
    const burst = new Burst();
    burst.credit({ kills: Infinity, hits: NaN, eliteKills: -5 });
    burst.advanceCharge(Infinity);
    burst.advanceCharge(-1000);
    burst.advanceCharge(300000);
    expect(burst.gauge).toBe(0);
    burst.credit({ kills: 10000 });
    expect(burst.gauge).toBe(3);
    burst.credit({ kills: 10000 });
    expect(burst.gauge).toBe(3);
    burst.advanceCharge(1000);
    expect(burst.gauge).toBe(3);
    burst.credit({ hits: 10000 });
    expect(burst.gauge).toBeCloseTo(3.45);
  });

  it("discards credit at full gauge without banking another activation", () => {
    const burst = new Burst();
    burst.credit({ eliteKills: 10000 });
    burst.credit({ kills: 10000 });
    expect(burst.gauge).toBe(100);
    burst.activate();
    expect(burst.gauge).toBe(0);
    expect(burst.activate()).toBe(false);
  });

  it("retains the five-minute rare-event charge budget with seven elites", () => {
    const burst = new Burst();
    let activations = 0;
    burst.credit({ kills: 10000 });
    for (let second = 1; second <= 300; second++) {
      burst.advanceCharge(1000);
      burst.credit({ hits: 10000, kills: 10000 });
      if (second >= 60 && (second - 60) % 40 === 0)
        burst.credit({ eliteKills: 1 });
      if (burst.activate()) activations++;
    }
    expect(activations).toBe(1);
    expect(activations * 100 + burst.gauge).toBeLessThanOrEqual(180.000001);
  });
});
