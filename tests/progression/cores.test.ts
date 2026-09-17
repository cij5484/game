import { expect, it } from "vitest";
import { Cores } from "../../src/game/progression/cores";
import { coreBalance, coreEffects } from "../../src/game/data/cores";

it("drops distinct run-only rule changes with a hard two-core ceiling", () => {
  const cores = new Cores();
  expect(cores.tryDrop({}, () => 1)).toBeNull();
  expect(cores.tryDrop({}, () => 0)?.id).toBe("tactical-expansion");
  expect(cores.tryDrop({}, () => 0)?.id).toBe("relic-expansion");
  expect(cores.tryDrop({}, () => 0)).toBeNull();
  expect(cores.owned.size).toBe(coreBalance.maxPerRun);
  expect(new Cores().owned.size).toBe(0);
  expect(coreEffects(new Set(["luck", "resonance"]))).toMatchObject({
    rarityModifiers: { RARE: 1.5, EPIC: 2, LEGENDARY: 3 },
    synergyMultiplier: 1.5,
  });
});
