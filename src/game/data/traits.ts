export const weaponTraitIds = [
  "penetration",
  "ricochet",
  "multishot",
  "explosive",
  "critical",
  "split",
  "heavy",
  "execution",
] as const;
export type WeaponTraitId = (typeof weaponTraitIds)[number];
export type WeaponTraitLevels = Partial<Record<WeaponTraitId, number>>;
export interface TraitEffects {
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
  splitTargets: number;
  splitDamageFactor: number;
  splitRadius: number;
  heavyDamageMultiplier: number;
  heavyPushback: number;
  heavySplashRadius: number;
  heavySplashFactor: number;
  executionThreshold: number;
  executionSplashRadius: number;
  executionSplashFactor: number;
  criticalSplashRadius: number;
  criticalSplashFactor: number;
  criticalEchoDamageFactor: number;
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
  critical: {
    id: "critical",
    title: "치명타",
    levels: [
      {
        rarity: "RARE",
        description: "치명타 적중 시 반경 60에 기본 피해 40% 충격파",
        effects: { criticalSplashRadius: 60, criticalSplashFactor: 0.4 },
      },
      {
        rarity: "RARE",
        description: "치명타 충격파 반경 80 · 기본 피해 65%",
        effects: { criticalSplashRadius: 80, criticalSplashFactor: 0.65 },
      },
      {
        rarity: "EPIC",
        description:
          "치명타 충격파 반경 95 · 피해 80% · 다른 적 1명에게 치명타 피해 35% 메아리",
        effects: {
          criticalSplashRadius: 95,
          criticalSplashFactor: 0.8,
          criticalEchoDamageFactor: 0.35,
        },
      },
      {
        rarity: "RARE",
        description: "치명타 충격파 반경 115 · 피해 100% · 메아리 55%",
        effects: {
          criticalSplashRadius: 115,
          criticalSplashFactor: 1,
          criticalEchoDamageFactor: 0.55,
        },
      },
      {
        rarity: "EPIC",
        description:
          "치명타 충격파 반경 150 · 피해 150% · 다른 적 1명에게 치명타 피해 100% 메아리",
        effects: {
          criticalSplashRadius: 150,
          criticalSplashFactor: 1.5,
          criticalEchoDamageFactor: 1,
        },
      },
    ],
  },
  split: {
    id: "split",
    title: "분열탄",
    levels: [
      {
        rarity: "RARE",
        description: "첫 적중에서 주변 1명에게 45% 분열탄 · 재분열 없음",
        effects: { splitTargets: 1, splitDamageFactor: 0.45, splitRadius: 140 },
      },
      {
        rarity: "RARE",
        description: "주변 1명에게 70% 분열탄 · 탐색 반경 170",
        effects: { splitTargets: 1, splitDamageFactor: 0.7, splitRadius: 170 },
      },
      {
        rarity: "EPIC",
        description: "첫 적중에서 주변 2명에게 75% 분열탄",
        effects: { splitTargets: 2, splitDamageFactor: 0.75, splitRadius: 200 },
      },
      {
        rarity: "RARE",
        description: "주변 2명에게 100% 분열탄 · 탐색 반경 230",
        effects: { splitTargets: 2, splitDamageFactor: 1, splitRadius: 230 },
      },
      {
        rarity: "EPIC",
        description: "첫 적중에서 주변 3명에게 120% 분열탄 · 반경 270",
        effects: { splitTargets: 3, splitDamageFactor: 1.2, splitRadius: 270 },
      },
    ],
  },
  heavy: {
    id: "heavy",
    title: "중량탄",
    levels: [
      {
        rarity: "RARE",
        description: "직격 피해 +30% · 적을 전장 깊이 1%만큼 밀침",
        effects: { heavyDamageMultiplier: 1.3, heavyPushback: 0.01 },
      },
      {
        rarity: "RARE",
        description: "직격 피해 +50% · 밀침 1.5%",
        effects: { heavyDamageMultiplier: 1.5, heavyPushback: 0.015 },
      },
      {
        rarity: "EPIC",
        description: "직격 피해 +70% · 밀침 2% · 반경 80에 50% 충격파",
        effects: {
          heavyDamageMultiplier: 1.7,
          heavyPushback: 0.02,
          heavySplashRadius: 80,
          heavySplashFactor: 0.5,
        },
      },
      {
        rarity: "RARE",
        description: "직격 피해 +90% · 밀침 2.5% · 반경 100에 75% 충격파",
        effects: {
          heavyDamageMultiplier: 1.9,
          heavyPushback: 0.025,
          heavySplashRadius: 100,
          heavySplashFactor: 0.75,
        },
      },
      {
        rarity: "EPIC",
        description: "직격 피해 +120% · 밀침 4% · 반경 140에 120% 충격파",
        effects: {
          heavyDamageMultiplier: 2.2,
          heavyPushback: 0.04,
          heavySplashRadius: 140,
          heavySplashFactor: 1.2,
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
};
export function getTraitEffects(levels: WeaponTraitLevels): TraitEffects {
  const effects: TraitEffects = {
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
    splitTargets: 0,
    splitDamageFactor: 0,
    splitRadius: 0,
    heavyDamageMultiplier: 1,
    heavyPushback: 0,
    heavySplashRadius: 0,
    heavySplashFactor: 0,
    executionThreshold: 0,
    executionSplashRadius: 0,
    executionSplashFactor: 0,
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
