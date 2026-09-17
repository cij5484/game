export interface RecipeRequirements {
  traits?: Readonly<Record<string, number>>;
  relics?: Readonly<Record<string, number>>;
  magic?: Readonly<Record<string, number>>;
}
export interface EvolutionRecipe {
  id: string;
  title: string;
  requires: RecipeRequirements;
  effects: {
    penetrationBonus: number;
    penetrationWidthMultiplier: number;
    tracerColor: number;
    tracerWidth: number;
  };
}
export const evolutionRecipes: readonly EvolutionRecipe[] = [
  {
    id: "hyper-gauss",
    title: "초관통 가우스 (Hyper Gauss)",
    requires: { traits: { penetration: 4 }, relics: { "siege-core": 3 } },
    effects: {
      penetrationBonus: 3,
      penetrationWidthMultiplier: 1.6,
      tracerColor: 0x55ffff,
      tracerWidth: 8,
    },
  },
];
