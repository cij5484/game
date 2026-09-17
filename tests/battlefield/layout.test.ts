import { expect, it } from "vitest";
import { battlefieldLayout, battlefieldReference } from "../../src/game/battlefield/layout";

it.each([[720, 1280], [720, 1560], [720, 1600], [768, 1024]])(
  "keeps portrait gameplay visible and wall bottom-anchored at %s x %s",
  (width, height) => {
    const layout = battlefieldLayout(width, height);
    expect(battlefieldReference).toEqual({ width: 720, height: 1280 });
    expect(layout.x).toBeGreaterThanOrEqual(0);
    expect(layout.y).toBeGreaterThanOrEqual(0);
    expect(layout.x * 2 + 720 * layout.scale).toBeCloseTo(width);
    expect(layout.y + 1280 * layout.scale).toBeCloseTo(height);
    expect(Math.min(layout.x, layout.y)).toBeCloseTo(0);
  },
);
