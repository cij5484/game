import type { EnemyState } from "../enemies/enemySimulation";
import { getOverrides, type Overrides } from "./runtimeBalance";

export type DamageSource =
  | "Gauss"
  | "Grenade"
  | "Missile"
  | "Drone"
  | "Other";

const sources: DamageSource[] = [
  "Gauss",
  "Grenade",
  "Missile",
  "Drone",
  "Other",
];

const emptyDamage = (): Record<DamageSource, number> => ({
  Gauss: 0,
  Grenade: 0,
  Missile: 0,
  Drone: 0,
  Other: 0,
});

const CAP = 256;
const BALANCE_CHANGE_CAP = 32;
const STORAGE_KEY = "horde-defense.dev.last-balance-report.v1";
const milestones = [180, 300, 450, 600, 720, 900, 1080];

const cloneOverrides = (value: Overrides = getOverrides()): Overrides => ({
  ...value,
});

const overrideFingerprint = (value: Overrides): string =>
  JSON.stringify(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
  );

type RunState = {
  stageMs: number;
  level: number;
  wallHp: number;
  wallMaxHp: number;
  enemies: number;
  build: string[];
  nearWall75?: number;
  nearWall90?: number;
  fps?: number;
  substeps?: number;
  speed?: number;
};

export interface BalanceMetrics extends Omit<RunState, "build"> {
  spawns?: number;
  spawnPerMin?: number;
  wallPercent: number;
  avgEnemies: number;
  windowSeconds: number;
  totalDps: number;
  sourceDps: Record<DamageSource, number>;
  kills: number;
  kpm: number;
  wallDamage: number;
  wallReachPerMin: number;
  lastEliteTtk: number | null;
  bossTtk: number | null;
}

export interface ModEvent {
  stageMs: number;
  id: string;
  name: string;
  preDps: number;
  postDps: number | null;
  deltaPercent: number | null;
}

export interface TelemetryEvent {
  stageMs: number;
  type: "mod" | "elite" | "boss-spawn" | "boss-kill" | "finish";
  label: string;
  ttk?: number;
}

export interface TimelineSnapshot {
  label: string;
  metrics: BalanceMetrics;
  build: string[];
}

type EnemyGroup = "Grunt" | "Runner" | "Shield" | "Elite";

const groups: EnemyGroup[] = ["Grunt", "Runner", "Shield", "Elite"];

const groupOf = (enemy: EnemyState): EnemyGroup =>
  enemy.elite
    ? "Elite"
    : enemy.kind === "runner"
      ? "Runner"
      : enemy.kind === "shield"
        ? "Shield"
        : "Grunt";

const emptyKinds = () =>
  Object.fromEntries(
    groups.map((k) => [k, { spawns: 0, kills: 0 }]),
  ) as Record<EnemyGroup, { spawns: number; kills: number }>;

export interface GrowthInput {
  kind: string;
  id: string;
  name: string;
  level: number;
  previousLevel: number | null;
  nextLevel: number | null;
  rarity: string | null;
  choice?: string;
  offered?: {
    id: string;
    name: string;
    rarity: string | null;
  }[];
}

export interface GrowthEvent extends GrowthInput {
  stageMs: number;
}

interface Observation {
  dps: number;
  kpm: number;
  avgEnemies: number;
  nearWall75: number;
  nearWall90: number;
}

export interface GrowthOverlap {
  kind: string;
  id: string;
  name: string;
  stageMs: number;
  previousLevel: number | null;
  nextLevel: number | null;
}

interface PowerObservation {
  event: GrowthEvent;
  pre: Observation;
  post: Observation | null;
  confounded: boolean;
  overlappingGrowthEvents: GrowthOverlap[];
}

export interface UnlockSummary {
  basicMods: string[];
  specialWeapons: string[];
  specialCapacity: number;
  relicSystem: boolean;
  coreSystem: boolean;
  synergySystem: boolean;
}

export interface RunContextInput {
  runId: string;
  gitCommit: string;
  metaModifiers: Record<string, number>;
  rerolls: number;
  unlockSummary: UnlockSummary;
}

export interface BalanceChange {
  stageMs: number;
  overrides: Overrides;
}

export interface RunContext {
  telemetryVersion: 3;
  runId: string;
  startedAtIso: string;
  gitCommit: string;

  balanceOverridesStart: Overrides;
  balanceOverridesEnd: Overrides | null;
  balanceChangedDuringRun: boolean;
  balanceChanges: BalanceChange[];

  metaModifiers: Record<string, number>;
  rerolls: number;
  unlockSummary: UnlockSummary;
}

export interface PressureSummary {
  firstNear75Ms: number | null;
  lastNear75Ms: number | null;
  secondsWithNear75: number;
  maxNear75: number;

  firstNear90Ms: number | null;
  lastNear90Ms: number | null;
  secondsWithNear90: number;
  maxNear90: number;

  longestNear75StreakSeconds: number;
  longestNear90StreakSeconds: number;

  wallReachCount: number;
  wallDamageTotal: number;

  firstWallDamageMs: number | null;
  lastWallDamageMs: number | null;
}

const emptyPressureSummary = (): PressureSummary => ({
  firstNear75Ms: null,
  lastNear75Ms: null,
  secondsWithNear75: 0,
  maxNear75: 0,

  firstNear90Ms: null,
  lastNear90Ms: null,
  secondsWithNear90: 0,
  maxNear90: 0,

  longestNear75StreakSeconds: 0,
  longestNear90StreakSeconds: 0,

  wallReachCount: 0,
  wallDamageTotal: 0,

  firstWallDamageMs: null,
  lastWallDamageMs: null,
});

export interface BalanceV2 {
  timeline5s: BalanceMetrics[];
  growthEvents: GrowthEvent[];
  powerSpikeObservations: PowerObservation[];

  weaponContribution: Record<
    DamageSource,
    {
      dps: number;
      percent: number;
    }
  >;

  spawnKillPressure: {
    spawns: number;
    kills: number;
    spawnPerMin: number;
    killPerMin: number;
    byKind: ReturnType<typeof emptyKinds>;
  };

  enemyLifetime: Record<
    EnemyGroup,
    {
      count: number;
      totalSeconds: number;
      averageSeconds: number | null;
    }
  >;

  bossEvents: {
    events: {
      kind: string;
      stageMs: number;
      count: number;
    }[];
    counts: Record<string, number>;
    combatTtk: number | null;
    fightDuration: number | null;
  };

