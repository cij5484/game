import { describe, expect, it } from "vitest";
import { laneCenterX, laneX } from "../../src/game/battlefield/lanes";

describe("soft lanes", () => {
  it.each([300, 900, 1280])("scales lane centers with width %s", (width) => {
    expect(laneCenterX("left", width)).toBeCloseTo(width / 6);
    expect(laneCenterX("center", width)).toBeCloseTo(width / 2);
    expect(laneCenterX("right", width)).toBeCloseTo((width * 5) / 6);
  });

  it("places offsets within each lane, independently of perspective", () => {
    for (const [lane, start] of [
      ["left", 0],
      ["center", 300],
      ["right", 600],
    ] as const) {
      expect(laneX(lane, 900, 0)).toBe(start);
      expect(laneX(lane, 900, 0.25)).toBe(start + 75);
      expect(laneX(lane, 900, 0.5)).toBe(laneCenterX(lane, 900));
      expect(laneX(lane, 900, 1)).toBe(start + 300);
    }
    expect(laneX("center", 450, 0.25)).toBe(187.5);
  });

  it("clamps offsets at lane boundaries", () => {
    expect(laneX("center", 900, -1)).toBe(300);
    expect(laneX("center", 900, 2)).toBe(600);
  });
});
