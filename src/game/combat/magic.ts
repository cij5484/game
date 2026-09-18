import { combatPosition } from "../battlefield/combatGeometry";
import { magicConfigs } from "../data/magic";
import { abilityGrowthBalance, getAbilityEffects } from "../data/abilityGrowth";
import type { GrowthBranches } from "../data/growth";
import type { UpgradeRanks } from "../data/upgrades";
import type { EnemyState } from "../enemies/enemySimulation";
import { selectAutoTarget } from "./targeting";

export type MagicId = keyof typeof magicConfigs;
export interface MagicResult {
  enemies: EnemyState[];
  hitIds: number[];
  strikeIds: number[];
}
function distance(a: EnemyState, b: EnemyState): number {
  const start = combatPosition(a),
    end = combatPosition(b);
  return Math.hypot(start.x - end.x, start.y - end.y);
}
function threatOrder(a: EnemyState, b: EnemyState): number {
  return (
    Number(!!b.elite) - Number(!!a.elite) ||
    b.progress01 - a.progress01 ||
    Number(b.kind === "shield") - Number(a.kind === "shield") ||
    a.id - b.id
  );
}

export class Magic {
  private effects = getAbilityEffects({});
  private activeFrost = getAbilityEffects({});
  private frostMs = 0;
  private frostSpeed = 1;
  private clockMs = 0;
  private strikes: { dueMs: number; damage: number }[] = [];
  private cooldowns: Record<MagicId, number> = {
    "frost-nova": 0,
    "chain-lightning": 0,
  };
  private cooldownTotals: Record<MagicId, number> = {
    "frost-nova": magicConfigs["frost-nova"].cooldownMs,
    "chain-lightning": magicConfigs["chain-lightning"].cooldownMs,
  };

  setUpgrades(ranks: UpgradeRanks, branches: GrowthBranches = {}): void {
    this.effects = getAbilityEffects(ranks, branches);
  }
  readyProgress(id: MagicId): number {
    return 1 - this.remaining(id) / this.cooldownTotals[id];
  }
  remaining(id: MagicId): number {
    return this.cooldowns[id];
  }
  get frostRemainingMs(): number {
    return this.frostMs;
  }
  get movementMultiplier(): number {
    return this.frostMs > 0 ? this.frostSpeed : 1;
  }
  get primaryDamageMultiplier(): number {
    return this.frostMs > 0 ? 1 + this.activeFrost.frostVulnerability : 1;
  }

  advance(deltaMs: number): void {
    const elapsed = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
    this.clockMs += elapsed;
    this.frostMs = Math.max(0, this.frostMs - elapsed);
    for (const id of Object.keys(this.cooldowns) as MagicId[])
      this.cooldowns[id] = Math.max(0, this.cooldowns[id] - elapsed);
  }
  refundCooldowns(refunds: Partial<Record<MagicId, number>>): void {
    for (const id of Object.keys(this.cooldowns) as MagicId[])
      this.cooldowns[id] = Math.max(
        0,
        this.cooldowns[id] - Math.max(0, refunds[id] ?? 0),
      );
  }

  /** Called once for a death transaction. The entire capstone cascade is resolved here. */
  afterDeaths(
    enemies: readonly EnemyState[],
    killedIds: readonly number[],
  ): { enemies: EnemyState[]; hitIds: number[]; centerIds: number[] } {
    const effects = this.activeFrost;
    const result = {
      enemies: [...enemies],
      hitIds: [] as number[],
      centerIds: [] as number[],
    };
    if (this.frostMs <= 0 || effects.frostDeathDamage <= 0) return result;
    const killed = new Set(killedIds);
    const pending = enemies
      .filter((e) => e.hp <= 0 && killed.has(e.id))
      .slice(0, abilityGrowthBalance.frostCenterCap)
      .map((enemy) => ({ enemy, depth: 0 }));
    const damaged = new Set<number>();
    for (
      let cursor = 0;
      cursor < pending.length &&
      result.centerIds.length < abilityGrowthBalance.frostCenterCap;
      cursor++
    ) {
      const { enemy: center, depth } = pending[cursor]!;
      if (
        depth >= effects.frostDeathDepth ||
        damaged.size >= effects.frostDeathTargetCap
      )
        break;
      result.centerIds.push(center.id);
      const victims = result.enemies
        .filter(
          (e) =>
            e.hp > 0 &&
            !damaged.has(e.id) &&
            distance(center, e) <= effects.frostDeathRadius,
        )
        .sort(
          (a, b) => distance(center, a) - distance(center, b) || a.id - b.id,
        )
        .slice(
          0,
          Math.min(
            abilityGrowthBalance.frostVictimsPerCenter,
            effects.frostDeathTargetCap - damaged.size,
          ),
        );
      const ids = new Set(victims.map((e) => e.id));
      for (let i = 0; i < result.enemies.length; i++) {
        const enemy = result.enemies[i]!;
        if (!ids.has(enemy.id)) continue;
        damaged.add(enemy.id);
        const next = {
          ...enemy,
          hp: Math.max(0, enemy.hp - effects.frostDeathDamage),
        };
        result.enemies[i] = next;
        if (
          next.hp <= 0 &&
          depth + 1 < effects.frostDeathDepth &&
          pending.length < abilityGrowthBalance.frostCenterCap
        )
          pending.push({ enemy: next, depth: depth + 1 });
      }
    }
    result.hitIds = [...damaged];
    return result;
  }

