export const weaponTraitIds = [
  "rapid",
  "penetration",
  "ricochet",
  "multishot",
  "explosive",
  "critical",
] as const;
export type WeaponTraitId = (typeof weaponTraitIds)[number];
export type WeaponTraitLevels = Partial<Record<WeaponTraitId, number>>;
export interface TraitEffects {
  burstRoundsBonus: number;
  roundIntervalReductionMs: number;
  burstRecoveryReductionMs: number;
  killRelayTargets: number;
  killRelayDamageFactor: number;
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
  criticalChance: number;
  criticalMultiplier: number;
  criticalSplashRadius: number;
  criticalSplashFactor: number;
  criticalEchoDamageFactor: number;
}
export interface WeaponTraitDefinition {
  id: WeaponTraitId;
  title: string;
  levels: readonly { description: string; effects: Partial<TraitEffects> }[];
}
// Prototype tuning: each row is the complete cumulative effect for that trait level.
export const traitBalance = {
  initialLimit: 2,
  maximumLimit: 3,
  maxLevel: 5,
  eliteExpansionChance: 0.03,
} as const;
export const weaponTraits: Record<WeaponTraitId, WeaponTraitDefinition> = {
  rapid: {
    id: "rapid",
    title: "속사",
    levels: [
      {
        description: "점사 4발 · 점사 후 회복 40ms 단축",
        effects: { burstRoundsBonus: 1, burstRecoveryReductionMs: 40 },
      },
      {
        description: "점사 5발 · 발사 간격 15ms, 회복 70ms 단축",
        effects: {
          burstRoundsBonus: 2,
          roundIntervalReductionMs: 15,
          burstRecoveryReductionMs: 70,
        },
      },
      {
        description: "점사 5발 · 처치 시 주변 1명에게 60% 연쇄 피해",
        effects: {
          burstRoundsBonus: 2,
          roundIntervalReductionMs: 20,
          burstRecoveryReductionMs: 100,
          killRelayTargets: 1,
          killRelayDamageFactor: 0.6,
        },
      },
      {
        description: "점사 6발 · 발사 간격 30ms, 회복 130ms 단축 · 연쇄 80%",
        effects: {
          burstRoundsBonus: 3,
          roundIntervalReductionMs: 30,
          burstRecoveryReductionMs: 130,
          killRelayTargets: 1,
          killRelayDamageFactor: 0.8,
        },
      },
      {
        description: "점사 7발 · 처치 시 주변 2명에게 100% 연쇄 피해",
        effects: {
          burstRoundsBonus: 4,
          roundIntervalReductionMs: 40,
          burstRecoveryReductionMs: 160,
          killRelayTargets: 2,
          killRelayDamageFactor: 1,
        },
      },
    ],
  },
  penetration: {
    id: "penetration",
    title: "관통",
    levels: [
      {
        description: "뒤쪽 적 1명 관통 · 관통 피해 65% 유지",
        effects: { pierceCount: 1, pierceDamageRetention: 0.65 },
      },
      {
        description: "뒤쪽 적 2명 관통 · 관통 피해 75% 유지",
        effects: { pierceCount: 2, pierceDamageRetention: 0.75 },
      },
      {
        description:
          "뒤쪽 적 3명 관통 · 피해 85% 유지 · 방패 피해 감소 절반 무시",
        effects: {
          pierceCount: 3,
          pierceDamageRetention: 0.85,
          shieldBypass: 0.5,
        },
      },
      {
        description:
          "뒤쪽 적 4명 관통 · 피해 95% 유지 · 방패 피해 감소 75% 무시",
        effects: {
          pierceCount: 4,
          pierceDamageRetention: 0.95,
          shieldBypass: 0.75,
        },
      },
      {
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
        description: "주변 적으로 1회 도탄 · 피해 65% 유지",
        effects: { bounceCount: 1, bounceDamageRetention: 0.65 },
      },
      {
        description: "2회 도탄 · 탐색 거리 +30 · 피해 75% 유지",
        effects: {
          bounceCount: 2,
          bounceRadiusBonus: 30,
          bounceDamageRetention: 0.75,
        },
      },
      {
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
        description: "전방 다른 적 1명에게 55% 피해 탄환 동시 발사",
        effects: {
          multishotTargets: 1,
          multishotDamageFactor: 0.55,
          multishotSpreadRadians: 0.65,
        },
      },
      {
        description:
          "전방 다른 적 1명에게 80% 피해 탄환 동시 발사 · 사격 각도 확장",
        effects: {
          multishotTargets: 1,
          multishotDamageFactor: 0.8,
          multishotSpreadRadians: 0.75,
        },
      },
      {
        description: "전방 다른 적 2명에게 75% 피해 탄환 동시 발사",
        effects: {
          multishotTargets: 2,
          multishotDamageFactor: 0.75,
          multishotSpreadRadians: 0.85,
        },
      },
      {
        description: "전방 다른 적 3명에게 85% 피해 탄환 동시 발사",
        effects: {
          multishotTargets: 3,
          multishotDamageFactor: 0.85,
          multishotSpreadRadians: 0.95,
        },
      },
      {
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
        description: "적중 시 반경 65의 다른 적에게 40% 폭발 피해",
        effects: { explosionRadius: 65, explosionDamageFactor: 0.4 },
      },
      {
        description: "폭발 반경 85 · 주변 피해 60%",
        effects: { explosionRadius: 85, explosionDamageFactor: 0.6 },
      },
      {
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
  critical: {
    id: "critical",
    title: "치명타",
    levels: [
      {
        description: "치명타 확률 20% · 피해 2배",
        effects: { criticalChance: 0.2, criticalMultiplier: 2 },
      },
      {
        description: "치명타 확률 30% · 피해 2.3배",
        effects: { criticalChance: 0.3, criticalMultiplier: 2.3 },
      },
      {
        description:
          "확률 35% · 피해 2.5배 · 치명타 시 반경 70에 기본 피해 50% 충격파",
        effects: {
          criticalChance: 0.35,
          criticalMultiplier: 2.5,
          criticalSplashRadius: 70,
          criticalSplashFactor: 0.5,
        },
      },
      {
        description: "확률 45% · 피해 2.8배 · 치명타 충격파 반경 90 / 피해 75%",
        effects: {
          criticalChance: 0.45,
          criticalMultiplier: 2.8,
          criticalSplashRadius: 90,
          criticalSplashFactor: 0.75,
        },
      },
      {
        description:
          "확률 55% · 피해 3배 · 충격파 반경 110 · 주변 다른 적 1명에게 치명타 피해 50% 메아리",
        effects: {
          criticalChance: 0.55,
          criticalMultiplier: 3,
          criticalSplashRadius: 110,
          criticalSplashFactor: 1,
          criticalEchoDamageFactor: 0.5,
        },
      },
    ],
  },
};
export function getTraitEffects(levels: WeaponTraitLevels): TraitEffects {
  const effects: TraitEffects = {
    burstRoundsBonus: 0,
    roundIntervalReductionMs: 0,
    burstRecoveryReductionMs: 0,
    killRelayTargets: 0,
    killRelayDamageFactor: 0,
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
    criticalChance: 0,
    criticalMultiplier: 2,
    criticalSplashRadius: 0,
    criticalSplashFactor: 0,
    criticalEchoDamageFactor: 0,
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
