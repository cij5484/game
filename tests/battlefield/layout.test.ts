import { expect, it } from "vitest";
import { battlefieldLayout } from "../../src/game/battlefield/layout";

it.each([
  [1280, 720],
  [1560, 720],
  [1600, 720],
  [1024, 768],
])(
  "fits the logical battlefield inside %s x %s without stretching",
  (width, height) => {
    const layout = battlefieldLayout(width, height);
    expect(layout.x).toBeGreaterThanOrEqual(0);
    expect(layout.y).toBeGreaterThanOrEqual(0);
    expect(layout.x * 2 + 1280 * layout.scale).toBeCloseTo(width);
    expect(layout.y * 2 + 720 * layout.scale).toBeCloseTo(height);
    expect(Math.min(layout.x, layout.y)).toBeCloseTo(0);
  },
);