  performance: {
    frames: number;
    configuredSpeed: number | null;
    averageSpeed: number | null;
    averageFps: number | null;
    minFps: number | null;
    averageSubsteps: number | null;
    maxSubsteps: number | null;
    effectiveSpeed: number | null;
  };
}

export interface BalanceReport {
  version: 1;
  v2?: BalanceV2;

  runContext?: RunContext;
  pressureSummary?: PressureSummary;

  result: string;
  metrics: BalanceMetrics;
  build: string[];

  eliteSamples: number[];
  eliteSampleCount: number;
  eliteAverageTtk: number | null;

  modEvents: ModEvent[];
  events: TelemetryEvent[];
  snapshots: TimelineSnapshot[];
}

type Bucket = {
  byKind: ReturnType<typeof emptyKinds>;
  spawns: number;
  second: number;
  damage: Record<DamageSource, number>;
  kills: number;
  wallDamage: number;
  reaches: number;
};

const append = <T>(items: T[], value: T) => {
  if (items.length === CAP) items.shift();
  items.push(value);
};

const overlapOf = (event: GrowthEvent): GrowthOverlap => ({
  kind: event.kind,
  id: event.id,
  name: event.name,
  stageMs: event.stageMs,
  previousLevel: event.previousLevel,
  nextLevel: event.nextLevel,
});

const sameOverlap = (a: GrowthOverlap, b: GrowthOverlap) =>
  a.kind === b.kind &&
  a.id === b.id &&
  a.stageMs === b.stageMs &&
  a.previousLevel === b.previousLevel &&
  a.nextLevel === b.nextLevel;

export class BalanceTelemetry {
  private readonly enabled: boolean;

  private state: RunState = {
    stageMs: 0,
    level: 1,
    wallHp: 0,
    wallMaxHp: 0,
    enemies: 0,
    build: [],
  };

  private runContext: RunContext | null = null;
  private lastOverrideFingerprint = "";
  private lastOverrideCheckSecond = -1;

  private pressure = emptyPressureSummary();
  private currentNear75Streak = 0;
  private currentNear90Streak = 0;

  private buckets: Bucket[] = [];

  private samples: {
    second: number;
    count: number;
    nearWall75: number;
    nearWall90: number;
  }[] = [];

  private firstHit = new Map<number, number>();
  private reached = new Set<number>();

  private eliteSamples: number[] = [];
  private eliteCount = 0;
  private eliteTotal = 0;

  private lastEliteTtk: number | null = null;
  private bossTtk: number | null = null;

  private totalDamage = 0;

  private modEvents: ModEvent[] = [];
  private pendingMods: {
    event: ModEvent;
    baseline: number;
  }[] = [];

  private events: TelemetryEvent[] = [];
  private snapshots: TimelineSnapshot[] = [];

  private nextMilestone = 0;
  private result = "in-progress";

  private alive = new Map<
    number,
    {
      stageMs: number;
      kind: EnemyGroup;
    }
  >();

  private lifetime = Object.fromEntries(
    groups.map((k) => [k, { count: 0, totalSeconds: 0 }]),
  ) as Record<
    EnemyGroup,
    {
      count: number;
      totalSeconds: number;
    }
  >;

  private timeline5s: BalanceMetrics[] = [];
  private lastTimelineSlot = 0;

  private growthEvents: GrowthEvent[] = [];
  private observations: PowerObservation[] = [];

  private pendingGrowth: {
    observation: PowerObservation;
    damage: number;
    kills: number;
    sampleCount: number;
    enemies: number;
    nearWall75: number;
    nearWall90: number;
  }[] = [];

  private totalKills = 0;

  private bossDetails: {
    kind: string;
    stageMs: number;
    count: number;
  }[] = [];

  private bossCounts: Record<string, number> = {};

  private bossId: number | null = null;
  private bossSpawnMs: number | null = null;
  private bossDeathMs: number | null = null;

  private performance = {
    frames: 0,
    speed: 0,
    fps: 0,
    minFps: Infinity,
    substeps: 0,
    maxSubsteps: 0,
    realMs: 0,
    stageMs: 0,
    configuredSpeed: null as number | null,
  };

  constructor(enabled = import.meta.env.DEV) {
    this.enabled = enabled;
  }

  startRunContext(input: RunContextInput): void {
    if (!this.enabled) return;

    const startOverrides = cloneOverrides();

    this.runContext = {
      telemetryVersion: 3,
      runId: input.runId,
      startedAtIso: new Date().toISOString(),
      gitCommit: input.gitCommit || "unknown",

      balanceOverridesStart: startOverrides,
      balanceOverridesEnd: null,
      balanceChangedDuringRun: false,
      balanceChanges: [],

      metaModifiers: { ...input.metaModifiers },
      rerolls: input.rerolls,

      unlockSummary: {
        basicMods: [...input.unlockSummary.basicMods],
        specialWeapons: [...input.unlockSummary.specialWeapons],
        specialCapacity: input.unlockSummary.specialCapacity,
        relicSystem: input.unlockSummary.relicSystem,
        coreSystem: input.unlockSummary.coreSystem,
        synergySystem: input.unlockSummary.synergySystem,
      },
    };

    this.lastOverrideFingerprint = overrideFingerprint(startOverrides);
    this.lastOverrideCheckSecond = -1;
  }

  private checkBalanceOverrides(force = false): void {
    if (!this.runContext) return;

    const second = Math.floor(this.state.stageMs / 1000);

    if (!force && second === this.lastOverrideCheckSecond) return;

    this.lastOverrideCheckSecond = second;

    const current = cloneOverrides();
    const fingerprint = overrideFingerprint(current);

    if (fingerprint !== this.lastOverrideFingerprint) {
      this.runContext.balanceChangedDuringRun = true;

      if (this.runContext.balanceChanges.length === BALANCE_CHANGE_CAP)
        this.runContext.balanceChanges.shift();

      this.runContext.balanceChanges.push({
        stageMs: this.state.stageMs,
        overrides: current,
      });

      this.lastOverrideFingerprint = fingerprint;
    }

    if (force) this.runContext.balanceOverridesEnd = current;
  }

