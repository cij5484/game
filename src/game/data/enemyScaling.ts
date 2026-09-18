import { runBalance } from "./run";

// M3 tuning: 1.5x the M2 movement curve; HP and attack clocks are unchanged.
export const enemyScalingBalance = {
  durationMs: runBalance.durationMs,
  maxHpMultiplier: 1.1,
  initialSpeedMultiplier: 0.975,
  maxSpeedMultiplier: 1.53,
} as const;

// M6 prototype: mild spawn-only HP growth; movement retains the M3 curve.
export const enemyLevelScaling = {
  linear: 0.02,
  quadratic: 0.0008,
} as const;

export function enemyLevelHpMultiplier(characterLevel: number): number {
  const levels = Math.max(0, characterLevel - 1);
  return (
    1 +
    enemyLevelScaling.linear * levels +
    enemyLevelScaling.quadratic * levels ** 2
  );
}
