import type { MarineConfig, StimpackConfig } from "../model/types";

// Keep weapon tuning in one place while preserving the planned balance imports.
export { gaussRifleBalance } from "./weapons";

// Prototype tuning values for the enemy-pressure-only milestone.
export const enemyPressureBalance = {
  wallMaxHp: 500,
  spawnIntervalMs: 10000,
} as const;

export const marineConfig = {
  id: "marine",
  primaryAttackId: "gauss-rifle",
  secondaryAbilityId: "stimpack",
  burstId: "marine-burst",
  baseStats: {
    damageMultiplier: 1, // prototype tuning value
    attackSpeedMultiplier: 1, // prototype tuning value
  },
} as const satisfies MarineConfig;

export const stimpackBalance = {
  id: "stimpack",
  boostMs: 5000, // prototype tuning value
  boostAttackSpeedMultiplier: 1.5, // prototype tuning value
  crashMs: 1000,
  recoveryMs: 2000,
} as const satisfies StimpackConfig;
