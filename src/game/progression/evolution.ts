import { evolutionRecipes, type RecipeRequirements } from "../data/evolutions";
type Levels = Readonly<Record<string, number | undefined>>;
export function meetsRecipeRequirements(
  requires: RecipeRequirements,
  traits: Levels,
  relics: Levels = {},
  magic: Levels = {},
  upgrades: Levels = {},
): boolean {
  const meets = (requirements: Levels = {}, levels: Levels) =>
    Object.entries(requirements).every(
      ([id, level]) => (levels[id] ?? 0) >= (level ?? 0),
    );
  return (
    meets(requires.traits, traits) &&
    meets(requires.relics, relics) &&
    meets(requires.magic, magic) &&
    meets(requires.upgrades, upgrades)
  );
}
export function eligibleEvolutions(
  traits: Levels,
  relics: Levels,
  already: ReadonlySet<string>,
  magic: Levels = {},
  upgrades: Levels = {},
) {
  return evolutionRecipes.filter(
    (recipe) =>
      !already.has(recipe.id) &&
      meetsRecipeRequirements(recipe.requires, traits, relics, magic, upgrades),
  );
}
