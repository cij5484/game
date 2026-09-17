import type { UpgradeRarity } from "./upgrades";

export const coreBalance = { eliteDropChance: 0.08, maxPerRun: 2 } as const;
export const cores = {
  "tactical-expansion": {
    id: "tactical-expansion",
    title: "전술 확장 코어",
    symbol: "✚",
    description: "무기 특성 한도 3 → 4",
    weight: 1,
  },
  "relic-expansion": {
    id: "relic-expansion",
    title: "유물 확장 코어",
    symbol: "◇",
    description: "유물 보유 한도 3 → 4",
    weight: 1,
  },
  luck: {
    id: "luck",
    title: "행운 코어",
    symbol: "♧",
    description: "희귀 ×1.5 · 유니크 ×2 · 전설 ×3 후보 가중치",
    weight: 1,
  },
  overload: {
    id: "overload",
    title: "과부하 코어",
    symbol: "↑",
    description: "보유한 모든 특성 즉시 +1레벨 · 최대 5",
    weight: 1,
  },
  resonance: {
    id: "resonance",
    title: "공명 코어",
    symbol: "∞",
    description: "활성 시너지의 피해·추가 대상·냉각 효과 ×1.5 강화",
    weight: 1,
  },
} as const;
export type CoreId = keyof typeof cores;
export function coreEffects(owned: ReadonlySet<CoreId>) {
  return {
    rarityModifiers: (owned.has("luck")
      ? { RARE: 1.5, EPIC: 2, LEGENDARY: 3 }
      : {}) as Partial<Record<UpgradeRarity, number>>,
    synergyMultiplier: owned.has("resonance") ? 1.5 : 1,
  };
}
