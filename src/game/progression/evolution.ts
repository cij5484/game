import { evolutionRecipes } from "../data/evolutions";

type Levels = Readonly<Record<string, number | undefined>>;

export function eligibleEvolutions(
  upgrades: Levels,
  modules: Levels,
  already: ReadonlySet<string>,
) {
  const meets = (
    requirements: Readonly<Record<string, number>>,
    levels: Levels,
  ) =>
    Object.entries(requirements).every(
      ([id, level]) => (levels[id] ?? 0) >= level,
    );
  return evolutionRecipes.filter(
    (recipe) =>
      !already.has(recipe.id) &&
      meets(recipe.requires.upgrades, upgrades) &&
      meets(recipe.requires.modules, modules),
  );
}
