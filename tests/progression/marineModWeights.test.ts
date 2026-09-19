import { afterEach, expect, it } from "vitest";
import { MarineProgression } from "../../src/game/progression/marineProgression";
import {
  marineGrowthBalance,
  marineModWeights,
  marineTraitIds,
  marineUpgradeWeight,
  marineUpgrades,
} from "../../src/game/data/marineGrowth";
import { allUnlocks } from "../../src/game/data/operations";

const originalGrowth = { ...marineGrowthBalance };
const originalWeights = Object.fromEntries(
  marineTraitIds.map((id) => [id, { ...marineModWeights[id] }]),
);
afterEach(() => {
  Object.assign(marineGrowthBalance, originalGrowth);
  for (const id of marineTraitIds)
    Object.assign(marineModWeights[id], originalWeights[id]);
});
function run(owned: number, roll: number, internal = 0, expand = false) {
  const rolls = [roll, internal, 0];
  const p = new MarineProgression(
    () => rolls.shift() ?? 0,
    undefined,
    1,
    allUnlocks(),
  );
  marineTraitIds.slice(0, owned).forEach((id) => {
    p.ranks[id] = 1;
  });
  if (expand) p.expandTraitLimit();
  p.pendingChoices = 1;
  return p;
}
it("uses each mod acquisition weight in the unlocked new-mod pool", () => {
  expect(
    marineTraitIds.map((id) => marineModWeights[id].acquisitionWeight),
  ).toEqual([1, 0.9, 0.6, 0.7, 0.8, 0.8]);
  expect(marineTraitIds.map((id) => marineModWeights[id].growthWeight)).toEqual(
    [1, 1, 1, 1, 1, 1],
  );
  expect(run(0, 3.1 / 3.7, 1.90001 / 4.8).offer()[0]!.id).toBe("burst");
  expect(run(0, 3.1 / 3.7, 2.50001 / 4.8).offer()[0]!.id).toBe("multishot");
  marineModWeights.burst.acquisitionWeight = 20;
  expect(run(0, 3.1 / 3.7, 0.5).offer()[0]!.id).toBe("burst");
});
it("weights only unlocked fresh-account mods, even when a locked mod has huge weight", () => {
  marineModWeights.incendiary.acquisitionWeight = 1000;
  const rolls = [3.1 / 3.7, 0.55, 0];
  const p = new MarineProgression(() => rolls.shift() ?? 0, undefined, 0, {
    ...allUnlocks(),
    basicMods: ["penetration", "burst"],
  });
  p.pendingChoices = 1;
  expect(p.offer()[0]!.id).toBe("penetration");
});
it.each([
  [0, 0.45],
  [1, 0.3],
  [2, 0.18],
  [3, 0.12],
])("uses the fixed new-mod category for %i owned", (owned, weight) => {
  const total = 3 + weight + (owned ? 0.6 : 0) + 0.25;
  const inside = run(
    owned,
    (3 + weight - 0.00001) / total,
    0,
    true,
  ).offer()[0]!;
  expect(inside.category).toBe("weapon-trait");
  expect(marineTraitIds.slice(0, owned)).not.toContain(inside.id);
  const after = run(owned, (3 + weight + 0.00001) / total, 0, true).offer()[0]!;
  if (owned) expect(marineTraitIds.slice(0, owned)).toContain(after.id);
  else expect(after.id).toBe("range");
});
it("uses growthWeight times capped investment, independent from acquisition weight", () => {
  marineModWeights.penetration.growthWeight = 0.1;
  marineModWeights.penetration.acquisitionWeight = 100;
  const p = run(2, 3.3 / 4.03, 0.2);
  p.ranks.penetration = 100;
  expect(marineUpgradeWeight(marineUpgrades.penetration, p.ranks)).toBeCloseTo(
    0.14,
  );
  expect(p.offer()[0]!.id).toBe("ricochet");
});
it("keeps cached choices frozen while live weights affect rerolls and ignores legacy newModWeight", () => {
  let rolls = [3.1 / 3.7, 0, 0];
  const p = new MarineProgression(
    () => rolls.shift() ?? 0,
    undefined,
    1,
    allUnlocks(),
  );
  p.pendingChoices = 1;
  const cards = p.offer();
  marineModWeights.penetration.acquisitionWeight = 0;
  marineGrowthBalance.newModWeight = 100;
  expect(p.offer()).toBe(cards);
  rolls = [3.1 / 3.7, 0, 0];
  expect(p.reroll()).toBe(true);
  expect(p.offer()[0]!.id).toBe("ricochet");
  expect(p.offer().some((card) => card.id === "penetration")).toBe(false);
  marineGrowthBalance.rangeWeight = 0;
  expect(
    run(0, 0.99999)
      .offer()
      .some((card) => card.id === "range"),
  ).toBe(false);
});
