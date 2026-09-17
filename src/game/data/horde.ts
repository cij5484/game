import type { EnemyKind, LaneId } from "../model/types";

interface HordeStage {
  atMs: number;
  spawnIntervalMs: number;
  batchSize: number;
  maxActiveEnemies: number;
  enemyWeights: Record<EnemyKind, number>;
}

// Prototype tuning only: density targets, not final difficulty balance.
export const hordeBalance = {
  initialBatchSize: 30,
  initialEnemyWeights: { grunt: 1, runner: 0, shield: 0 } satisfies Record<
    EnemyKind,
    number
  >,
  initialMinProgress01: 0.08,
  initialMaxProgress01: 0.45,
  lateralMin01: 0.12,
  lateralMax01: 0.88,
  laneWeights: { left: 1, center: 1, right: 1 } satisfies Record<
    LaneId,
    number
  >,
  cycleMs: 30000,
  pressureMs: 20000,
  reliefIntervalMultiplier: 1.8,
  reliefBatchMultiplier: 0.5,
  stages: [
    {
      atMs: 0,
      spawnIntervalMs: 2000,
      batchSize: 4,
      maxActiveEnemies: 50,
      enemyWeights: { grunt: 90, runner: 10, shield: 0 },
    },
    {
      atMs: 30000,
      spawnIntervalMs: 1800,
      batchSize: 5,
      maxActiveEnemies: 60,
      enemyWeights: { grunt: 75, runner: 20, shield: 5 },
    },
    {
      atMs: 60000,
      spawnIntervalMs: 1600,
      batchSize: 6,
      maxActiveEnemies: 70,
      enemyWeights: { grunt: 60, runner: 25, shield: 15 },
    },
    {
      atMs: 120000,
      spawnIntervalMs: 1400,
      batchSize: 7,
      maxActiveEnemies: 80,
      enemyWeights: { grunt: 60, runner: 25, shield: 15 },
    },
  ] satisfies HordeStage[],
} as const;
