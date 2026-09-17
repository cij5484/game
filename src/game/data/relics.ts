export type RelicId =
  | "siege-amplifier"
  | "tesla-coil"
  | "ice-heart"
  | "stim-circuit"
  | "last-bulwark"
  | "berserker-seal"
  | "time-gear"
  | "lucky-coin";
export type RelicLevels = Partial<Record<RelicId, number>>;
export interface RelicEffects {
  shieldHitRefundMs: number;
  shieldRefundCapMs: number;
  empoweredRounds: number;
  shieldDamageMultiplier: number;
  wallHealing: number;
  arcEveryRounds: number;
  arcTargets: number;
  arcDamage: number;
  arcRadius: number;
  criticalChargeBonus: number;
  lightningReadiesArc: boolean;
  arcRefundMs: number;
  frostDurationBonusMs: number;
  frostKillRefundMs: number;
  frostKillRefundCapMs: number;
  stimRefundMs: number;
  boostKillHealing: number;
  lowWallHealing: number;
  lowWallDamageBonus: number;
  stimWallCost: number;
  boostDamageBonus: number;
  alternatingRefundMs: number;
  alternatingHealing: number;
  magicKillXpMultiplier: number;
  rarityModifiers: Partial<Record<"RARE" | "EPIC" | "LEGENDARY", number>>;
}
export interface RelicDefinition {
  id: RelicId;
  title: string;
  shortLabel: string;
  symbol?: string;
  maxLevel: number;
  levels: readonly { description: string; effects: Partial<RelicEffects> }[];
}
// Prototype tuning. Each row replaces the previous level; effects are cumulative within a row.
export const relicBalance = {
  maxTypes: 3,
  expandedMaxTypes: 4,
  lowWallRatio: 0.3,
} as const;
export const relics: Record<RelicId, RelicDefinition> = {
  "siege-amplifier": {
    id: "siege-amplifier",
    title: "공성 증폭기",
    shortLabel: "공성",
    maxLevel: 5,
    levels: [
      {
        description:
          "방패 적 명중마다 연쇄 번개 대기시간 0.06초 감소 · 발당 최대 0.24초",
        effects: { shieldHitRefundMs: 60, shieldRefundCapMs: 240 },
      },
      {
        description:
          "방패 적 명중마다 번개 대기시간 0.12초 감소 · 발당 최대 0.48초",
        effects: { shieldHitRefundMs: 120, shieldRefundCapMs: 480 },
      },
      {
        description: "이전 효과 유지 · 마법 사용 후 다음 3발은 방패 방어 무시",
        effects: {
          shieldHitRefundMs: 120,
          shieldRefundCapMs: 480,
          empoweredRounds: 3,
        },
      },
      {
        description: "마법 후 방어 무시 5발 · 강화탄은 방패 적에게 피해 +50%",
        effects: {
          shieldHitRefundMs: 120,
          shieldRefundCapMs: 480,
          empoweredRounds: 5,
          shieldDamageMultiplier: 1.5,
        },
      },
      {
        description:
          "마법 후 방어 무시 7발 · 방패 피해 +100% · 마법마다 성벽 120 회복",
        effects: {
          shieldHitRefundMs: 120,
          shieldRefundCapMs: 480,
          empoweredRounds: 7,
          shieldDamageMultiplier: 2,
          wallHealing: 120,
        },
      },
    ],
  },
  "ice-heart": {
    id: "ice-heart",
    title: "얼음 심장",
    shortLabel: "빙심",
    symbol: "❄",
    maxLevel: 5,
    levels: [500, 1000, 1500, 2000, 3000].map((duration, rank) => ({
      description: `서리장 지속 +${duration / 1000}초${rank >= 2 ? ` · 서리 중 처치마다 서리 대기 ${[0, 0, 60, 90, 120][rank]}ms 감소 (판정당 최대 0.6초)` : ""}`,
      effects: {
        frostDurationBonusMs: duration,
        frostKillRefundMs: [0, 0, 60, 90, 120][rank]!,
        frostKillRefundCapMs: 600,
      },
    })),
  },
  "stim-circuit": {
    id: "stim-circuit",
    title: "자극 회로",
    shortLabel: "회로",
    symbol: "ϟ",
    maxLevel: 5,
    levels: [300, 500, 800, 1100, 1500].map((refund, rank) => ({
      description: `스팀팩 사용 시 두 마법 대기 ${refund / 1000}초 감소${rank >= 2 ? ` · 강화 중 처치마다 성벽 ${[0, 0, 2, 3, 5][rank]} 회복` : ""}`,
      effects: {
        stimRefundMs: refund,
        boostKillHealing: [0, 0, 2, 3, 5][rank]!,
      },
    })),
  },
  "last-bulwark": {
    id: "last-bulwark",
    title: "최후의 보루",
    shortLabel: "보루",
    symbol: "▣",
    maxLevel: 5,
    levels: [60, 90, 120, 150, 200].map((healing, rank) => ({
      description: `성벽 30% 이하: 마법 사용 시 ${healing} 회복 · 기본 피해 +${(rank + 1) * 10}%`,
      effects: { lowWallHealing: healing, lowWallDamageBonus: (rank + 1) / 10 },
    })),
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
  "lucky-coin": {
    id: "lucky-coin",
    title: "행운 동전",
    shortLabel: "행운",
    symbol: "◉",
    maxLevel: 5,
    levels: [1, 2, 3, 4, 5].map((level) => ({
      description: `마법 처치 경험치 +${level * 10}% · 희귀 이상 선택 가중치 +${level * 5}%`,
      effects: {
        magicKillXpMultiplier: 1 + level / 10,
        rarityModifiers: {
          RARE: level / 20,
          EPIC: level / 20,
          LEGENDARY: level / 20,
        },
      },
    })),
  },
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
};
