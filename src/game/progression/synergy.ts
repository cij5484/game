import { synergyRecipes } from "../data/synergies";
import { meetsRecipeRequirements } from "./evolution";
export function activeSynergies(
  traits: Readonly<Record<string, number | undefined>>,
) {
  return synergyRecipes.filter((recipe) =>
    meetsRecipeRequirements(recipe.requires, traits),
  );
}
