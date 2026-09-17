import { synergyRecipes } from "../data/synergies";
import { meetsRecipeRequirements } from "./evolution";
export function activeSynergies(
  traits: Readonly<Record<string, number | undefined>>,
  equippedMagic: Readonly<Record<string, number | undefined>> = {
    "frost-nova": 1,
    "chain-lightning": 1,
  },
) {
  return synergyRecipes.filter((recipe) =>
    meetsRecipeRequirements(
      recipe.requires,
      traits,
      {},
      { ...traits, ...equippedMagic },
      traits,
    ),
  );
}
