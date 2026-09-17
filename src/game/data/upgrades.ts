import { weaponTraits, type WeaponTraitId } from "./traits";

export type UpgradeId =
  | WeaponTraitId
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
export type UpgradeTag = WeaponTraitId | "stim" | "frost" | "lightning";
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
// Prototype tuning: XP and rarity remain independent of the two-trait limit.
export const progressionBalance = {
  initialXp: 8,
  xpPerLevel: 6,
  xpQuadratic: 2,
  choiceCount: 3,
  buildBiasPerRank: 0.08,
  maxBuildBias: 1.6,
} as const;
const traitCards = Object.fromEntries(
  Object.values(weaponTraits).map((trait) => [
    trait.id,
    {
      id: trait.id,
      rarity: "COMMON",
      tag: trait.id,
      ability: "gauss-rifle",
      title: trait.title,
      description: trait.levels[0]!.description,
      maxRank: 5,
      weight: 1,
      amount: 1,
    },
  ]),
) as Record<WeaponTraitId, UpgradeDefinition>;
export const upgrades: Record<UpgradeId, UpgradeDefinition> = {
  ...traitCards,
  "stim-duration": {
    id: "stim-duration",
    rarity: "COMMON",
    tag: "stim",
    ability: "stimpack",
    title: "연장 투약",
    description: "자극제 강화 지속시간 +0.5초",
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
    description: "자극제 강화 공격속도 배율 +0.1",
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
    description: "자극제 회복 −0.2초 (탈진 1초 유지)",
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
    description: "서리장이 현재 전장의 적에게 즉시 피해 30",
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
    description: "연쇄 번개 연결 대상 +2명",
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
    description: "연쇄 번개 대상별 피해 +12",
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
    description: "연쇄 번개 연결 거리 +40",
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
    requires: { tag: "rapid", ranks: 4 },
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
    requires: { tag: "penetration", ranks: 4 },
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
    requires: { tag: "ricochet", ranks: 4 },
  },
};
