import { describe, expect, it, vi } from "vitest";
import { PROTOTYPE_NAME } from "../src/game/createGame";

// Phaser requires a browser on import; the real scene is checked in the browser.
vi.mock("phaser", () => ({ default: { Scene: class {} } }));

describe("prototype foundation", () => {
  it("exports the prototype name", () => {
    expect(PROTOTYPE_NAME).toBe("Horde Defense Prototype");
  });
});
