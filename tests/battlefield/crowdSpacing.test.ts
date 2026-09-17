import { expect, it } from "vitest";
import { attackSlotPosition } from "../../src/game/battlefield/crowdSpacing";

it("distributes twenty wall attackers across four columns without changing lanes", () => {
  const positions = Array.from({ length: 20 }, (_, i) => attackSlotPosition(i, 216));
  expect(new Set(positions.map(({ x, y }) => `${x},${y}`)).size).toBe(20);
  expect(positions.every(({ x, y }) => Math.abs(x) < 108 && y <= 0)).toBe(true);
  expect(attackSlotPosition(4, 216).y).toBeLessThan(attackSlotPosition(0, 216).y);
});
