import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { primaryAttack } from "../../src/game/combat/primaryAttack";
import { expect, it } from "vitest";
import {
  gaussRifleBalance,
  stimpackBalance,
} from "../../src/game/data/balance";
import { GaussRifle } from "../../src/game/combat/gaussRifle";
import { Stimpack } from "../../src/game/combat/stimpack";
it("base rifle fires automatically at the slow single-shot prototype cadence", () => {
  const rifle = new GaussRifle(gaussRifleBalance),
    shots: number[] = [];
  rifle.advance(999, (time) => {
    shots.push(time);
  });
  expect(shots).toEqual([0, 800]);
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

it("an unupgraded normal Gauss hit kills an opening Grunt", () => {
  const grunt = createPrototypeEnemy("grunt", "center", 1);
  const result = primaryAttack(
    grunt,
    [grunt],
    {},
    gaussRifleBalance.damagePerRound,
    {},
    [],
    { shotIndex: 1, random: () => 1 },
  );
  expect(result.enemies[0]!.hp).toBe(0);
});
