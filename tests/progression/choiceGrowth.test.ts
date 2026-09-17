import { expect, it } from "vitest";
import { Progression } from "../../src/game/progression/progression";
import { weaponTraitIds } from "../../src/game/data/traits";

it("offers both permanent Lv3 alternatives together and follows only the chosen branch", () => {
  const p = new Progression(() => 0, ["gauss-rifle"]);
  p.ranks.penetration = 2;
  p.gainXp(8);
  expect(p.offer().map((c) => c.id)).toContain("penetration:a");
  expect(p.offer().map((c) => c.id)).toContain("penetration:b");
  expect(p.choose("penetration:b")).toBe(true);
  expect(p.branches.penetration).toBe("b");
  expect(p.ranks.penetration).toBe(3);
  p.gainXp(p.threshold);
  expect(p.offer().map((c) => c.id)).not.toContain("penetration:a");
  expect(p.choose("penetration:a")).toBe(false);
  expect(p.choose("penetration")).toBe(true);
  expect(p.ranks.penetration).toBe(4);
  p.gainXp(p.threshold);
  expect(p.choose("penetration")).toBe(true);
  expect(p.ranks.penetration).toBe(5);
});
it("only offers five Marine traits and slot expansion affects no other category", () => {
  expect(weaponTraitIds).toEqual([
    "penetration",
    "ricochet",
    "multishot",
    "explosive",
    "execution",
  ]);
  const p = new Progression(() => 0, ["gauss-rifle"]);
  Object.assign(p.ranks, { penetration: 5, ricochet: 5, multishot: 5 });
  Object.assign(p.branches, {
    penetration: "a",
    ricochet: "a",
    multishot: "a",
  });
  p.gainXp(8);
  expect(p.offer().some((c) => c.id === "explosive")).toBe(false);
  p.expandTraitLimit();
  expect(p.offer().some((c) => c.id === "explosive")).toBe(true);
});
it("guarantees an unlocked synergy choice and requires taking its card to activate", () => {
  const p = new Progression(() => 0);
  Object.assign(p.ranks, { penetration: 1, explosive: 1 });
  expect(p.activeSynergyIds.size).toBe(0);
  p.gainXp(8);
  expect(p.offer()[0]!.id).toBe("synergy:deep-blast");
  expect(p.choose("synergy:deep-blast")).toBe(true);
  expect([...p.activeSynergyIds]).toEqual(["deep-blast"]);
  expect(Object.keys(p.traitLevels)).toHaveLength(2);
  p.gainXp(p.threshold);
  expect(p.offer().some((c) => c.id === "synergy:deep-blast")).toBe(false);
});

import { abilityGrowth } from "../../src/game/data/abilityGrowth";
import { upgrades, type UpgradeId } from "../../src/game/data/upgrades";
import { synergyRecipes } from "../../src/game/data/synergies";
it.each([...weaponTraitIds, ...Object.keys(abilityGrowth)] as UpgradeId[])(
  "%s locks either Lv3 branch and reaches its own Lv5 capstone",
  (id) => {
    for (const branch of ["a", "b"] as const) {
      const p = new Progression(() => 0);
      for (const card of Object.values(upgrades)) p.ranks[card.id] = 5;
      for (const recipe of synergyRecipes) p.activeSynergyIds.add(recipe.id);
      p.ranks[id] = 2;
      p.gainXp(8);
      expect(p.offer().map((c) => c.id)).toEqual([`${id}:a`, `${id}:b`]);
      expect(p.choose(`${id}:${branch}`)).toBe(true);
      for (const level of [4, 5]) {
        p.gainXp(p.threshold);
        const card = p.offer()[0]!;
        expect(card.id).toBe(id);
        expect(card.title).toContain(" · ");
        if (level === 5) expect(card.rarity).toBe("LEGENDARY");
        expect(p.choose(`${id}:${branch === "a" ? "b" : "a"}`)).toBe(false);
        expect(p.choose(id)).toBe(true);
        expect(p.ranks[id]).toBe(level);
        expect(p.branches[id]).toBe(branch);
      }
      p.gainXp(p.threshold);
      expect(p.offer()).toEqual([]);
    }
  },
);
