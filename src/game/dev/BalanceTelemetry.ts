import type { EnemyState } from "../enemies/enemySimulation";

export type DamageSource = "Gauss" | "Grenade" | "Missile" | "Drone" | "Other";
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
const STORAGE_KEY = "horde-defense.dev.last-balance-report.v1";
const milestones = [180, 300, 450, 600, 720, 900, 1080];
type RunState = {
  stageMs: number;
  level: number;
  wallHp: number;
  wallMaxHp: number;
  enemies: number;
  build: string[];
};
export interface BalanceMetrics extends Omit<RunState, "build"> {
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
export interface BalanceReport {
  version: 1;
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
  private buckets: Bucket[] = [];
  private samples: { second: number; count: number }[] = [];
  private firstHit = new Map<number, number>();
  private reached = new Set<number>();
  private eliteSamples: number[] = [];
  private eliteCount = 0;
  private eliteTotal = 0;
  private lastEliteTtk: number | null = null;
  private bossTtk: number | null = null;
  private totalDamage = 0;
  private modEvents: ModEvent[] = [];
  private pendingMods: { event: ModEvent; baseline: number }[] = [];
  private events: TelemetryEvent[] = [];
  private snapshots: TimelineSnapshot[] = [];
  private nextMilestone = 0;
  private result = "in-progress";

  constructor(enabled = import.meta.env.DEV) {
    this.enabled = enabled;
  }

  setTime(stageMs: number) {
    if (
      !this.enabled ||
      this.result !== "in-progress" ||
      !Number.isFinite(stageMs)
    )
      return;
    const priorSecond = Math.floor(this.state.stageMs / 1000);
    this.state.stageMs = Math.max(this.state.stageMs, stageMs);
    // Mature before this frame's damage, so a hit beyond 15s cannot enter the post window.
    if (this.pendingMods.length)
      this.pendingMods = this.pendingMods.filter(({ event, baseline }) => {
        if (this.state.stageMs < event.stageMs + 15000) return true;
        event.postDps = (this.totalDamage - baseline) / 15;
        event.deltaPercent =
          event.preDps > 0 ? (event.postDps / event.preDps - 1) * 100 : null;
        return false;
      });
    if (Math.floor(this.state.stageMs / 1000) === priorSecond) return;
    const cutoff = Math.floor(this.state.stageMs / 1000) - 29;
    this.buckets = this.buckets.filter((b) => b.second >= cutoff);
    this.samples = this.samples.filter((s) => s.second >= cutoff);
  }

  private bucket() {
    const second = Math.floor(this.state.stageMs / 1000);
    let b = this.buckets.at(-1);
    if (!b || b.second !== second) {
      b = {
        second,
        damage: emptyDamage(),
        kills: 0,
        wallDamage: 0,
        reaches: 0,
      };
      this.buckets.push(b);
    }
    return b;
  }

