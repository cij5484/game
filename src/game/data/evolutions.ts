export interface EvolutionRecipe {
  id: string;
  title: string;
  requires: {
    upgrades: Readonly<Record<string, number>>;
    modules: Readonly<Record<string, number>>;
  };
  effects: {
    penetrationBonus: number;
    penetrationWidthMultiplier: number;
    tracerColor: number;
    tracerWidth: number;
  };
}

// Prototype recipe and beam tuning; conditions are independent of character code.
export const evolutionRecipes: readonly EvolutionRecipe[] = [
  {
    id: "hyper-gauss",
    title: "HYPER GAUSS",
    requires: { upgrades: { penetration: 2 }, modules: { penetration: 3 } },
    effects: {
      penetrationBonus: 3,
      penetrationWidthMultiplier: 1.6,
      tracerColor: 0x55ffff,
      tracerWidth: 8,
    },
  },
];
