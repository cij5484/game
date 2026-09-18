import { expect, it } from "vitest";
import { upgrades, upgradeCategory } from "../../src/game/data/upgrades";
import {
  display,
  rarityLabels,
  magicLabels,
  levelChange,
  choiceFaces,
} from "../../src/game/data/display";
import {
  weaponTraitIds,
  weaponTraits,
  traitLevel,
} from "../../src/game/data/traits";
import { relics } from "../../src/game/data/relics";
import { buildSummary } from "../../src/game/ui/buildSummary";
it("keeps Korean ability labels and correctly classifies compressed growth tracks", () => {
  expect(rarityLabels).toEqual({
    COMMON: "일반",
    RARE: "희귀",
    EPIC: "유니크",
    LEGENDARY: "전설",
  });
  expect(magicLabels["frost-nova"]).toBe("서리장");
  expect(magicLabels["chain-lightning"]).toBe("연쇄 번개");
  expect(display.burst).toBe("필살기");
  expect(levelChange(4, 5)).toBe("4 → 5레벨 · 최대");
  expect(upgradeCategory(upgrades["primary-damage"])).toBe("basic");
  expect(upgradeCategory(upgrades.explosive)).toBe("weapon-trait");
  expect(upgradeCategory(upgrades["frost-growth"])).toBe("magic");
  expect(upgradeCategory(upgrades["lightning-growth"])).toBe("magic");
  expect(upgradeCategory(upgrades["stim-growth"])).toBe("secondary");
  expect(
    Object.values(upgrades)
      .filter((c) => upgradeCategory(c) === "basic")
      .map((c) => c.id),
  ).toEqual(["primary-damage", "attack-speed", "crit-chance"]);
});
it("uses shared early faces and the chosen branch description for advanced traits", () => {
  for (const id of weaponTraitIds) {
    expect(choiceFaces[id]!.lines).toHaveLength(2);
    for (const branch of ["a", "b"] as const) {
      const item = buildSummary({ [id]: 5 }, {}, new Set(), new Set(), {
        [id]: branch,
      })[0]!;
      expect(item.symbol).toBeTruthy();
      expect(item.title).toContain(weaponTraits[id].branches[branch].title);
      expect(item.detail).toBe(traitLevel(id, 5, branch).description);
    }
  }
  for (const id of Object.keys(relics))
    expect(choiceFaces[id]!.lines).toHaveLength(5);
  for (const id of [
    "incendiary",
    "marking",
    "suppression",
    "overheat",
    "rapid-overdrive",
    "siege-lance",
    "ricochet-cascade",
  ])
    expect(id in choiceFaces).toBe(false);
});
