import { runBalance } from "./run";

// Linear spawn-time growth; density remains the main source of difficulty.
export const enemyScalingBalance = {
  durationMs: runBalance.durationMs,
  maxHpMultiplier: 1.15,
  maxSpeedMultiplier: 1.05,
} as const;
