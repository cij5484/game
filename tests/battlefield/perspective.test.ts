import { describe, expect, it } from "vitest";
import { perspectiveScale } from "../../src/game/battlefield/perspective";

describe("visual perspective", () => {
  it("grows linearly from far to near", () => {
    expect(perspectiveScale(0)).toBe(0.5);
    expect(perspectiveScale(0.5)).toBe(0.75);
    expect(perspectiveScale(1)).toBe(1);
    expect(perspectiveScale(1)).toBeGreaterThan(perspectiveScale(0));
  });

  it("clamps out-of-range progress to the visual endpoints", () => {
    expect(perspectiveScale(-0.5)).toBe(0.5);
    expect(perspectiveScale(1.5)).toBe(1);
  });
});
