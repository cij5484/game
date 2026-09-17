import { expect, it } from "vitest";
import { eligibleEvolutions } from "../../src/game/progression/evolution";

it("requires every recipe condition and does not grant an evolution twice", () => {
  expect(
    eligibleEvolutions({ penetration: 1 }, { penetration: 3 }, new Set()),
  ).toEqual([]);
  expect(
    eligibleEvolutions({ penetration: 2 }, { penetration: 2 }, new Set()),
  ).toEqual([]);
  expect(
    eligibleEvolutions({ penetration: 2 }, { penetration: 3 }, new Set()).map(
      (recipe) => recipe.id,
    ),
  ).toEqual(["hyper-gauss"]);
  expect(
    eligibleEvolutions(
      { penetration: 3 },
      { penetration: 3 },
      new Set(["hyper-gauss"]),
    ),
  ).toEqual([]);
});
