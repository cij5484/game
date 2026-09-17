import type { RecipeRequirements } from "./evolutions";
export interface SynergyDefinition {
  id: string;
  title: string;
  symbol: string;
  description: string;
  requires: RecipeRequirements;
  effects: {
    pierceExplosion?: boolean;
    criticalBounceBonus?: number;
    propagateCritical?: boolean;
    everyRounds?: number;
    extraRays?: number;
    rayDamageFactor?: number;
  };
}
export const synergyRecipes: readonly SynergyDefinition[] = [
  {
    id: "deep-blast",
    title: "심층 폭발",
    symbol: "✹",
    description: "관통한 적마다 폭발이 이어집니다.",
    requires: { traits: { penetration: 1, explosive: 1 } },
    effects: { pierceExplosion: true },
  },
  {
    id: "lethal-ricochet",
    title: "살상 도탄",
    symbol: "✦",
    description: "치명타 도탄은 치명타 피해를 이어가며 2번 더 튕깁니다.",
    requires: { traits: { ricochet: 1 }, upgrades: { "crit-chance": 1 } },
    effects: { criticalBounceBonus: 2, propagateCritical: true },
  },
  {
    id: "bullet-storm",
    title: "탄막 폭풍",
    symbol: "⋔",
    description:
      "4번째 발사마다 온전한 피해의 추가 탄환 2발을 동시에 발사합니다.",
    requires: { traits: { multishot: 1 }, upgrades: { "attack-speed": 3 } },
    effects: { everyRounds: 4, extraRays: 2, rayDamageFactor: 1 },
  },

  {
    id: "focused-bombardment",
    title: "집속 폭격",
    symbol: "◉",
    description: "중앙탄은 강화 폭발, 보조탄은 작은 폭발을 일으킵니다.",
    requires: { traits: { multishot: 1, explosive: 1 } },
    effects: {},
  },
  {
    id: "execution-blast",
    title: "즉결 폭파",
    symbol: "✷",
    description:
      "처형에 성공하면 강한 폭발을 일으킵니다. 폭발은 다시 처형을 유발하지 않습니다.",
    requires: { traits: { execution: 1, explosive: 1 } },
    effects: {},
  },
];
