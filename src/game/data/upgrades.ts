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
  | "frost-radius"
  | "frost-duration"
  | "frost-shatter"
  | "chain-targets"
  | "chain-damage"
  | "chain-radius"
  | "storm-fork";
export type UpgradeRanks = Partial<Record<UpgradeId, number>>;
export type UpgradeAbility =
  "gauss-rifle" | "stimpack" | "frost-nova" | "chain-lightning";
export type UpgradeTag =
  "rapid" | "penetration" | "ricochet" | "stim" | "frost" | "lightning";
export interface UpgradeDefinition {
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
} as const;
export const upgrades: Record<UpgradeId, UpgradeDefinition> = {
  "extended-burst": {
    id: "extended-burst",
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
    tag: "ricochet",
    ability: "gauss-rifle",
    title: "빙결 도체",
    description: "첫 대상이 동결되어 있으면 도탄 +2회",
    maxRank: 1,
    weight: 1,
    amount: 2,
    requires: { tag: "ricochet", ranks: 6 },
  },
  "stim-duration": {
    id: "stim-duration",
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
    tag: "stim",
    ability: "stimpack",
    title: "회복 훈련",
    description: "Stimpack Recovery −0.2초 (Crash 1초 유지)",
    maxRank: 3,
    weight: 1,
    amount: 200,
  },
  "frost-radius": {
    id: "frost-radius",
    tag: "frost",
    ability: "frost-nova",
    title: "넓은 서리",
    description: "Frost Nova 범위 +60",
    maxRank: 5,
    weight: 1,
    amount: 60,
  },
  "frost-duration": {
    id: "frost-duration",
    tag: "frost",
    ability: "frost-nova",
    title: "깊은 동결",
    description: "동결 지속시간 +0.4초",
    maxRank: 5,
    weight: 1,
    amount: 400,
  },
  "frost-shatter": {
    id: "frost-shatter",
    tag: "frost",
    ability: "frost-nova",
    title: "서리 파쇄",
    description: "Frost Nova가 범위 안 적에게 즉시 피해 30",
    maxRank: 1,
    weight: 1,
    amount: 30,
    requires: { tag: "frost", ranks: 6 },
  },
  "chain-targets": {
    id: "chain-targets",
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
    tag: "lightning",
    ability: "chain-lightning",
    title: "분기 폭풍",
    description: "연쇄 주변 미적중 적 +3명에게 60% 피해",
    maxRank: 1,
    weight: 1,
    amount: 3,
    requires: { tag: "lightning", ranks: 6 },
  },
};
