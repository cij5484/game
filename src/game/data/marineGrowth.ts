import { runtimeObject } from "../dev/runtimeBalance";
import { getTraitEffects, type TraitEffects } from "./traits";
import type { UpgradeRanks, UpgradeRarity } from "./upgrades";
import type { GaussRifleConfig } from "../model/types";
import { gaussRifleBalance } from "./weapons";
import { marineConfig } from "./balance";
import type { MetaModifiers } from "./meta";

export const marineTraitIds = [
  "penetration",
  "ricochet",
  "burst",
  "multishot",
  "explosive",
  "incendiary",
] as const;
export type MarineTraitId = (typeof marineTraitIds)[number];
export type MarineModBranch = "a" | "b";
export type MarineModBranches = Partial<Record<MarineTraitId, MarineModBranch>>;
export const marineModBranches: Record<
  MarineTraitId,
  Record<
    MarineModBranch,
    {
      title: string;
      description: string;
      completion: string;
    }
  >
> = {
  penetration: {
    a: {
      title: "심층 관통",
      description: "더 많은 적을 직선으로 관통 · Lv10 관통 수 추가 증가",
      completion: "관통 폭주",
    },
    b: {
      title: "잔존 운동에너지",
      description: "관통 후 피해 유지율 증가 · Lv10 후방에도 높은 피해",
      completion: "운동에너지 관통탄",
    },
  },
  ricochet: {
    a: {
      title: "연쇄 도탄",
      description: "도탄 횟수와 탐색 거리 증가 · Lv10 긴 연쇄",
      completion: "도탄 연쇄",
    },
    b: {
      title: "중량 도탄",
      description: "각 도탄의 피해 강화 · Lv10 강한 충격",
      completion: "충격 도탄",
    },
  },
  burst: {
    a: {
      title: "확장 점사",
      description: "한 행동의 발수 증가 · Lv10 점사 피해 추가 강화",
      completion: "완전 점사",
    },
    b: {
      title: "고속 점사",
      description: "점사 내부 탄 간격 단축 · Lv10 초고속 집중 사격",
      completion: "초고속 점사",
    },
  },
  multishot: {
    a: {
      title: "광역 다중탄",
      description: "보조탄 수와 분산 각도 증가 · Lv10 넓은 동시 사격",
      completion: "전방위 사격",
    },
    b: {
      title: "집중 다중탄",
      description: "좁은 각도의 소수 표적에 보조탄 집중 · 중복 탄환 피해 적용",
      completion: "집중 일제사격",
    },
  },
  explosive: {
    a: {
      title: "광역 폭발",
      description: "폭발 반경 증가 · Lv10 폭발 피해도 강화",
      completion: "폭발 지대",
    },
    b: {
      title: "고폭탄",
      description: "작은 반경에 폭발 피해 집중 · Lv10 고폭 화력",
      completion: "고폭 탄두",
    },
  },
  incendiary: {
    a: {
      title: "연소 확산",
      description: "화상 상태인 적 처치 시 주변 전파 · Lv10 전달 중첩 증가",
      completion: "화염 전염",
    },
    b: {
      title: "열축적",
      description: "화상 최대 중첩 증가 · Lv10 최대 중첩 피해 증폭",
      completion: "임계 과열",
    },
  },
};
export type MarineUpgradeId =
  MarineTraitId | "primary-damage" | "attack-speed" | "crit-chance" | "range";
export type MarineRanks = UpgradeRanks &
  Partial<Record<"burst" | "incendiary" | "range", number>>;
