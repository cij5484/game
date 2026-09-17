import type { EnemyKind } from "../model/types";

// Prototype tuning values; elites retain their base kind's movement and attacks.
export const eliteBalance = {
  kind: "grunt" as EnemyKind,
  hpMultiplier: 4,
  firstSpawnMs: 15000,
  spawnIntervalMs: 25000,
} as const;