  private observePressure(
    stageMs: number,
    nearWall75: number,
    nearWall90: number,
  ): void {
    const p = this.pressure;

    p.maxNear75 = Math.max(p.maxNear75, nearWall75);
    p.maxNear90 = Math.max(p.maxNear90, nearWall90);

    if (nearWall75 > 0) {
      if (p.firstNear75Ms === null) p.firstNear75Ms = stageMs;

      p.lastNear75Ms = stageMs;
      p.secondsWithNear75++;

      this.currentNear75Streak++;

      p.longestNear75StreakSeconds = Math.max(
        p.longestNear75StreakSeconds,
        this.currentNear75Streak,
      );
    } else {
      this.currentNear75Streak = 0;
    }

    if (nearWall90 > 0) {
      if (p.firstNear90Ms === null) p.firstNear90Ms = stageMs;

      p.lastNear90Ms = stageMs;
      p.secondsWithNear90++;

      this.currentNear90Streak++;

      p.longestNear90StreakSeconds = Math.max(
        p.longestNear90StreakSeconds,
        this.currentNear90Streak,
      );
    } else {
      this.currentNear90Streak = 0;
    }
  }

  spawn(enemy: EnemyState) {
    if (
      !this.enabled ||
      this.result !== "in-progress" ||
      this.alive.has(enemy.id)
    )
      return;

    if (enemy.boss) {
      if (this.bossId !== enemy.id) {
        this.bossId = enemy.id;
        this.bucket().spawns++;
      }
      return;
    }

    const kind = groupOf(enemy);

    this.alive.set(enemy.id, {
      stageMs: this.state.stageMs,
      kind,
    });

    const b = this.bucket();

    b.spawns++;
    b.byKind[kind].spawns++;
  }

  growth(input: GrowthInput, observe = true) {
    if (!this.enabled || this.result !== "in-progress") return;

    const event: GrowthEvent = {
      ...input,
      offered: input.offered?.slice(0, 4).map((c) => ({ ...c })),
      stageMs: this.state.stageMs,
    };

    const sameTimestampPrevious = this.growthEvents
      .filter((other) => other.stageMs === event.stageMs)
      .map(overlapOf);

    const newOverlap = overlapOf(event);

    for (const observation of this.observations) {
      if (
        event.stageMs >= observation.event.stageMs &&
        event.stageMs < observation.event.stageMs + 15000
      ) {
        if (
          !observation.overlappingGrowthEvents.some((other) =>
            sameOverlap(other, newOverlap),
          )
        ) {
          observation.overlappingGrowthEvents.push(newOverlap);
        }

        observation.confounded =
          observation.overlappingGrowthEvents.length > 0;
      }
    }

    append(this.growthEvents, event);

    if (!observe) return;

    const cutoff = Math.floor(this.state.stageMs / 1000) - 14;
    const seconds = Math.min(15, this.state.stageMs / 1000);

    const buckets = this.buckets.filter((b) => b.second >= cutoff);
    const samples = this.samples.filter((b) => b.second >= cutoff);

    const mean = (
      key: "count" | "nearWall75" | "nearWall90",
    ) =>
      samples.length
        ? samples.reduce((n, b) => n + b[key], 0) / samples.length
        : 0;

    const observation: PowerObservation = {
      event,

      pre: {
        dps: seconds
          ? buckets.reduce(
              (n, b) =>
                n +
                sources.reduce(
                  (sourceTotal, source) =>
                    sourceTotal + b.damage[source],
                  0,
                ),
              0,
            ) / seconds
          : 0,

        kpm: seconds
          ? (buckets.reduce((n, b) => n + b.kills, 0) * 60) /
            seconds
          : 0,

        avgEnemies: mean("count"),
        nearWall75: mean("nearWall75"),
        nearWall90: mean("nearWall90"),
      },

      post: null,

      confounded: sameTimestampPrevious.length > 0,

      overlappingGrowthEvents: sameTimestampPrevious,
    };

    append(this.observations, observation);

    append(this.pendingGrowth, {
      observation,
      damage: this.totalDamage,
      kills: this.totalKills,
      sampleCount: 0,
      enemies: 0,
      nearWall75: 0,
      nearWall90: 0,
    });
  }

  bossEvent(kind: string, count = 1) {
    if (
      !this.enabled ||
      this.result !== "in-progress" ||
      !Number.isFinite(count) ||
      count <= 0
    )
      return;

    if (
      ![
        "spawn",
        "first-hit",
        "hp-65",
        "reinforcement",
        "hp-25",
        "final-charge",
        "siege-charge",
        "siege-interrupt",
        "wall-hit",
        "death",
      ].includes(kind)
    )
      return;

    if (
      [
        "spawn",
        "first-hit",
        "hp-65",
        "reinforcement",
        "hp-25",
        "final-charge",
        "death",
      ].includes(kind) &&
      this.bossCounts[kind]
    )
      return;

    this.bossCounts[kind] =
      (this.bossCounts[kind] ?? 0) + count;

    append(this.bossDetails, {
      kind,
      stageMs: this.state.stageMs,
      count,
    });

    if (kind === "spawn") this.bossSpawnMs = this.state.stageMs;
    if (kind === "death") this.bossDeathMs = this.state.stageMs;
  }

  performanceFrame(frame: {
    speed: number;
    fps: number;
    substeps: number;
    realMs: number;
    stageMs: number;
  }) {
    if (
      !this.enabled ||
      this.result !== "in-progress" ||
      !Object.values(frame).every(Number.isFinite) ||
      frame.realMs <= 0 ||
      frame.stageMs <= 0
    )
      return;

    const p = this.performance;

    p.frames++;
    p.configuredSpeed = frame.speed;
    p.speed += frame.speed;
    p.fps += frame.fps;
    p.minFps = Math.min(p.minFps, frame.fps);
    p.substeps += frame.substeps;
    p.maxSubsteps = Math.max(p.maxSubsteps, frame.substeps);
    p.realMs += frame.realMs;
    p.stageMs += frame.stageMs;
  }

