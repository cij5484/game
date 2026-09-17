export type UpgradeId =
  | "extended-burst"
  | "faster-cycle"
  | "penetration"
  | "ricochet"
  | "frost-radius"
  | "frost-duration"
  | "chain-targets"
  | "chain-damage";
export type UpgradeRanks = Partial<Record<UpgradeId, number>>;
export type UpgradeAbility = "gauss-rifle" | "frost-nova" | "chain-lightning";
export interface UpgradeDefinition {
  id: UpgradeId;
  tag: "rapid" | "penetration" | "ricochet" | "frost" | "lightning";
  ability: UpgradeAbility;
  title: string;
  description: string;
  maxRank: number;
  weight: number;
  amount: number;
}

// All numbers are prototype tuning values, including XP requirements and weights.
export const progressionBalance = {
  initialXp: 5,
  xpPerLevel: 3,
  choiceCount: 3,
} as const;
export const upgrades: Record<UpgradeId, UpgradeDefinition> = {
  "extended-burst": {
    id: "extended-burst",
    tag: "rapid",
    ability: "gauss-rifle",
    title: "확장 점사",
    description: "한 번의 점사에 탄환 +1발",
    maxRank: 3,
    weight: 1,
    amount: 1,
  },
  "faster-cycle": {
    id: "faster-cycle",
    tag: "rapid",
    ability: "gauss-rifle",
    title: "빠른 재장전",
    description: "점사 후 회복 시간 −60ms",
    maxRank: 3,
    weight: 1,
    amount: 60,
  },
  penetration: {
    id: "penetration",
    tag: "penetration",
    ability: "gauss-rifle",
    title: "관통탄",
    description: "탄환이 뒤쪽 적 +1명을 관통",
    maxRank: 3,
    weight: 1,
    amount: 1,
  },
  ricochet: {
    id: "ricochet",
    tag: "ricochet",
    ability: "gauss-rifle",
    title: "도탄",
    description: "탄환이 주변 다른 적 1명에게 도탄",
    maxRank: 1,
    weight: 1,
    amount: 1,
  },
  "frost-radius": {
    id: "frost-radius",
    tag: "frost",
    ability: "frost-nova",
    title: "넓은 서리",
    description: "Frost Nova 범위 +60",
    maxRank: 3,
    weight: 1,
    amount: 60,
  },
  "frost-duration": {
    id: "frost-duration",
    tag: "frost",
    ability: "frost-nova",
    title: "깊은 동결",
    description: "동결 지속시간 +0.5초",
    maxRank: 3,
    weight: 1,
    amount: 500,
  },
  "chain-targets": {
    id: "chain-targets",
    tag: "lightning",
    ability: "chain-lightning",
    title: "연쇄 확장",
    description: "Chain Lightning 연결 대상 +3명",
    maxRank: 3,
    weight: 1,
    amount: 3,
  },
  "chain-damage": {
    id: "chain-damage",
    tag: "lightning",
    ability: "chain-lightning",
    title: "고전압",
    description: "Chain Lightning 대상별 피해 +15",
    maxRank: 3,
    weight: 1,
    amount: 15,
  },
};
