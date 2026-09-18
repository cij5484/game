import { getTraitEffects, type TraitEffects } from "./traits";
import type { UpgradeRanks, UpgradeRarity } from "./upgrades";
import type { GaussRifleConfig } from "../model/types";
import { gaussRifleBalance } from "./weapons";

export const marineTraitIds = [
  "penetration",
  "ricochet",
  "burst",
  "multishot",
  "explosive",
  "heavy",
] as const;
export type MarineTraitId = (typeof marineTraitIds)[number];
export type MarineUpgradeId =
  MarineTraitId | "primary-damage" | "attack-speed" | "crit-chance" | "range";
export type MarineRanks = UpgradeRanks &
  Partial<Record<"burst" | "heavy" | "range", number>>;
export interface MarineGrowthState {
  ranks: MarineRanks;
  quality: Partial<Record<MarineUpgradeId, number>>;
  legendary: ReadonlySet<MarineTraitId>;
}
export interface MarineUpgradeDefinition {
  id: MarineUpgradeId;
  title: string;
  symbol: string;
  owner: "global" | "basicWeapon";
  category: "basic" | "weapon-trait" | "weapon-growth";
  weight: number;
  maxRank: number;
}
export interface MarineChoice extends MarineUpgradeDefinition {
  growthId: MarineUpgradeId;
  description: string;
  rarity: UpgradeRarity;
  tag: string;
  ability: "gauss-rifle";
  amount: number;
}
const basic = (
  id: MarineUpgradeId,
  title: string,
  symbol: string,
): MarineUpgradeDefinition => ({
  id,
  title,
  symbol,
  owner: "global",
  category: "basic",
  weight: 1,
  maxRank: Infinity,
});
const trait = (
  id: MarineTraitId,
  title: string,
  symbol: string,
): MarineUpgradeDefinition => ({
  id,
  title,
  symbol,
  owner: "basicWeapon",
  category: "weapon-trait",
  weight: 1.3,
  maxRank: Infinity,
});
export const marineUpgrades: Record<MarineUpgradeId, MarineUpgradeDefinition> =
  {
    "primary-damage": basic("primary-damage", "공격력", "⚔"),
    "attack-speed": basic("attack-speed", "공격속도", "»"),
    "crit-chance": basic("crit-chance", "치명타 확률", "✦"),
    penetration: trait("penetration", "관통", "⇢"),
    ricochet: trait("ricochet", "도탄", "↗"),
    burst: trait("burst", "점사", "≋"),
    multishot: trait("multishot", "다중탄", "⋔"),
    explosive: trait("explosive", "폭발탄", "✹"),
    heavy: trait("heavy", "고위력 단발", "●"),
    range: {
      id: "range",
      title: "사거리",
      symbol: "⌖",
      owner: "basicWeapon",
      category: "weapon-growth",
      weight: 0.25,
      maxRank: 5,
    },
  };
export const marineGrowthBalance = {
  initialXp: 8,
  xpPerLevel: 4,
  xpQuadratic: 0.35,
  choiceCount: 3,
  traitLimit: 3,
  investmentPerRank: 0.1,
  maxInvestment: 2,
  greatSuccessChance: 0.06,
  minimumRecoveryMs: 100,
  maxBurstRounds: 8,
  maxPierceCount: 8,
  maxBounceCount: 6,
  maxMultishotTargets: 5,
  maxExplosionRadius: 130,
} as const;
const increments = (
  COMMON: number,
  RARE: number,
  EPIC: number,
  LEGENDARY: number,
): Record<UpgradeRarity, number> => ({ COMMON, RARE, EPIC, LEGENDARY });
const traitQuality = increments(1, 1.6, 2.4, 3.2);
// Quality is cumulative actual strength, independently of rank. EPIC is displayed as 유니크.
export const marineQualityIncrements: Record<
  MarineUpgradeId,
  Record<UpgradeRarity, number>
