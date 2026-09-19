import { expect, it, vi } from "vitest";
import { MarineProgression } from "../../src/game/progression/marineProgression";
import {
  marineTraitIds,
  marineQualityIncrements,
} from "../../src/game/data/marineGrowth";

function crossing(rarityRoll = 0, greatSuccessRoll = 0) {
  const rolls = [0.9, 0, rarityRoll, 0, 0, 0, 0];
  const random = vi.fn(() => rolls.shift() ?? greatSuccessRoll);
  const p = new MarineProgression(random, undefined, 2);
  p.ranks.penetration = 4;
  p.quality.penetration = 4;
  p.pendingChoices = 2;
  expect(p.offer()[0]!.id).toBe("penetration");
  expect(p.choose("penetration")).toBe(true);
  return { p, random };
}

it("holds Lv4 +2 at mandatory Lv5 then applies the same growth remainder without any roll or choice cost", () => {
  const { p, random } = crossing();
  expect(p.ranks.penetration).toBe(5);
  expect(p.quality.penetration).toBe(5);
  expect(p.lastSelection).toMatchObject({
    levels: 2,
    appliedLevels: 1,
    greatSuccess: true,
  });
  expect(p.modBranchPending).toBe(true);
  expect(p.offerModBranch()).toMatchObject({
    traitId: "penetration",
    choices: [{ id: "a" }, { id: "b" }],
  });
  random.mockClear();
  expect(p.offer()).toEqual([]);
  expect(p.choose("primary-damage")).toBe(false);
  expect(p.reroll()).toBe(false);
  expect(p.chooseModBranch("unknown")).toBe(false);
  expect(p.chooseModBranch("a")).toBe(true);
  expect(random).not.toHaveBeenCalled();
  expect(p.pendingChoices).toBe(1);
  expect(p.rerollsRemaining).toBe(2);
  expect(p.ranks.penetration).toBe(6);
  expect(p.quality.penetration).toBe(6);
  expect(p.lastSelection?.appliedLevels).toBe(2);
  expect(p.branches.penetration).toBe("a");
  expect(p.growth.branches?.penetration).toBe("a");
  expect(p.chooseModBranch("b")).toBe(false);
  expect(p.offerModBranch()).toBeNull();
});

it("quality liberation promotes only applied growth, then the queued remainder once", () => {
  const { p } = crossing();
  expect(p.applyCore("quality")).toBe(true);
  expect(p.quality.penetration).toBeCloseTo(
    4 + marineQualityIncrements.penetration.RARE,
  );
  expect(p.chooseModBranch("b")).toBe(true);
  expect(p.quality.penetration).toBeCloseTo(
    4 + 2 * marineQualityIncrements.penetration.RARE,
  );
  expect(p.history).toHaveLength(1);
  expect(p.history[0]).toMatchObject({
    levels: 2,
    appliedLevels: 2,
    originalRarity: "COMMON",
    rarity: "RARE",
  });
});

it("keeps Legendary independent and requests a branch even for a single level reaching five", () => {
  const { p } = crossing(0.9999, 0.5);
  expect(p.ranks.penetration).toBe(5);
  expect(p.legendary.has("penetration")).toBe(true);
  expect(p.chooseModBranch("a")).toBe(true);
  expect(p.ranks.penetration).toBe(5);
  expect(p.legendary.has("penetration")).toBe(true);
});

it.each(marineTraitIds)(
  "keeps %s growing past ten without another branch",
  (id) => {
    const rolls = [0.9, 0, 0, 0, 0, 0, 0];
    const p = new MarineProgression(() => rolls.shift() ?? 0.5);
    p.ranks[id] = 10;
    p.quality[id] = 10;
    p.branches[id] = "b";
    p.pendingChoices = 1;
    expect(p.offer()[0]!.id).toBe(id);
    expect(p.choose(id)).toBe(true);
    expect(p.ranks[id]).toBe(11);
    expect(p.modBranchPending).toBe(false);
    expect(p.branches[id]).toBe("b");
  },
);

it("holds incendiary Great Success at Lv5 before branch selection releases Lv6", () => {
  const rolls = [0.9, 0, 0, 0, 0, 0, 0];
  const p = new MarineProgression(() => rolls.shift() ?? 0);
  p.ranks.incendiary = p.quality.incendiary = 4;
  p.pendingChoices = 1;
  expect(p.offer()[0]!.id).toBe("incendiary");
  expect(p.choose("incendiary")).toBe(true);
  expect(p.ranks.incendiary).toBe(5);
  expect(p.offerModBranch()?.traitId).toBe("incendiary");
  expect(p.chooseModBranch("b")).toBe(true);
  expect(p.ranks.incendiary).toBe(6);
  expect(p.quality.incendiary).toBe(6);
});
