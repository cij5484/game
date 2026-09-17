import type { MagicConfig } from "../model/types";

// Every numeric field below is a prototype tuning value, not approved balance.
export const magicConfigs = {
  "frost-nova": {
    id: "frost-nova",
    effect: "global-slow",
    cooldownMs: 30000,
    durationMs: 7000,
    moveSpeedMultiplier: 0.5,
  },
  "chain-lightning": {
    id: "chain-lightning",
    effect: "chain-damage",
    cooldownMs: 24000,
    damagePerTarget: 75,
    maxTargets: 30,
    chainRadiusPx: 360,
  },
} as const satisfies Record<MagicConfig["id"], MagicConfig>;
