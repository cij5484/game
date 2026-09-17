import { weaponTraits, weaponTraitIds, type WeaponTraitId } from "./traits";

export type UpgradeCategory = "basic" | "weapon-trait" | "magic" | "secondary";
export function upgradeCategory(card: UpgradeDefinition): UpgradeCategory {
  if (
    weaponTraitIds.includes(card.id as WeaponTraitId) ||
    (card.ability === "gauss-rifle" && card.rarity === "LEGENDARY")
  )
    return "weapon-trait";
  if (card.tag === "general") return "basic";
  if (card.ability === "stimpack") return "secondary";
  if (card.ability === "frost-nova" || card.ability === "chain-lightning")
    return "magic";
  return "basic";
}

export type UpgradeId =
  | WeaponTraitId
  | "primary-damage"
  | "attack-speed"
  | "crit-chance"
  | "frost-vulnerability"
  | "frost-deathburst"
  | "chain-killchain"
  | "chain-strike"
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
  WeaponTraitId | "general" | "stim" | "frost" | "lightning";
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
  requires?: { tag: UpgradeTag; ranks: number; upgrade?: UpgradeId };
}
// Prototype tuning: XP and rarity remain independent of trait capacity.
export const progressionBalance = {
  initialXp: 8,
  xpPerLevel: 6,
  xpQuadratic: 2,
  choiceCount: 3,
  buildBiasPerRank: 0.08,
  maxBuildBias: 1.6,
  traitWeightMultiplier: 2,
} as const;
const traitCards = Object.fromEntries(
  Object.values(weaponTraits).map((trait) => [
    trait.id,
    {
      id: trait.id,
      rarity: trait.levels[0]!.rarity,
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
  "primary-damage": {
    id: "primary-damage",
    rarity: "COMMON",
    tag: "general",
    ability: "gauss-rifle",
    title: "탄환 강화",
    description: "기본 공격 피해 +15%",
    maxRank: 5,
    weight: 1,
    amount: 0.15,
  },
  "attack-speed": {
    id: "attack-speed",
    rarity: "COMMON",
    tag: "general",
    ability: "gauss-rifle",
    title: "사격 훈련",
    description: "기본 공격속도 +6%",
    maxRank: 5,
    weight: 1,
    amount: 0.06,
  },
  "crit-chance": {
    id: "crit-chance",
    rarity: "COMMON",
    tag: "general",
    ability: "gauss-rifle",
    title: "정밀 조준",
    description: "치명타 확률 +5%p",
    maxRank: 5,
    weight: 1,
    amount: 0.05,
  },
  "frost-vulnerability": {
    id: "frost-vulnerability",
    rarity: "RARE",
    tag: "frost",
    ability: "frost-nova",
    title: "서리 균열",
    description: "서리 지속 중 기본 공격 피해 +15%",
    maxRank: 3,
    weight: 1,
    amount: 0.15,
  },
  "frost-deathburst": {
    id: "frost-deathburst",
    rarity: "EPIC",
    tag: "frost",
    ability: "frost-nova",
    title: "빙결 파편",
    description: "서리 지속 중 처치한 적이 반경 130에 피해 35 폭발",
    maxRank: 3,
    weight: 1,
    amount: 35,
  },
  "chain-killchain": {
    id: "chain-killchain",
    rarity: "RARE",
    tag: "lightning",
    ability: "chain-lightning",
    title: "처치 연쇄",
    description: "번개로 처치 시 추가 연결 +2회 · 추가 연결 최대 12회",
    maxRank: 3,
    weight: 1,
    amount: 2,
  },
  "chain-strike": {
    id: "chain-strike",
    rarity: "EPIC",
    tag: "lightning",
    ability: "chain-lightning",
    title: "낙뢰 충격",
    description: "번개 6번째 적중마다 주변에 번개 피해 50% 충격파",
    maxRank: 2,
    weight: 1,
    amount: 0.5,
  },

  "stim-duration": {
    id: "stim-duration",
    rarity: "COMMON",
    tag: "stim",
    ability: "stimpack",
    title: "연장 투약",
    description: "스팀팩 강화 지속시간 +0.5초",
    maxRank: 4,
    weight: 1,
    amount: 500,
  },
  "stim-speed": {
    id: "stim-speed",
    rarity: "COMMON",
    tag: "stim",
    ability: "stimpack",
    title: "고농도 스팀팩",
    description: "스팀팩 강화 공격속도 배율 +0.1",
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
    description: "스팀팩 회복 −0.2초 (탈진 1초 유지)",
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
    description: "전역 서리의 이동속도 감소 +6%p",
    maxRank: 5,
    weight: 1,
    amount: 0.06,
  },
  "frost-duration": {
    id: "frost-duration",
    rarity: "COMMON",
    tag: "frost",
    ability: "frost-nova",
    title: "깊은 동결",
    description: "전역 서리 지속시간 +0.8초",
    maxRank: 5,
    weight: 1,
    amount: 800,
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
    description: "연쇄 번개 대상별 피해 +18",
    maxRank: 5,
    weight: 1,
    amount: 18,
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
    tag: "general",
    ability: "gauss-rifle",
    title: "폭주 연쇄",
    description:
      "탄환 처치 시 주변 3명에게 100% 추가 피해 (탄환당 1회) · 전설 강화 · 추가 슬롯 없음",
    maxRank: 1,
    weight: 1,
    amount: 3,
    requires: { tag: "general", upgrade: "attack-speed", ranks: 4 },
  },
  "siege-lance": {
    id: "siege-lance",
    rarity: "LEGENDARY",
    tag: "penetration",
    ability: "gauss-rifle",
    title: "공성 관통포",
    description:
      "관통 피해 100% 유지 · 마지막 관통에서 반경 140 충격파 · 전설 강화 · 추가 슬롯 없음",
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
    description:
      "마지막 도탄에서 미적중 적 3명에게 80% 피해 분기 · 전설 강화 · 추가 슬롯 없음",
    maxRank: 1,
    weight: 1,
    amount: 3,
    requires: { tag: "ricochet", ranks: 4 },
  },
};

export function getGeneralStats(ranks: UpgradeRanks) {
  const bonus = (id: UpgradeId) => {
    const rank = ranks[id] ?? 0;
    return (
      (Number.isFinite(rank)
        ? Math.max(0, Math.min(upgrades[id].maxRank, Math.floor(rank)))
        : 0) * upgrades[id].amount
    );
  };
  return {
    primaryDamageMultiplier: 1 + bonus("primary-damage"),
    attackSpeedMultiplier: 1 + bonus("attack-speed"),
    criticalChance: 0.05 + bonus("crit-chance"),
    criticalMultiplier: 1.75,
  };
}
