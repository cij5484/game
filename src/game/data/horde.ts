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
  initialBatchSize: 18,
  initialEnemyWeights: { grunt: 1, runner: 0, shield: 0 } satisfies Record<
    EnemyKind,
    number
  >,
  initialMinProgress01: 0.08,
  initialMaxProgress01: 0.30,
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
      spawnIntervalMs: 1800,
      batchSize: 3,
      maxActiveEnemies: 36,
      enemyWeights: { grunt: 95, runner: 5, shield: 0 },
    },
    {
      atMs: 30000,
      name: "BREATHING ROOM",
      phase: "relief",
      spawnIntervalMs: 2000,
      batchSize: 3,
      maxActiveEnemies: 40,
      enemyWeights: { grunt: 90, runner: 10, shield: 0 },
    },
    {
      atMs: 38000,
      name: "RUNNER RUSH",
      phase: "pressure",
      spawnIntervalMs: 1700,
      batchSize: 4,
      maxActiveEnemies: 48,
      enemyWeights: { grunt: 65, runner: 30, shield: 5 },
    },
    {
      atMs: 60000,
      name: "ARMORED HORDE",
      phase: "pressure",
      spawnIntervalMs: 1600,
      batchSize: 5,
      maxActiveEnemies: 60,
      enemyWeights: { grunt: 60, runner: 20, shield: 20 },
    },
    {
      atMs: 90000,
      name: "REGROUP",
      phase: "relief",
      spawnIntervalMs: 1800,
      batchSize: 5,
      maxActiveEnemies: 72,
      enemyWeights: { grunt: 85, runner: 10, shield: 5 },
    },
    {
      atMs: 98000,
      name: "SHIELD ADVANCE",
      phase: "pressure",
      spawnIntervalMs: 1500,
      batchSize: 7,
      maxActiveEnemies: 85,
      enemyWeights: { grunt: 50, runner: 15, shield: 35 },
    },
    {
      atMs: 135000,
      name: "MIXED ONSLAUGHT",
      phase: "pressure",
      spawnIntervalMs: 1350,
      batchSize: 9,
      maxActiveEnemies: 105,
      enemyWeights: { grunt: 50, runner: 30, shield: 20 },
    },
    {
      atMs: 165000,
      name: "COUNTERATTACK WINDOW",
      phase: "relief",
      spawnIntervalMs: 1550,
      batchSize: 8,
      maxActiveEnemies: 115,
      enemyWeights: { grunt: 80, runner: 15, shield: 5 },
    },
    {
      atMs: 173000,
      name: "BREAK THE LINE",
      phase: "pressure",
      spawnIntervalMs: 1200,
      batchSize: 12,
      maxActiveEnemies: 130,
      enemyWeights: { grunt: 45, runner: 30, shield: 25 },
    },
    {
      atMs: 210000,
      name: "LAST BREATHER",
      phase: "relief",
      spawnIntervalMs: 1400,
      batchSize: 10,
      maxActiveEnemies: 140,
      enemyWeights: { grunt: 75, runner: 15, shield: 10 },
    },
    {
      atMs: 218000,
      name: "SIEGE",
      phase: "pressure",
      spawnIntervalMs: 1050,
      batchSize: 16,
      maxActiveEnemies: 150,
      enemyWeights: { grunt: 45, runner: 25, shield: 30 },
    },
    {
      atMs: 255000,
      name: "FINAL PRESSURE",
      phase: "pressure",
      spawnIntervalMs: 850,
      batchSize: 20,
      maxActiveEnemies: 170,
      enemyWeights: { grunt: 40, runner: 30, shield: 30 },
    },
    {
      atMs: 285000,
      name: "LAST SURGE",
      phase: "pressure",
      spawnIntervalMs: 800,
      batchSize: 24,
      maxActiveEnemies: 180,
      enemyWeights: { grunt: 40, runner: 30, shield: 30 },
    },
  ] satisfies HordeStage[],
} as const;
