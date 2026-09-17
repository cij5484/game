import { expect, it } from "vitest";
import {
  eligibleEvolutions,
  meetsRecipeRequirements,
} from "../../src/game/progression/evolution";
it("requires penetration four and siege core three and never evolves twice", () => {
  expect(
    eligibleEvolutions({ penetration: 3 }, { "siege-core": 3 }, new Set()),
  ).toEqual([]);
  expect(
    eligibleEvolutions({ penetration: 4 }, { "siege-core": 2 }, new Set()),
  ).toEqual([]);
  expect(
    eligibleEvolutions({ penetration: 4 }, { "siege-core": 3 }, new Set()).map(
      (x) => x.id,
    ),
  ).toEqual(["hyper-gauss"]);
  expect(
    eligibleEvolutions(
      { penetration: 4 },
      { "siege-core": 3 },
      new Set(["hyper-gauss"]),
    ),
  ).toEqual([]);
  const requires = {
    traits: { rapid: 1 },
    relics: { "tesla-coil": 2 },
    magic: { "chain-damage": 1 },
  };
  expect(
    meetsRecipeRequirements(requires, { rapid: 1 }, { "tesla-coil": 2 }),
  ).toBe(false);
  expect(
    meetsRecipeRequirements(
      requires,
      { rapid: 1 },
      { "tesla-coil": 2 },
      { "chain-damage": 1 },
    ),
  ).toBe(true);
});
