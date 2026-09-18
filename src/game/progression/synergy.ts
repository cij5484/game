import { synergyRecipes } from "../data/synergies";
import { meetsRecipeRequirements } from "./evolution";
export function unlockedSynergies(
  ranks: Readonly<Record<string, number | undefined>>,
) {
  return synergyRecipes.filter((recipe) =>
    meetsRecipeRequirements(recipe.requires, ranks, {}, ranks, ranks),
  );
}
/** Meeting a recipe only unlocks its card. Selection is the sole activation route. */
export function activeSynergies(
  ranks: Readonly<Record<string, number | undefined>>,
  selected: ReadonlySet<string> = new Set(),
) {
  return unlockedSynergies(ranks).filter((recipe) => selected.has(recipe.id));
}
