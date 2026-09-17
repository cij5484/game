import type { GaussRifleConfig } from "../model/types";

export const gaussRifleBalance = {
  id: "gauss-rifle",
  shotIntervalMs: 200, // same average rate as the former 3 rounds / 600ms cycle
  damagePerRound: 10, // prototype tuning value
} as const satisfies GaussRifleConfig;