  cast(id: MagicId, enemies: readonly EnemyState[]): MagicResult | null {
    if (this.cooldowns[id] > 0) return null;
    this.cooldowns[id] = magicConfigs[id].cooldownMs;
    this.cooldownTotals[id] = this.cooldowns[id];
    if (id === "frost-nova") {
      const base = magicConfigs[id];
      this.activeFrost = { ...this.effects };
      this.frostMs = base.durationMs + this.effects.frostDurationBonusMs;
      this.frostSpeed = Math.max(
        0.1,
        base.moveSpeedMultiplier - this.effects.frostSlowBonus,
      );
      return {
        enemies: [...enemies],
        hitIds: enemies.filter((e) => e.hp > 0).map((e) => e.id),
        strikeIds: [],
      };
    }
    const base = magicConfigs[id];
    const living = enemies.filter((e) => e.hp > 0);
    const priority = this.effects.lightningPriority;
    let next = priority
      ? [...living].sort(threatOrder)[0]
      : selectAutoTarget(living);
    const damage =
      base.damagePerTarget * this.effects.lightningDamageMultiplier;
    const targetCount =
      this.effects.lightningTargetOverride ||
      base.maxTargets + this.effects.lightningTargetBonus;
    const hits = new Set<number>();
    let killBonus = 0;
    while (
      next &&
      hits.size <
        Math.min(
          abilityGrowthBalance.lightningTargetCap,
          targetCount + killBonus,
        )
    ) {
      hits.add(next.id);
      if (next.hp <= damage)
        killBonus = Math.min(
          this.effects.lightningKillJumpCap,
          killBonus + this.effects.lightningKillJumps,
        );
      const anchor = next;
      let candidate: EnemyState | undefined;
      let nearest: number = base.chainRadiusPx;
      for (const enemy of living) {
        if (hits.has(enemy.id)) continue;
        const gap = distance(anchor, enemy);
        if (gap > base.chainRadiusPx) continue;
        if (
          priority
            ? !candidate || threatOrder(enemy, candidate) < 0
            : gap < nearest ||
              (gap === nearest && (!candidate || enemy.id < candidate.id))
        ) {
          candidate = enemy;
          nearest = gap;
        }
      }
      next = candidate;
    }
    for (
      let i = 0;
      i < this.effects.lightningStrikeCount &&
      this.strikes.length < abilityGrowthBalance.strikeQueueCap;
      i++
    ) {
      this.strikes.push({
        dueMs: this.clockMs + (i + 1) * abilityGrowthBalance.strikeIntervalMs,
        damage: this.effects.lightningStrikeDamage,
      });
    }
    return {
      enemies: enemies.map((enemy) =>
        hits.has(enemy.id)
          ? { ...enemy, hp: Math.max(0, enemy.hp - damage) }
          : enemy,
      ),
      hitIds: [...hits],
      strikeIds: [],
    };
  }

  /** Drain due storm events after advancing simulated time; repeated drain calls cannot replay them. */
  drainStrikes(enemies: readonly EnemyState[]): MagicResult {
    const result: MagicResult = {
      enemies: [...enemies],
      hitIds: [],
      strikeIds: [],
    };
    const due = this.strikes.filter((strike) => strike.dueMs <= this.clockMs);
    this.strikes = this.strikes.filter((strike) => strike.dueMs > this.clockMs);
    const hitIds = new Set<number>();
    for (const strike of due) {
      const living = result.enemies.filter((e) => e.hp > 0).sort(threatOrder);
      const center = living[0];
      if (!center) continue;
      result.strikeIds.push(center.id);
      const victims = new Set(
        living
          .filter(
            (e) => distance(e, center) <= abilityGrowthBalance.strikeRadius,
          )
          .slice(0, abilityGrowthBalance.strikeTargetCap)
          .map((e) => e.id),
      );
      result.enemies = result.enemies.map((enemy) => {
        if (!victims.has(enemy.id)) return enemy;
        hitIds.add(enemy.id);
        return { ...enemy, hp: Math.max(0, enemy.hp - strike.damage) };
      });
    }
    result.hitIds = [...hitIds];
    return result;
  }
}
