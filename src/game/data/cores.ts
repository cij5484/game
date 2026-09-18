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
    description: "유물 한도 3 → 4 · 즉시 유물 선택 1회",
    weight: 1,
  },
  "choice-expansion": {
    id: "choice-expansion",
    title: "선택 확장 코어",
    symbol: "▤",
    description: "레벨업 강화 카드 후보 3장 → 4장",
    weight: 1,
  },
  resonance: {
    id: "resonance",
    title: "공명 코어",
    symbol: "∞",
    description: "선택해 활성화한 시너지의 효과 ×1.5",
    weight: 1,
  },
} as const;
export type CoreId = keyof typeof cores;
export function coreEffects(owned: ReadonlySet<CoreId>) {
  return { synergyMultiplier: owned.has("resonance") ? 1.5 : 1 };
}
