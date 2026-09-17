import type { EnemyConfig, EnemyKind, LaneId } from "../model/types";

export interface EnemyState {
  id: number;
  burn?: {
    remainingMs: number;
    dps: number;
    depth: number;
    spreadTargets: number;
    spreadRadius: number;
    maxDepth: number;
  };
  markStacks?: number;
  markShotIndex?: number;
  suppressionStacks?: number;
  suppressionMs?: number;
  suppressionSlow?: number;
  suppressionImmunityMs?: number;
  suppressionAttackDelayMs?: number;
  elite?: boolean;
  /** Fixed at spawn; temporary movement effects multiply this value. */
  speedMultiplier?: number;
  hp: number;
  maxHp?: number;
  kind: EnemyKind;
  lane: LaneId;
  offset01: number;
  progress01: number;
  phase: "moving" | "attacking";
}

export function advanceEnemy(
  enemy: EnemyState,
  deltaMs: number,
  config: EnemyConfig,
  movementMultiplier = 1,
): { enemy: EnemyState; wallTimeMs: number } {
  if (deltaMs <= 0 || enemy.hp <= 0) return { enemy, wallTimeMs: 0 };
  if (enemy.progress01 >= 1) {
    return {
      enemy: { ...enemy, progress01: 1, phase: "attacking" },
      wallTimeMs: deltaMs,
    };
  }
  const progressPerSecond =
    config.progressPerSecond *
    (enemy.speedMultiplier ?? 1) *
    movementMultiplier *
    ((enemy.suppressionMs ?? 0) > 0
      ? 1 - Math.min(0.6, enemy.suppressionSlow ?? 0)
      : 1);
  if (progressPerSecond <= 0) return { enemy, wallTimeMs: 0 };

  const arrivalMs = ((1 - enemy.progress01) / progressPerSecond) * 1000;
  const arrived = deltaMs >= arrivalMs;
  return {
    enemy: {
      ...enemy,
      progress01: arrived
        ? 1
        : Math.min(1, enemy.progress01 + (progressPerSecond * deltaMs) / 1000),
      phase: arrived ? "attacking" : "moving",
    },
    wallTimeMs: arrived ? deltaMs - arrivalMs : 0,
  };
}
