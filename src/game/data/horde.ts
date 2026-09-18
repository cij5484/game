import type { EnemyKind, LaneId } from "../model/types";
import { runBalance } from "./run";
interface HordeStage {
  atMs: number;
  name: string;
  phase: "pressure" | "relief";
  spawnIntervalMs: number;
  batchSize: number;
  maxActiveEnemies: number;
  enemyWeights: Record<EnemyKind, number>;
}
// M6 follow-up: fewer starting enemies, continuously growing supply. Batch means vary ±2.
// Director uses combat time; phase timestamps preserve the intended X1 stage-minute ramp.
export const hordeBalance = {
  initialBatchSize: 36,
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
  batchVariation: 2,
  intervalVariation: 0.12,
  compositionVariation: 0.15,
  laneSpecializationAtMs: 540000 * runBalance.combatTempo,
  laneSpecializationMultiplier: 2,
  stages: [
    {
      atMs: 0,
      name: "DISTANT HORDE",
      phase: "pressure",
      spawnIntervalMs: 1800,
      batchSize: 3,
      maxActiveEnemies: 175,
      enemyWeights: { grunt: 99, runner: 1, shield: 0 },
    },
    {
      atMs: 180000 * runBalance.combatTempo,
      name: "FIRST PRESSURE",
      phase: "pressure",
      spawnIntervalMs: 1400,
      batchSize: 8,
      maxActiveEnemies: 250,
      enemyWeights: { grunt: 92, runner: 8, shield: 0 },
    },
    {
      atMs: 300000 * runBalance.combatTempo,
      name: "GROWING FRONT",
      phase: "pressure",
      spawnIntervalMs: 1300,
      batchSize: 12,
      maxActiveEnemies: 250,
      enemyWeights: { grunt: 98, runner: 2, shield: 0 },
    },
    {
      atMs: 360000 * runBalance.combatTempo,
      name: "SHIELD INTRODUCTION",
      phase: "pressure",
      spawnIntervalMs: 1200,
      batchSize: 18,
      maxActiveEnemies: 325,
      enemyWeights: { grunt: 91, runner: 6, shield: 3 },
    },
    {
      atMs: 450000 * runBalance.combatTempo,
      name: "SHIELD ADVANCE",
      phase: "pressure",
      spawnIntervalMs: 1100,
      batchSize: 24,
      maxActiveEnemies: 375,
      enemyWeights: { grunt: 84, runner: 8, shield: 8 },
    },
    {
      atMs: 540000 * runBalance.combatTempo,
      name: "MIXED LANES",
      phase: "pressure",
      spawnIntervalMs: 1000,
      batchSize: 32,
      maxActiveEnemies: 425,
      enemyWeights: { grunt: 78, runner: 12, shield: 10 },
    },
    {
      atMs: 660000 * runBalance.combatTempo,
      name: "WIDE FRONT",
      phase: "pressure",
      spawnIntervalMs: 950,
      batchSize: 40,
      maxActiveEnemies: 425,
      enemyWeights: { grunt: 94, runner: 4, shield: 2 },
    },
    {
      atMs: 720000 * runBalance.combatTempo,
      name: "GROWING HORDE",
      phase: "pressure",
      spawnIntervalMs: 850,
      batchSize: 48,
      maxActiveEnemies: 500,
      enemyWeights: { grunt: 80, runner: 12, shield: 8 },
    },
    {
      atMs: 900000 * runBalance.combatTempo,
      name: "HORDE POWER",
      phase: "pressure",
      spawnIntervalMs: 700,
      batchSize: 64,
      maxActiveEnemies: 600,
      enemyWeights: { grunt: 78, runner: 14, shield: 8 },
    },
    {
      atMs: 1080000 * runBalance.combatTempo,
      name: "FINAL ONSLAUGHT",
      phase: "pressure",
      spawnIntervalMs: 600,
      batchSize: 84,
      maxActiveEnemies: 700,
      enemyWeights: { grunt: 76, runner: 16, shield: 8 },
    },
    {
      atMs: 1140000 * runBalance.combatTempo,
      name: "FINAL HOLD (NO BOSS)",
      phase: "pressure",
      spawnIntervalMs: 550,
      batchSize: 96,
      maxActiveEnemies: 700,
      enemyWeights: { grunt: 92, runner: 6, shield: 2 },
    },
  ] satisfies HordeStage[],
} as const;
