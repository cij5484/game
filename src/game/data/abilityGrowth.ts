import type { GrowthBranch, GrowthBranches } from "./growth";
import type { UpgradeRanks } from "./upgrades";

export type AbilityGrowthId =
  "frost-growth" | "lightning-growth" | "stim-growth";
export interface AbilityEffects {
  frostDurationBonusMs: number;
  frostSlowBonus: number;
  frostVulnerability: number;
  frostDeathDamage: number;
  frostDeathRadius: number;
  frostDeathDepth: number;
  frostDeathTargetCap: number;
  lightningTargetBonus: number;
  lightningTargetOverride: number;
  lightningDamageMultiplier: number;
  lightningKillJumps: number;
  lightningKillJumpCap: number;
  lightningPriority: boolean;
  lightningStrikeCount: number;
  lightningStrikeDamage: number;
  stimDurationBonusMs: number;
  stimSpeedBonus: number;
  stimCrashMultiplier: number;
  stimRecoveryMultiplier: number;
  stimDamageMultiplier: number;
}
export interface AbilityGrowthLevel {
  description: string;
  effects: Partial<AbilityEffects>;
}
export interface AbilityGrowthDefinition {
  id: AbilityGrowthId;
  title: string;
  ability: "frost-nova" | "chain-lightning" | "stimpack";
  tag: "frost" | "lightning" | "stim";
  levels: readonly AbilityGrowthLevel[];
  branches: Record<
    GrowthBranch,
    { title: string; levels: readonly AbilityGrowthLevel[] }
  >;
}
export const abilityGrowthBalance = {
  lightningTargetCap: 64,
  frostCenterCap: 8,
  frostVictimsPerCenter: 12,
  strikeIntervalMs: 500,
  strikeTargetCap: 8,
  strikeRadius: 150,
  strikeQueueCap: 3,
} as const;

