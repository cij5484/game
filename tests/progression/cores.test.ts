import { expect, it } from "vitest";
import { Cores } from "../../src/game/progression/cores";
import { coreBalance, coreEffects } from "../../src/game/data/cores";
it("drops distinct run-only rules with a hard two-core ceiling", () => {
  const cores = new Cores();
  expect(cores.tryDrop(() => 1)).toBeNull();
  expect(cores.tryDrop(() => 0)?.id).toBe("tactical-expansion");
  expect(cores.tryDrop(() => 0)?.id).toBe("relic-expansion");
  expect(cores.tryDrop(() => 0)).toBeNull();
  expect(cores.owned.size).toBe(coreBalance.maxPerRun);
  expect(new Cores().owned.size).toBe(0);
});
it("can draw candidate expansion and resonance instead of removed rarity or forced-growth rules", () => {
  const picks = (value: number) => {
    const c = new Cores();
    let roll = 0;
    return c.tryDrop(() => (roll++ === 0 ? 0 : value))?.id;
  };
  expect(picks(0.6)).toBe("choice-expansion");
  expect(picks(0.9)).toBe("resonance");
  expect(coreEffects(new Set(["choice-expansion"]))).toEqual({
    synergyMultiplier: 1,
  });
  expect(coreEffects(new Set(["resonance"]))).toEqual({
    synergyMultiplier: 1.5,
  });
});
