import type { GrowthBranch, GrowthBranches } from "./growth";
export const weaponTraitIds = [
  "penetration",
  "ricochet",
  "multishot",
  "explosive",
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
  bounceDamageGrowth: number;
  bounceForkTargets: number;
  bounceForkDamageFactor: number;
  bounceImpactRadius: number;
  bounceImpactFactor: number;
  multishotTargets: number;
  multishotDamageFactor: number;
  multishotSpreadRadians: number;
  multishotPrimaryFactor: number;
  explosionRadius: number;
  explosionDamageFactor: number;
  explosionChainTargets: number;
  explosionSecondaryRadius: number;
  explosionSecondaryDamageFactor: number;
  executionThreshold: number;
  executionSplashRadius: number;
  executionSplashFactor: number;
  executionChainTargets: number;
}
export interface TraitLevel {
  rarity: "RARE" | "EPIC";
  description: string;
  effects: Partial<TraitEffects>;
}
export interface WeaponTraitDefinition {
  id: WeaponTraitId;
  title: string;
  levels: readonly TraitLevel[];
  branches: Record<
    GrowthBranch,
    { title: string; levels: readonly TraitLevel[] }
  >;
}
export const traitBalance = {
  initialLimit: 3,
  maximumLimit: 4,
  maxLevel: 5,
  branchLevel: 3,
} as const;
// Rows are complete cumulative effects, not additions to previous levels.
export const weaponTraits: Record<WeaponTraitId, WeaponTraitDefinition> = {
  penetration: {
    id: "penetration",
    title: "관통",
    levels: [
      {
        rarity: "RARE",
        description: "뒤쪽 적 1명 관통 · 관통 피해 65% 유지",
        effects: {
          pierceCount: 1,
          pierceDamageRetention: 0.65,
        },
      },
      {
        rarity: "RARE",
        description: "뒤쪽 적 2명 관통 · 관통 피해 75% 유지",
        effects: {
          pierceCount: 2,
          pierceDamageRetention: 0.75,
        },
      },
    ],
    branches: {
      a: {
        title: "직선 관통",
        levels: [
          {
            rarity: "EPIC",
            description: "3명 관통 · 피해 85% 유지 · 방패 피해 감소 25% 무시",
            effects: {
              pierceCount: 3,
              pierceDamageRetention: 0.85,
              shieldBypass: 0.25,
            },
          },
          {
            rarity: "EPIC",
            description: "5명 관통 · 피해 95% 유지 · 방패 피해 감소 35% 무시",
            effects: {
              pierceCount: 5,
              pierceDamageRetention: 0.95,
              shieldBypass: 0.35,
            },
          },
          {
            rarity: "EPIC",
            description:
              "무손실 관통 · 8명에게 100% 피해 · 방패 피해 감소 절반 무시",
            effects: {
              pierceCount: 8,
              pierceDamageRetention: 1,
              shieldBypass: 0.5,
            },
          },
        ],
      },
      b: {
        title: "파쇄 관통",
        levels: [
          {
            rarity: "EPIC",
            description:
              "2명 관통 · 마지막 지점 반경 100에 90% 파쇄 · 방패 피해 감소 절반 무시",
            effects: {
              pierceCount: 2,
              pierceDamageRetention: 0.75,
              pierceShockwaveRadius: 100,
              pierceShockwaveFactor: 0.9,
              shieldBypass: 0.5,
            },
          },
          {
            rarity: "EPIC",
            description:
              "2명 관통 · 반경 135에 130% 파쇄 · 방패 피해 감소 75% 무시",
            effects: {
              pierceCount: 2,
              pierceDamageRetention: 0.85,
              pierceShockwaveRadius: 135,
              pierceShockwaveFactor: 1.3,
              shieldBypass: 0.75,
            },
          },
          {
            rarity: "EPIC",
            description:
              "대형 파쇄 · 3명 관통 · 반경 180에 180% 충격파 · 방패 완전 무시",
            effects: {
              pierceCount: 3,
              pierceDamageRetention: 0.9,
              pierceShockwaveRadius: 180,
              pierceShockwaveFactor: 1.8,
              shieldBypass: 1,
            },
          },
        ],
      },
    },
  },
  ricochet: {
    id: "ricochet",
    title: "도탄",
    levels: [
      {
        rarity: "RARE",
        description: "주변 적으로 1회 도탄 · 피해 65% 유지",
        effects: {
          bounceCount: 1,
          bounceDamageRetention: 0.65,
        },
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
    ],
    branches: {
      a: {
        title: "연쇄 도탄",
        levels: [
          {
            rarity: "EPIC",
            description: "4회 도탄 · 탐색 거리 +80 · 피해 75%",
            effects: {
              bounceCount: 4,
              bounceRadiusBonus: 80,
              bounceDamageRetention: 0.75,
            },
          },
          {
            rarity: "EPIC",
            description: "6회 도탄 · 거리 +120 · 마지막 1명 분기",
            effects: {
              bounceCount: 6,
              bounceRadiusBonus: 120,
              bounceDamageRetention: 0.85,
              bounceForkTargets: 1,
              bounceForkDamageFactor: 0.8,
            },
          },
          {
            rarity: "EPIC",
            description:
              "전장 연쇄 · 8회 도탄 · 거리 +160 · 마지막 3명에게 분기",
            effects: {
              bounceCount: 8,
              bounceRadiusBonus: 160,
              bounceDamageRetention: 1,
              bounceForkTargets: 3,
              bounceForkDamageFactor: 1,
            },
          },
        ],
      },
      b: {
        title: "강타 도탄",
        levels: [
          {
            rarity: "EPIC",
            description: "2회 도탄 · 첫 피해 90% · 튕길 때마다 +45%p",
            effects: {
              bounceCount: 2,
              bounceRadiusBonus: 30,
              bounceDamageRetention: 0.9,
              bounceDamageGrowth: 0.45,
            },
          },
          {
            rarity: "EPIC",
            description: "2회 도탄 · 첫 피해 110% · 다음 도탄 +65%p",
            effects: {
              bounceCount: 2,
              bounceRadiusBonus: 50,
              bounceDamageRetention: 1.1,
              bounceDamageGrowth: 0.65,
            },
          },
          {
            rarity: "EPIC",
            description:
              "파괴 도탄 · 3회 도탄 130→220→310% · 마지막 반경 100 충격파",
            effects: {
              bounceCount: 3,
              bounceRadiusBonus: 70,
              bounceDamageRetention: 1.3,
              bounceDamageGrowth: 0.9,
              bounceImpactRadius: 100,
              bounceImpactFactor: 1.5,
            },
          },
        ],
      },
    },
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
    ],
    branches: {
      a: {
        title: "광역 사격",
        levels: [
          {
            rarity: "EPIC",
            description: "넓은 부채꼴로 보조탄 2발 · 개별 피해 70%",
            effects: {
              multishotTargets: 2,
              multishotDamageFactor: 0.7,
              multishotSpreadRadians: 0.95,
            },
          },
          {
            rarity: "EPIC",
            description: "넓은 부채꼴로 보조탄 4발 · 개별 피해 80%",
            effects: {
              multishotTargets: 4,
              multishotDamageFactor: 0.8,
              multishotSpreadRadians: 1.15,
            },
          },
          {
            rarity: "EPIC",
            description: "전면 탄막 · 넓은 부채꼴로 보조탄 6발 · 개별 피해 90%",
            effects: {
              multishotTargets: 6,
              multishotDamageFactor: 0.9,
              multishotSpreadRadians: 1.3,
            },
          },
        ],
      },
      b: {
        title: "집중 사격",
        levels: [
          {
            rarity: "EPIC",
            description: "좁은 각도 보조탄 1발 · 보조탄/중앙탄 피해 115%",
            effects: {
              multishotTargets: 1,
              multishotDamageFactor: 1.15,
              multishotSpreadRadians: 0.22,
              multishotPrimaryFactor: 1.15,
            },
          },
          {
            rarity: "EPIC",
            description: "좁은 각도 보조탄 1발 · 보조탄 150% · 중앙탄 130%",
            effects: {
              multishotTargets: 1,
              multishotDamageFactor: 1.5,
              multishotSpreadRadians: 0.2,
              multishotPrimaryFactor: 1.3,
            },
          },
          {
            rarity: "EPIC",
            description:
              "집중 일제사격 · 좁은 각도 보조탄 2발 200% · 중앙탄 160%",
            effects: {
              multishotTargets: 2,
              multishotDamageFactor: 2,
              multishotSpreadRadians: 0.18,
              multishotPrimaryFactor: 1.6,
            },
          },
        ],
      },
    },
  },
  explosive: {
    id: "explosive",
    title: "폭발탄",
    levels: [
      {
        rarity: "RARE",
        description: "적중 시 반경 65의 다른 적에게 40% 폭발 피해",
        effects: {
          explosionRadius: 65,
          explosionDamageFactor: 0.4,
        },
      },
      {
        rarity: "RARE",
        description: "폭발 반경 85 · 주변 피해 60%",
        effects: {
          explosionRadius: 85,
          explosionDamageFactor: 0.6,
        },
      },
    ],
    branches: {
      a: {
        title: "연쇄 폭발",
        levels: [
          {
            rarity: "EPIC",
            description: "반경 100 · 70% 피해 · 폭발 처치한 2명 추가 폭발",
            effects: {
              explosionRadius: 100,
              explosionDamageFactor: 0.7,
              explosionChainTargets: 2,
              explosionSecondaryRadius: 80,
              explosionSecondaryDamageFactor: 0.6,
            },
          },
          {
            rarity: "EPIC",
            description: "반경 115 · 85% 피해 · 처치한 4명 추가 폭발",
            effects: {
              explosionRadius: 115,
              explosionDamageFactor: 0.85,
              explosionChainTargets: 4,
              explosionSecondaryRadius: 100,
              explosionSecondaryDamageFactor: 0.8,
            },
          },
          {
            rarity: "EPIC",
            description:
              "연쇄 붕괴 · 처치한 6명 추가 폭발 · 반경 130/125 · 피해 100% · 재연쇄 없음",
            effects: {
              explosionRadius: 130,
              explosionDamageFactor: 1,
              explosionChainTargets: 6,
              explosionSecondaryRadius: 125,
              explosionSecondaryDamageFactor: 1,
            },
          },
        ],
      },
      b: {
        title: "압축 탄두",
        levels: [
          {
            rarity: "EPIC",
            description: "추가 폭발 없이 반경 125에 100% 피해",
            effects: {
              explosionRadius: 125,
              explosionDamageFactor: 1,
            },
          },
          {
            rarity: "EPIC",
            description: "반경 155에 140% 단일 대폭발",
            effects: {
              explosionRadius: 155,
              explosionDamageFactor: 1.4,
            },
          },
          {
            rarity: "EPIC",
            description: "초대형 기폭 · 반경 190에 190% 단일 대폭발",
            effects: {
              explosionRadius: 190,
              explosionDamageFactor: 1.9,
            },
          },
        ],
      },
    },
  },
  execution: {
    id: "execution",
    title: "처형탄",
    levels: [
      {
        rarity: "RARE",
        description: "최대 체력 10% 이하 적을 직격 시 처형",
        effects: {
          executionThreshold: 0.1,
        },
      },
      {
        rarity: "RARE",
        description: "최대 체력 15% 이하 적을 직격 시 처형",
        effects: {
          executionThreshold: 0.15,
        },
      },
    ],
    branches: {
      a: {
        title: "사형 집행",
        levels: [
          {
            rarity: "EPIC",
            description: "최대 체력 25% 이하 적 직격 처형",
            effects: {
              executionThreshold: 0.25,
            },
          },
          {
            rarity: "EPIC",
            description: "최대 체력 32% 이하 적 직격 처형",
            effects: {
              executionThreshold: 0.32,
            },
          },
          {
            rarity: "EPIC",
            description:
              "최후 통첩 · 최대 체력 40% 이하 처형 · 정예/방패도 동일 적용",
            effects: {
              executionThreshold: 0.4,
            },
          },
        ],
      },
      b: {
        title: "죽음의 파동",
        levels: [
          {
            rarity: "EPIC",
            description: "체력 15% 이하 처형 · 성공 시 반경 110에 120% 파동",
            effects: {
              executionThreshold: 0.15,
              executionSplashRadius: 110,
              executionSplashFactor: 1.2,
            },
          },
          {
            rarity: "EPIC",
            description: "체력 18% 이하 처형 · 반경 145에 170% 파동",
            effects: {
              executionThreshold: 0.18,
              executionSplashRadius: 145,
              executionSplashFactor: 1.7,
            },
          },
          {
            rarity: "EPIC",
            description:
              "집단 선고 · 체력 20% 이하 처형 · 반경 190에 230% 파동 · 약해진 주변 4명 추가 처형 (재파동 없음)",
            effects: {
              executionThreshold: 0.2,
              executionSplashRadius: 190,
              executionSplashFactor: 2.3,
              executionChainTargets: 4,
            },
          },
        ],
      },
    },
  },
};
export function traitLevel(
  id: WeaponTraitId,
  level: number,
  branch?: GrowthBranch,
): TraitLevel {
  const rank = Math.min(
    5,
    Math.max(1, Number.isFinite(level) ? Math.floor(level) : 1),
  );
  const definition = weaponTraits[id];
  return rank >= 3 && (branch === "a" || branch === "b")
    ? definition.branches[branch].levels[rank - 3]!
    : definition.levels[Math.min(2, rank) - 1]!;
}
export function getTraitEffects(
  levels: WeaponTraitLevels,
  branches: GrowthBranches = {},
): TraitEffects {
  const effects: TraitEffects = {
    pierceCount: 0,
    pierceDamageRetention: 0.55,
    shieldBypass: 0,
    pierceShockwaveRadius: 0,
    pierceShockwaveFactor: 0,
    bounceCount: 0,
    bounceRadiusBonus: 0,
    bounceDamageRetention: 0.6,
    bounceDamageGrowth: 0,
    bounceForkTargets: 0,
    bounceForkDamageFactor: 0,
    bounceImpactRadius: 0,
    bounceImpactFactor: 0,
    multishotTargets: 0,
    multishotDamageFactor: 0,
    multishotSpreadRadians: 0,
    multishotPrimaryFactor: 1,
    explosionRadius: 0,
    explosionDamageFactor: 0,
    explosionChainTargets: 0,
    explosionSecondaryRadius: 0,
    explosionSecondaryDamageFactor: 0,
    executionThreshold: 0,
    executionSplashRadius: 0,
    executionSplashFactor: 0,
    executionChainTargets: 0,
  };
  for (const id of weaponTraitIds) {
    if ((levels[id] ?? 0) > 0)
      Object.assign(effects, traitLevel(id, levels[id]!, branches[id]).effects);
  }
  return effects;
}
