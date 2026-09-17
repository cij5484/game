import { expect, it } from "vitest";
import { relics } from "../../src/game/data/relics";
import {
  Relics,
  eligibleRelics,
  relicEffects,
} from "../../src/game/progression/relics";
it("levels run-only relics to five, excludes MAX and respects capacity", () => {
  const state = new Relics(() => 0.999);
  state.levels["ice-heart"] = 5;
  state.levels["tesla-coil"] = 1;
  expect(state.choose("siege-amplifier")).toBe(false);
  for (let i = 0; i < 11; i++) state.reward();
  for (let i = 0; i < 5; i++)
    expect(state.choose("siege-amplifier")).toBe(true);
  expect(state.levels["siege-amplifier"]).toBe(5);
  expect(state.offer().map((card) => card.id)).toEqual(["tesla-coil"]);
  expect(state.choose("siege-amplifier")).toBe(false);
  for (let i = 0; i < 5; i++) state.choose("tesla-coil");
  expect(state.pendingRewards).toBe(0);
  state.reward();
  expect(state.offer()).toEqual([]);
  expect(new Relics().levels).toEqual({});
  expect(
    eligibleRelics({ "siege-amplifier": 1 }, 1).map((card) => card.id),
  ).toEqual(["siege-amplifier"]);
});

it("offers three distinct cached choices from eight and expands capacity once", () => {
  expect(Object.values(relics)).toHaveLength(8);
  const state = new Relics(() => 0.999);
  state.reward();
  const offer = state.offer();
  expect(offer).toHaveLength(3);
  expect(new Set(offer.map((x) => x.id)).size).toBe(3);
  state.reward();
  expect(state.offer()).toEqual(offer);
  expect(state.choose("lucky-coin")).toBe(false);
  expect(state.capacity).toBe(3);
  expect(state.expandCapacity()).toBe(true);
  expect(state.expandCapacity()).toBe(false);
  expect(state.capacity).toBe(4);
  Object.assign(state.levels, {
    "siege-amplifier": 5,
    "tesla-coil": 5,
    "ice-heart": 5,
    "stim-circuit": 1,
  });
  expect(eligibleRelics(state.levels, state.capacity).map((x) => x.id)).toEqual(
    ["stim-circuit"],
  );
  expect(relicEffects({ "ice-heart": 5 }).frostDurationBonusMs).toBe(3000);
  expect(relicEffects({ "lucky-coin": 5 }).rarityModifiers).toEqual({
    RARE: 0.25,
    EPIC: 0.25,
    LEGENDARY: 0.25,
  });
});
