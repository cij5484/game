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

import { choiceFaces } from "../../src/game/data/display";
import { weaponTraitIds } from "../../src/game/data/traits";
import { relics } from "../../src/game/data/relics";
it("has five card faces for every current trait and relic and no removed faces", () => {
  for (const id of [...weaponTraitIds, ...Object.keys(relics)]) {
    expect(choiceFaces[id as keyof typeof choiceFaces].lines).toHaveLength(5);
  }
  for (const id of [
    "critical",
    "split",
    "heavy",
    "siege-amplifier",
    "ice-heart",
    "stim-circuit",
    "lucky-coin",
  ])
    expect(id in choiceFaces).toBe(false);
});