> = {
  "primary-damage": increments(0.18, 0.3, 0.46, 0.66),
  "attack-speed": increments(0.08, 0.125, 0.18, 0.24),
  "crit-chance": increments(0.055, 0.09, 0.14, 0.2),
  penetration: traitQuality,
  ricochet: traitQuality,
  burst: traitQuality,
  multishot: traitQuality,
  explosive: traitQuality,
  heavy: traitQuality,
  range: increments(0, 0.03, 0.045, 0.06),
};
const positive = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;
export function marineStrength(
  state: MarineGrowthState,
  id: MarineUpgradeId,
): number {
  const rank = Math.floor(positive(state.ranks[id] ?? 0));
  if (!rank) return 0;
  return positive(
    state.quality[id] ??
      rank * marineQualityIncrements[id][id === "range" ? "RARE" : "COMMON"],
  );
}
export function marineUpgradeWeight(
  definition: MarineUpgradeDefinition,
  ranks: MarineRanks,
): number {
  return (
    definition.weight *
    Math.min(
      marineGrowthBalance.maxInvestment,
      1 +
        positive(ranks[definition.id] ?? 0) *
          marineGrowthBalance.investmentPerRank,
    )
  );
}
export function rollMarineRarity(
  level: number,
  random = Math.random,
  minRare = false,
  excludeLegendary = false,
): UpgradeRarity {
  const weights =
    level < 10
      ? [780, 200, 19, 1]
      : level < 20
        ? [680, 270, 47, 3]
        : level < 30
          ? [580, 330, 84, 6]
          : [500, 360, 130, 10];
  if (minRare) weights[0] = 0;
  if (excludeLegendary) weights[3] = 0;
  let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
  const rarities = ["COMMON", "RARE", "EPIC", "LEGENDARY"] as const;
  return (
    rarities.find((_, index) => (roll -= weights[index]!) < 0) ?? "LEGENDARY"
  );
}
export function getMarineStats(state: MarineGrowthState) {
  const strength = (id: MarineUpgradeId) => marineStrength(state, id);
  const crit = strength("crit-chance");
  return {
    primaryDamageMultiplier:
      (1 + strength("primary-damage")) *
      (1 + 0.45 * strength("heavy")) *
      (1 + 0.035 * strength("burst")),
    attackSpeedMultiplier: 1 + strength("attack-speed"),
    criticalChance: Math.min(
      1 - Number.EPSILON,
      0.05 + (0.95 * crit) / (1 + crit),
    ),
    criticalMultiplier: 1.75,
    minTargetProgress01: Math.max(0.25, 0.55 - strength("range")),
  };
}
export function deriveMarineWeaponConfig(
  state: MarineGrowthState,
): GaussRifleConfig {
  const burst = marineStrength(state, "burst");
  const heavy = marineStrength(state, "heavy");
  // ponytail: bounded projectile work; mastery damage keeps growing after the seven-round cap.
  const burstRounds =
    burst > 0
      ? Math.min(
          marineGrowthBalance.maxBurstRounds - 1,
          2 + Math.floor((state.ranks.burst! - 1) / 2),
        ) + (state.legendary.has("burst") ? 1 : 0)
      : 1;
  const roundIntervalMs = Math.max(55, 155 / (1 + 0.055 * burst));
  const heavyPenalty = heavy > 0 ? 1.2 + 0.15 / (1 + 0.15 * heavy) : 1;
  return {
    ...gaussRifleBalance,
    burstRounds,
    roundIntervalMs,
    shotIntervalMs: Math.max(
      (burstRounds - 1) * roundIntervalMs +
        marineGrowthBalance.minimumRecoveryMs,
      (gaussRifleBalance.shotIntervalMs * heavyPenalty) /
        getMarineStats(state).attackSpeedMultiplier,
    ),
  };
}
export function getMarineTraitEffects(state: MarineGrowthState): TraitEffects {
  const effects = getTraitEffects({});
  const q = (id: MarineTraitId) => marineStrength(state, id);
  const rank = (id: MarineTraitId) =>
    Math.floor(positive(state.ranks[id] ?? 0));
  if (q("penetration") > 0) {
    const strength = q("penetration");
    effects.pierceCount = Math.min(
      marineGrowthBalance.maxPierceCount,
      1 + Math.floor((rank("penetration") - 1) * 0.7),
    );
    effects.pierceDamageRetention = 0.6 + (0.35 * strength) / (strength + 5);
    effects.shieldBypass = (0.5 * strength) / (strength + 12);
    if (state.legendary.has("penetration")) {
      effects.pierceShockwaveRadius = 100;
      effects.pierceShockwaveFactor = 0.65 + 0.035 * strength;
    }
  }
  if (q("ricochet") > 0) {
    const strength = q("ricochet");
    effects.bounceCount = Math.min(
      marineGrowthBalance.maxBounceCount,
      1 + Math.floor((rank("ricochet") - 1) / 2),
    );
    effects.bounceRadiusBonus = Math.min(90, strength * 7);
    effects.bounceDamageRetention = 0.6 + (0.35 * strength) / (strength + 5);
    effects.bounceDamageGrowth = 0.01 * strength;
  }
  if (q("multishot") > 0) {
    const strength = q("multishot");
    effects.multishotTargets = Math.min(
      marineGrowthBalance.maxMultishotTargets,
      1 + Math.floor((rank("multishot") - 1) / 2),
    );
    effects.multishotDamageFactor = 0.5 + 0.065 * strength;
    effects.multishotSpreadRadians = Math.min(1.3, 0.65 + 0.04 * strength);
  }
  if (q("explosive") > 0) {
    const strength = q("explosive");
    effects.explosionRadius = Math.min(
      marineGrowthBalance.maxExplosionRadius,
      60 + strength * 6,
    );
    effects.explosionDamageFactor = 0.35 + 0.075 * strength;
    if (state.legendary.has("explosive")) {
      effects.explosionChainTargets = 2;
      effects.explosionSecondaryRadius = 75;
      effects.explosionSecondaryDamageFactor = 0.3 + 0.035 * strength;
    }
  }
  return effects;
}
export function describeMarineUpgrade(
  id: MarineUpgradeId,
  state: MarineGrowthState,
): string {
  const stats = getMarineStats(state);
  const effects = getMarineTraitEffects(state);
  const weapon = deriveMarineWeaponConfig(state);
  const percent = (value: number) => `${Math.round(value * 100)}%`;
  switch (id) {
    case "primary-damage":
      return `공용 공격력 +${percent(marineStrength(state, id))}`;
    case "attack-speed":
      return `공격속도 +${percent(stats.attackSpeedMultiplier - 1)} · 주기 ${Math.round(weapon.shotIntervalMs)}ms`;
    case "crit-chance":
      return `치명타 확률 ${percent(stats.criticalChance)} · 피해 ×1.75`;
    case "range":
      return `진행도 ${percent(stats.minTargetProgress01)}부터 조준 · 개조 슬롯 미사용`;
    case "penetration":
      return `${effects.pierceCount}명 관통 · 후속 피해 ${percent(effects.pierceDamageRetention)}${state.legendary.has(id) ? " · 끝점 충격파" : ""}`;
    case "ricochet":
      return `${effects.bounceCount}회 도탄 · 후속 피해 ${percent(effects.bounceDamageRetention)} · 탐색 +${Math.round(effects.bounceRadiusBonus)}`;
    case "burst":
      return `${weapon.burstRounds}연발 · 간격 ${Math.round(weapon.roundIntervalMs!)}ms · 숙련 피해 +${percent(0.035 * marineStrength(state, id))}${state.legendary.has(id) ? " · 추가 마무리탄" : ""}`;
    case "multishot":
      return `보조탄 ${effects.multishotTargets}발 동시 발사 · 피해 ${percent(effects.multishotDamageFactor)}`;
    case "explosive":
      return `반경 ${Math.round(effects.explosionRadius)} · 피해 ${percent(effects.explosionDamageFactor)}${state.legendary.has(id) ? " · 처치 2명 1회 재폭발" : ""}`;
    case "heavy":
      return `개별 탄환 피해 ×${(1 + 0.45 * marineStrength(state, id)).toFixed(2)} · 주기 ${Math.round(weapon.shotIntervalMs)}ms`;
  }
}
