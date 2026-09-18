import type { GaussRifleConfig } from "../model/types";

export const gaussRifleBalance = {
  id: "gauss-rifle",
  shotIntervalMs: 800, // prototype M1: slow autonomous single shots
  damagePerRound: 10, // prototype tuning value
} as const satisfies GaussRifleConfig;
