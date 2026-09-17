import type { MagicConfig } from "../model/types";

// Every numeric field below is a prototype tuning value, not approved balance.
export const magicConfigs = {
  "frost-nova": {
    id: "frost-nova",
    effect: "freeze",
    cooldownMs: 8000,
    radiusPx: 220,
    freezeDurationMs: 1500,
  },
  "chain-lightning": {
    id: "chain-lightning",
    effect: "chain-damage",
    cooldownMs: 6000,
    damagePerTarget: 25,
    maxTargets: 4,
    chainRadiusPx: 180,
  },
} as const satisfies Record<MagicConfig["id"], MagicConfig>;
