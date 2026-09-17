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
    thermalShockFactor?: number;
    thermalShockTargets?: number;
    coolingAmount?: number;
    coolingWindowMs?: number;
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
    id: "flame-pierce",
    title: "화염 궤적",
    symbol: "♨",
    description:
      "관통 적중의 화상을 강화하고 마지막 관통 지점에 화염 파동을 만듭니다.",
    requires: { traits: { penetration: 1, incendiary: 1 } },
    effects: {},
  },
  {
    id: "flame-bounce",
    title: "화염 도탄",
    symbol: "↗",
    description:
      "도탄으로 화상을 남기고 마지막 도탄에서 주변으로 화상을 전염시킵니다.",
    requires: { traits: { ricochet: 1, incendiary: 1 } },
    effects: {},
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
  {
    id: "marked-execution",
    title: "사냥감 처형",
    symbol: "⌖",
    description:
      "MAX 표식 대상의 처형 기준을 완화하고 처치 시 위험한 이웃에게 표식을 이전합니다.",
    requires: { traits: { marking: 1, execution: 1 } },
    effects: {},
  },
  {
    id: "suppression-pierce",
    title: "제압 관통",
    symbol: "≋",
    description:
      "관통 경로를 제압하고 마지막 관통에서 주변으로 제압 충격파를 보냅니다.",
    requires: { traits: { penetration: 1, suppression: 1 } },
    effects: {},
  },
  {
    id: "heat-barrage",
    title: "과열 탄막",
    symbol: "♨",
    description: "높은 열에서 추가 탄막을 발사하지만 발열도 빨라집니다.",
    requires: { traits: { overheat: 1, multishot: 1 } },
    effects: {},
  },
  {
    id: "thermal-shock",
    title: "열충격",
    symbol: "❖",
    description:
      "서리장 시전 시 불타는 적 최대 24명에게 남은 화상 피해의 60%를 즉시 가합니다. 화상은 유지됩니다.",
    requires: { traits: { incendiary: 1 }, magic: { "frost-nova": 1 } },
    effects: { thermalShockFactor: 0.6, thermalShockTargets: 24 },
  },
  {
    id: "cryo-cooling",
    title: "극저온 냉각",
    symbol: "❄",
    description:
      "서리장 시전 시 열 45를 냉각하고 2초 동안 기본 공격 피해 +25%를 얻습니다. 과열 잠금은 유지됩니다.",
    requires: { traits: { overheat: 1 }, magic: { "frost-nova": 1 } },
    effects: { coolingAmount: 45, coolingWindowMs: 2000 },
  },
];
