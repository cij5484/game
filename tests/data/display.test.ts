import { expect, it } from "vitest";
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
    EPIC: "영웅",
    LEGENDARY: "전설",
  });
  expect(magicLabels["frost-nova"]).toBe("서리장");
  expect(magicLabels["chain-lightning"]).toBe("연쇄 번개");
  expect(display.burst).toBe("필살기");
  expect(levelChange(4, 5)).toBe("4 → 5레벨 · 최대");
});
