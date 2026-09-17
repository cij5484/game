import { expect, it } from "vitest";
import { activeSynergies } from "../../src/game/progression/synergy";
it("requires both traits and activates each of the three recipes", () => {
  expect(activeSynergies({ penetration: 5 })).toEqual([]);
  expect(
    activeSynergies({ penetration: 1, explosive: 1 }).map((x) => x.id),
  ).toEqual(["deep-blast"]);
  expect(
    activeSynergies({ ricochet: 1, critical: 1 }).map((x) => x.id),
  ).toEqual(["lethal-ricochet"]);
  expect(activeSynergies({ rapid: 1, multishot: 1 }).map((x) => x.id)).toEqual([
    "bullet-storm",
  ]);
});
