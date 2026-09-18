import { runtimeObject } from "../dev/runtimeBalance";
// Stage 1 prototype values: independent elite stats, never Grunt HP multipliers.
export const eliteBalance = runtimeObject("elite", {
  runner: {
    hp: 80,
    progressPerSecond: 0.075,
    wallDamage: 8,
    triggerProgress01: 0.6,
    telegraphMs: 1200,
    chargeMs: 1000,
    chargeSpeedMultiplier: 3.2,
  },
  shield: {
    hp: 48,
    shieldHp: 100,
    progressPerSecond: 0.022,
    wallDamage: 10,
    protectionBehind01: 0.14,
    protectionTargets: 4,
    damageMultiplier: 0.6,
  },
  windows: [
    [240000, 300000],
    [480000, 540000],
    [720000, 780000],
    [945000, 975000],
    [1080000, 1125000],
  ],
} as const);