  setTime(stageMs: number) {
    if (
      !this.enabled ||
      this.result !== "in-progress" ||
      !Number.isFinite(stageMs)
    )
      return;

    if (this.pendingGrowth.length) {
      this.pendingGrowth = this.pendingGrowth.filter((p) => {
        if (stageMs < p.observation.event.stageMs + 15000)
          return true;

        p.observation.post = {
          dps: (this.totalDamage - p.damage) / 15,
          kpm: (this.totalKills - p.kills) * 4,

          avgEnemies: p.sampleCount
            ? p.enemies / p.sampleCount
            : 0,

          nearWall75: p.sampleCount
            ? p.nearWall75 / p.sampleCount
            : 0,

          nearWall90: p.sampleCount
            ? p.nearWall90 / p.sampleCount
            : 0,
        };

        return false;
      });
    }

    const priorSecond = Math.floor(this.state.stageMs / 1000);

    this.state.stageMs = Math.max(
      this.state.stageMs,
      stageMs,
    );

    if (this.pendingMods.length) {
      this.pendingMods = this.pendingMods.filter(
        ({ event, baseline }) => {
          if (
            this.state.stageMs <
            event.stageMs + 15000
          )
            return true;

          event.postDps =
            (this.totalDamage - baseline) / 15;

          event.deltaPercent =
            event.preDps > 0
              ? (event.postDps / event.preDps - 1) * 100
              : null;

          return false;
        },
      );
    }

    if (
      Math.floor(this.state.stageMs / 1000) ===
      priorSecond
    )
      return;

    const cutoff =
      Math.floor(this.state.stageMs / 1000) - 29;

    this.buckets = this.buckets.filter(
      (b) => b.second >= cutoff,
    );

    this.samples = this.samples.filter(
      (s) => s.second >= cutoff,
    );
  }

  private bucket() {
    const second = Math.floor(
      this.state.stageMs / 1000,
    );

    let b = this.buckets.at(-1);

    if (!b || b.second !== second) {
      b = {
        second,
        spawns: 0,
        byKind: emptyKinds(),
        damage: emptyDamage(),
        kills: 0,
        wallDamage: 0,
        reaches: 0,
      };

      this.buckets.push(b);
    }

    return b;
  }

  damage(
    before: EnemyState,
    after: EnemyState,
    source: DamageSource,
  ) {
    if (
      !this.enabled ||
      this.result !== "in-progress" ||
      before.hp <= 0
    )
      return;

    const loss =
      Math.max(
        0,
        before.hp - Math.max(0, after.hp),
      ) +
      Math.max(
        0,
        (before.shieldHp ?? 0) -
          Math.max(0, after.shieldHp ?? 0),
      );

    if (loss <= 0) return;

    this.bucket().damage[source] += loss;
    this.totalDamage += loss;

    if (
      (before.elite || before.boss) &&
      !this.firstHit.has(before.id)
    )
      this.firstHit.set(
        before.id,
        this.state.stageMs,
      );

    if (before.boss) {
      this.bossEvent("first-hit");

      const maxHp = before.maxHp;

      if (
        maxHp &&
        before.hp > maxHp * 0.65 &&
        after.hp <= maxHp * 0.65
      )
        this.bossEvent("hp-65");

      if (
        maxHp &&
        before.hp > maxHp * 0.25 &&
        after.hp <= maxHp * 0.25
      )
        this.bossEvent("hp-25");

      if (
        before.boss.phase === "siege-charge" &&
        after.boss?.phase === "stagger"
      )
        this.bossEvent("siege-interrupt");

      if (after.hp <= 0)
        this.bossEvent("death");
    }

    if (after.hp > 0) return;

    this.totalKills++;

    if (!before.boss) {
      this.bucket().byKind[groupOf(before)].kills++;

      const alive = this.alive.get(before.id);

      if (alive) {
        const stat = this.lifetime[alive.kind];

        stat.count++;

        stat.totalSeconds +=
          (this.state.stageMs - alive.stageMs) /
          1000;
      }
    }

    this.bucket().kills++;

    const first = this.firstHit.get(before.id);

    if (first !== undefined) {
      const ttk =
        (this.state.stageMs - first) / 1000;

      if (before.boss) {
        this.bossTtk = ttk;

        append(this.events, {
          stageMs: this.state.stageMs,
          type: "boss-kill",
          label: "Boss 처치",
          ttk,
        });
      } else {
        this.lastEliteTtk = ttk;
        this.eliteTotal += ttk;
        this.eliteCount++;

        append(this.eliteSamples, ttk);

        append(this.events, {
          stageMs: this.state.stageMs,
          type: "elite",
          label: "Elite 처치",
          ttk,
        });
      }
    }

    this.removeEnemy(before.id);
  }

  wallDamage(before: number, after: number) {
    if (
      !this.enabled ||
      this.result !== "in-progress"
    )
      return;

    const damage = Math.max(
      0,
      before - Math.max(0, after),
    );

    if (damage <= 0) return;

    this.bucket().wallDamage += damage;

    this.pressure.wallDamageTotal += damage;

    if (this.pressure.firstWallDamageMs === null)
      this.pressure.firstWallDamageMs =
        this.state.stageMs;

    this.pressure.lastWallDamageMs =
      this.state.stageMs;
  }

  wallReach(id: number) {
    if (
      !this.enabled ||
      this.result !== "in-progress" ||
      this.reached.has(id)
    )
      return;

    this.reached.add(id);

    this.bucket().reaches++;
    this.pressure.wallReachCount++;
  }

  removeEnemy(id: number) {
    this.alive.delete(id);
    this.firstHit.delete(id);
    this.reached.delete(id);
  }

  update(state: RunState) {
    if (
      !this.enabled ||
      this.result !== "in-progress"
    )
      return;

    this.setTime(state.stageMs);

    this.state = {
      ...state,
      stageMs: this.state.stageMs,
    };

    const second = Math.floor(
      this.state.stageMs / 1000,
    );

    if (
      this.samples.at(-1)?.second !== second
    ) {
      const nearWall75 =
        state.nearWall75 ?? 0;

      const nearWall90 =
        state.nearWall90 ?? 0;

      this.samples.push({
        second,
        count: state.enemies,
        nearWall75,
        nearWall90,
      });

      this.observePressure(
        this.state.stageMs,
        nearWall75,
        nearWall90,
      );

      this.checkBalanceOverrides();

      for (const p of this.pendingGrowth) {
        p.sampleCount++;
        p.enemies += state.enemies;
        p.nearWall75 += nearWall75;
        p.nearWall90 += nearWall90;
      }
    }

    const slot = Math.floor(
      this.state.stageMs / 5000,
    );

    if (slot > this.lastTimelineSlot) {
      if (this.timeline5s.length === 512)
        this.timeline5s.shift();

      this.timeline5s.push(this.metrics());

      this.lastTimelineSlot = slot;
    }

    while (
      this.nextMilestone < milestones.length &&
      this.state.stageMs >=
        milestones[this.nextMilestone]! * 1000
    ) {
      this.snapshot(
        formatTime(
          milestones[this.nextMilestone]! *
            1000,
        ),
      );

      this.nextMilestone++;
    }
  }

