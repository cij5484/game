import type { UpgradeRarity } from "./upgrades";

export type PrototypeRelicId =
  | "loader"
  | "impact"
  | "precision"
  | "capacitor"
  | "replicator"
  | "reinforcement";
export type PrototypeCoreId = "armament" | "modification" | "quality";
export interface PrototypeRelicDefinition {
  summary: string;
  id: PrototypeRelicId;
  title: string;
  symbol: string;
  description: string;
}
export interface PrototypeCoreDefinition {
  id: PrototypeCoreId;
  title: string;
  symbol: string;
  description: string;
}

// M6 prototype tuning: user playtest owns subsequent balance changes.
export const highrollBalance = {
  relicDropChance: 0.32,
  coreDropChance: 0.03,
  maxCores: 1,
  relicCapacity: 2,
  loaderCycleMultiplier: 0.8,
  impactChance: 0.12,
  impactPush: 0.025,
  eliteKnockbackMultiplier: 0.25,
  precisionBonus: 0.12,
  overchargeChance: 0.08,
  overchargeMultiplier: 2,
  replicationChance: 0.08,
} as const;

export const prototypeRelics: Record<
  PrototypeRelicId,
  PrototypeRelicDefinition
> = {
  loader: {
    id: "loader",
    summary: "특수무기 주기 −20%",
    title: "고속 장전 장치",
    symbol: "»",
    description: "모든 특수무기 공격 주기 20% 감소",
  },
  impact: {
    id: "impact",
    summary: "12% 확률 · 약한 밀치기",
    title: "충격 탄약",
    symbol: "⇠",
    description: "모든 공격 적중 시 12% 확률로 약한 밀치기 · 정예 효과 25%",
  },
  precision: {
    id: "precision",
    summary: "치명타 확률 +12%p",
    title: "정밀 조준기",
    symbol: "⌖",
    description: "치명타 확률 +12%p",
  },
  capacitor: {
    id: "capacitor",
    summary: "8% 확률 · 행동 피해 ×2",
    title: "과충전 축전기",
    symbol: "ϟ",
    description: "공격 행동 시작 시 8% 확률로 해당 행동 전체 피해 2배",
  },
  replicator: {
    id: "replicator",
    summary: "8% 확률 · 기본 공격 복제",
    title: "탄약 복제기",
    symbol: "≋",
    description: "기본무기 공격 행동을 8% 확률로 한 번 추가 반복 · 재복제 없음",
  },
  reinforcement: {
    id: "reinforcement",
    summary: "가우스 Marine +1",
    title: "전설 — 증원 병력",
    symbol: "+",
    description:
      "Marine +1 · 현재 기본무기와 개조로 독립 자동 사격 · 특수무기 제외",
  },
};

export const prototypeCores: Record<PrototypeCoreId, PrototypeCoreDefinition> =
  {
    armament: {
      id: "armament",
      title: "무장 확장 코어",
      symbol: "Ⅲ",
      description: "특수무기 한도 2 → 3 · 추가 획득 1회",
    },
    modification: {
      id: "modification",
      title: "개조 확장 코어",
      symbol: "Ⅳ",
      description: "기본무기 개조 한도 3 → 4",
    },
    quality: {
      id: "quality",
      title: "품질 개방 코어",
      symbol: "↑",
      description:
        "과거와 이후 일반 성장 희귀도 +1단계 · 전설 유지 · 특별 선택 제외",
    },
  };

export function promoteRarity(rarity: UpgradeRarity): UpgradeRarity {
  return {
    COMMON: "RARE",
    RARE: "EPIC",
    EPIC: "LEGENDARY",
    LEGENDARY: "LEGENDARY",
  }[rarity] as UpgradeRarity;
}