export interface MarineGrowthState {
  ranks: MarineRanks;
  quality: Partial<Record<MarineUpgradeId, number>>;
  legendary: ReadonlySet<MarineTraitId>;
  branches?: MarineModBranches;
  readonly meta?: Readonly<MetaModifiers>;
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
    incendiary: trait("incendiary", "소이탄", "♨"),
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
export const marineGrowthBalance = runtimeObject("marineGrowth", {
  specialCapacity: 2,
  baseCritChance: 0.05,
  criticalMultiplier: 1.75,
  initialXp: 8,
  xpPerLevel: 5,
  xpQuadratic: 0.5,
  choiceCount: 3,
  traitLimit: 3,
  investmentPerRank: 0.1,
  maxInvestment: 2,
  maxModInvestment: 1.4,
  newModWeight: 0.45,
  newModWeight0: 0.45,
  newModWeight1: 0.3,
  newModWeight2: 0.18,
  newModWeight3: 0.12,
  rangeWeight: 0.25,
  ownedModWeight: 0.6,
  specialGrowthWeight: 0.65,
  maxSpecialInvestment: 1.5,
  firstAcquisitionWeight: 0.3,
  laterAcquisitionWeight: 0.2,
  firstAcquisitionLevel: 8,
  laterAcquisitionLevel: 14,
  greatSuccessChance: 0.06,
  minimumRecoveryMs: 100,
  maxBurstRounds: 8,
  maxPierceCount: 8,
  maxBounceCount: 6,
  maxMultishotTargets: 5,
  maxExplosionRadius: 130,
} as const);
export const marineModWeights = runtimeObject("marineModWeights", {
  penetration: { acquisitionWeight: 1, growthWeight: 1 },
  ricochet: { acquisitionWeight: 0.9, growthWeight: 1 },
  burst: { acquisitionWeight: 0.6, growthWeight: 1 },
  multishot: { acquisitionWeight: 0.7, growthWeight: 1 },
  explosive: { acquisitionWeight: 0.8, growthWeight: 1 },
  incendiary: { acquisitionWeight: 0.8, growthWeight: 1 },
});
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
> = runtimeObject("marineQuality", {
  "primary-damage": increments(0.18, 0.3, 0.46, 0.66),
  "attack-speed": increments(0.08, 0.125, 0.18, 0.24),
  "crit-chance": increments(0.055, 0.09, 0.14, 0.2),
  penetration: { ...traitQuality },
  ricochet: { ...traitQuality },
  burst: { ...traitQuality },
  multishot: { ...traitQuality },
  explosive: { ...traitQuality },
  incendiary: { ...traitQuality },
  range: increments(0, 0.03, 0.045, 0.06),
});
const positive = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;
export function getMarineModBranch(
  state: MarineGrowthState,
  id: MarineTraitId,
) {
  return (state.ranks[id] ?? 0) >= 5 ? state.branches?.[id] : undefined;
}
// Prototype branch progress: Lv5 starts at 0, Lv6–9 advance, Lv10 completes.
const branchProgress = (state: MarineGrowthState, id: MarineTraitId) =>
  Math.max(0, Math.min(1, ((state.ranks[id] ?? 0) - 5) / 5));
const branchComplete = (state: MarineGrowthState, id: MarineTraitId) =>
  Number((state.ranks[id] ?? 0) >= 10);
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
  if (definition.id === "range") return marineGrowthBalance.rangeWeight;
  if (definition.category !== "weapon-trait") return definition.weight;
  const rank = positive(ranks[definition.id] ?? 0);
  const weights = marineModWeights[definition.id as MarineTraitId];
  if (!rank) return weights.acquisitionWeight;
  return (
    weights.growthWeight *
    Math.min(
      marineGrowthBalance.maxModInvestment,
      1 + rank * marineGrowthBalance.investmentPerRank,
    )
  );
}

export const marineRarityBalance = runtimeObject("marineRarity", {
  bands: [
    { weights: [780, 200, 19, 1] },
    { weights: [680, 270, 47, 3] },
    { weights: [580, 330, 84, 6] },
    { weights: [500, 360, 130, 10] },
  ],
} as const);

export const marineModBalance = runtimeObject("marineMods", {
  burstDamagePerQuality: 0.035,
  burstAdditionalRoundDamageFactor: 0.65,
  burstAdditionalRoundDamagePerQuality: 0.025,
  burstAdditionalRoundDamageMax: 1,
  burstIntervalMs: 155,
  burstSpeedPerQuality: 0.055,
  penetrationCountPerLevel: 0.7,
  penetrationBaseRetention: 0.6,
  ricochetBaseRetention: 0.6,
  ricochetRadiusPerQuality: 7,
  ricochetDamageGrowth: 0.01,
  multishotBaseDamage: 0.5,
  multishotDamagePerQuality: 0.065,
  explosionBaseRadius: 60,
  explosionRadiusPerQuality: 6,
  explosionBaseDamage: 0.35,
  explosionDamagePerQuality: 0.075,
} as const);
export function getBurstRoundDamageFactor(
  state: MarineGrowthState,
  roundIndex: number,
): number {
  if (roundIndex <= 0) return 1;
  return Math.min(
    marineModBalance.burstAdditionalRoundDamageMax,
    marineModBalance.burstAdditionalRoundDamageFactor +
      marineModBalance.burstAdditionalRoundDamagePerQuality *
        Math.max(0, marineStrength(state, "burst") - 1),
  );
}

