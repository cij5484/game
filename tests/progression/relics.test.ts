import { expect, it } from "vitest";
import { Relics, eligibleRelics } from "../../src/game/progression/relics";
it("levels run-only relics to five, excludes MAX and respects capacity", () => {
  const state = new Relics();
  expect(state.choose("siege-core")).toBe(false);
  for (let i = 0; i < 11; i++) state.reward();
  for (let i = 0; i < 5; i++) expect(state.choose("siege-core")).toBe(true);
  expect(state.levels["siege-core"]).toBe(5);
  expect(state.offer().map((card) => card.id)).toEqual(["tesla-coil"]);
  expect(state.choose("siege-core")).toBe(false);
  for (let i = 0; i < 5; i++) state.choose("tesla-coil");
  expect(state.pendingRewards).toBe(0);
  state.reward();
  expect(state.offer()).toEqual([]);
  expect(new Relics().levels).toEqual({});
  expect(eligibleRelics({ "siege-core": 1 }, 1).map((card) => card.id)).toEqual(
    ["siege-core"],
  );
});
