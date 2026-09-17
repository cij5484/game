import { describe, expect, it } from "vitest";
import { Stimpack } from "../../src/game/combat/stimpack";
import { stimpackBalance } from "../../src/game/data/balance";

describe("Stimpack", () => {
  it("boosts, locks primary for one second, then recovers over two seconds", () => {
    const stim = new Stimpack(stimpackBalance);
    expect(stim.phase).toBe("normal");
    expect(stim.activate()).toBe(true);
    expect(stim.attackSpeedMultiplier).toBe(1.5);
    expect(stim.activate()).toBe(false);
    stim.advance(5000);
    expect(stim.phase).toBe("crash");
    expect(stim.canAttack).toBe(false);
    stim.advance(999);
    expect(stim.canAttack).toBe(false);
    stim.advance(1);
    expect(stim.phase).toBe("recovery");
    expect(stim.canAttack).toBe(true);
    expect(stim.attackSpeedMultiplier).toBe(0);
    stim.advance(1000);
    expect(stim.attackSpeedMultiplier).toBe(0.5);
    stim.advance(1000);
    expect(stim.phase).toBe("normal");
    expect(stim.attackSpeedMultiplier).toBe(1);
    expect(stim.activate()).toBe(true);
    stim.advance(20000);
    expect(stim.phase).toBe("normal");
  });

  it("converts real time and weapon time without frame-rate-dependent recovery", () => {
    const stim = new Stimpack(stimpackBalance);
    stim.activate();
    expect(stim.weaponTimeFor(100)).toBe(150);
    expect(stim.realTimeFor(150)).toBe(100);
    stim.advance(5000);
    expect(stim.weaponTimeFor(1000)).toBe(0);
    stim.advance(1000);
    expect(stim.weaponTimeFor(2000)).toBe(1000);
    expect(stim.realTimeFor(250)).toBe(1000);
    const firstHalf = stim.weaponTimeFor(1000);
    stim.advance(1000);
    expect(firstHalf + stim.weaponTimeFor(1000)).toBe(1000);
    expect(stim.realTimeFor(750)).toBe(1000);
    expect(stim.timeToBoundaryMs).toBe(1000);
  });
});

it("upgrades stim without resetting its phase or allowing negative boundaries", () => {
  const stim = new Stimpack(stimpackBalance);
  stim.activate();
  stim.advance(2000);
  stim.setUpgrades({ "stim-duration": 2, "stim-speed": 2 });
  expect(stim.timeToBoundaryMs).toBe(4000);
  expect(stim.attackSpeedMultiplier).toBeCloseTo(1.7);
  stim.advance(4000);
  expect(stim.timeToBoundaryMs).toBe(1000);
  stim.advance(2800);
  stim.setUpgrades({ "stim-recovery": 2 });
  expect(stim.phase).toBe("normal");
  expect(stim.timeToBoundaryMs).toBe(Infinity);
});
