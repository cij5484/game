import { hordeBalance } from "../data/horde";
import type { EnemyKind, LaneId } from "../model/types";

export interface SpawnSpec {
  kind: EnemyKind;
  lane: LaneId;
  offset01: number;
  progress01: number;
}

function weightedChoice<T extends string>(
  weights: Record<T, number>,
  random: number,
): T {
  const entries = Object.entries(weights) as [T, number][];
  let remaining = random * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [value, weight] of entries) {
    remaining -= weight;
    if (remaining < 0) return value;
  }
  return entries[entries.length - 1]![0];
}

export class SpawnDirector {
  private elapsed = 0;
  private nextSpawnAtMs = 0;
  private initial = true;
  private readonly random: () => number;

  constructor(random = Math.random) {
    this.random = random;
  }

  get elapsedMs() {
    return this.elapsed;
  }
  get timeToSpawnMs() {
    return Math.max(0, this.nextSpawnAtMs - this.elapsed);
  }

  get settings() {
    const stage = hordeBalance.stages.findLastIndex(
      (value) => value.atMs <= this.elapsed,
    );
    const values = hordeBalance.stages[stage]!;
    const phase =
      this.elapsed % hordeBalance.cycleMs < hordeBalance.pressureMs
        ? "pressure"
        : "relief";
    return {
      stage,
      phase,
      maxActiveEnemies: values.maxActiveEnemies,
      spawnIntervalMs:
        values.spawnIntervalMs *
        (phase === "relief" ? hordeBalance.reliefIntervalMultiplier : 1),
      batchSize: Math.max(
        1,
        Math.floor(
          values.batchSize *
            (phase === "relief" ? hordeBalance.reliefBatchMultiplier : 1),
        ),
      ),
    };
  }

  advance(deltaMs: number) {
    this.elapsed += Math.max(0, deltaMs);
  }

  spawn(activeCount: number): SpawnSpec[] {
    if (this.timeToSpawnMs > 0) return [];
    const settings = this.settings;
    const initial = this.initial;
    const count = Math.max(
      0,
      Math.min(
        initial ? hordeBalance.initialBatchSize : settings.batchSize,
        settings.maxActiveEnemies - activeCount,
      ),
    );
    this.initial = false;
    // A full battlefield consumes this spawn opportunity; no catch-up backlog.
    this.nextSpawnAtMs = this.elapsed + settings.spawnIntervalMs;
    return Array.from({ length: count }, () => ({
      kind: weightedChoice(hordeBalance.enemyWeights, this.random()),
      lane: weightedChoice(hordeBalance.laneWeights, this.random()),
      offset01:
        hordeBalance.lateralMin01 +
        this.random() * (hordeBalance.lateralMax01 - hordeBalance.lateralMin01),
      progress01: initial
        ? this.random() * hordeBalance.initialMaxProgress01
        : 0,
    }));
  }
}