  acquireMod(id: string, name: string) {
    if (
      !this.enabled ||
      this.result !== "in-progress" ||
      this.modEvents.some((e) => e.id === id) ||
      this.modEvents.length >= CAP
    )
      return;

    const seconds = Math.min(
      15,
      this.state.stageMs / 1000,
    );

    const damage = this.buckets
      .filter(
        (b) =>
          b.second >=
          Math.floor(
            this.state.stageMs / 1000,
          ) -
            14,
      )
      .reduce(
        (sum, b) =>
          sum +
          sources.reduce(
            (n, s) => n + b.damage[s],
            0,
          ),
        0,
      );

    const event: ModEvent = {
      stageMs: this.state.stageMs,
      id,
      name,
      preDps:
        seconds > 0 ? damage / seconds : 0,
      postDps: null,
      deltaPercent: null,
    };

    this.modEvents.push(event);

    this.pendingMods.push({
      event,
      baseline: this.totalDamage,
    });

    append(this.events, {
      stageMs: this.state.stageMs,
      type: "mod",
      label: `${name} Lv1 획득`,
    });
  }

  bossSpawn() {
    if (
      !this.enabled ||
      this.result !== "in-progress"
    )
      return;

    this.bossEvent("spawn");

    append(this.events, {
      stageMs: this.state.stageMs,
      type: "boss-spawn",
      label: "Boss 등장",
    });

    this.snapshot("Boss 등장");
  }

  private metrics(): BalanceMetrics {
    const sourceDps = emptyDamage();

    const windowSeconds = Math.min(
      30,
      this.state.stageMs / 1000,
    );

    let spawns = 0;
    let kills = 0;
    let wallDamage = 0;
    let reaches = 0;

    for (const b of this.buckets) {
      for (const source of sources)
        sourceDps[source] += b.damage[source];

      spawns += b.spawns;
      kills += b.kills;
      wallDamage += b.wallDamage;
      reaches += b.reaches;
    }

    for (const source of sources) {
      sourceDps[source] =
        windowSeconds > 0
          ? sourceDps[source] / windowSeconds
          : 0;
    }

    const {
      build: _build,
      ...state
    } = this.state;

    return {
      ...state,

      nearWall75:
        state.nearWall75 ?? 0,

      nearWall90:
        state.nearWall90 ?? 0,

      spawns,

      spawnPerMin:
        windowSeconds > 0
          ? (spawns * 60) / windowSeconds
          : 0,

      wallPercent:
        state.wallMaxHp > 0
          ? (state.wallHp /
              state.wallMaxHp) *
            100
          : 0,

      avgEnemies:
        this.samples.length
          ? this.samples.reduce(
              (n, s) => n + s.count,
              0,
            ) / this.samples.length
          : state.enemies,

      windowSeconds,

      totalDps: sources.reduce(
        (n, s) => n + sourceDps[s],
        0,
      ),

      sourceDps,

      kills,

      kpm:
        windowSeconds > 0
          ? (kills * 60) / windowSeconds
          : 0,

      wallDamage,

      wallReachPerMin:
        windowSeconds > 0
          ? (reaches * 60) / windowSeconds
          : 0,

      lastEliteTtk: this.lastEliteTtk,
      bossTtk: this.bossTtk,
    };
  }

  private snapshot(label: string) {
    append(this.snapshots, {
      label,
      metrics: this.metrics(),
      build: [...this.state.build],
    });
  }

  private clonedRunContext(): RunContext | null {
    if (!this.runContext) return null;

    return {
      ...this.runContext,

      balanceOverridesStart: {
        ...this.runContext.balanceOverridesStart,
      },

      balanceOverridesEnd:
        this.runContext.balanceOverridesEnd
          ? {
              ...this.runContext
                .balanceOverridesEnd,
            }
          : null,

      balanceChanges:
        this.runContext.balanceChanges.map(
          (change) => ({
            stageMs: change.stageMs,
            overrides: {
              ...change.overrides,
            },
          }),
        ),

      metaModifiers: {
        ...this.runContext.metaModifiers,
      },

      unlockSummary: {
        ...this.runContext.unlockSummary,
        basicMods: [
          ...this.runContext.unlockSummary
            .basicMods,
        ],
        specialWeapons: [
          ...this.runContext.unlockSummary
            .specialWeapons,
        ],
      },
    };
  }

