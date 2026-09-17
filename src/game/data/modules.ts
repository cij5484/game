export type ModuleId = "penetration" | "storm";
export type ModuleLevels = Partial<Record<ModuleId, number>>;

export interface ModuleEffects {
  penetrationBonus: number;
  widthBonus: number;
  aftershockRadius: number;
  aftershockDamageFactor: number;
  ricochetRadiusBonus: number;
  extraRicochet: number;
}

export interface ModuleDefinition {
  id: ModuleId;
  title: string;
  shortLabel: string;
  maxLevel: number;
  levels: readonly { description: string; effects: Partial<ModuleEffects> }[];
}

// Prototype tuning values. Level effects replace the previous level, not stack.
export const moduleBalance = { maxTypes: 3 } as const;
export const modules: Record<ModuleId, ModuleDefinition> = {
  penetration: {
    id: "penetration",
    title: "관통 모듈",
    shortLabel: "PEN",
    maxLevel: 3,
    levels: [
      { description: "관통 대상 +1명", effects: { penetrationBonus: 1 } },
      {
        description: "관통 대상 +2명 · 관통 폭 +16",
        effects: { penetrationBonus: 2, widthBonus: 16 },
      },
      {
        description: "관통 +2명 · 폭 +16 · 마지막 관통 적 주변에 50% 충격파",
        effects: {
          penetrationBonus: 2,
          widthBonus: 16,
          aftershockRadius: 90,
          aftershockDamageFactor: 0.5,
        },
      },
    ],
  },
  storm: {
    id: "storm",
    title: "스톰 모듈",
    shortLabel: "STM",
    maxLevel: 3,
    levels: [
      {
        description: "추가 도탄 +1명 · 도탄 탐색 거리 +40",
        effects: { ricochetRadiusBonus: 40, extraRicochet: 1 },
      },
      {
        description: "추가 도탄 +1명 · 도탄 탐색 거리 +80",
        effects: { ricochetRadiusBonus: 80, extraRicochet: 1 },
      },
      {
        description: "추가 도탄 +2명 · 도탄 탐색 거리 +80",
        effects: { ricochetRadiusBonus: 80, extraRicochet: 2 },
      },
    ],
  },
};
