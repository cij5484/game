import { expect, it } from "vitest";
import { upgrades, upgradeCategory } from "../../src/game/data/upgrades";
import {
  display,
  rarityLabels,
  magicLabels,
  levelChange,
} from "../../src/game/data/display";

it("keeps English identifiers separate from Korean player labels", () => {
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
  expect(upgradeCategory(upgrades["frost-shatter"])).toBe("magic");
  expect(upgradeCategory(upgrades["stim-duration"])).toBe("secondary");
  expect(upgradeCategory(upgrades["rapid-overdrive"])).toBe("weapon-trait");
  expect(upgradeCategory(upgrades["siege-lance"])).toBe("weapon-trait");
  expect(upgradeCategory(upgrades["ricochet-cascade"])).toBe("weapon-trait");
  expect(
    Object.values(upgrades)
      .filter((card) => upgradeCategory(card) === "basic")
      .map((card) => card.id),
  ).toEqual(["primary-damage", "attack-speed", "crit-chance"]);
  expect(upgrades.explosive.rarity).toBe("RARE");
  expect(upgrades["frost-shatter"].rarity).toBe("EPIC");
});
