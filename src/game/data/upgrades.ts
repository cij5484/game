export type UpgradeId =
  | "extended-burst"
  | "faster-cycle"
  | "round-interval"
  | "penetration"
  | "pierce-retention"
  | "ricochet"
  | "bounce-radius"
  | "bounce-retention"
  | "rapid-relay"
  | "armor-piercing"
  | "frozen-ricochet"
  | "stim-duration"
  | "stim-speed"
  | "stim-recovery"
  | "frost-strength"
  | "frost-duration"
  | "frost-shatter"
  | "chain-targets"
  | "chain-damage"
  | "chain-radius"
  | "storm-fork"
  | "rapid-overdrive"
  | "siege-lance"
  | "ricochet-cascade";
export type UpgradeRanks = Partial<Record<UpgradeId, number>>;
export type UpgradeAbility =
  "gauss-rifle" | "stimpack" | "frost-nova" | "chain-lightning";
export type UpgradeTag =
  "rapid" | "penetration" | "ricochet" | "stim" | "frost" | "lightning";
export type UpgradeRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
export const rarityWeights: Record<UpgradeRarity, number> = {
  COMMON: 10,
  RARE: 4,
  EPIC: 1,
  LEGENDARY: 0.25,
};
export interface UpgradeDefinition {
  rarity: UpgradeRarity;
  id: UpgradeId;
  tag: UpgradeTag;
  ability: UpgradeAbility;
  title: string;
  description: string;
  maxRank: number;
  weight: number;
  amount: number;
  requires?: { tag: UpgradeTag; ranks: number };
}
// Prototype tuning: 10–14 choices for roughly 1000–2500 XP, not guaranteed by time.
export const progressionBalance = {
  initialXp: 8,
  xpPerLevel: 6,
  xpQuadratic: 2,
  choiceCount: 3,
  buildBiasPerRank: 0.08,
  maxBuildBias: 1.6,
} as const;
export const upgrades: Record<UpgradeId, UpgradeDefinition> = {
  "extended-burst": {
    id: "extended-burst",
    rarity: "COMMON",
    tag: "rapid",
    ability: "gauss-rifle",
    title: "확장 점사",
    description: "한 번의 점사에 탄환 +1발",
    maxRank: 5,
    weight: 1,
    amount: 1,
  },
  "faster-cycle": {
    id: "faster-cycle",
    rarity: "COMMON",
    tag: "rapid",
    ability: "gauss-rifle",
    title: "빠른 재장전",
    description: "점사 후 회복 시간 −30ms",
    maxRank: 5,
    weight: 1,
    amount: 30,
  },
  "round-interval": {
    id: "round-interval",
    rarity: "RARE",
    tag: "rapid",
    ability: "gauss-rifle",
    title: "고속 급탄",
    description: "점사 안의 발사 간격 −10ms",
    maxRank: 4,
    weight: 1,
    amount: 10,
  },
  penetration: {
    id: "penetration",
    rarity: "COMMON",
    tag: "penetration",
    ability: "gauss-rifle",
    title: "관통탄",
    description: "탄환이 뒤쪽 적 +1명을 관통",
    maxRank: 5,
    weight: 1,
    amount: 1,
  },
  "pierce-retention": {
    id: "pierce-retention",
    rarity: "RARE",
    tag: "penetration",
    ability: "gauss-rifle",
    title: "관통 에너지",
    description: "관통 피해 유지율 +8%p",
    maxRank: 4,
    weight: 1,
    amount: 0.08,
    requires: { tag: "penetration", ranks: 1 },
  },
  ricochet: {
    id: "ricochet",
    rarity: "COMMON",
    tag: "ricochet",
    ability: "gauss-rifle",
    title: "도탄",
    description: "주변 다른 적으로 도탄 +1회",
    maxRank: 3,
    weight: 1,
    amount: 1,
  },
  "bounce-radius": {
    id: "bounce-radius",
    rarity: "RARE",
    tag: "ricochet",
    ability: "gauss-rifle",
    title: "확장 도탄",
    description: "도탄 탐색 거리 +30",
    maxRank: 4,
    weight: 1,
    amount: 30,
    requires: { tag: "ricochet", ranks: 1 },
  },
  "bounce-retention": {
    id: "bounce-retention",
    rarity: "RARE",
    tag: "ricochet",
    ability: "gauss-rifle",
    title: "잔류 전하",
    description: "도탄 피해 유지율 +8%p",
    maxRank: 4,
    weight: 1,
    amount: 0.08,
    requires: { tag: "ricochet", ranks: 1 },
  },
  "rapid-relay": {
    id: "rapid-relay",
    rarity: "EPIC",
    tag: "rapid",
    ability: "gauss-rifle",
    title: "연쇄 급사",
    description: "탄환으로 처치하면 주변 적 1명에게 60% 추가 피해",
    maxRank: 1,
    weight: 1,
    amount: 0.6,
    requires: { tag: "rapid", ranks: 6 },
  },
  "armor-piercing": {
    id: "armor-piercing",
    rarity: "EPIC",
    tag: "penetration",
    ability: "gauss-rifle",
    title: "장갑 균열",
    description: "Shield 방어로 감소하는 피해의 절반 회복",
    maxRank: 1,
    weight: 1,
    amount: 0.5,
    requires: { tag: "penetration", ranks: 6 },
  },
  "frozen-ricochet": {
    id: "frozen-ricochet",
    rarity: "EPIC",
    tag: "ricochet",
    ability: "gauss-rifle",
    title: "빙결 도체",
    description: "전역 서리 활성 중 도탄 +2회",
    maxRank: 1,
    weight: 1,
    amount: 2,
    requires: { tag: "ricochet", ranks: 6 },
  },
  "stim-duration": {
    id: "stim-duration",
    rarity: "COMMON",
    tag: "stim",
    ability: "stimpack",
    title: "연장 투약",
    description: "Stimpack Boost 지속시간 +0.5초",
    maxRank: 4,
    weight: 1,
    amount: 500,
  },
  "stim-speed": {
    id: "stim-speed",
    rarity: "RARE",
    tag: "stim",
    ability: "stimpack",
    title: "고농도 자극제",
    description: "Stimpack Boost 공격속도 배율 +0.1",
    maxRank: 3,
    weight: 1,
    amount: 0.1,
  },
  "stim-recovery": {
    id: "stim-recovery",
    rarity: "COMMON",
    tag: "stim",
    ability: "stimpack",
    title: "회복 훈련",
    description: "Stimpack Recovery −0.2초 (Crash 1초 유지)",
    maxRank: 3,
    weight: 1,
    amount: 200,
  },
  "frost-strength": {
    id: "frost-strength",
    rarity: "COMMON",
    tag: "frost",
    ability: "frost-nova",
    title: "혹한 강화",
    description: "전역 서리의 이동속도 감소 +4%p",
    maxRank: 5,
    weight: 1,
    amount: 0.04,
  },
  "frost-duration": {
    id: "frost-duration",
    rarity: "COMMON",
    tag: "frost",
    ability: "frost-nova",
    title: "깊은 동결",
    description: "전역 서리 지속시간 +0.6초",
    maxRank: 5,
    weight: 1,
    amount: 600,
  },
  "frost-shatter": {
    id: "frost-shatter",
    rarity: "EPIC",
    tag: "frost",
    ability: "frost-nova",
    title: "서리 파쇄",
    description: "Frost Nova가 현재 전장의 적에게 즉시 피해 30",
    maxRank: 1,
    weight: 1,
    amount: 30,
    requires: { tag: "frost", ranks: 6 },
  },
  "chain-targets": {
    id: "chain-targets",
    rarity: "COMMON",
    tag: "lightning",
    ability: "chain-lightning",
    title: "연쇄 확장",
    description: "Chain Lightning 연결 대상 +2명",
    maxRank: 5,
    weight: 1,
    amount: 2,
  },
  "chain-damage": {
    id: "chain-damage",
    rarity: "RARE",
    tag: "lightning",
    ability: "chain-lightning",
    title: "고전압",
    description: "Chain Lightning 대상별 피해 +12",
    maxRank: 5,
    weight: 1,
    amount: 12,
  },
  "chain-radius": {
    id: "chain-radius",
    rarity: "COMMON",
    tag: "lightning",
    ability: "chain-lightning",
    title: "전도장",
    description: "Chain Lightning 연결 거리 +40",
    maxRank: 4,
    weight: 1,
    amount: 40,
  },
  "storm-fork": {
    id: "storm-fork",
    rarity: "EPIC",
    tag: "lightning",
    ability: "chain-lightning",
    title: "분기 폭풍",
    description: "연쇄 주변 미적중 적 +3명에게 60% 피해",
    maxRank: 1,
    weight: 1,
    amount: 3,
    requires: { tag: "lightning", ranks: 6 },
  },
  "rapid-overdrive": {
    id: "rapid-overdrive",
    rarity: "LEGENDARY",
    tag: "rapid",
    ability: "gauss-rifle",
    title: "폭주 연쇄",
    description: "탄환 처치 시 주변 3명에게 100% 추가 피해 (탄환당 1회)",
    maxRank: 1,
    weight: 1,
    amount: 3,
    requires: { tag: "rapid", ranks: 6 },
  },
  "siege-lance": {
    id: "siege-lance",
    rarity: "LEGENDARY",
    tag: "penetration",
    ability: "gauss-rifle",
    title: "공성 관통포",
    description: "관통 피해 100% 유지 · 마지막 관통에서 반경 140 충격파",
    maxRank: 1,
    weight: 1,
    amount: 1,
    requires: { tag: "penetration", ranks: 6 },
  },
  "ricochet-cascade": {
    id: "ricochet-cascade",
    rarity: "LEGENDARY",
    tag: "ricochet",
    ability: "gauss-rifle",
    title: "연쇄 폭풍탄",
    description: "마지막 도탄에서 미적중 적 3명에게 80% 피해 분기",
    maxRank: 1,
    weight: 1,
    amount: 3,
    requires: { tag: "ricochet", ranks: 6 },
  },
};
