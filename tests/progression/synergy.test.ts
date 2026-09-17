import { expect, it } from "vitest";
import { activeSynergies } from "../../src/game/progression/synergy";
it("requires recipe requirements and activates each of the base recipes", () => {
  expect(activeSynergies({ penetration: 5 })).toEqual([]);
  expect(activeSynergies({ "attack-speed": 2, multishot: 1 })).toEqual([]);
  expect(
    activeSynergies({ penetration: 1, explosive: 1 }).map((x) => x.id),
  ).toEqual(["deep-blast"]);
  expect(
    activeSynergies({ ricochet: 1, "crit-chance": 1 }).map((x) => x.id),
  ).toEqual(["lethal-ricochet"]);
  expect(
    activeSynergies({ "attack-speed": 3, multishot: 1 }).map((x) => x.id),
  ).toEqual(["bullet-storm"]);
});

import { synergyRecipes } from "../../src/game/data/synergies";
it("has twelve recipes and tests every ingredient at its exact boundary", () => {
  expect(synergyRecipes).toHaveLength(12);
  for (const recipe of synergyRecipes) {
    const ranks = { ...recipe.requires.traits, ...recipe.requires.upgrades };
    const magic = recipe.requires.magic ?? {};
    expect(activeSynergies(ranks, magic).map((s) => s.id)).toContain(recipe.id);
    for (const [id, rank] of Object.entries(ranks)) {
      expect(
        activeSynergies({ ...ranks, [id]: rank! - 1 }, magic).map((s) => s.id),
      ).not.toContain(recipe.id);
    }
    for (const [id, rank] of Object.entries(magic)) {
      expect(
        activeSynergies(ranks, { ...magic, [id]: rank - 1 }).map((s) => s.id),
      ).not.toContain(recipe.id);
    }
  }
});
it("ignores the removed critical trait and requires basic critical investment", () => {
  expect(activeSynergies({ ricochet: 1, critical: 5 })).toEqual([]);
});
