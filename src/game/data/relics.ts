export type RelicId = "siege-core" | "tesla-coil";
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
}
export interface RelicDefinition {
  id: RelicId;
  title: string;
  shortLabel: string;
  maxLevel: number;
  levels: readonly { description: string; effects: Partial<RelicEffects> }[];
}
// Prototype tuning. Each row replaces the previous level; effects are cumulative within a row.
export const relicBalance = { maxTypes: 3 } as const;
export const relics: Record<RelicId, RelicDefinition> = {
  "siege-core": {
    id: "siege-core",
    title: "공성 코어",
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
