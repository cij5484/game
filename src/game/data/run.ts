import { runtimeObject } from "../dev/runtimeBalance";
// Prototype playtest values, not final difficulty balance.
export const runBalance = runtimeObject("run", {
  combatTempo: 1.5,
  durationMs: 1200000,
  wallMaxHp: 12000,
} as const);
