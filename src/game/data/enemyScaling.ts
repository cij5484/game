import { runBalance } from "./run";

// M3 tuning: 1.5x the M2 movement curve; HP and attack clocks are unchanged.
export const enemyScalingBalance = {
  durationMs: runBalance.durationMs,
  maxHpMultiplier: 1.1,
  initialSpeedMultiplier: 0.975,
  maxSpeedMultiplier: 1.53,
} as const;
