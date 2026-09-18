import { eliteBalance } from "../data/elite";
import type { EnemyConfig, EnemyKind, LaneId } from "../model/types";

export interface EnemyState {
  id: number;
  elite?: boolean;
  shieldHp?: number;
  maxShieldHp?: number;
  protectedBy?: number | undefined;
  incomingDamageMultiplier?: number;
  chargePhase?: "approaching" | "telegraph" | "charging" | "spent";
  chargeRemainingMs?: number;
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
  if (enemy.elite && enemy.kind === "runner" && enemy.chargePhase !== "spent") {
    const tune = eliteBalance.runner;
    let current = enemy,
      remaining = deltaMs;
    while (remaining > 0 && current.progress01 < 1) {
      const phase = current.chargePhase ?? "approaching";
      if (phase === "approaching") {
        const speed =
          tune.progressPerSecond *
          (current.speedMultiplier ?? 1) *
          movementMultiplier;
        if (speed <= 0) return { enemy: current, wallTimeMs: 0 };
        const until = Math.max(
          0,
          ((tune.triggerProgress01 - current.progress01) / speed) * 1000,
        );
        if (remaining < until)
          return {
            enemy: {
              ...current,
              progress01: current.progress01 + (speed * remaining) / 1000,
            },
            wallTimeMs: 0,
          };
        current = {
          ...current,
          progress01: Math.max(current.progress01, tune.triggerProgress01),
          chargePhase: "telegraph",
          chargeRemainingMs: tune.telegraphMs,
        };
        remaining -= until;
      } else if (phase === "telegraph") {
        const consumed = Math.min(
          remaining,
          current.chargeRemainingMs ?? tune.telegraphMs,
        );
        remaining -= consumed;
        const left = (current.chargeRemainingMs ?? tune.telegraphMs) - consumed;
        current = {
          ...current,
          chargeRemainingMs: left,
          ...(left <= 0
            ? {
                chargePhase: "charging" as const,
                chargeRemainingMs: tune.chargeMs,
              }
            : {}),
        };
      } else if (phase === "charging") {
        const consumed = Math.min(
          remaining,
          current.chargeRemainingMs ?? tune.chargeMs,
        );
        const result = advanceEnemy(
          { ...current, chargePhase: "spent" },
          consumed,
          config,
          movementMultiplier * tune.chargeSpeedMultiplier,
        );
        remaining -= consumed;
        const left = (current.chargeRemainingMs ?? tune.chargeMs) - consumed;
        current = {
          ...result.enemy,
          chargePhase: left <= 0 ? "spent" : "charging",
          chargeRemainingMs: left,
        };
        if (current.progress01 >= 1)
          return { enemy: current, wallTimeMs: result.wallTimeMs + remaining };
      } else
        return advanceEnemy(current, remaining, config, movementMultiplier);
    }
    return { enemy: current, wallTimeMs: 0 };
  }
  const progressPerSecond =
    (enemy.elite
      ? eliteBalance[enemy.kind as "runner" | "shield"].progressPerSecond
      : config.progressPerSecond) *
    (enemy.speedMultiplier ?? 1) *
    movementMultiplier;
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
