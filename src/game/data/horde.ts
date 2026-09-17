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

// Prototype five-minute encounters: caps control density, intervals control replacement pressure.
export const hordeBalance = {
  initialBatchSize: 65,
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
  stages: [
    {
      atMs: 0,
      name: "GRUNT FLOOD",
      phase: "pressure",
      spawnIntervalMs: 900,
      batchSize: 14,
      maxActiveEnemies: 90,
      enemyWeights: { grunt: 95, runner: 5, shield: 0 },
    },
    {
      atMs: 30000,
      name: "BREATHING ROOM",
      phase: "relief",
      spawnIntervalMs: 1200,
      batchSize: 10,
      maxActiveEnemies: 90,
      enemyWeights: { grunt: 90, runner: 10, shield: 0 },
    },
    {
      atMs: 45000,
      name: "RUNNER RUSH",
      phase: "pressure",
      spawnIntervalMs: 850,
      batchSize: 16,
      maxActiveEnemies: 100,
      enemyWeights: { grunt: 65, runner: 30, shield: 5 },
    },
    {
      atMs: 60000,
      name: "ARMORED HORDE",
      phase: "pressure",
      spawnIntervalMs: 800,
      batchSize: 18,
      maxActiveEnemies: 110,
      enemyWeights: { grunt: 60, runner: 20, shield: 20 },
    },
    {
      atMs: 90000,
      name: "REGROUP",
      phase: "relief",
      spawnIntervalMs: 1200,
      batchSize: 12,
      maxActiveEnemies: 110,
      enemyWeights: { grunt: 85, runner: 10, shield: 5 },
    },
    {
      atMs: 105000,
      name: "SHIELD ADVANCE",
      phase: "pressure",
      spawnIntervalMs: 750,
      batchSize: 20,
      maxActiveEnemies: 120,
      enemyWeights: { grunt: 50, runner: 15, shield: 35 },
    },
    {
      atMs: 135000,
      name: "MIXED ONSLAUGHT",
      phase: "pressure",
      spawnIntervalMs: 700,
      batchSize: 22,
      maxActiveEnemies: 130,
      enemyWeights: { grunt: 50, runner: 30, shield: 20 },
    },
    {
      atMs: 165000,
      name: "COUNTERATTACK WINDOW",
      phase: "relief",
      spawnIntervalMs: 1100,
      batchSize: 14,
      maxActiveEnemies: 130,
      enemyWeights: { grunt: 80, runner: 15, shield: 5 },
    },
    {
      atMs: 180000,
      name: "BREAK THE LINE",
      phase: "pressure",
      spawnIntervalMs: 650,
      batchSize: 24,
      maxActiveEnemies: 135,
      enemyWeights: { grunt: 45, runner: 30, shield: 25 },
    },
    {
      atMs: 210000,
      name: "LAST BREATHER",
      phase: "relief",
      spawnIntervalMs: 1000,
      batchSize: 16,
      maxActiveEnemies: 135,
      enemyWeights: { grunt: 75, runner: 15, shield: 10 },
    },
    {
      atMs: 225000,
      name: "SIEGE",
      phase: "pressure",
      spawnIntervalMs: 600,
      batchSize: 26,
      maxActiveEnemies: 150,
      enemyWeights: { grunt: 45, runner: 25, shield: 30 },
    },
    {
      atMs: 255000,
      name: "FINAL PRESSURE",
      phase: "pressure",
      spawnIntervalMs: 500,
      batchSize: 30,
      maxActiveEnemies: 160,
      enemyWeights: { grunt: 40, runner: 30, shield: 30 },
    },
  ] satisfies HordeStage[],
} as const;
