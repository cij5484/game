import type { MagicConfig } from "../model/types";

// Every numeric field below is a prototype tuning value, not approved balance.
export const magicConfigs = {
  "frost-nova": {
    id: "frost-nova",
    effect: "freeze",
    cooldownMs: 20000,
    radiusPx: 550,
    freezeDurationMs: 3500,
  },
  "chain-lightning": {
    id: "chain-lightning",
    effect: "chain-damage",
    cooldownMs: 14000,
    damagePerTarget: 50,
    maxTargets: 12,
    chainRadiusPx: 300,
  },
} as const satisfies Record<MagicConfig["id"], MagicConfig>;

export const magicBehaviorBalance = { forkDamageFactor: 0.6 } as const;
