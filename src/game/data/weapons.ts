import type { GaussRifleConfig } from "../model/types";

export const gaussRifleBalance = {
  id: "gauss-rifle",
  roundsPerBurst: 3,
  maxBufferedCommands: 1,
  roundIntervalMs: 110, // prototype tuning value
  burstRecoveryMs: 380, // prototype tuning value
  damagePerRound: 10, // prototype tuning value
} as const satisfies GaussRifleConfig;
