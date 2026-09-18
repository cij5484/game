import { describe, expect, it } from "vitest";
import { Stimpack } from "../../src/game/combat/stimpack";
import { stimpackBalance } from "../../src/game/data/balance";

describe("Stimpack", () => {
  it("reports current-phase progress from simulated time", () => {
    const stim = new Stimpack(stimpackBalance);
    expect(stim.phaseProgress).toBe(1);
    stim.activate();
    expect(stim.phaseProgress).toBe(0);
    stim.advance(2500);
    expect(stim.phaseProgress).toBe(0.5);
    stim.advance(3000);
    expect(stim.phase).toBe("crash");
    expect(stim.phaseProgress).toBe(0.5);
    stim.advance(1500);
    expect(stim.phase).toBe("recovery");
    expect(stim.phaseProgress).toBe(0.5);
    stim.advance(1000);
    expect(stim.phaseProgress).toBe(1);
  });
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

it("compressed foundation growth keeps the current phase and stable branch safely shortens recovery", () => {
  const stim = new Stimpack(stimpackBalance);
  stim.activate();
  stim.advance(2000);
  stim.setUpgrades({ "stim-growth": 2 });
  expect(stim.timeToBoundaryMs).toBe(4000);
  expect(stim.attackSpeedMultiplier).toBeCloseTo(1.8);
  stim.advance(4000);
  expect(stim.timeToBoundaryMs).toBe(1000);
  stim.advance(2800);
  stim.setUpgrades({ "stim-growth": 5 }, { "stim-growth": "b" });
  expect(stim.phase).toBe("normal");
});
it("high-dose trades powerful automatic fire for longer recovery while stable dose shortens the cycle", () => {
  const high = new Stimpack(stimpackBalance);
  high.setUpgrades({ "stim-growth": 5 }, { "stim-growth": "a" });
  high.activate();
  expect(high.attackSpeedMultiplier).toBeCloseTo(2.7);
  expect(high.primaryDamageMultiplier).toBe(1.35);
  high.advance(7000);
  expect(high.phase).toBe("crash");
  expect(high.timeToBoundaryMs).toBe(1000);
  high.advance(1000);
  expect(high.timeToBoundaryMs).toBe(4000);
  expect(high.primaryDamageMultiplier).toBe(1);
  const stable = new Stimpack(stimpackBalance);
  stable.setUpgrades({ "stim-growth": 5 }, { "stim-growth": "b" });
  stable.activate();
  expect(stable.attackSpeedMultiplier).toBeCloseTo(1.7);
  stable.advance(5500);
  expect(stable.timeToBoundaryMs).toBe(500);
  stable.advance(500);
  expect(stable.timeToBoundaryMs).toBe(700);
});
it("stable crash shortening never creates a negative phase boundary when upgraded during crash", () => {
  const stim = new Stimpack(stimpackBalance);
  stim.activate();
  stim.advance(5900);
  stim.setUpgrades({ "stim-growth": 5 }, { "stim-growth": "b" });
  expect(stim.phase).toBe("recovery");
  expect(stim.timeToBoundaryMs).toBe(700);
  expect(stim.attackSpeedMultiplier).toBe(0);
});

it("caps adrenaline extension across all kill transactions and increases recovery without changing crash", () => {
  const stim = new Stimpack(stimpackBalance);
  expect(stim.extendBoost(500, 3000, 0.5)).toBe(0);
  stim.activate();
  for (let i = 0; i < 6; i++)
    expect(stim.extendBoost(500, 3000, 0.5)).toBe(500);
  expect(stim.extendBoost(1000, 3000, 0.5)).toBe(0);
  stim.advance(8000);
  expect(stim.phase).toBe("crash");
  expect(stim.timeToBoundaryMs).toBe(1000);
  stim.advance(1000);
  expect(stim.phase).toBe("recovery");
  expect(stim.timeToBoundaryMs).toBe(3500);
  expect(stim.weaponTimeFor(3500)).toBe(1750);
  expect(stim.realTimeFor(1750)).toBe(3500);
  stim.advance(3500);
  stim.activate();
  expect(stim.timeToBoundaryMs).toBe(5000);
});
it("does not extend boost from invalid values or alter recovery when no extension was accepted", () => {
  const stim = new Stimpack(stimpackBalance);
  stim.activate();
  expect(stim.extendBoost(Infinity, 3000, 0.5)).toBe(0);
  expect(stim.extendBoost(-10, 3000, 0.5)).toBe(0);
  stim.advance(6000);
  expect(stim.timeToBoundaryMs).toBe(2000);
});

it("integrates and inverts the longer recovery consistently after partial recovery has elapsed", () => {
  const stim = new Stimpack(stimpackBalance);
  stim.activate();
  stim.extendBoost(3000, 3000, 0.5);
  stim.advance(9000);
  const firstQuarter = stim.weaponTimeFor(875);
  expect(firstQuarter).toBeCloseTo(109.375);
  stim.advance(875);
  expect(stim.attackSpeedMultiplier).toBe(0.25);
  expect(stim.realTimeFor(328.125)).toBeCloseTo(875);
  const secondQuarter = stim.weaponTimeFor(875);
  expect(secondQuarter).toBeCloseTo(328.125);
  stim.advance(875);
  expect(firstQuarter + secondQuarter + stim.weaponTimeFor(1750)).toBeCloseTo(
    1750,
  );
});

it("adrenaline debt remains bounded on stable dosing and its shorter recovery still integrates correctly", () => {
  const stim = new Stimpack(stimpackBalance);
  stim.setUpgrades({ "stim-growth": 5 }, { "stim-growth": "b" });
  stim.activate();
  expect(stim.extendBoost(10000, 3000, 0.5)).toBe(3000);
  expect(stim.extendBoost(10000, 3000, 0.5)).toBe(0);
  stim.advance(8500);
  expect(stim.phase).toBe("crash");
  expect(stim.timeToBoundaryMs).toBe(500);
  stim.advance(500);
  expect(stim.timeToBoundaryMs).toBe(2200);
  expect(stim.weaponTimeFor(1100)).toBe(275);
  expect(stim.realTimeFor(275)).toBe(1100);
});
