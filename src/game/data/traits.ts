export const weaponTraitIds = [
  "penetration",
  "ricochet",
  "multishot",
  "explosive",
  "execution",
  "incendiary",
  "marking",
  "suppression",
  "overheat",
] as const;
export type WeaponTraitId = (typeof weaponTraitIds)[number];
export type WeaponTraitLevels = Partial<Record<WeaponTraitId, number>>;
export interface TraitEffects {
  burnDpsFactor: number;
  burnDurationMs: number;
  burnSpreadTargets: number;
  burnSpreadRadius: number;
  burnMaxDepth: number;
  markMaxStacks: number;
  markDamagePerStack: number;
  markShieldBypass: number;
  markTransferStacks: number;
  markTransferRadius: number;
  markFinisherFactor: number;
  suppressionThreshold: number;
  suppressionDurationMs: number;
  suppressionSlow: number;
  suppressionPushback: number;
  suppressionAttackDelayMs: number;
  suppressionWaveTargets: number;
  suppressionWaveRadius: number;
  heatPerShot: number;
  heatCapacity: number;
  heatCoolingPerSecond: number;
  heatDamageBonus: number;
  heatLockMs: number;
  heatPulseFactor: number;

  pierceCount: number;
  pierceDamageRetention: number;
  shieldBypass: number;
  pierceShockwaveRadius: number;
  pierceShockwaveFactor: number;
  bounceCount: number;
  bounceRadiusBonus: number;
  bounceDamageRetention: number;
  bounceForkTargets: number;
  bounceForkDamageFactor: number;
  multishotTargets: number;
  multishotDamageFactor: number;
  multishotSpreadRadians: number;
  explosionRadius: number;
  explosionDamageFactor: number;
  explosionChainTargets: number;
  explosionSecondaryRadius: number;
  explosionSecondaryDamageFactor: number;
  executionThreshold: number;
  executionSplashRadius: number;
  executionSplashFactor: number;
}
export interface WeaponTraitDefinition {
  id: WeaponTraitId;
  title: string;
  levels: readonly {
    rarity: "RARE" | "EPIC";
    description: string;
    effects: Partial<TraitEffects>;
  }[];
}
// Prototype tuning: each row is the complete cumulative effect for that trait level.
export const traitBalance = {
  initialLimit: 3,
  maximumLimit: 4,
  maxLevel: 5,
} as const;
export const weaponTraits: Record<WeaponTraitId, WeaponTraitDefinition> = {
  penetration: {
    id: "penetration",
    title: "관통",
    levels: [
      {
        rarity: "RARE",
        description: "뒤쪽 적 1명 관통 · 관통 피해 65% 유지",
        effects: { pierceCount: 1, pierceDamageRetention: 0.65 },
      },
      {
        rarity: "RARE",
        description: "뒤쪽 적 2명 관통 · 관통 피해 75% 유지",
        effects: { pierceCount: 2, pierceDamageRetention: 0.75 },
      },
      {
        rarity: "EPIC",
        description:
          "뒤쪽 적 3명 관통 · 피해 85% 유지 · 방패 피해 감소 절반 무시",
        effects: {
          pierceCount: 3,
          pierceDamageRetention: 0.85,
          shieldBypass: 0.5,
        },
      },
      {
        rarity: "RARE",
        description:
          "뒤쪽 적 4명 관통 · 피해 95% 유지 · 방패 피해 감소 75% 무시",
        effects: {
          pierceCount: 4,
          pierceDamageRetention: 0.95,
          shieldBypass: 0.75,
        },
      },
      {
        rarity: "EPIC",
        description:
          "5명 관통 · 피해/방패 무시 100% · 마지막 관통에 반경 110 충격파",
        effects: {
          pierceCount: 5,
          pierceDamageRetention: 1,
          shieldBypass: 1,
          pierceShockwaveRadius: 110,
          pierceShockwaveFactor: 0.8,
        },
      },
    ],
  },
  ricochet: {
    id: "ricochet",
    title: "도탄",
    levels: [
      {
        rarity: "RARE",
        description: "주변 적으로 1회 도탄 · 피해 65% 유지",
        effects: { bounceCount: 1, bounceDamageRetention: 0.65 },
      },
      {
        rarity: "RARE",
        description: "2회 도탄 · 탐색 거리 +30 · 피해 75% 유지",
        effects: {
          bounceCount: 2,
          bounceRadiusBonus: 30,
          bounceDamageRetention: 0.75,
        },
      },
      {
        rarity: "EPIC",
        description: "3회 도탄 · 마지막 도탄이 다른 1명에게 60% 피해 분기",
        effects: {
          bounceCount: 3,
          bounceRadiusBonus: 50,
          bounceDamageRetention: 0.8,
          bounceForkTargets: 1,
          bounceForkDamageFactor: 0.6,
        },
      },
      {
        rarity: "RARE",
        description: "4회 도탄 · 탐색 거리 +80 · 피해 90% 유지 · 1명 분기",
        effects: {
          bounceCount: 4,
          bounceRadiusBonus: 80,
          bounceDamageRetention: 0.9,
          bounceForkTargets: 1,
          bounceForkDamageFactor: 0.8,
        },
      },
      {
        rarity: "EPIC",
        description:
          "5회 도탄 · 피해 100% 유지 · 마지막 도탄이 2명에게 100% 분기",
        effects: {
          bounceCount: 5,
          bounceRadiusBonus: 110,
          bounceDamageRetention: 1,
          bounceForkTargets: 2,
          bounceForkDamageFactor: 1,
        },
      },
    ],
  },
  multishot: {
    id: "multishot",
    title: "다중탄",
    levels: [
      {
        rarity: "RARE",
        description: "전방 다른 적 1명에게 55% 피해 탄환 동시 발사",
        effects: {
          multishotTargets: 1,
          multishotDamageFactor: 0.55,
          multishotSpreadRadians: 0.65,
        },
      },
      {
        rarity: "RARE",
        description:
          "전방 다른 적 1명에게 80% 피해 탄환 동시 발사 · 사격 각도 확장",
        effects: {
          multishotTargets: 1,
          multishotDamageFactor: 0.8,
          multishotSpreadRadians: 0.75,
        },
      },
      {
        rarity: "EPIC",
        description: "전방 다른 적 2명에게 75% 피해 탄환 동시 발사",
        effects: {
          multishotTargets: 2,
          multishotDamageFactor: 0.75,
          multishotSpreadRadians: 0.85,
        },
      },
      {
        rarity: "RARE",
        description: "전방 다른 적 3명에게 85% 피해 탄환 동시 발사",
        effects: {
          multishotTargets: 3,
          multishotDamageFactor: 0.85,
          multishotSpreadRadians: 0.95,
        },
      },
      {
        rarity: "EPIC",
        description: "전방 다른 적 4명에게 100% 피해 탄환 동시 발사",
        effects: {
          multishotTargets: 4,
          multishotDamageFactor: 1,
          multishotSpreadRadians: 1.1,
        },
      },
    ],
  },
  explosive: {
    id: "explosive",
    title: "폭발탄",
    levels: [
      {
        rarity: "RARE",
        description: "적중 시 반경 65의 다른 적에게 40% 폭발 피해",
        effects: { explosionRadius: 65, explosionDamageFactor: 0.4 },
      },
      {
        rarity: "RARE",
        description: "폭발 반경 85 · 주변 피해 60%",
        effects: { explosionRadius: 85, explosionDamageFactor: 0.6 },
      },
      {
        rarity: "EPIC",
        description: "반경 100 · 피해 70% · 폭발로 처치한 적 1명이 추가 폭발",
        effects: {
          explosionRadius: 100,
          explosionDamageFactor: 0.7,
          explosionChainTargets: 1,
          explosionSecondaryRadius: 70,
          explosionSecondaryDamageFactor: 0.4,
        },
      },
      {
        rarity: "RARE",
        description: "반경 120 · 피해 85% · 처치한 적 최대 2명이 추가 폭발",
        effects: {
          explosionRadius: 120,
          explosionDamageFactor: 0.85,
          explosionChainTargets: 2,
          explosionSecondaryRadius: 85,
          explosionSecondaryDamageFactor: 0.55,
        },
      },
      {
        rarity: "EPIC",
        description:
          "반경 145 · 피해 100% · 처치한 적 최대 3명이 추가 폭발 (재연쇄 없음)",
        effects: {
          explosionRadius: 145,
          explosionDamageFactor: 1,
          explosionChainTargets: 3,
          explosionSecondaryRadius: 100,
          explosionSecondaryDamageFactor: 0.7,
        },
      },
    ],
  },
  execution: {
    id: "execution",
    title: "처형탄",
    levels: [
      {
        rarity: "RARE",
        description: "최대 체력 10% 이하 적을 직격 시 처형",
        effects: { executionThreshold: 0.1 },
      },
      {
        rarity: "RARE",
        description: "최대 체력 15% 이하 적을 직격 시 처형",
        effects: { executionThreshold: 0.15 },
      },
      {
        rarity: "EPIC",
        description: "체력 20% 이하 처형 · 처형 시 반경 80에 60% 충격파",
        effects: {
          executionThreshold: 0.2,
          executionSplashRadius: 80,
          executionSplashFactor: 0.6,
        },
      },
      {
        rarity: "RARE",
        description: "체력 25% 이하 처형 · 반경 100에 90% 충격파",
        effects: {
          executionThreshold: 0.25,
          executionSplashRadius: 100,
          executionSplashFactor: 0.9,
        },
      },
      {
        rarity: "EPIC",
        description:
          "체력 30% 이하 처형 · 반경 140에 140% 충격파 · 연쇄 처형 없음",
        effects: {
          executionThreshold: 0.3,
          executionSplashRadius: 140,
          executionSplashFactor: 1.4,
        },
      },
    ],
  },
  incendiary: {
    id: "incendiary",
    title: "소이탄",
    levels: [
      {
        rarity: "RARE",
        description: "초당 기본 피해 22% 화상 · 2초",
        effects: {
          burnDpsFactor: 0.22,
          burnDurationMs: 2000,
          burnSpreadTargets: 0,
          burnSpreadRadius: 0,
          burnMaxDepth: 0,
        },
      },
      {
        rarity: "RARE",
        description: "초당 기본 피해 30% 화상 · 2.6초",
        effects: {
          burnDpsFactor: 0.3,
          burnDurationMs: 2600,
          burnSpreadTargets: 0,
          burnSpreadRadius: 0,
          burnMaxDepth: 0,
        },
      },
      {
        rarity: "EPIC",
        description:
          "초당 기본 피해 36% 화상 · 3초 · 사망 시 2명 전염 · 최대 1세대",
        effects: {
          burnDpsFactor: 0.36,
          burnDurationMs: 3000,
          burnSpreadTargets: 2,
          burnSpreadRadius: 95,
          burnMaxDepth: 1,
        },
      },
      {
        rarity: "RARE",
        description:
          "초당 기본 피해 44% 화상 · 3.4초 · 사망 시 3명 전염 · 최대 2세대",
        effects: {
          burnDpsFactor: 0.44,
          burnDurationMs: 3400,
          burnSpreadTargets: 3,
          burnSpreadRadius: 125,
          burnMaxDepth: 2,
        },
      },
      {
        rarity: "EPIC",
        description:
          "초당 기본 피해 55% 화상 · 4초 · 사망 시 4명 전염 · 최대 3세대",
        effects: {
          burnDpsFactor: 0.55,
          burnDurationMs: 4000,
          burnSpreadTargets: 4,
          burnSpreadRadius: 150,
          burnMaxDepth: 3,
        },
      },
    ],
  },
  marking: {
    id: "marking",
    title: "표식탄",
    levels: [
      {
        rarity: "RARE",
        description: "같은 대상 연속 직격 시 표식 최대 3 · 중첩당 피해 +8%",
        effects: {
          markMaxStacks: 3,
          markDamagePerStack: 0.08,
          markShieldBypass: 0,
          markTransferStacks: 0,
          markTransferRadius: 160,
          markFinisherFactor: 0,
        },
      },
      {
        rarity: "RARE",
        description: "같은 대상 연속 직격 시 표식 최대 4 · 중첩당 피해 +9%",
        effects: {
          markMaxStacks: 4,
          markDamagePerStack: 0.09,
          markShieldBypass: 0,
          markTransferStacks: 0,
          markTransferRadius: 160,
          markFinisherFactor: 0,
        },
      },
      {
        rarity: "EPIC",
        description:
          "같은 대상 연속 직격 시 표식 최대 4 · 중첩당 피해 +12% · MAX 표식 방패 약화",
        effects: {
          markMaxStacks: 4,
          markDamagePerStack: 0.12,
          markShieldBypass: 0.4,
          markTransferStacks: 0,
          markTransferRadius: 160,
          markFinisherFactor: 0,
        },
      },
      {
        rarity: "RARE",
        description:
          "같은 대상 연속 직격 시 표식 최대 5 · 중첩당 피해 +14% · MAX 표식 방패 약화 · 처치 시 표식 2개 이전",
        effects: {
          markMaxStacks: 5,
          markDamagePerStack: 0.14,
          markShieldBypass: 0.55,
          markTransferStacks: 2,
          markTransferRadius: 160,
          markFinisherFactor: 0,
        },
      },
      {
        rarity: "EPIC",
        description:
          "같은 대상 연속 직격 시 표식 최대 5 · 중첩당 피해 +17% · MAX 표식 방패 약화 · 처치 시 표식 2개 이전 · MAX 마무리 피해 +50%",
        effects: {
          markMaxStacks: 5,
          markDamagePerStack: 0.17,
          markShieldBypass: 0.8,
          markTransferStacks: 2,
          markTransferRadius: 160,
          markFinisherFactor: 0.5,
        },
      },
    ],
  },
  suppression: {
    id: "suppression",
    title: "제압탄",
    levels: [
      {
        rarity: "RARE",
        description: "3회 적중 시 600ms 국지 감속 · 재제압 면역 2.4초",
        effects: {
          suppressionThreshold: 3,
          suppressionDurationMs: 600,
          suppressionSlow: 0.25,
          suppressionPushback: 0,
          suppressionAttackDelayMs: 0,
          suppressionWaveTargets: 0,
          suppressionWaveRadius: 0,
        },
      },
      {
        rarity: "RARE",
        description: "3회 적중 시 700ms 국지 감속 · 재제압 면역 2.4초",
        effects: {
          suppressionThreshold: 3,
          suppressionDurationMs: 700,
          suppressionSlow: 0.3,
          suppressionPushback: 0,
          suppressionAttackDelayMs: 0,
          suppressionWaveTargets: 0,
          suppressionWaveRadius: 0,
        },
      },
      {
        rarity: "EPIC",
        description:
          "3회 적중 시 800ms 국지 감속 · 짧은 밀침/성벽 공격 지연 · 재제압 면역 2.4초",
        effects: {
          suppressionThreshold: 3,
          suppressionDurationMs: 800,
          suppressionSlow: 0.35,
          suppressionPushback: 0.012,
          suppressionAttackDelayMs: 180,
          suppressionWaveTargets: 0,
          suppressionWaveRadius: 0,
        },
      },
      {
        rarity: "RARE",
        description:
          "3회 적중 시 900ms 국지 감속 · 짧은 밀침/성벽 공격 지연 · 재제압 면역 2.4초",
        effects: {
          suppressionThreshold: 3,
          suppressionDurationMs: 900,
          suppressionSlow: 0.4,
          suppressionPushback: 0.018,
          suppressionAttackDelayMs: 240,
          suppressionWaveTargets: 0,
          suppressionWaveRadius: 0,
        },
      },
      {
        rarity: "EPIC",
        description:
          "3회 적중 시 1000ms 국지 감속 · 짧은 밀침/성벽 공격 지연 · 뒤쪽 4명 제압 파동 · 재제압 면역 2.4초",
        effects: {
          suppressionThreshold: 3,
          suppressionDurationMs: 1000,
          suppressionSlow: 0.45,
          suppressionPushback: 0.025,
          suppressionAttackDelayMs: 300,
          suppressionWaveTargets: 4,
          suppressionWaveRadius: 130,
        },
      },
    ],
  },
  overheat: {
    id: "overheat",
    title: "과열",
    levels: [
      {
        rarity: "RARE",
        description:
          "지속 사격 Heat · 고열 피해 최대 +25% · 한계 초과 시 1.2초 사격 중단",
        effects: {
          heatPerShot: 11,
          heatCapacity: 100,
          heatCoolingPerSecond: 38,
          heatDamageBonus: 0.25,
          heatLockMs: 1200,
          heatPulseFactor: 0,
        },
      },
      {
        rarity: "RARE",
        description:
          "지속 사격 Heat · 고열 피해 최대 +35% · 한계 초과 시 1.2초 사격 중단",
        effects: {
          heatPerShot: 11,
          heatCapacity: 100,
          heatCoolingPerSecond: 38,
          heatDamageBonus: 0.35,
          heatLockMs: 1200,
          heatPulseFactor: 0,
        },
      },
      {
        rarity: "EPIC",
        description:
          "지속 사격 Heat · 고열 피해 최대 +45% · 고열 직격 화상 · 한계 초과 시 1.2초 사격 중단",
        effects: {
          heatPerShot: 11,
          heatCapacity: 100,
          heatCoolingPerSecond: 38,
          heatDamageBonus: 0.45,
          heatLockMs: 1200,
          heatPulseFactor: 0.15,
        },
      },
      {
        rarity: "RARE",
        description:
          "지속 사격 Heat · 고열 피해 최대 +55% · 고열 직격 화상 · 한계 초과 시 1.1초 사격 중단",
        effects: {
          heatPerShot: 11,
          heatCapacity: 120,
          heatCoolingPerSecond: 52,
          heatDamageBonus: 0.55,
          heatLockMs: 1100,
          heatPulseFactor: 0.15,
        },
      },
      {
        rarity: "EPIC",
        description:
          "지속 사격 Heat · 고열 피해 최대 +80% · 고열 직격 화상 · 한계 초과 시 1.5초 사격 중단",
        effects: {
          heatPerShot: 11,
          heatCapacity: 120,
          heatCoolingPerSecond: 52,
          heatDamageBonus: 0.8,
          heatLockMs: 1500,
          heatPulseFactor: 0.15,
        },
      },
    ],
  },
};
export function getTraitEffects(levels: WeaponTraitLevels): TraitEffects {
  const effects: TraitEffects = {
    burnDpsFactor: 0,
    burnDurationMs: 0,
    burnSpreadTargets: 0,
    burnSpreadRadius: 0,
    burnMaxDepth: 0,
    markMaxStacks: 0,
    markDamagePerStack: 0,
    markShieldBypass: 0,
    markTransferStacks: 0,
    markTransferRadius: 0,
    markFinisherFactor: 0,
    suppressionThreshold: 0,
    suppressionDurationMs: 0,
    suppressionSlow: 0,
    suppressionPushback: 0,
    suppressionAttackDelayMs: 0,
    suppressionWaveTargets: 0,
    suppressionWaveRadius: 0,
    heatPerShot: 0,
    heatCapacity: 0,
    heatCoolingPerSecond: 0,
    heatDamageBonus: 0,
    heatLockMs: 0,
    heatPulseFactor: 0,

    pierceCount: 0,
    pierceDamageRetention: 0.55,
    shieldBypass: 0,
    pierceShockwaveRadius: 0,
    pierceShockwaveFactor: 0,
    bounceCount: 0,
    bounceRadiusBonus: 0,
    bounceDamageRetention: 0.6,
    bounceForkTargets: 0,
    bounceForkDamageFactor: 0,
    multishotTargets: 0,
    multishotDamageFactor: 0,
    multishotSpreadRadians: 0,
    explosionRadius: 0,
    explosionDamageFactor: 0,
    explosionChainTargets: 0,
    explosionSecondaryRadius: 0,
    explosionSecondaryDamageFactor: 0,
    executionThreshold: 0,
    executionSplashRadius: 0,
    executionSplashFactor: 0,
  };
  for (const id of weaponTraitIds) {
    const level = Math.min(
      traitBalance.maxLevel,
      Math.max(0, Math.floor(levels[id] ?? 0)),
    );
    if (level > 0)
      Object.assign(effects, weaponTraits[id].levels[level - 1]!.effects);
  }
  return effects;
}
