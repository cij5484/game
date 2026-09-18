import type { EnemyKind, LaneId } from "../model/types";
import type { EnemyState } from "./enemySimulation";
import { enemyConfigs } from "../data/enemies";
import { eliteBalance } from "../data/elite";
import { enemyScalingBalance } from "../data/enemyScaling";

export function createPrototypeEnemy(
  kind: EnemyKind,
  lane: LaneId,
  id: number,
  offset01 = 0.5,
  elite = false,
  elapsedMs = 0,
): EnemyState {
  // Legacy grunt-elite requests migrate to the Stage 1 runner archetype.
  if (elite && kind === "grunt") kind = "runner";
  const eliteStats = elite
    ? eliteBalance[kind as "runner" | "shield"]
    : undefined;
  const growth = Math.min(
    1,
    Math.max(0, elapsedMs / enemyScalingBalance.durationMs),
  );
  const hpMultiplier = 1 + growth * (enemyScalingBalance.maxHpMultiplier - 1);
  const speedMultiplier =
    enemyScalingBalance.initialSpeedMultiplier +
    growth *
      (enemyScalingBalance.maxSpeedMultiplier -
        enemyScalingBalance.initialSpeedMultiplier);
  const hp = (eliteStats?.hp ?? enemyConfigs[kind].hp) * hpMultiplier;
  return {
    id,
    ...(kind === "shield"
      ? {
          shieldHp: elite
            ? eliteBalance.shield.shieldHp
            : enemyConfigs.shield.shieldHp,
          maxShieldHp: elite
            ? eliteBalance.shield.shieldHp
            : enemyConfigs.shield.shieldHp,
        }
      : {}),
    ...(elite && kind === "runner"
      ? { chargePhase: "approaching" as const, chargeRemainingMs: 0 }
      : {}),
    ...(elite ? { elite: true } : {}),
    ...(speedMultiplier !== 1 ? { speedMultiplier } : {}),
    kind,
    lane,
    offset01,
    hp,
    maxHp: hp,
    progress01: 0,
    phase: "moving",
  };
}
