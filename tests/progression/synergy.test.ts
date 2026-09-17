import { expect, it } from "vitest";
import {
  activeSynergies,
  unlockedSynergies,
} from "../../src/game/progression/synergy";
import { synergyRecipes } from "../../src/game/data/synergies";
it("recipe completion unlocks a card without activating it", () => {
  const ranks = { penetration: 1, explosive: 1 };
  expect(unlockedSynergies(ranks).map((x) => x.id)).toEqual(["deep-blast"]);
  expect(activeSynergies(ranks)).toEqual([]);
  expect(
    activeSynergies(ranks, new Set(["deep-blast"])).map((x) => x.id),
  ).toEqual(["deep-blast"]);
  expect(activeSynergies({ penetration: 1 }, new Set(["deep-blast"]))).toEqual(
    [],
  );
});
it("all five selected recipes require every ingredient at its boundary", () => {
  expect(synergyRecipes).toHaveLength(5);
  for (const recipe of synergyRecipes) {
    const ranks = { ...recipe.requires.traits, ...recipe.requires.upgrades };
    const selected = new Set([recipe.id]);
    expect(activeSynergies(ranks, selected).map((s) => s.id)).toContain(
      recipe.id,
    );
    expect(activeSynergies(ranks)).toEqual([]);
    for (const [id, rank] of Object.entries(ranks))
      expect(
        activeSynergies({ ...ranks, [id]: rank! - 1 }, selected).map(
          (s) => s.id,
        ),
      ).not.toContain(recipe.id);
  }
});
it("retired trait investment cannot satisfy basic critical synergy requirements", () => {
  expect(unlockedSynergies({ ricochet: 1, critical: 5 })).toEqual([]);
  expect(
    unlockedSynergies({ ricochet: 1, "crit-chance": 1 }).map((s) => s.id),
  ).toEqual(["lethal-ricochet"]);
});
