import type { EnemyConfig, EnemyKind, LaneId } from "../model/types";

export interface EnemyState {
  id: number;
  hp: number;
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
): { enemy: EnemyState; wallTimeMs: number } {
  if (deltaMs <= 0 || enemy.hp <= 0) return { enemy, wallTimeMs: 0 };
  if (enemy.progress01 >= 1) {
    return {
      enemy: { ...enemy, progress01: 1, phase: "attacking" },
      wallTimeMs: deltaMs,
    };
  }
  if (config.progressPerSecond <= 0) return { enemy, wallTimeMs: 0 };

  const arrivalMs = ((1 - enemy.progress01) / config.progressPerSecond) * 1000;
  const arrived = deltaMs >= arrivalMs;
  return {
    enemy: {
      ...enemy,
      progress01: arrived
        ? 1
        : Math.min(
            1,
            enemy.progress01 + (config.progressPerSecond * deltaMs) / 1000,
          ),
      phase: arrived ? "attacking" : "moving",
    },
    wallTimeMs: arrived ? deltaMs - arrivalMs : 0,
  };
}
