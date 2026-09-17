import { expect, it } from "vitest";
import {
  gaussRifleBalance,
  stimpackBalance,
} from "../../src/game/data/balance";
import { GaussRifle } from "../../src/game/combat/gaussRifle";
import { Stimpack } from "../../src/game/combat/stimpack";
it("base rifle fires automatically at the preserved average cadence", () => {
  const rifle = new GaussRifle(gaussRifleBalance),
    shots: number[] = [];
  rifle.advance(999, (time) => {
    shots.push(time);
  });
  expect(shots).toEqual([0, 200, 400, 600, 800]);
});
it("base stim keeps one-second crash and two-second recovery unless a branch changes them", () => {
  const stim = new Stimpack(stimpackBalance);
  stim.activate();
  stim.advance(stimpackBalance.boostMs);
  expect(stim.phase).toBe("crash");
  stim.advance(999);
  expect(stim.canAttack).toBe(false);
  stim.advance(1);
  expect(stim.phase).toBe("recovery");
  stim.advance(1999);
  expect(stim.phase).toBe("recovery");
  stim.advance(1);
  expect(stim.phase).toBe("normal");
});
