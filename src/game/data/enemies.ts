import type { EnemyConfig, EnemyKind } from "../model/types";

// Every numeric field below is a prototype tuning value, not approved balance.
export const enemyConfigs = {
  grunt: {
    hp: 8, // prototype M1: normal Gauss one-shot, including early spawn HP scaling
    progressPerSecond: 0.032,
    wallAttackDamage: 5,
    wallAttackIntervalMs: 1000,
    primaryDamageMultiplier: 1,
    xpOnKill: 1,
  },
  runner: {
    hp: 20,
    progressPerSecond: 0.08,
    wallAttackDamage: 3,
    wallAttackIntervalMs: 750,
    primaryDamageMultiplier: 1,
    xpOnKill: 1,
  },
  shield: {
    hp: 60,
    progressPerSecond: 0.025,
    wallAttackDamage: 8,
    wallAttackIntervalMs: 1500,
    primaryDamageMultiplier: 0.5,
    xpOnKill: 3,
  },
} as const satisfies Record<EnemyKind, EnemyConfig>;
