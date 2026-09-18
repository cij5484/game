import { expect, it } from "vitest";
import {
  battlefieldLayout,
  battlefieldPoint,
  containsPoint,
} from "../../src/game/battlefield/layout";
it.each([
  [360, 640],
  [390, 844],
  [360, 800],
  [768, 1024],
])("partitions %sx%s into non-overlapping safe regions", (width, height) => {
  const l = battlefieldLayout(width, height, {
    top: 24,
    bottom: 20,
    left: 0,
    right: 0,
  });
  expect(l.header.y).toBe(24);
  expect(l.header.y + l.header.height).toBe(l.battlefield.y);
  expect(l.battlefield.y + l.battlefield.height).toBe(l.bottom.y);
  expect(l.bottom.y + l.bottom.height).toBeCloseTo(height - 20);
  expect(l.battlefield.height).toBeGreaterThan(height * 0.5);
  const far = battlefieldPoint(l, 0.5, 0),
    near = battlefieldPoint(l, 0.5, 1);
  expect(far.y).toBe(l.battlefield.y);
  expect(near.y).toBeLessThan(l.bottom.y);
  expect(containsPoint(l.battlefield, far.x, far.y)).toBe(true);
  expect(containsPoint(l.battlefield, far.x, l.header.y)).toBe(false);
  expect(containsPoint(l.battlefield, near.x, l.bottom.y)).toBe(false);
});
