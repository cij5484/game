import type { EnemyKind, LaneId } from "../model/types";

// Prototype tuning only: density targets, not final difficulty balance.
export const hordeBalance = {
  initialBatchSize: 12,
  initialMaxProgress01: 0.35,
  lateralMin01: 0.12,
  lateralMax01: 0.88,
  enemyWeights: { grunt: 60, runner: 25, shield: 15 } satisfies Record<
    EnemyKind,
    number
  >,
  laneWeights: { left: 1, center: 1, right: 1 } satisfies Record<
    LaneId,
    number
  >,
  cycleMs: 30000,
  pressureMs: 20000,
  reliefIntervalMultiplier: 1.8,
  reliefBatchMultiplier: 0.5,
  stages: [
    { atMs: 0, spawnIntervalMs: 3000, batchSize: 3, maxActiveEnemies: 24 },
    { atMs: 60000, spawnIntervalMs: 2200, batchSize: 4, maxActiveEnemies: 36 },
    { atMs: 120000, spawnIntervalMs: 1600, batchSize: 5, maxActiveEnemies: 48 },
    { atMs: 180000, spawnIntervalMs: 1200, batchSize: 6, maxActiveEnemies: 60 },
  ],
} as const;
