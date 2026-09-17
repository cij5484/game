import { expect, it } from "vitest";
import { TapInput } from "../../src/game/input/tapInput";

it("emits one secondary and no primary for overlapping fingers", () => {
  const input = new TapInput();
  input.down(1, 10, 10, 0);
  input.down(2, 50, 10, 50);
  expect(input.up(1, 10, 10, 80)).toBeNull();
  expect(input.up(2, 50, 10, 100)?.kind).toBe("secondary");
  input.down(1, 10, 10, 200);
  expect(input.up(1, 10, 10, 250)?.kind).toBe("primary");
});

it("rejects drags, cancelled touches and three-finger input", () => {
  const input = new TapInput();
  input.down(1, 0, 0, 0);
  input.move(1, 60, 0);
  expect(input.up(1, 0, 0, 100)).toBeNull();
  input.down(1, 0, 0, 200);
  input.cancel();
  expect(input.up(1, 0, 0, 250)).toBeNull();
  for (const id of [1, 2, 3]) input.down(id, 0, 0, 300);
  for (const id of [1, 2, 3]) expect(input.up(id, 0, 0, 350)).toBeNull();
});
