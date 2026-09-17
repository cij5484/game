import { hordeBalance } from "../data/horde";
import { eliteBalance } from "../data/elite";
import type { EnemyKind, LaneId } from "../model/types";

export interface SpawnSpec {
  kind: EnemyKind;
  lane: LaneId;
  offset01: number;
  progress01: number;
  elite?: boolean;
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
  private nextEliteAtMs: number = eliteBalance.firstSpawnMs;
  private elitePending = false;
  private initial = true;
  private readonly random: () => number;

  constructor(random = Math.random) {
    this.random = random;
  }

  get elapsedMs() {
    return this.elapsed;
  }
  get timeToSpawnMs() {
    return Math.max(
      0,
      Math.min(
        this.nextSpawnAtMs,
        this.elitePending ? Infinity : this.nextEliteAtMs,
      ) - this.elapsed,
    );
  }

  get settings() {
    const stage = hordeBalance.stages.findLastIndex(
      (value) => value.atMs <= this.elapsed,
    );
    const values = hordeBalance.stages[stage]!;
    return { stage, ...values };
  }

  advance(deltaMs: number) {
    this.elapsed += Math.max(0, deltaMs);
  }

  spawn(activeCount: number): SpawnSpec[] {
    if (this.timeToSpawnMs > 0) return [];
    const settings = this.settings;
    const spawns: SpawnSpec[] = [];
    if (this.elapsed >= this.nextEliteAtMs) {
      this.elitePending = activeCount >= settings.maxActiveEnemies;
      if (!this.elitePending) {
        spawns.push({
          kind: eliteBalance.kind,
          lane: weightedChoice(hordeBalance.laneWeights, this.random()),
          offset01: 0.5,
          progress01: 0,
          elite: true,
        });
        this.nextEliteAtMs = this.elapsed + eliteBalance.spawnIntervalMs;
      }
    }
    if (this.elapsed < this.nextSpawnAtMs) return spawns;
    const initial = this.initial;
    const count = Math.max(
      0,
      Math.min(
        initial ? hordeBalance.initialBatchSize : settings.batchSize,
        // Keep one place available for the next elite, even during a full horde.
        settings.maxActiveEnemies - 1 - activeCount - spawns.length,
      ),
    );
    this.initial = false;
    // A full battlefield consumes this spawn opportunity; no catch-up backlog.
    this.nextSpawnAtMs = Math.min(
      this.elapsed + settings.spawnIntervalMs,
      hordeBalance.stages[settings.stage + 1]?.atMs ?? Infinity,
    );
    return [
      ...spawns,
      ...Array.from({ length: count }, () => ({
        kind: weightedChoice(
          initial ? hordeBalance.initialEnemyWeights : settings.enemyWeights,
          this.random(),
        ),
        lane: weightedChoice(hordeBalance.laneWeights, this.random()),
        offset01:
          hordeBalance.lateralMin01 +
          this.random() *
            (hordeBalance.lateralMax01 - hordeBalance.lateralMin01),
        progress01: initial
          ? hordeBalance.initialMinProgress01 +
            this.random() *
              (hordeBalance.initialMaxProgress01 -
                hordeBalance.initialMinProgress01)
          : 0,
      })),
    ];
  }
}
