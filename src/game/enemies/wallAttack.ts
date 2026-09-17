import type { EnemyConfig } from "../model/types";

export function advanceWallAttack(
  elapsedMs: number,
  wallTimeMs: number,
  config: Pick<EnemyConfig, "wallAttackIntervalMs" | "wallAttackDamage">,
): { elapsedMs: number; damage: number } {
  const interval = config.wallAttackIntervalMs;
  if (!Number.isFinite(interval) || interval <= 0) {
    throw new RangeError("Wall attack interval must be finite and positive");
  }
  if (wallTimeMs <= 0) return { elapsedMs, damage: 0 };
  const total = elapsedMs + wallTimeMs;
  return {
    elapsedMs: total % interval,
    damage: Math.floor(total / interval) * config.wallAttackDamage,
  };
}
