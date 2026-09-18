import type { EnemyKind, LaneId } from "../model/types";
interface HordeStage {
  atMs: number;
  name: string;
  phase: "pressure" | "relief";
  spawnIntervalMs: number;
  batchSize: number;
  maxActiveEnemies: number;
  enemyWeights: Record<EnemyKind, number>;
}
// M2 tuning: replacement pressure grows, Grunt HP does not become the difficulty lever.
export const hordeBalance = {
  initialBatchSize: 24,
  initialVanguardCount: 3,
  initialVanguardMinProgress01: 0.43,
  initialVanguardMaxProgress01: 0.445,
  initialEnemyWeights: { grunt: 1, runner: 0, shield: 0 },
  initialMinProgress01: 0.08,
  initialMaxProgress01: 0.3,
  lateralMin01: 0.12,
  lateralMax01: 0.88,
  laneWeights: { left: 1, center: 1, right: 1 } satisfies Record<
    LaneId,
    number
  >,
  batchVariation: 1,
  intervalVariation: 0.12,
  compositionVariation: 0.15,
  laneSpecializationAtMs: 540000,
  laneSpecializationMultiplier: 2,
  stages: [
    {
      atMs: 0,
      name: "DISTANT HORDE",
      phase: "pressure",
      spawnIntervalMs: 2200,
      batchSize: 2,
      maxActiveEnemies: 50,
      enemyWeights: { grunt: 99, runner: 1, shield: 0 },
    },
    {
      atMs: 180000,
      name: "FIRST PRESSURE",
      phase: "pressure",
      spawnIntervalMs: 1800,
      batchSize: 4,
      maxActiveEnemies: 70,
      enemyWeights: { grunt: 92, runner: 8, shield: 0 },
    },
    {
      atMs: 300000,
      name: "REGROUP",
      phase: "relief",
      spawnIntervalMs: 3000,
      batchSize: 2,
      maxActiveEnemies: 70,
      enemyWeights: { grunt: 98, runner: 2, shield: 0 },
    },
    {
      atMs: 360000,
      name: "SHIELD INTRODUCTION",
      phase: "pressure",
      spawnIntervalMs: 1800,
      batchSize: 5,
      maxActiveEnemies: 90,
      enemyWeights: { grunt: 91, runner: 6, shield: 3 },
    },
    {
      atMs: 450000,
      name: "SHIELD ADVANCE",
      phase: "pressure",
      spawnIntervalMs: 1700,
      batchSize: 6,
      maxActiveEnemies: 100,
      enemyWeights: { grunt: 84, runner: 8, shield: 8 },
    },
    {
      atMs: 540000,
      name: "MIXED LANES",
      phase: "pressure",
      spawnIntervalMs: 1500,
      batchSize: 8,
      maxActiveEnemies: 120,
      enemyWeights: { grunt: 78, runner: 12, shield: 10 },
    },
    {
      atMs: 660000,
      name: "SECOND BREATHER",
      phase: "relief",
      spawnIntervalMs: 2800,
      batchSize: 3,
      maxActiveEnemies: 120,
      enemyWeights: { grunt: 94, runner: 4, shield: 2 },
    },
    {
      atMs: 720000,
      name: "GROWING HORDE",
      phase: "pressure",
      spawnIntervalMs: 1350,
      batchSize: 10,
      maxActiveEnemies: 140,
      enemyWeights: { grunt: 80, runner: 12, shield: 8 },
    },
    {
      atMs: 900000,
      name: "HORDE POWER",
      phase: "pressure",
      spawnIntervalMs: 1100,
      batchSize: 14,
      maxActiveEnemies: 165,
      enemyWeights: { grunt: 78, runner: 14, shield: 8 },
    },
    {
      atMs: 1080000,
      name: "FINAL ONSLAUGHT",
      phase: "pressure",
      spawnIntervalMs: 850,
      batchSize: 20,
      maxActiveEnemies: 180,
      enemyWeights: { grunt: 76, runner: 16, shield: 8 },
    },
    {
      atMs: 1140000,
      name: "M2 FINAL HOLD (NO BOSS)",
      phase: "relief",
      spawnIntervalMs: 2000,
      batchSize: 6,
      maxActiveEnemies: 180,
      enemyWeights: { grunt: 92, runner: 6, shield: 2 },
    },
  ] satisfies HordeStage[],
} as const;
