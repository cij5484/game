import { weaponTraits, weaponTraitIds, type WeaponTraitId } from "./traits";
import { abilityGrowth } from "./abilityGrowth";
import type { GrowthBranch } from "./growth";

export type AbilityGrowthId =
  "frost-growth" | "lightning-growth" | "stim-growth";
export type UpgradeId =
  | WeaponTraitId
  | "primary-damage"
  | "attack-speed"
  | "crit-chance"
  | AbilityGrowthId;
export type UpgradeRanks = Partial<Record<UpgradeId, number>>;
export type UpgradeAbility =
  "gauss-rifle" | "stimpack" | "frost-nova" | "chain-lightning";
export type UpgradeTag =
  WeaponTraitId | "general" | "stim" | "frost" | "lightning";
export type UpgradeRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type UpgradeCategory = "basic" | "weapon-trait" | "magic" | "secondary";
export interface UpgradeDefinition {
  id: UpgradeId;
  rarity: UpgradeRarity;
  tag: UpgradeTag;
  ability: UpgradeAbility;
  title: string;
  description: string;
  maxRank: number;
  weight: number;
  amount: number;
}
export type ChoiceId =
  UpgradeId | `${UpgradeId}:${GrowthBranch}` | `synergy:${string}`;
export interface UpgradeChoice extends Omit<UpgradeDefinition, "id"> {
  id: ChoiceId;
  growthId?: UpgradeId;
  branch?: GrowthBranch;
  synergyId?: string;
  symbol?: string;
}
export function upgradeCategory(
  card: Pick<UpgradeDefinition, "tag" | "ability">,
): UpgradeCategory {
  if (card.tag === "general") return "basic";
  if (card.ability === "gauss-rifle") return "weapon-trait";
  return card.ability === "stimpack" ? "secondary" : "magic";
}
export const rarityWeights: Record<UpgradeRarity, number> = {
  COMMON: 10,
  RARE: 4,
  EPIC: 1,
  LEGENDARY: 0.25,
};
// Preserve current XP pacing, basic stat values and trait investment weight.
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
  weaponTraitIds.map((id) => [
    id,
    {
      id,
      rarity: "RARE",
      tag: id,
      ability: "gauss-rifle",
      title: weaponTraits[id].title,
      description: weaponTraits[id].levels[0]!.description,
      maxRank: 5,
      weight: 1,
      amount: 1,
    },
  ]),
) as Record<WeaponTraitId, UpgradeDefinition>;
const abilityCards = Object.fromEntries(
  Object.entries(abilityGrowth).map(([id, track]) => [
    id,
    {
      id,
      rarity: "RARE",
      tag: track.tag,
      ability: track.ability,
      title: track.title,
      description: track.levels[0]!.description,
      maxRank: 5,
      weight: 1,
      amount: 1,
    },
  ]),
) as Record<AbilityGrowthId, UpgradeDefinition>;
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
  ...abilityCards,
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