const frostBase: AbilityGrowthLevel[] = [
  {
    description: "서리 지속 +1초 · 이동속도 추가 -5%p",
    effects: { frostDurationBonusMs: 1000, frostSlowBonus: 0.05 },
  },
  {
    description: "서리 지속 +2초 · 이동속도 추가 -10%p",
    effects: { frostDurationBonusMs: 2000, frostSlowBonus: 0.1 },
  },
];
const lightningBase: AbilityGrowthLevel[] = [
  {
    description: "번개 대상 +3명 · 피해 +15%",
    effects: { lightningTargetBonus: 3, lightningDamageMultiplier: 1.15 },
  },
  {
    description: "번개 대상 +6명 · 피해 +25%",
    effects: { lightningTargetBonus: 6, lightningDamageMultiplier: 1.25 },
  },
];
const stimBase: AbilityGrowthLevel[] = [
  {
    description: "강화 지속 +0.5초 · 강화 공격속도 +0.15배",
    effects: { stimDurationBonusMs: 500, stimSpeedBonus: 0.15 },
  },
  {
    description: "강화 지속 +1초 · 강화 공격속도 +0.3배",
    effects: { stimDurationBonusMs: 1000, stimSpeedBonus: 0.3 },
  },
];
// Lv3+ has no branch benefit unless the run explicitly selected A or B.
const foundation = (rows: AbilityGrowthLevel[]) => [
  ...rows,
  rows[1]!,
  rows[1]!,
  rows[1]!,
];
export const abilityGrowth: Record<AbilityGrowthId, AbilityGrowthDefinition> = {
  "frost-growth": {
    id: "frost-growth",
    title: "서리장",
    ability: "frost-nova",
    tag: "frost",
    levels: foundation(frostBase),
    branches: {
      a: {
        title: "전장 제어",
        levels: [
          {
            description:
              "전장 제어: 지속 +3.5초 · 이동속도 추가 -25%p · 새로 등장한 적도 적용",
            effects: { frostDurationBonusMs: 3500, frostSlowBonus: 0.25 },
          },
          {
            description: "전장 제어 강화: 지속 +5초 · 이동속도 추가 -30%p",
            effects: { frostDurationBonusMs: 5000, frostSlowBonus: 0.3 },
          },
          {
            description:
              "화이트아웃: 지속 +7초 · 이동속도 추가 -38%p · 전장 전체 극한 제어",
            effects: { frostDurationBonusMs: 7000, frostSlowBonus: 0.38 },
          },
        ],
      },
      b: {
        title: "파쇄",
        levels: [
          {
            description:
              "파쇄: 서리 지속 +2초 · 기본 공격 피해 +30% · 처치 시 냉기 파열 30 (최대 24명)",
            effects: {
              frostDurationBonusMs: 2000,
              frostSlowBonus: 0.1,
              frostVulnerability: 0.3,
              frostDeathDamage: 30,
              frostDeathRadius: 100,
              frostDeathDepth: 1,
              frostDeathTargetCap: 24,
            },
          },
          {
            description:
              "파쇄 강화: 기본 공격 피해 +45% · 냉기 파열 45 / 반경 120 (최대 32명)",
            effects: {
              frostDurationBonusMs: 2000,
              frostSlowBonus: 0.1,
              frostVulnerability: 0.45,
              frostDeathDamage: 45,
              frostDeathRadius: 120,
              frostDeathDepth: 1,
              frostDeathTargetCap: 32,
            },
          },
          {
            description:
              "절대 파쇄: 기본 공격 피해 +60% · 냉기 파열 70 / 반경 150 · 2단 연쇄 (전체 최대 8중심 / 40명)",
            effects: {
              frostDurationBonusMs: 2000,
              frostSlowBonus: 0.1,
              frostVulnerability: 0.6,
              frostDeathDamage: 70,
              frostDeathRadius: 150,
              frostDeathDepth: 2,
              frostDeathTargetCap: 40,
            },
          },
        ],
      },
    },
  },
  "lightning-growth": {
    id: "lightning-growth",
    title: "연쇄 번개",
    ability: "chain-lightning",
    tag: "lightning",
    levels: foundation(lightningBase),
    branches: {
      a: {
        title: "연쇄",
        levels: [
          {
            description:
              "연쇄: 대상 +12명 · 피해 +25% · 번개 처치마다 2명 추가 (최대 +12명)",
            effects: {
              lightningTargetBonus: 12,
              lightningDamageMultiplier: 1.25,
              lightningKillJumps: 2,
              lightningKillJumpCap: 12,
            },
          },
          {
            description:
              "연쇄 강화: 대상 +18명 · 피해 +35% · 처치마다 3명 추가 (최대 +18명)",
            effects: {
              lightningTargetBonus: 18,
              lightningDamageMultiplier: 1.35,
              lightningKillJumps: 3,
              lightningKillJumpCap: 18,
            },
          },
          {
            description:
              "연쇄 폭풍: 대상 +24명 · 피해 +50% · 처치마다 4명 추가 · 총 최대 64명",
            effects: {
              lightningTargetBonus: 24,
              lightningDamageMultiplier: 1.5,
              lightningKillJumps: 4,
              lightningKillJumpCap: 24,
            },
          },
        ],
      },
      b: {
        title: "낙뢰",
        levels: [
          {
            description: "낙뢰: 정예·위험 적 우선 6명 · 피해 2.4배",
            effects: {
              lightningTargetOverride: 6,
              lightningDamageMultiplier: 2.4,
              lightningPriority: true,
            },
          },
          {
            description: "낙뢰 강화: 정예·위험 적 우선 8명 · 피해 2.9배",
            effects: {
              lightningTargetOverride: 8,
              lightningDamageMultiplier: 2.9,
              lightningPriority: true,
            },
          },
          {
            description:
              "천둥 폭풍: 정예·위험 적 우선 10명 · 피해 3.4배 · 0.5초 간격 추가 낙뢰 3회 (피해 150 / 회당 최대 8명)",
            effects: {
              lightningTargetOverride: 10,
              lightningDamageMultiplier: 3.4,
              lightningPriority: true,
              lightningStrikeCount: 3,
              lightningStrikeDamage: 150,
            },
          },
        ],
      },
    },
  },
  "stim-growth": {
    id: "stim-growth",
    title: "스팀팩",
    ability: "stimpack",
    tag: "stim",
    levels: foundation(stimBase),
    branches: {
      a: {
        title: "고농도 투약",
        levels: [
          {
            description:
              "고농도 투약: 강화 공속 +0.6배 / 피해 +10% / 지속 +1초 · 탈진 1초 유지 · 회복 1.5배",
            effects: {
              stimDurationBonusMs: 1000,
              stimSpeedBonus: 0.6,
              stimDamageMultiplier: 1.1,
              stimRecoveryMultiplier: 1.5,
            },
          },
          {
            description:
              "고농도 강화: 강화 공속 +0.85배 / 피해 +20% / 지속 +1.5초 · 회복 1.75배",
            effects: {
              stimDurationBonusMs: 1500,
              stimSpeedBonus: 0.85,
              stimDamageMultiplier: 1.2,
              stimRecoveryMultiplier: 1.75,
            },
          },
          {
            description:
              "한계 돌파: 강화 공속 +1.2배 / 피해 +35% / 지속 +2초 · 탈진 1초 유지 · 회복 2배",
            effects: {
              stimDurationBonusMs: 2000,
              stimSpeedBonus: 1.2,
              stimDamageMultiplier: 1.35,
              stimRecoveryMultiplier: 2,
            },
          },
        ],
      },
      b: {
        title: "안정 투약",
        levels: [
          {
            description:
              "안정 투약: 강화 공속 +0.15배 / 지속 +0.5초 · 탈진 0.8초 / 회복 1.4초",
            effects: {
              stimDurationBonusMs: 500,
              stimSpeedBonus: 0.15,
              stimCrashMultiplier: 0.8,
              stimRecoveryMultiplier: 0.7,
            },
          },
          {
            description:
              "안정 강화: 강화 공속 +0.18배 / 지속 +0.5초 · 탈진 0.65초 / 회복 1초",
            effects: {
              stimDurationBonusMs: 500,
              stimSpeedBonus: 0.18,
              stimCrashMultiplier: 0.65,
              stimRecoveryMultiplier: 0.5,
            },
          },
          {
            description:
              "완전 안정화: 강화 공속 +0.2배 / 지속 +0.5초 · 탈진 0.5초 / 회복 0.7초",
            effects: {
              stimDurationBonusMs: 500,
              stimSpeedBonus: 0.2,
              stimCrashMultiplier: 0.5,
              stimRecoveryMultiplier: 0.35,
            },
          },
        ],
      },
    },
  },
};

