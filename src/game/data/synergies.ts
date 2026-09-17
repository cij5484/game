import type { RecipeRequirements } from "./evolutions";
export interface SynergyDefinition {
  id: string;
  title: string;
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
    description: "관통한 적마다 폭발이 이어집니다.",
    requires: { traits: { penetration: 1, explosive: 1 } },
    effects: { pierceExplosion: true },
  },
  {
    id: "lethal-ricochet",
    title: "살상 도탄",
    description: "치명타 도탄은 치명타 피해를 이어가며 2번 더 튕깁니다.",
    requires: { traits: { ricochet: 1, critical: 1 } },
    effects: { criticalBounceBonus: 2, propagateCritical: true },
  },
  {
    id: "bullet-storm",
    title: "탄막 폭풍",
    description:
      "4번째 발사마다 온전한 피해의 추가 탄환 2발을 동시에 발사합니다.",
    requires: { traits: { multishot: 1 }, upgrades: { "attack-speed": 3 } },
    effects: { everyRounds: 4, extraRays: 2, rayDamageFactor: 1 },
  },
];
