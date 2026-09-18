export type RelicId =
  | "tesla-coil"
  | "berserker-seal"
  | "time-gear"
  | "last-bulwark"
  | "ammo-replicator"
  | "frost-resonator"
  | "adrenaline-pump"
  | "emergency-reclaimer";
export type RelicLevels = Partial<Record<RelicId, number>>;
export interface RelicEffects {
  arcEveryRounds: number;
  arcTargets: number;
  arcDamage: number;
  arcRadius: number;
  criticalChargeBonus: number;
  lightningReadiesArc: boolean;
  arcRefundMs: number;
  stimWallCost: number;
  boostDamageBonus: number;
  alternatingRefundMs: number;
  alternatingHealing: number;
  crisisDurationMs: number;
  crisisSpeedBonus: number;
  crisisDamageReduction: number;
  crisisPushback: number;
  crisisRefundMs: number;
  echoEveryVolleys: number;
  echoDamageMultiplier: number;
  echoTraitLevel: number;
  echoRoundCap: number;
  brittleThreshold: number;
  shatterDamage: number;
  shatterRadius: number;
  shatterWaves: number;
  shatterTargets: number;
  shatterChainStacks: number;
  boostExtensionPerKillMs: number;
  boostExtensionCapMs: number;
  recoveryCostRatio: number;
  pumpDamageBonus: number;
  reclaimHealing: number;
  reclaimEnergy: number;
  reclaimKillsPerSecond: number;
  lethalSave: boolean;
}
export interface RelicDefinition {
  id: RelicId;
  title: string;
  shortLabel: string;
  symbol?: string;
  maxLevel: number;
  levels: readonly { description: string; effects: Partial<RelicEffects> }[];
}
// Each level replaces the previous row. Safety budgets are shared by all levels.
export const relicBalance = {
  maxTypes: 3,
  expandedMaxTypes: 4,
  lowWallRatio: 0.3,
  echoDelayMs: 180,
  echoQueueCap: 4,
  echoMaxRounds: 3,
  echoCycleShots: 3,
  nearWallProgress: 0.85,
  reclaimWindowMs: 1000,
  shatterTotalTargetCap: 24,
  emergencyProtectionMs: 1200,
  emergencyPushback: 0.16,
} as const;
export const relics: Record<RelicId, RelicDefinition> = {
  "tesla-coil": {
    id: "tesla-coil",
    title: "테슬라 코일",
    shortLabel: "테슬라",
    maxLevel: 5,
    levels: [
      {
        description: "기본 공격 12발 명중마다 근처 적 1명에게 전격 피해 12",
        effects: {
          arcEveryRounds: 12,
          arcTargets: 1,
          arcDamage: 12,
          arcRadius: 240,
        },
      },
      {
        description: "10발 명중마다 2명에게 전격 피해 16",
        effects: {
          arcEveryRounds: 10,
          arcTargets: 2,
          arcDamage: 16,
          arcRadius: 240,
        },
      },
      {
        description: "치명타 명중은 충전 +2 · 전격 3명 / 피해 20",
        effects: {
          arcEveryRounds: 10,
          arcTargets: 3,
          arcDamage: 20,
          arcRadius: 240,
          criticalChargeBonus: 2,
        },
      },
      {
        description: "연쇄 번개 사용 후 다음 명중에 전격 · 전격 4명 / 피해 24",
        effects: {
          arcEveryRounds: 10,
          arcTargets: 4,
          arcDamage: 24,
          arcRadius: 240,
          criticalChargeBonus: 2,
          lightningReadiesArc: true,
        },
      },
      {
        description:
          "6발마다 전격 5명 / 피해 30 · 전격 적중 시 두 마법 대기시간 0.4초 감소",
        effects: {
          arcEveryRounds: 6,
          arcTargets: 5,
          arcDamage: 30,
          arcRadius: 240,
          criticalChargeBonus: 2,
          lightningReadiesArc: true,
          arcRefundMs: 400,
        },
      },
    ],
  },
  "berserker-seal": {
    id: "berserker-seal",
    title: "광전사 인장",
    shortLabel: "광전",
    symbol: "◆",
    maxLevel: 5,
    levels: [40, 50, 60, 80, 100].map((cost, rank) => ({
      description: `스팀팩 사용 시 성벽 ${cost} 소모 (최소 1 유지) · 강화 중 기본 피해 +${(rank + 1) * 20}%`,
      effects: { stimWallCost: cost, boostDamageBonus: (rank + 1) / 5 },
    })),
  },
  "time-gear": {
    id: "time-gear",
    title: "시간 톱니",
    shortLabel: "시간",
    symbol: "◷",
    maxLevel: 5,
    levels: [300, 500, 800, 1200, 1800].map((refund, rank) => ({
      description: `다른 마법을 번갈아 사용하면 이전 마법 대기 ${refund / 1000}초 감소${rank >= 2 ? ` · 성벽 ${[0, 0, 30, 50, 80][rank]} 회복` : ""}`,
      effects: {
        alternatingRefundMs: refund,
        alternatingHealing: [0, 0, 30, 50, 80][rank]!,
      },
    })),
  },
  "last-bulwark": {
    id: "last-bulwark",
    title: "최후의 보루",
    shortLabel: "보루",
    symbol: "▣",
    maxLevel: 5,
    levels: [0, 1, 2, 3, 4].map((rank) => ({
      description: `Run당 1회 성벽 30% 위기: 주변 적 밀침 · ${3 + rank}초간 공격속도 +${20 + rank * 10}% / 받는 피해 -${20 + rank * 10}% · 두 마법 대기 ${(500 + rank * 250) / 1000}초 회복`,
      effects: {
        crisisDurationMs: 3000 + rank * 1000,
        crisisSpeedBonus: 0.2 + rank * 0.1,
        crisisDamageReduction: 0.2 + rank * 0.1,
        crisisPushback: 0.06 + rank * 0.02,
        crisisRefundMs: 500 + rank * 250,
      },
    })),
  },
  "ammo-replicator": {
    id: "ammo-replicator",
    title: "탄약 복제기",
    shortLabel: "복제",
    symbol: "⧉",
    maxLevel: 5,
    levels: [0, 1, 2, 3, 4].map((rank) => ({
      description: `${[24, 18, 15, 12, 9][rank]}발 자동 사격마다 0.18초 뒤 다른 적에게 ${[30, 40, 50, 65, 85][rank]}% 복제 사격 (최대 ${[2, 2, 3, 3, 3][rank]}발)${rank >= 4 ? " · 전체 특성 계승" : rank >= 2 ? " · 관통·도탄·다중탄 일부 계승" : ""} · 복제 재귀 없음`,
      effects: {
        echoEveryVolleys: [8, 6, 5, 4, 3][rank]!,
        echoDamageMultiplier: [0.3, 0.4, 0.5, 0.65, 0.85][rank]!,
        echoTraitLevel: rank >= 4 ? 5 : rank >= 2 ? rank - 1 : 0,
        echoRoundCap: [2, 2, 3, 3, 3][rank]!,
      },
    })),
  },
  "frost-resonator": {
    id: "frost-resonator",
    title: "서리 공진기",
    shortLabel: "공진",
    symbol: "❄",
    maxLevel: 5,
    levels: [0, 1, 2, 3, 4].map((rank) => ({
      description: `서리 중 기본 명중 ${[5, 4, 4, 3, 2][rank]}회: 취성 파쇄 피해 ${[16, 22, 30, 40, 54][rank]} / 반경 ${[70, 85, 100, 120, 140][rank]}${rank >= 3 ? " · 파쇄가 취성 1 전달" : ""} · 발당 최대 ${rank === 4 ? 3 : rank >= 2 ? 2 : 1}파동 / 총 24명`,
      effects: {
        brittleThreshold: [5, 4, 4, 3, 2][rank]!,
        shatterDamage: [16, 22, 30, 40, 54][rank]!,
        shatterRadius: [70, 85, 100, 120, 140][rank]!,
        shatterWaves: rank === 4 ? 3 : rank >= 2 ? 2 : 1,
        shatterTargets: [4, 5, 6, 7, 8][rank]!,
        shatterChainStacks: rank >= 3 ? 1 : 0,
      },
    })),
  },
  "adrenaline-pump": {
    id: "adrenaline-pump",
    title: "아드레날린 펌프",
    shortLabel: "펌프",
    symbol: "ϟ",
    maxLevel: 5,
    levels: [0, 1, 2, 3, 4].map((rank) => ({
      description: `강화 중 처치: Boost +${[60, 80, 100, 120, 150][rank]}ms (회당 최대 +${[1000, 1400, 1800, 2400, 3000][rank]! / 1000}초) · 연장한 시간의 50%만큼 회복 지연${rank >= 2 ? ` · 강화 피해 +${[0, 0, 10, 15, 25][rank]}%` : ""} · 선택한 투약의 탈진 시간 유지`,
      effects: {
        boostExtensionPerKillMs: [60, 80, 100, 120, 150][rank]!,
        boostExtensionCapMs: [1000, 1400, 1800, 2400, 3000][rank]!,
        recoveryCostRatio: 0.5,
        pumpDamageBonus: [0, 0, 0.1, 0.15, 0.25][rank]!,
      },
    })),
  },
  "emergency-reclaimer": {
    id: "emergency-reclaimer",
    title: "긴급 회수 장치",
    shortLabel: "회수",
    symbol: "⊕",
    maxLevel: 5,
    levels: [0, 1, 2, 3, 4].map((rank) => ({
      description: `성벽 근처 처치: 성벽 ${rank + 1} / 에너지 ${rank >= 2 ? 2 : 1} 회수 (최근 1초 최대 ${[4, 5, 6, 7, 8][rank]}회)${rank === 4 ? " · Run당 1회 치명 피해 방지 + 1.2초 방벽 / 밀침" : ""}`,
      effects: {
        reclaimHealing: rank + 1,
        reclaimEnergy: rank >= 2 ? 2 : 1,
        reclaimKillsPerSecond: [4, 5, 6, 7, 8][rank]!,
        lethalSave: rank === 4,
      },
    })),
  },
};
