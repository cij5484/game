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
  const growth = Math.min(
    1,
    Math.max(0, elapsedMs / enemyScalingBalance.durationMs),
  );
  const hpMultiplier = 1 + growth * (enemyScalingBalance.maxHpMultiplier - 1);
  const speedMultiplier =
    1 + growth * (enemyScalingBalance.maxSpeedMultiplier - 1);
  const hp =
    enemyConfigs[kind].hp *
    hpMultiplier *
    (elite ? eliteBalance.hpMultiplier : 1);
  return {
    id,
    ...(elite ? { elite: true } : {}),
    ...(speedMultiplier > 1 ? { speedMultiplier } : {}),
    kind,
    lane,
    offset01,
    hp,
    maxHp: hp,
    progress01: 0,
    phase: "moving",
  };
}