  report(): BalanceReport {
    const m = this.metrics();
    const p = this.performance;

    const byKind = emptyKinds();

    for (const b of this.buckets) {
      for (const k of groups) {
        byKind[k].spawns +=
          b.byKind[k].spawns;

        byKind[k].kills +=
          b.byKind[k].kills;
      }
    }

    const v2: BalanceV2 = {
      timeline5s: this.timeline5s.map(
        (metric) => ({
          ...metric,
          sourceDps: {
            ...metric.sourceDps,
          },
        }),
      ),

      growthEvents:
        this.growthEvents.map((e) => ({
          ...e,

          offered: e.offered?.map(
            (c) => ({ ...c }),
          ),
        })),

      powerSpikeObservations:
        this.observations.map((o) => ({
          event: {
            ...o.event,

            offered:
              o.event.offered?.map(
                (c) => ({ ...c }),
              ),
          },

          pre: { ...o.pre },

          post:
            o.post
              ? { ...o.post }
              : null,

          confounded: o.confounded,

          overlappingGrowthEvents:
            o.overlappingGrowthEvents.map(
              (event) => ({ ...event }),
            ),
        })),

      weaponContribution:
        Object.fromEntries(
          sources.map((s) => [
            s,
            {
              dps: m.sourceDps[s],

              percent: m.totalDps
                ? (m.sourceDps[s] * 100) /
                  m.totalDps
                : 0,
            },
          ]),
        ) as BalanceV2["weaponContribution"],

      spawnKillPressure: {
        spawns: m.spawns ?? 0,
        kills: m.kills,
        spawnPerMin:
          m.spawnPerMin ?? 0,
        killPerMin: m.kpm,
        byKind,
      },

      enemyLifetime:
        Object.fromEntries(
          groups.map((k) => [
            k,
            {
              ...this.lifetime[k],

              averageSeconds:
                this.lifetime[k].count
                  ? this.lifetime[k]
                      .totalSeconds /
                    this.lifetime[k].count
                  : null,
            },
          ]),
        ) as BalanceV2["enemyLifetime"],

      bossEvents: {
        events:
          this.bossDetails.map(
            (e) => ({ ...e }),
          ),

        counts: {
          ...this.bossCounts,
        },

        combatTtk: this.bossTtk,

        fightDuration:
          this.bossDeathMs !== null &&
          this.bossSpawnMs !== null
            ? (this.bossDeathMs -
                this.bossSpawnMs) /
              1000
            : null,
      },

      performance: {
        frames: p.frames,

        configuredSpeed:
          p.configuredSpeed,

        averageSpeed:
          p.frames
            ? p.speed / p.frames
            : null,

        averageFps:
          p.frames
            ? p.fps / p.frames
            : null,

        minFps:
          p.frames
            ? p.minFps
            : null,

        averageSubsteps:
          p.frames
            ? p.substeps / p.frames
            : null,

        maxSubsteps:
          p.frames
            ? p.maxSubsteps
            : null,

        effectiveSpeed:
          p.realMs
            ? p.stageMs / p.realMs
            : null,
      },
    };

    const runContext =
      this.clonedRunContext();

    const report: BalanceReport = {
      v2,
      version: 1,
      result: this.result,

      metrics: this.metrics(),

      build: [...this.state.build],

      eliteSamples: [
        ...this.eliteSamples,
      ],

      eliteSampleCount:
        this.eliteCount,

      eliteAverageTtk:
        this.eliteCount
          ? this.eliteTotal /
            this.eliteCount
          : null,

      modEvents:
        this.modEvents.map(
          (e) => ({ ...e }),
        ),

      events:
        this.events.map(
          (e) => ({ ...e }),
        ),

      snapshots:
        this.snapshots.map((s) => ({
          label: s.label,

          build: [...s.build],

          metrics: {
            ...s.metrics,

            sourceDps: {
              ...s.metrics.sourceDps,
            },
          },
        })),

      pressureSummary: {
        ...this.pressure,
      },
    };

    if (runContext)
      report.runContext = runContext;

    return report;
  }

  finish(result: string) {
    if (
      this.enabled &&
      this.result === "in-progress"
    ) {
      this.result = result;

      this.checkBalanceOverrides(true);

      this.snapshot("Run 종료");

      append(this.events, {
        stageMs: this.state.stageMs,
        type: "finish",
        label: result,
      });

      saveLastBalanceReport(
        this.report(),
      );
    }

    return this.report();
  }
}

const formatTime = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(
    Math.floor(ms / 1000) % 60,
  ).padStart(2, "0")}`;

const value = (n: number | null) =>
  n === null ? "—" : n.toFixed(1);

const metricText = (
  m: BalanceMetrics,
) =>
  `${formatTime(m.stageMs)} | Lv${m.level} | Wall ${m.wallHp}/${m.wallMaxHp} (${value(m.wallPercent)}%) | Enemy ${m.enemies} (평균 ${value(m.avgEnemies)})
DPS ${value(m.totalDps)} (${sources
    .map(
      (s) =>
        `${s} ${value(
          m.sourceDps[s],
        )}`,
    )
    .join(", ")}) | KPM ${value(m.kpm)} | Wall 피해 ${value(m.wallDamage)} | 도달/min ${value(m.wallReachPerMin)}`;

export function formatBalanceReport(
  r: BalanceReport,
): string {
  const version =
    r.runContext &&
    r.pressureSummary
      ? "v3"
      : r.v2
        ? "v2"
        : "v1";

  const pressure =
    r.pressureSummary
      ? [
          "",
          "Pressure",
          `Near75 ${r.pressureSummary.secondsWithNear75}s / max ${r.pressureSummary.maxNear75} / longest ${r.pressureSummary.longestNear75StreakSeconds}s`,
          `Near90 ${r.pressureSummary.secondsWithNear90}s / max ${r.pressureSummary.maxNear90} / longest ${r.pressureSummary.longestNear90StreakSeconds}s`,
          `Wall reach ${r.pressureSummary.wallReachCount} / total damage ${value(r.pressureSummary.wallDamageTotal)}`,
        ]
      : [];

  return [
    `Balance Report ${version} — ${r.result}`,

    "Stage time 기준 · 1초 집계의 최근 30초 관찰값",

    metricText(r.metrics),

    ...pressure,

    "",

    "Build",

    ...r.build,

    "",

    `TTK: Elite ${r.eliteSampleCount} samples / 평균 ${value(r.eliteAverageTtk)}s / 최근 ${value(r.metrics.lastEliteTtk)}s; Boss ${value(r.metrics.bossTtk)}s`,

    `Elite samples (최근 최대 ${CAP}): ${r.eliteSamples.map(value).join(", ")}`,

    "",

    "Mod Acquisition (다른 성장/적 밀도 영향을 포함하는 관찰값)",

    ...r.modEvents.map(
      (e) =>
        `${formatTime(e.stageMs)} ${e.name}: ${value(e.preDps)} → ${value(e.postDps)} DPS (${e.deltaPercent === null ? "—" : `${e.deltaPercent >= 0 ? "+" : ""}${value(e.deltaPercent)}%`})`,
    ),

    "",

    "Events",

    ...r.events.map(
      (e) =>
        `${formatTime(e.stageMs)} ${e.label}${e.ttk === undefined ? "" : ` TTK ${value(e.ttk)}s`}`,
    ),

    "",

    "Timeline Snapshots",

    ...r.snapshots.map(
      (s) =>
        `${s.label}
