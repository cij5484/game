import { expect, it } from "vitest";
import { relics, type RelicId } from "../../src/game/data/relics";
import {
  Relics,
  eligibleRelics,
  relicEffects,
} from "../../src/game/progression/relics";
it("offers exactly eight redesigned relics and upgrades each from one through MAX", () => {
  const expected = [
    "tesla-coil",
    "berserker-seal",
    "time-gear",
    "last-bulwark",
    "ammo-replicator",
    "frost-resonator",
    "adrenaline-pump",
    "emergency-reclaimer",
  ];
  expect(
    eligibleRelics({})
      .map((x) => x.id)
      .sort(),
  ).toEqual(expected.sort());
  for (const id of expected as RelicId[]) {
    const state = new Relics();
    state.levels[id] = 1;
    state.capacity = 1;
    for (let level = 2; level <= 5; level++) {
      state.reward();
      expect(state.choose(id)).toBe(true);
      expect(state.levels[id]).toBe(level);
    }
    state.reward();
    expect(state.offer()).toEqual([]);
    expect(relics[id].levels).toHaveLength(5);
    expect(
      Object.values(relicEffects({ [id]: 5 })).every(
        (v) => typeof v !== "number" || Number.isFinite(v),
      ),
    ).toBe(true);
  }
});
it("respects three relic slots and expands to four once while keeping cached choices", () => {
  const state = new Relics(() => 0.999);
  state.reward();
  const offer = state.offer();
  state.reward();
  expect(state.offer()).toEqual(offer);
  expect(new Set(offer.map((x) => x.id)).size).toBe(3);
  Object.assign(state.levels, {
    "tesla-coil": 5,
    "time-gear": 5,
    "last-bulwark": 5,
  });
  expect(eligibleRelics(state.levels, state.capacity)).toEqual([]);
  expect(state.expandCapacity()).toBe(true);
  expect(state.expandCapacity()).toBe(false);
  expect(eligibleRelics(state.levels, state.capacity)).toHaveLength(5);
});
it("ignores removed relic ids when counting capacity for imported run state", () => {
  const legacy = {
    "siege-amplifier": 5,
    "ice-heart": 5,
    "stim-circuit": 5,
    "lucky-coin": 5,
  };
  expect(eligibleRelics(legacy as never)).toHaveLength(8);
});