export function marineRarityWeights(
  level: number,
  minRare = false,
  excludeLegendary = false,
) {
  const band = level < 10 ? 0 : level < 20 ? 1 : level < 30 ? 2 : 3;
  const weights = [...marineRarityBalance.bands[band]!.weights];
  if (minRare) weights[0] = 0;
  if (excludeLegendary) weights[3] = 0;
  return weights;
}
export function rollMarineRarity(
  level: number,
  random = Math.random,
  minRare = false,
  excludeLegendary = false,
): UpgradeRarity | null {
  const weights = marineRarityWeights(level, minRare, excludeLegendary);
  const lastEligible = weights.findLastIndex((weight) => weight > 0);
  if (lastEligible < 0) return null;
  let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
  const rarities = ["COMMON", "RARE", "EPIC", "LEGENDARY"] as const;
  return (
    rarities.find((_, index) => (roll -= weights[index]!) < 0) ??
    rarities[lastEligible]!
  );
}
export function getMarineStats(state: MarineGrowthState) {
  const strength = (id: MarineUpgradeId) => marineStrength(state, id);
  const crit = strength("crit-chance");
  const criticalChance = Math.min(
    1 - Number.EPSILON,
    marineGrowthBalance.baseCritChance +
      ((1 - marineGrowthBalance.baseCritChance) * crit) / (1 + crit),
  );
  return {
    primaryDamageMultiplier:
      (1 + strength("primary-damage")) *
      (1 + marineModBalance.burstDamagePerQuality * strength("burst")) *
      (getMarineModBranch(state, "burst") === "a" &&
      branchComplete(state, "burst")
        ? 1.2
        : 1) *
      (state.meta?.primaryDamageMultiplier ?? 1),
    attackSpeedMultiplier:
      (1 + strength("attack-speed")) *
      (state.meta?.primarySpeedMultiplier ?? 1),
    criticalChance: Math.min(
      1,
      criticalChance + (state.meta?.criticalChanceBonus ?? 0),
    ),
    criticalMultiplier:
      marineGrowthBalance.criticalMultiplier +
      (state.meta?.criticalMultiplierBonus ?? 0),
    minTargetProgress01: Math.max(
      0.25,
      marineConfig.primaryMinProgress01 -
        (1 - marineConfig.primaryMinProgress01) *
          ((state.meta?.rangeMultiplier ?? 1) - 1) -
        strength("range"),
    ),
  };
}
export function deriveMarineWeaponConfig(
  state: MarineGrowthState,
): GaussRifleConfig {
  const burst = marineStrength(state, "burst");
  const burstBranch = getMarineModBranch(state, "burst");
  const burstProgress = branchProgress(state, "burst");
  // ponytail: bounded projectile work; mastery damage keeps growing after the seven-round cap.
  const burstRounds =
    burst > 0
      ? Math.min(
          marineGrowthBalance.maxBurstRounds - 1,
          2 +
            Math.floor((state.ranks.burst! - 1) / 2) +
            (burstBranch === "a" ? 1 + Math.floor(burstProgress) : 0),
        ) + (state.legendary.has("burst") ? 1 : 0)
      : 1;
  const roundIntervalMs = Math.max(
    burstBranch === "b" ? 35 : 55,
    (marineModBalance.burstIntervalMs /
      (1 + marineModBalance.burstSpeedPerQuality * burst)) *
      (burstBranch === "b"
        ? 0.7 - 0.15 * burstProgress - 0.1 * branchComplete(state, "burst")
        : 1),
  );
  return {
    ...gaussRifleBalance,
    burstRounds,
    roundIntervalMs,
    shotIntervalMs: Math.max(
      (burstRounds - 1) * roundIntervalMs +
        marineGrowthBalance.minimumRecoveryMs,
      gaussRifleBalance.shotIntervalMs /
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
      1 +
        Math.floor(
          (rank("penetration") - 1) * marineModBalance.penetrationCountPerLevel,
        ),
    );
    effects.pierceDamageRetention =
      marineModBalance.penetrationBaseRetention +
      (0.35 * strength) / (strength + 5);
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
    effects.bounceRadiusBonus = Math.min(
      90,
      strength * marineModBalance.ricochetRadiusPerQuality,
    );
    effects.bounceDamageRetention =
      marineModBalance.ricochetBaseRetention +
      (0.35 * strength) / (strength + 5);
    effects.bounceDamageGrowth =
      marineModBalance.ricochetDamageGrowth * strength;
  }
  if (q("multishot") > 0) {
    const strength = q("multishot");
    effects.multishotTargets = Math.min(
      marineGrowthBalance.maxMultishotTargets,
      1 + Math.floor((rank("multishot") - 1) / 2),
    );
    effects.multishotDamageFactor =
      marineModBalance.multishotBaseDamage +
      marineModBalance.multishotDamagePerQuality * strength;
    effects.multishotSpreadRadians = Math.min(1.3, 0.65 + 0.04 * strength);
  }
  if (q("explosive") > 0) {
    const strength = q("explosive");
    effects.explosionRadius = Math.min(
      marineGrowthBalance.maxExplosionRadius,
      marineModBalance.explosionBaseRadius +
        strength * marineModBalance.explosionRadiusPerQuality,
    );
    effects.explosionDamageFactor =
      marineModBalance.explosionBaseDamage +
      marineModBalance.explosionDamagePerQuality * strength;
    if (state.legendary.has("explosive")) {
      effects.explosionChainTargets = 2;
      effects.explosionSecondaryRadius = 75;
      effects.explosionSecondaryDamageFactor = 0.3 + 0.035 * strength;
    }
  }
  // Branch bonuses build on quality growth; unselected/legacy builds stay identical.
  for (const id of marineTraitIds) {
    const branch = getMarineModBranch(state, id);
    if (!branch) continue;
    const progress = branchProgress(state, id),
      done = branchComplete(state, id);
    switch (id) {
      case "penetration":
        if (branch === "a")
          effects.pierceCount = Math.min(
            marineGrowthBalance.maxPierceCount + 4,
            effects.pierceCount + 2 + Math.floor(2 * progress) + 2 * done,
          );
        else
          effects.pierceDamageRetention = Math.min(
            1,
            effects.pierceDamageRetention +
              0.07 +
              0.05 * progress +
              0.06 * done,
          );
        break;
      case "ricochet":
        if (branch === "a") {
          effects.bounceCount = Math.min(
            marineGrowthBalance.maxBounceCount + 4,
            effects.bounceCount + 1 + Math.floor(2 * progress) + done,
          );
          effects.bounceRadiusBonus += 25 + 25 * progress + 20 * done;
        } else {
          effects.bounceDamageRetention *= 1.3 + 0.3 * progress + 0.25 * done;
          effects.bounceDamageGrowth *= 1.5;
        }
        break;
      case "multishot":
        if (branch === "a") {
          effects.multishotTargets = Math.min(
            marineGrowthBalance.maxMultishotTargets + 3,
            effects.multishotTargets + 1 + Math.floor(progress) + done,
          );
          effects.multishotSpreadRadians = Math.min(
            1.5,
            effects.multishotSpreadRadians + 0.2 + 0.15 * progress + 0.1 * done,
          );
        } else {
          effects.multishotSpreadRadians = 0.3 - 0.1 * progress - 0.05 * done;
          effects.multishotDamageFactor *= 1.2 + 0.2 * progress + 0.2 * done;
        }
        break;
      case "explosive":
        if (branch === "a") {
          effects.explosionRadius = Math.min(
            marineGrowthBalance.maxExplosionRadius,
            effects.explosionRadius + 6 + 4 * progress + 8 * done,
          );
          // Keep the completion useful when quality reaches the radius cap early.
          effects.explosionDamageFactor *= 1 + 0.1 * done;
        } else {
          effects.explosionRadius *= 0.8;
          effects.explosionDamageFactor *= 1.4 + 0.3 * progress + 0.3 * done;
        }
        break;
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
      return `치명타 확률 ${percent(stats.criticalChance)} · 피해 ×${stats.criticalMultiplier}`;
    case "range":
      return `진행도 ${percent(stats.minTargetProgress01)}부터 조준 · 개조 슬롯 미사용`;
    case "penetration":
      return `${effects.pierceCount}명 관통 · 후속 피해 ${percent(effects.pierceDamageRetention)}${state.legendary.has(id) ? " · 끝점 충격파" : ""}`;
    case "ricochet":
      return `${effects.bounceCount}회 도탄 · 후속 피해 ${percent(effects.bounceDamageRetention)} · 탐색 +${Math.round(effects.bounceRadiusBonus)}`;
    case "burst":
      return `${weapon.burstRounds}연발 · 간격 ${Math.round(weapon.roundIntervalMs!)}ms · 숙련 피해 +${percent(marineModBalance.burstDamagePerQuality * marineStrength(state, id))}${state.legendary.has(id) ? " · 추가 마무리탄" : ""}`;
    case "multishot":
      return `보조탄 ${effects.multishotTargets}발 동시 발사 · 피해 ${percent(effects.multishotDamageFactor)}`;
    case "explosive":
      return `반경 ${Math.round(effects.explosionRadius)} · 피해 ${percent(effects.explosionDamageFactor)}${state.legendary.has(id) ? " · 처치 2명 1회 재폭발" : ""}`;
    case "incendiary": {
      const burn = getIncendiaryStats(state);
      return `화상 ${burn.durationMs / 1000}초 · ${burn.tickMs}ms마다 중첩당 ${percent(burn.tickFactor)} · 최대 ${burn.maxStacks}중첩`;
    }
  }
}

export const incendiaryBalance = runtimeObject("incendiary", {
  tickMs: 500,
  durationMs: 3000,
  baseMaxStacks: 2,
  baseTickFactor: 0.025,
  tickFactorPerQuality: 0.01,
  aSpreadTargets: 2,
  aCompletionSpreadTargets: 4,
  aSpreadRadius: 90,
  aCompletionSpreadRadius: 140,
  aTransferStacks: 1,
  aCompletionTransferStacks: 2,
  aSpreadFactor: 0.7,
  aCompletionSpreadFactor: 0.9,
  bMaxStacks: 4,
  bCompletionMaxStacks: 6,
  bEfficiencyBonus: 0.15,
  bOverheatMultiplier: 1.6,
});
export function getIncendiaryStats(state: MarineGrowthState) {
  const tuning = incendiaryBalance;
  const quality = marineStrength(state, "incendiary");
  const branch = getMarineModBranch(state, "incendiary");
  const progress = branchProgress(state, "incendiary");
  const complete = branchComplete(state, "incendiary");
  const interpolate = (start: number, end: number) =>
    start + (end - start) * progress;
  return {
    tickMs: tuning.tickMs,
    durationMs: tuning.durationMs,
    maxStacks: Math.max(
      1,
      Math.floor(
        branch === "b"
          ? interpolate(tuning.bMaxStacks, tuning.bCompletionMaxStacks)
          : tuning.baseMaxStacks,
      ),
    ),
    tickFactor:
      quality > 0
        ? (tuning.baseTickFactor + tuning.tickFactorPerQuality * quality) *
          (branch === "b" ? 1 + tuning.bEfficiencyBonus * progress : 1)
        : 0,
    spreadTargets:
      branch === "a"
        ? Math.floor(
            interpolate(tuning.aSpreadTargets, tuning.aCompletionSpreadTargets),
          )
        : 0,
    spreadRadius:
      branch === "a"
        ? interpolate(tuning.aSpreadRadius, tuning.aCompletionSpreadRadius)
        : 0,
    transferStacks:
      branch === "a"
        ? Math.floor(
            complete
              ? tuning.aCompletionTransferStacks
              : tuning.aTransferStacks,
          )
        : 0,
    spreadFactor:
      branch === "a"
        ? interpolate(tuning.aSpreadFactor, tuning.aCompletionSpreadFactor)
        : 0,
    overheatMultiplier:
      branch === "b" && complete ? tuning.bOverheatMultiplier : 1,
  };
}
