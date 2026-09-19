import { combatPosition } from "../battlefield/combatGeometry";
import type { getIncendiaryStats } from "../data/marineGrowth";
import type { EnemyState } from "../enemies/enemySimulation";
import { applyPrimaryDamage } from "./damage";

type BurnStats = ReturnType<typeof getIncendiaryStats>;
interface Burn {
  stacks: number;
  damagePerStack: number;
  remainingMs: number;
  elapsedMs: number;
  stats: BurnStats;
}

/** Combat-time only. The caller ignites once per damaged target per Gauss round. */
export class Incendiary {
  private burns = new Map<number, Burn>();

  get size(): number {
    return this.burns.size;
  }

  has(id: number): boolean {
    return this.burns.has(id);
  }

  clear(): void {
    this.burns.clear();
  }

  ignite(id: number, damagePerStack: number, stats: BurnStats): void {
    this.addStacks(id, damagePerStack, stats, 1);
  }

  private addStacks(
    id: number,
    damage: number,
    stats: BurnStats,
    stacks: number,
  ): void {
    if (
      !(damage > 0) ||
      !Number.isFinite(damage) ||
      stats.tickMs <= 0 ||
      stats.durationMs <= 0
    )
      return;
    const old = this.burns.get(id);
    if (old) {
      stats = {
        tickMs: Math.min(old.stats.tickMs, stats.tickMs),
        durationMs: Math.max(old.stats.durationMs, stats.durationMs),
        maxStacks: Math.max(old.stats.maxStacks, stats.maxStacks),
        tickFactor: Math.max(old.stats.tickFactor, stats.tickFactor),
        spreadTargets: Math.max(old.stats.spreadTargets, stats.spreadTargets),
        spreadRadius: Math.max(old.stats.spreadRadius, stats.spreadRadius),
        transferStacks: Math.max(
          old.stats.transferStacks,
          stats.transferStacks,
        ),
        spreadFactor: Math.max(old.stats.spreadFactor, stats.spreadFactor),
        overheatMultiplier: Math.max(
          old.stats.overheatMultiplier,
          stats.overheatMultiplier,
        ),
      };
    }
    this.burns.set(id, {
      stacks: Math.min(stats.maxStacks, (old?.stacks ?? 0) + stacks),
      damagePerStack: Math.max(old?.damagePerStack ?? 0, damage),
      remainingMs: stats.durationMs,
      // Repeated rounds refresh expiry without postponing the next tick.
      elapsedMs: old?.elapsedMs ?? 0,
      stats: { ...stats },
    });
  }

  advance(
    deltaMs: number,
    enemies: readonly EnemyState[],
  ): {
    enemies: readonly EnemyState[];
    hitIds: number[];
    killIds: number[];
  } {
    const hitIds: number[] = [],
      killIds: number[] = [];
    if (!this.burns.size) return { enemies, hitIds, killIds };
    const present = new Set<number>();
    let result: EnemyState[] | undefined;
    const delta = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i]!;
      const burn = this.burns.get(enemy.id);
      if (!burn || enemy.hp <= 0) continue;
      present.add(enemy.id);
      burn.elapsedMs += Math.min(delta, burn.remainingMs);
      burn.remainingMs = Math.max(0, burn.remainingMs - delta);
      const ticks = Math.floor(burn.elapsedMs / burn.stats.tickMs);
      burn.elapsedMs %= burn.stats.tickMs;
      let next = enemy;
      const damage =
        burn.damagePerStack *
        burn.stacks *
        (burn.stacks >= burn.stats.maxStacks
          ? burn.stats.overheatMultiplier
          : 1);
      for (let tick = 0; tick < ticks && next.hp > 0; tick++)
        next = applyPrimaryDamage(next, damage);
      if (next.hp !== enemy.hp || next.shieldHp !== enemy.shieldHp) {
        result ??= [...enemies];
        result[i] = next;
        hitIds.push(enemy.id);
        if (next.hp <= 0) killIds.push(enemy.id);
      }
      // Keep a lethal final tick's source until the caller processes this death wave.
      if (burn.remainingMs <= 0 && next.hp > 0) this.burns.delete(enemy.id);
    }
    for (const id of this.burns.keys())
      if (!present.has(id)) this.burns.delete(id);
    return { enemies: result ?? enemies, hitIds, killIds };
  }

  /** Invoke once per death wave, before removing dead enemies from the scene. */
  processDeaths(
    dead: readonly EnemyState[],
    survivors: readonly EnemyState[],
  ): void {
    const sources: { enemy: EnemyState; burn: Burn }[] = [];
    for (const enemy of dead) {
      const burn = this.burns.get(enemy.id);
      this.burns.delete(enemy.id);
      if (burn && burn.stats.spreadTargets > 0 && burn.stats.spreadRadius > 0)
        sources.push({ enemy, burn });
    }
    if (!sources.length) return;
    const cellSize = Math.max(
      ...sources.map(({ burn }) => burn.stats.spreadRadius),
    );
    const cells = new Map<
      string,
      { enemy: EnemyState; x: number; y: number }[]
    >();
    for (const enemy of survivors) {
      if (enemy.hp <= 0) continue;
      const point = { enemy, ...combatPosition(enemy) };
      const key = `${Math.floor(point.x / cellSize)},${Math.floor(point.y / cellSize)}`;
      const cell = cells.get(key);
      if (cell) cell.push(point);
      else cells.set(key, [point]);
    }
    for (const { enemy, burn } of sources.sort(
      (a, b) => a.enemy.id - b.enemy.id,
    )) {
      const origin = combatPosition(enemy),
        radius = burn.stats.spreadRadius;
      const candidates: { id: number; distance: number }[] = [];
      for (
        let x = Math.floor((origin.x - radius) / cellSize);
        x <= Math.floor((origin.x + radius) / cellSize);
        x++
      ) {
        for (
          let y = Math.floor((origin.y - radius) / cellSize);
          y <= Math.floor((origin.y + radius) / cellSize);
          y++
        ) {
          for (const target of cells.get(`${x},${y}`) ?? []) {
            const distance =
              (target.x - origin.x) ** 2 + (target.y - origin.y) ** 2;
            if (distance <= radius ** 2)
              candidates.push({ id: target.enemy.id, distance });
          }
        }
      }
      candidates.sort((a, b) => a.distance - b.distance || a.id - b.id);
      for (const target of candidates.slice(0, burn.stats.spreadTargets)) {
        this.addStacks(
          target.id,
          burn.damagePerStack * burn.stats.spreadFactor,
          burn.stats,
          burn.stats.transferStacks,
        );
      }
    }
  }
}