export function abilityLevel(
  id: AbilityGrowthId,
  level: number,
  branch?: GrowthBranch,
): AbilityGrowthLevel {
  const index = Math.min(4, Math.max(0, Math.floor(level) - 1));
  return index >= 2 && branch
    ? abilityGrowth[id].branches[branch].levels[index - 2]!
    : abilityGrowth[id].levels[index]!;
}

export function getAbilityEffects(
  ranks: UpgradeRanks,
  branches: GrowthBranches = {},
): AbilityEffects {
  const effects: AbilityEffects = {
    frostDurationBonusMs: 0,
    frostSlowBonus: 0,
    frostVulnerability: 0,
    frostDeathDamage: 0,
    frostDeathRadius: 0,
    frostDeathDepth: 0,
    frostDeathTargetCap: 0,
    lightningTargetBonus: 0,
    lightningTargetOverride: 0,
    lightningDamageMultiplier: 1,
    lightningKillJumps: 0,
    lightningKillJumpCap: 0,
    lightningPriority: false,
    lightningStrikeCount: 0,
    lightningStrikeDamage: 0,
    stimDurationBonusMs: 0,
    stimSpeedBonus: 0,
    stimCrashMultiplier: 1,
    stimRecoveryMultiplier: 1,
    stimDamageMultiplier: 1,
  };
  for (const id of Object.keys(abilityGrowth) as AbilityGrowthId[]) {
    const rank = ranks[id] ?? 0;
    if (Number.isFinite(rank) && rank > 0)
      Object.assign(effects, abilityLevel(id, rank, branches[id]).effects);
  }
  return effects;
}
