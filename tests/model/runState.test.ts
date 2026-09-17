import { expect, it } from "vitest";
import {
  advanceRun,
  applyWallDamage,
  createRunState,
} from "../../src/game/model/runState";

it("clears at five minutes, freezes terminal state and starts a fresh retry", () => {
  const initial = createRunState(12000);
  const almost = advanceRun(initial, 299999, 300000);
  expect(almost.status).toBe("running");
  const clear = advanceRun(almost, 20, 300000);
  expect(clear).toMatchObject({
    status: "cleared",
    elapsedMs: 300000,
    wallHp: 12000,
  });
  expect(applyWallDamage(clear, 12000)).toEqual(clear);
  expect(advanceRun(clear, 1000, 300000)).toEqual(clear);
  const failed = applyWallDamage(almost, 12000);
  expect(advanceRun(failed, 1000, 300000).status).toBe("failed");
  expect(createRunState(12000)).toEqual(initial);
  expect(initial.elapsedMs).toBe(0);
});
