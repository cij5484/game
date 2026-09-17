import { runBalance } from "./run";

// Linear spawn-time growth; density remains the main source of difficulty.
export const enemyScalingBalance = {
  durationMs: runBalance.durationMs,
  maxHpMultiplier: 1.1,
  initialSpeedMultiplier: 0.65,
  maxSpeedMultiplier: 1.02,
} as const;