  damage(before: EnemyState, after: EnemyState, source: DamageSource) {
    if (!this.enabled || this.result !== "in-progress" || before.hp <= 0)
      return;
    const loss =
      Math.max(0, before.hp - Math.max(0, after.hp)) +
      Math.max(0, (before.shieldHp ?? 0) - Math.max(0, after.shieldHp ?? 0));
    if (loss <= 0) return;
    this.bucket().damage[source] += loss;
    this.totalDamage += loss;
    if ((before.elite || before.boss) && !this.firstHit.has(before.id))
      this.firstHit.set(before.id, this.state.stageMs);
    if (after.hp > 0) return;
    this.bucket().kills++;
    const first = this.firstHit.get(before.id);
    if (first !== undefined) {
      const ttk = (this.state.stageMs - first) / 1000;
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
    if (this.enabled && this.result === "in-progress")
      this.bucket().wallDamage += Math.max(0, before - Math.max(0, after));
  }
  wallReach(id: number) {
    if (!this.enabled || this.result !== "in-progress" || this.reached.has(id))
      return;
    this.reached.add(id);
    this.bucket().reaches++;
  }
  removeEnemy(id: number) {
    this.firstHit.delete(id);
    this.reached.delete(id);
  }

  update(state: RunState) {
    if (!this.enabled || this.result !== "in-progress") return;
    this.setTime(state.stageMs);
    this.state = { ...state, stageMs: this.state.stageMs };
    const second = Math.floor(this.state.stageMs / 1000);
    if (this.samples.at(-1)?.second !== second)
      this.samples.push({ second, count: state.enemies });
    while (
      this.nextMilestone < milestones.length &&
      this.state.stageMs >= milestones[this.nextMilestone]! * 1000
    ) {
      this.snapshot(formatTime(milestones[this.nextMilestone]! * 1000));
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
    const seconds = Math.min(15, this.state.stageMs / 1000);
    const damage = this.buckets
      .filter((b) => b.second >= Math.floor(this.state.stageMs / 1000) - 14)
      .reduce(
        (sum, b) => sum + sources.reduce((n, s) => n + b.damage[s], 0),
        0,
      );
    const event: ModEvent = {
      stageMs: this.state.stageMs,
      id,
      name,
      preDps: seconds > 0 ? damage / seconds : 0,
      postDps: null,
      deltaPercent: null,
    };
    this.modEvents.push(event);
    this.pendingMods.push({ event, baseline: this.totalDamage });
    append(this.events, {
      stageMs: this.state.stageMs,
      type: "mod",
      label: `${name} Lv1 획득`,
    });
  }

  bossSpawn() {
    if (!this.enabled || this.result !== "in-progress") return;
    append(this.events, {
      stageMs: this.state.stageMs,
      type: "boss-spawn",
      label: "Boss 등장",
    });
    this.snapshot("Boss 등장");
  }

  private metrics(): BalanceMetrics {
    const sourceDps = emptyDamage();
    const windowSeconds = Math.min(30, this.state.stageMs / 1000);
    let kills = 0,
      wallDamage = 0,
      reaches = 0;
    for (const b of this.buckets) {
      for (const source of sources) sourceDps[source] += b.damage[source];
      kills += b.kills;
      wallDamage += b.wallDamage;
      reaches += b.reaches;
    }
    for (const source of sources)
      sourceDps[source] =
        windowSeconds > 0 ? sourceDps[source] / windowSeconds : 0;
    const { build: _build, ...state } = this.state;
    return {
      ...state,
      wallPercent:
        state.wallMaxHp > 0 ? (state.wallHp / state.wallMaxHp) * 100 : 0,
      avgEnemies: this.samples.length
        ? this.samples.reduce((n, s) => n + s.count, 0) / this.samples.length
        : state.enemies,
      windowSeconds,
      totalDps: sources.reduce((n, s) => n + sourceDps[s], 0),
      sourceDps,
      kills,
      kpm: windowSeconds > 0 ? (kills * 60) / windowSeconds : 0,
      wallDamage,
      wallReachPerMin: windowSeconds > 0 ? (reaches * 60) / windowSeconds : 0,
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

  report(): BalanceReport {
    return {
      version: 1,
      result: this.result,
      metrics: this.metrics(),
      build: [...this.state.build],
      eliteSamples: [...this.eliteSamples],
      eliteSampleCount: this.eliteCount,
      eliteAverageTtk: this.eliteCount
        ? this.eliteTotal / this.eliteCount
        : null,
      modEvents: this.modEvents.map((e) => ({ ...e })),
      events: this.events.map((e) => ({ ...e })),
      snapshots: this.snapshots.map((s) => ({
        label: s.label,
        build: [...s.build],
        metrics: { ...s.metrics, sourceDps: { ...s.metrics.sourceDps } },
      })),
    };
  }
  finish(result: string) {
    if (this.enabled && this.result === "in-progress") {
      this.result = result;
      this.snapshot("Run 종료");
      append(this.events, {
        stageMs: this.state.stageMs,
        type: "finish",
        label: result,
      });
      saveLastBalanceReport(this.report());
    }
    return this.report();
  }
}

const formatTime = (ms: number) =>
  `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
const value = (n: number | null) => (n === null ? "—" : n.toFixed(1));
const metricText = (m: BalanceMetrics) =>
  `${formatTime(m.stageMs)} | Lv${m.level} | Wall ${m.wallHp}/${m.wallMaxHp} (${value(m.wallPercent)}%) | Enemy ${m.enemies} (평균 ${value(m.avgEnemies)})\nDPS ${value(m.totalDps)} (${sources.map((s) => `${s} ${value(m.sourceDps[s])}`).join(", ")}) | KPM ${value(m.kpm)} | Wall 피해 ${value(m.wallDamage)} | 도달/min ${value(m.wallReachPerMin)}`;
export function formatBalanceReport(r: BalanceReport): string {
  return [
    `Balance Report v1 — ${r.result}`,
    "Stage time 기준 · 1초 집계의 최근 30초 관찰값",
    metricText(r.metrics),
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
      (s) => `${s.label}\n${metricText(s.metrics)}\n${s.build.join(" / ")}`,
    ),
  ].join("\n");
}

export function saveLastBalanceReport(report: BalanceReport) {
  if (!import.meta.env.DEV) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
  } catch {
    /* Storage unavailable; live report remains usable. */
  }
}

export function readLastBalanceReport(): BalanceReport | null {
  if (!import.meta.env.DEV) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > 1000000) return null;
    return parseBalanceReport(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Shared boundary validator for storage and the dev BroadcastChannel. */
export function parseBalanceReport(input: unknown): BalanceReport | null {
  try {
    if (!input || typeof input !== "object") return null;
    const r = input as BalanceReport;
    const strings = (x: unknown): x is string[] =>
      Array.isArray(x) &&
      x.length <= CAP &&
      x.every((v) => typeof v === "string");
    const finite = (x: unknown) => typeof x === "number" && Number.isFinite(x);
    const nullable = (x: unknown) => x === null || finite(x);
    const metrics = (m: BalanceMetrics) =>
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
      nullable(m.lastEliteTtk) &&
      nullable(m.bossTtk) &&
      m.sourceDps &&
      sources.every((s) => finite(m.sourceDps[s]));
    if (
      r.version !== 1 ||
      typeof r.result !== "string" ||
      !metrics(r.metrics) ||
      !strings(r.build) ||
      !Array.isArray(r.eliteSamples) ||
      r.eliteSamples.length > CAP ||
      !r.eliteSamples.every(finite) ||
      !finite(r.eliteSampleCount) ||
      !nullable(r.eliteAverageTtk)
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
          typeof e.label === "string" &&
          ["mod", "elite", "boss-spawn", "boss-kill", "finish"].includes(
            e.type,
          ) &&
          (e.ttk === undefined || finite(e.ttk)),
      )
    )
      return null;
    if (
      !Array.isArray(r.snapshots) ||
      r.snapshots.length > CAP ||
      !r.snapshots.every(
        (s) =>
          s &&
          typeof s.label === "string" &&
          strings(s.build) &&
          metrics(s.metrics),
      )
    )
      return null;
    return r;
  } catch {
    return null;
  }
}