${metricText(s.metrics)}
${s.build.join(" / ")}`,
    ),
  ].join("\n");
}

export function saveLastBalanceReport(
  report: BalanceReport,
) {
  if (!import.meta.env.DEV) return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(report),
    );
  } catch {
    /* Storage unavailable; live report remains usable. */
  }
}

export function readLastBalanceReport():
  | BalanceReport
  | null {
  if (!import.meta.env.DEV) return null;

  try {
    const raw =
      localStorage.getItem(STORAGE_KEY);

    if (
      !raw ||
      raw.length > 1000000
    )
      return null;

    return parseBalanceReport(
      JSON.parse(raw),
    );
  } catch {
    return null;
  }
}

export function parseBalanceReport(
  input: unknown,
): BalanceReport | null {
  try {
    if (
      !input ||
      typeof input !== "object"
    )
      return null;

    const r = input as BalanceReport;

    const finite = (x: unknown) =>
      typeof x === "number" &&
      Number.isFinite(x);

    const nullable = (x: unknown) =>
      x === null || finite(x);

    const safeString = (
      x: unknown,
      max = 256,
    ) =>
      typeof x === "string" &&
      x.length <= max;

    const strings = (
      x: unknown,
      cap = CAP,
    ): x is string[] =>
      Array.isArray(x) &&
      x.length <= cap &&
      x.every((v) =>
        safeString(v, 512),
      );

    const safeKey = (key: string) =>
      key.length <= 128 &&
      !key
        .split(".")
        .some((part) =>
          [
            "__proto__",
            "prototype",
            "constructor",
          ].includes(part),
        );

    const overrideRecord = (
      x: unknown,
    ): x is Overrides => {
      if (
        !x ||
        typeof x !== "object" ||
        Array.isArray(x)
      )
        return false;

      const entries = Object.entries(x);

      return (
        entries.length <= 256 &&
        entries.every(
          ([key, value]) =>
            safeKey(key) &&
            (typeof value ===
              "boolean" ||
              finite(value)),
        )
      );
    };

    const numberRecord = (
      x: unknown,
    ) => {
      if (
        !x ||
        typeof x !== "object" ||
        Array.isArray(x)
      )
        return false;

      const entries = Object.entries(x);

      return (
        entries.length <= 64 &&
        entries.every(
          ([key, value]) =>
            safeKey(key) &&
            finite(value),
        )
      );
    };

    const metrics = (
      m: BalanceMetrics,
    ) =>
      m &&
      [
        m.stageMs,
        m.level,
        m.wallHp,
        m.wallMaxHp,
        m.wallPercent,
        m.enemies,
        m.avgEnemies,
        m.windowSeconds,
        m.totalDps,
        m.kills,
        m.kpm,
        m.wallDamage,
        m.wallReachPerMin,
      ].every(finite) &&
      [
        m.spawns,
        m.spawnPerMin,
        m.nearWall75,
        m.nearWall90,
        m.fps,
        m.substeps,
        m.speed,
      ].every(
        (x) =>
          x === undefined ||
          finite(x),
      ) &&
      nullable(m.lastEliteTtk) &&
      nullable(m.bossTtk) &&
      m.sourceDps &&
      sources.every((s) =>
        finite(m.sourceDps[s]),
      );

    if (
      r.version !== 1 ||
      typeof r.result !== "string" ||
      !metrics(r.metrics) ||
      !strings(r.build) ||
      !Array.isArray(
        r.eliteSamples,
      ) ||
      r.eliteSamples.length > CAP ||
      !r.eliteSamples.every(finite) ||
      !finite(r.eliteSampleCount) ||
      !nullable(
        r.eliteAverageTtk,
      )
    )
      return null;

    if (
      !Array.isArray(r.modEvents) ||
      r.modEvents.length > CAP ||
      !r.modEvents.every(
        (e) =>
          e &&
          finite(e.stageMs) &&
          typeof e.id === "string" &&
          typeof e.name === "string" &&
          finite(e.preDps) &&
          nullable(e.postDps) &&
          nullable(e.deltaPercent),
      )
    )
      return null;

    if (
      !Array.isArray(r.events) ||
      r.events.length > CAP ||
      !r.events.every(
        (e) =>
          e &&
          finite(e.stageMs) &&
          typeof e.label ===
            "string" &&
          [
            "mod",
            "elite",
            "boss-spawn",
            "boss-kill",
            "finish",
          ].includes(e.type) &&
          (e.ttk === undefined ||
            finite(e.ttk)),
      )
    )
      return null;

    if (
      !Array.isArray(r.snapshots) ||
      r.snapshots.length > CAP ||
      !r.snapshots.every(
        (s) =>
          s &&
          typeof s.label ===
            "string" &&
          strings(s.build) &&
          metrics(s.metrics),
      )
    )
      return null;

    if (
      r.pressureSummary !==
      undefined
    ) {
      const p =
        r.pressureSummary;

      if (
        ![
          p.firstNear75Ms,
          p.lastNear75Ms,
          p.firstNear90Ms,
          p.lastNear90Ms,
          p.firstWallDamageMs,
          p.lastWallDamageMs,
        ].every(nullable) ||
        ![
          p.secondsWithNear75,
          p.maxNear75,
          p.secondsWithNear90,
          p.maxNear90,
          p.longestNear75StreakSeconds,
          p.longestNear90StreakSeconds,
          p.wallReachCount,
          p.wallDamageTotal,
        ].every(finite)
      )
        return null;
    }

    if (
      r.runContext !== undefined
    ) {
      const c = r.runContext;

      if (
        !c ||
        c.telemetryVersion !== 3 ||
        !safeString(
          c.runId,
          128,
        ) ||
        !safeString(
          c.startedAtIso,
          64,
        ) ||
        !safeString(
          c.gitCommit,
          128,
        ) ||
        !overrideRecord(
          c.balanceOverridesStart,
        ) ||
        !(
          c.balanceOverridesEnd ===
            null ||
          overrideRecord(
            c.balanceOverridesEnd,
          )
        ) ||
        typeof c.balanceChangedDuringRun !==
          "boolean" ||
        !Array.isArray(
          c.balanceChanges,
        ) ||
        c.balanceChanges.length >
          BALANCE_CHANGE_CAP ||
        !c.balanceChanges.every(
          (change) =>
            change &&
            finite(
              change.stageMs,
            ) &&
            overrideRecord(
              change.overrides,
            ),
        ) ||
        !numberRecord(
          c.metaModifiers,
        ) ||
        !finite(c.rerolls) ||
        !c.unlockSummary ||
        !strings(
          c.unlockSummary
            .basicMods,
          32,
        ) ||
        !strings(
          c.unlockSummary
            .specialWeapons,
          16,
        ) ||
        !finite(
          c.unlockSummary
            .specialCapacity,
        ) ||
        typeof c.unlockSummary
          .relicSystem !==
          "boolean" ||
        typeof c.unlockSummary
          .coreSystem !==
          "boolean" ||
        typeof c.unlockSummary
          .synergySystem !==
          "boolean"
      )
        return null;
    }

    if (r.v2 !== undefined) {
      const v = r.v2;

      const bounded = (
        a: unknown,
        check: (x: any) => boolean,
        cap = CAP,
      ) =>
        Array.isArray(a) &&
        a.length <= cap &&
        a.every(check);

      const event = (
        e: GrowthEvent,
      ) =>
        e &&
        finite(e.stageMs) &&
        [e.kind, e.id, e.name].every(
          (x) =>
            typeof x === "string",
        ) &&
        finite(e.level) &&
        nullable(
          e.previousLevel,
        ) &&
        nullable(e.nextLevel) &&
        (e.rarity === null ||
          typeof e.rarity ===
            "string") &&
        (e.choice === undefined ||
          typeof e.choice ===
            "string") &&
        (e.offered === undefined ||
          bounded(
            e.offered,
            (c) =>
              c &&
              typeof c.id ===
                "string" &&
              typeof c.name ===
                "string" &&
              (c.rarity ===
                null ||
                typeof c.rarity ===
                  "string"),
            4,
          ));

      const observation = (
        o: Observation,
      ) =>
        o &&
        [
          o.dps,
          o.kpm,
          o.avgEnemies,
          o.nearWall75,
          o.nearWall90,
        ].every(finite);

      const overlap = (
        o: GrowthOverlap,
      ) =>
        o &&
        finite(o.stageMs) &&
        typeof o.kind ===
          "string" &&
        typeof o.id ===
          "string" &&
        typeof o.name ===
          "string" &&
        nullable(
          o.previousLevel,
        ) &&
        nullable(o.nextLevel);

      if (
        !v ||
        !bounded(
          v.timeline5s,
          metrics,
          512,
        ) ||
        !bounded(
          v.growthEvents,
          event,
        ) ||
        !bounded(
          v.powerSpikeObservations,
          (o) =>
            o &&
            event(o.event) &&
            observation(o.pre) &&
            (o.post === null ||
              observation(o.post)) &&
            (o.confounded ===
              undefined ||
              typeof o.confounded ===
                "boolean") &&
            (o.overlappingGrowthEvents ===
              undefined ||
              bounded(
                o.overlappingGrowthEvents,
                overlap,
                64,
              )),
        ) ||
        !sources.every(
          (s) =>
            v.weaponContribution?.[
              s
            ] &&
            finite(
              v.weaponContribution[s]
                .dps,
            ) &&
            finite(
              v.weaponContribution[s]
                .percent,
            ),
        )
      )
        return null;

      if (
        !v.spawnKillPressure ||
        ![
          v.spawnKillPressure
            .spawns,
          v.spawnKillPressure
            .kills,
          v.spawnKillPressure
            .spawnPerMin,
          v.spawnKillPressure
            .killPerMin,
        ].every(finite) ||
        !groups.every(
          (k) =>
            v.spawnKillPressure
              .byKind?.[k] &&
            finite(
              v.spawnKillPressure
                .byKind[k].spawns,
            ) &&
            finite(
              v.spawnKillPressure
                .byKind[k].kills,
            ) &&
            v.enemyLifetime?.[
              k
            ] &&
            finite(
              v.enemyLifetime[k]
                .count,
            ) &&
            finite(
              v.enemyLifetime[k]
                .totalSeconds,
            ) &&
            nullable(
              v.enemyLifetime[k]
                .averageSeconds,
            ),
        )
      )
        return null;

      if (
        !v.bossEvents ||
        !bounded(
          v.bossEvents.events,
          (e) =>
            e &&
            typeof e.kind ===
              "string" &&
            finite(e.stageMs) &&
            finite(e.count),
        ) ||
        !v.bossEvents.counts ||
        Object.keys(
          v.bossEvents.counts,
        ).length > 10 ||
        !Object.values(
          v.bossEvents.counts,
        ).every(finite) ||
        !nullable(
          v.bossEvents.combatTtk,
        ) ||
        !nullable(
          v.bossEvents
            .fightDuration,
        )
      )
        return null;

      if (
        !v.performance ||
        !finite(
          v.performance.frames,
        ) ||
        ![
          v.performance
            .configuredSpeed,
          v.performance.averageSpeed,
          v.performance.averageFps,
          v.performance.minFps,
          v.performance
            .averageSubsteps,
          v.performance.maxSubsteps,
          v.performance
            .effectiveSpeed,
        ].every(nullable)
      )
        return null;
    }

    return r;
  } catch {
    return null;
  }
}

export function formatAiBalanceReport(
  r: BalanceReport,
): string {
  const v = r.v2;

  const reportVersion =
    r.runContext &&
    r.pressureSummary
      ? 3
      : v
        ? 2
        : 1;

  const observations =
    v?.powerSpikeObservations.map(
      (observation) => ({
        ...observation,

        confounded:
          observation.confounded ??
          false,

        overlappingGrowthEvents:
          observation.overlappingGrowthEvents ??
          [],
      }),
    ) ?? r.modEvents;

  return JSON.stringify(
    {
      RunContext:
        r.runContext ?? null,

      RunSummary: {
        version: reportVersion,
        result: r.result,
        stageMs:
          r.metrics.stageMs,
        level: r.metrics.level,
        wallPercent:
          r.metrics.wallPercent,
      },

      FinalBuild: r.build,

      Final30s: r.metrics,

      PressureSummary:
        r.pressureSummary ??
        null,

      WeaponContribution:
        v?.weaponContribution ??
        null,

      Timeline5s:
        v?.timeline5s ?? [],

      GrowthEvents:
        v?.growthEvents ?? [],

      PowerSpikeObservations: {
        caveat:
          "15-second pre/post observations are observational. confounded=true means another growth event occurred inside the measurement window. Do not causally attribute the full delta to the focal event. Null post means the post window was incomplete.",

        observations,
      },

      SpawnKillPressure:
        v?.spawnKillPressure ??
        null,

      NearWallPressure: {
        nearWall75:
          r.metrics
            .nearWall75 ?? null,

        nearWall90:
          r.metrics
            .nearWall90 ?? null,
      },

      EnemyLifetime:
        v?.enemyLifetime ?? null,

      EliteTTK: {
        count:
          r.eliteSampleCount,

        average:
          r.eliteAverageTtk,

        recent:
          r.metrics.lastEliteTtk,

        samples:
          r.eliteSamples,
      },

      BossEvents:
        v?.bossEvents ?? null,

      Performance:
        v?.performance ?? null,
    },
    null,
    2,
  );
}