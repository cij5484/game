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
  const entries = (Object.entries(weights) as [T, number][]).filter(
    ([, weight]) => weight > 0,
  );
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
  private eliteIndex = 0;
  private eliteTimes: number[];
  private laneRoles: EnemyKind[];
  private get nextEliteAtMs() {
    return this.eliteTimes[this.eliteIndex] ?? Infinity;
  }
  private elitePending = false;
  private initial = true;
  private readonly random: () => number;

  constructor(random = Math.random) {
    this.random = random;
    this.eliteTimes = eliteBalance.windows.map(
      ([start, end]) => start + random() * (end - start),
    );
    this.laneRoles = ["grunt", "runner", "shield"];
    for (let i = 2; i > 0; i--) {
      const j = Math.min(i, Math.floor(random() * (i + 1)));
      [this.laneRoles[i], this.laneRoles[j]] = [
        this.laneRoles[j]!,
        this.laneRoles[i]!,
      ];
    }
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
          kind:
            this.elapsed < 720000 || this.random() < 0.5 ? "runner" : "shield",
          lane: weightedChoice(hordeBalance.laneWeights, this.random()),
          offset01: 0.5,
          progress01: 0,
          elite: true,
        });
        this.eliteIndex++;
      }
    }
    if (this.elapsed < this.nextSpawnAtMs) return spawns;
    const initial = this.initial;
    const count = Math.max(
      0,
      Math.min(
        initial
          ? hordeBalance.initialBatchSize
          : Math.max(
              1,
              settings.batchSize +
                Math.floor(
                  this.random() * (2 * hordeBalance.batchVariation + 1),
                ) -
                hordeBalance.batchVariation,
            ),
        // Keep one place available for the next elite, even during a full horde.
        settings.maxActiveEnemies - 1 - activeCount - spawns.length,
      ),
    );
    this.initial = false;
    // A full battlefield consumes this spawn opportunity; no catch-up backlog.
    this.nextSpawnAtMs = Math.min(
      this.elapsed +
        settings.spawnIntervalMs *
          (1 + (this.random() * 2 - 1) * hordeBalance.intervalVariation),
      hordeBalance.stages[settings.stage + 1]?.atMs ?? Infinity,
    );
    const remainingLanes: Record<LaneId, number> = {
      ...hordeBalance.laneWeights,
    };
    return [
      ...spawns,
      ...Array.from({ length: count }, (_, index) => {
        // First three guarantee simultaneous lanes; the rest keep weighted variety.
        const lane = weightedChoice(
          index < 3 ? remainingLanes : hordeBalance.laneWeights,
          this.random(),
        );
        remainingLanes[lane] = 0;
        const role = this.laneRoles[["left", "center", "right"].indexOf(lane)]!;
        const base = initial
          ? hordeBalance.initialEnemyWeights
          : settings.enemyWeights;
        const weights = Object.fromEntries(
          Object.entries(base).map(([kind, weight]) => [
            kind,
            weight *
              (1 +
                (this.random() * 2 - 1) * hordeBalance.compositionVariation) *
              (this.elapsed >= hordeBalance.laneSpecializationAtMs &&
              role === kind
                ? hordeBalance.laneSpecializationMultiplier
                : 1),
          ]),
        ) as Record<EnemyKind, number>;
        return {
          kind: weightedChoice(weights, this.random()),
          lane,
          offset01:
            hordeBalance.lateralMin01 +
            this.random() *
              (hordeBalance.lateralMax01 - hordeBalance.lateralMin01),
          progress01:
            initial && index < hordeBalance.initialVanguardCount
              ? hordeBalance.initialVanguardMinProgress01 +
                this.random() *
                  (hordeBalance.initialVanguardMaxProgress01 -
                    hordeBalance.initialVanguardMinProgress01)
              : initial
                ? hordeBalance.initialMinProgress01 +
                  this.random() *
                    (hordeBalance.initialMaxProgress01 -
                      hordeBalance.initialMinProgress01)
                : 0,
        };
      }),
    ];
  }
}
