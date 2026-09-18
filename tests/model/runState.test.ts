import { expect, it } from "vitest";
import {
  advanceRun,
  applyWallDamage,
  clearRun,
  createRunState,
} from "../../src/game/model/runState";

it("keeps fighting beyond twenty minutes until the boss kill clears the run", () => {
  const initial = createRunState(12000);
  const almost = advanceRun(initial, 1199999);
  expect(almost.status).toBe("running");
  const overtime = advanceRun(almost, 2001);
  expect(overtime).toMatchObject({ status: "running", elapsedMs: 1202000 });
  const clear = clearRun(overtime);
  expect(clear).toMatchObject({
    status: "cleared",
    elapsedMs: 1202000,
    wallHp: 12000,
  });
  expect(applyWallDamage(clear, 12000)).toEqual(clear);
  expect(advanceRun(clear, 1000)).toEqual(clear);
  const failed = applyWallDamage(almost, 12000);
  expect(advanceRun(failed, 1000).status).toBe("failed");
  expect(clearRun(failed)).toEqual(failed);
  expect(createRunState(12000)).toEqual(initial);
  expect(initial.elapsedMs).toBe(0);
});
