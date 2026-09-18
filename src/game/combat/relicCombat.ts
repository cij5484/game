import { marineTraitIds, type MarineGrowthState } from "../data/marineGrowth";
import { applyEffectDamage } from "./damage";
import { combatPosition } from "../battlefield/combatGeometry";
import { relicBalance, type RelicLevels } from "../data/relics";
import { weaponTraitIds } from "../data/traits";
import type { UpgradeRanks } from "../data/upgrades";
import type { GrowthBranches } from "../data/growth";
import { relicEffects } from "../progression/relics";
import type { EnemyState } from "../enemies/enemySimulation";
import type { MagicId } from "./magic";

type Refunds = Partial<Record<MagicId, number>>;
export interface VolleySnapshot {
  /** Original target; the caller retargets the echo to a different living enemy. */
  targetId: number;
  ranks: UpgradeRanks;
  growth?: MarineGrowthState;
  branches?: GrowthBranches;
  activeSynergyIds?: ReadonlySet<string>;
  baseDamage: number;
  rounds?: number;
}
export interface EchoVolley extends VolleySnapshot {
  rounds: number;
  damageMultiplier: number;
}
export interface WallRelicResult {
  wallHp: number;
  event?: "bulwark" | "emergency";
  pushback: number;
  cooldownRefunds: Refunds;
}

/** Run-owned state; setLevels never resets once-per-run or timing budgets. */
export class RelicCombat {
  private effects = relicEffects({});
  private arcCharge = 0;
  private previousMagic: MagicId | undefined;
  private clockMs = 0;
  private volleyCount = 0;
  private echoes: { dueMs: number; volley: EchoVolley }[] = [];
  private brittle = new Map<number, number>();
  private reclaimedAt: number[] = [];
  private bulwarkUsed = false;
  private emergencyUsed = false;
  private crisisUntilMs = 0;
  private protectionUntilMs = 0;

  setLevels(levels: RelicLevels): void {
    this.effects = relicEffects(levels);
  }

  primaryModifiersFor(_wallRatio: number, boost: boolean) {
    return {
      damageMultiplier:
        1 +
        (boost
          ? this.effects.boostDamageBonus + this.effects.pumpDamageBonus
          : 0),
      attackSpeedMultiplier:
        1 +
        (this.clockMs < this.crisisUntilMs ? this.effects.crisisSpeedBonus : 0),
    };
  }

  // Only successful casts trigger effects; blocked input never calls this.
  onMagic(
    id: MagicId,
    _wallRatio = 1,
  ): { wallHealing: number; cooldownRefunds: Refunds } {
    if (id === "chain-lightning" && this.effects.lightningReadiesArc)
      this.arcCharge = this.effects.arcEveryRounds;
    // New Frost casts start a fresh brittleness window, including casts after a gap with no shots.
    if (id === "frost-nova") this.brittle.clear();
    const cooldownRefunds: Refunds = {};
    const alternating =
      this.previousMagic !== undefined && this.previousMagic !== id;
    if (alternating && this.effects.alternatingRefundMs > 0)
      cooldownRefunds[this.previousMagic!] = this.effects.alternatingRefundMs;
    this.previousMagic = id;
    return {
      wallHealing: alternating ? this.effects.alternatingHealing : 0,
      cooldownRefunds,
    };
  }

  onStim(): { wallCost: number; cooldownRefunds: Refunds } {
    return { wallCost: this.effects.stimWallCost, cooldownRefunds: {} };
  }

  onKills(
    kills: number,
    context: {
      frost: boolean;
      boost: boolean;
      magic: boolean;
      nearWallKills?: number;
    },
  ) {
    const count = Number.isFinite(kills) ? Math.max(0, Math.floor(kills)) : 0;
    this.reclaimedAt = this.reclaimedAt.filter(
      (time) => this.clockMs - time < relicBalance.reclaimWindowMs,
    );
    const near = Number.isFinite(context.nearWallKills)
      ? Math.max(0, Math.floor(context.nearWallKills!))
      : 0;
    const reclaimed = Math.min(
      count,
      near,
      Math.max(0, this.effects.reclaimKillsPerSecond - this.reclaimedAt.length),
    );
    for (let i = 0; i < reclaimed; i++) this.reclaimedAt.push(this.clockMs);
    return {
      wallHealing: reclaimed * this.effects.reclaimHealing,
      energy: reclaimed * this.effects.reclaimEnergy,
      boostExtensionMs: context.boost
        ? Math.min(
            this.effects.boostExtensionCapMs,
            count * this.effects.boostExtensionPerKillMs,
          )
        : 0,
      boostExtensionCapMs: this.effects.boostExtensionCapMs,
      recoveryCostRatio: this.effects.recoveryCostRatio,
    };
  }

  /** Called once per three original automatic shots; echo rounds never call back. */
  onVolley(snapshot: VolleySnapshot, isEcho = false): void {
    if (isEcho || this.effects.echoEveryVolleys <= 0) return;
    this.volleyCount++;
    if (this.volleyCount < this.effects.echoEveryVolleys) return;
    this.volleyCount = 0;
    if (this.echoes.length >= relicBalance.echoQueueCap) return;
    const ranks = { ...snapshot.ranks };
    const branches: GrowthBranches = {};
    for (const id of weaponTraitIds) {
      if (this.effects.echoTraitLevel >= 5) {
        if ((ranks[id] ?? 0) >= 3 && snapshot.branches?.[id])
          branches[id] = snapshot.branches[id];
        continue;
      }
      const inherited =
        this.effects.echoTraitLevel > 0 &&
        (id === "penetration" || id === "ricochet" || id === "multishot");
      if (!inherited) delete ranks[id];
      else if (ranks[id])
        ranks[id] = Math.min(ranks[id]!, this.effects.echoTraitLevel);
    }
    const growth: MarineGrowthState | undefined = snapshot.growth
      ? {
          ranks: { ...snapshot.growth.ranks },
          quality: { ...snapshot.growth.quality },
          legendary: new Set(snapshot.growth.legendary),
        }
      : undefined;
    if (growth && this.effects.echoTraitLevel < 5) {
      for (const id of marineTraitIds) {
        const level = growth.ranks[id] ?? 0;
        const inherited =
          this.effects.echoTraitLevel > 0 &&
          ["penetration", "ricochet", "multishot"].includes(id);
        if (!inherited) {
          delete growth.ranks[id];
          delete growth.quality[id];
        } else if (level > 0) {
          const limited = Math.min(level, this.effects.echoTraitLevel);
          growth.ranks[id] = limited;
          growth.quality[id] =
            ((growth.quality[id] ?? level) * limited) / level;
        }
      }
      growth.legendary = new Set();
    }
    this.echoes.push({
      dueMs: this.clockMs + relicBalance.echoDelayMs,
      volley: {
        ...snapshot,
        ...(growth ? { growth } : {}),
        ranks,
        branches,
        activeSynergyIds: new Set(snapshot.activeSynergyIds ?? []),
        rounds: Math.max(
          1,
          Math.min(
            snapshot.rounds ?? 1,
            this.effects.echoRoundCap,
            relicBalance.echoMaxRounds,
          ),
        ),
        damageMultiplier: this.effects.echoDamageMultiplier,
      },
    });
  }

  /** Advance active simulation time, then execute returned echoes without relic callbacks. */
  advance(deltaMs: number): EchoVolley[] {
    if (Number.isFinite(deltaMs)) this.clockMs += Math.max(0, deltaMs);
    const due = this.echoes.filter((e) => e.dueMs <= this.clockMs);
    this.echoes = this.echoes.filter((e) => e.dueMs > this.clockMs);
    return due.map((e) => e.volley);
  }

  onWallDamage(hp: number, maxHp: number, damage: number): WallRelicResult {
    let remaining = Math.max(0, damage);
    if (this.clockMs < this.protectionUntilMs) remaining = 0;
    else if (this.clockMs < this.crisisUntilMs)
      remaining *= 1 - this.effects.crisisDamageReduction;
    const result: WallRelicResult = {
      wallHp: Math.max(0, hp - remaining),
      pushback: 0,
      cooldownRefunds: {},
    };
    if (hp <= 0 || remaining <= 0) return result;
    if (!this.emergencyUsed && this.effects.lethalSave && result.wallHp <= 0) {
      this.emergencyUsed = true;
      this.protectionUntilMs =
        this.clockMs + relicBalance.emergencyProtectionMs;
      result.wallHp = 1;
      result.event = "emergency";
      result.pushback = relicBalance.emergencyPushback;
      return result;
    }
    if (
      !this.bulwarkUsed &&
      this.effects.crisisDurationMs > 0 &&
      result.wallHp > 0 &&
      result.wallHp <= maxHp * relicBalance.lowWallRatio
    ) {
      this.bulwarkUsed = true;
      this.crisisUntilMs = this.clockMs + this.effects.crisisDurationMs;
      result.event = "bulwark";
      result.pushback = this.effects.crisisPushback;
      result.cooldownRefunds = {
        "frost-nova": this.effects.crisisRefundMs,
        "chain-lightning": this.effects.crisisRefundMs,
      };
    }
    return result;
  }

  /** One tier of primary→shatter; returned damage never re-enters primary/relic triggers. */
  onPrimaryFrost(
    enemies: readonly EnemyState[],
    hitIds: readonly number[],
    frost: boolean,
  ): { enemies: EnemyState[]; hitIds: number[]; shatterIds: number[] } {
    const result = {
      enemies: [...enemies],
      hitIds: [] as number[],
      shatterIds: [] as number[],
    };
    if (!frost || this.effects.brittleThreshold <= 0) {
      this.brittle.clear();
      return result;
    }
    const living = new Map(
      enemies.filter((e) => e.hp > 0).map((e) => [e.id, e]),
    );
    for (const id of this.brittle.keys())
      if (!living.has(id)) this.brittle.delete(id);
    const pending: EnemyState[] = [];
    for (const id of new Set(hitIds)) {
      const enemy = living.get(id);
      if (!enemy) continue;
      const stacks = Math.min(
        this.effects.brittleThreshold,
        (this.brittle.get(id) ?? 0) + 1,
      );
      this.brittle.set(id, stacks);
      if (
        stacks >= this.effects.brittleThreshold &&
        pending.length < this.effects.shatterWaves
      )
        pending.push(enemy);
    }
    const damaged = new Set<number>();
    for (const anchor of pending) {
      this.brittle.delete(anchor.id);
      result.shatterIds.push(anchor.id);
      const point = combatPosition(anchor);
      const targets = [...living.values()]
        .filter((e) => !damaged.has(e.id))
        .map((enemy) => ({
          enemy,
          distance: Math.hypot(
            combatPosition(enemy).x - point.x,
            combatPosition(enemy).y - point.y,
          ),
        }))
        .filter((e) => e.distance <= this.effects.shatterRadius)
        .sort((a, b) => a.distance - b.distance || a.enemy.id - b.enemy.id)
        .slice(0, this.effects.shatterTargets);
      for (const { enemy } of targets) {
        if (damaged.size >= relicBalance.shatterTotalTargetCap) break;
        damaged.add(enemy.id);
        // Transferred stacks can trigger on a later primary hit, never recursively in this wave.
        if (this.effects.shatterChainStacks && enemy.id !== anchor.id)
          this.brittle.set(
            enemy.id,
            Math.min(
              this.effects.brittleThreshold - 1,
              (this.brittle.get(enemy.id) ?? 0) +
                this.effects.shatterChainStacks,
            ),
          );
      }
    }
    result.hitIds = [...damaged];
    result.enemies = enemies.map((enemy) =>
      damaged.has(enemy.id)
        ? applyEffectDamage(enemy, this.effects.shatterDamage)
        : enemy,
    );
    return result;
  }

  // Called once per original primary round. Tesla never recursively invokes this method.
  afterPrimary(
    enemies: readonly EnemyState[],
    hitIds: readonly number[],
    critical: boolean,
  ): { enemies: EnemyState[]; hitIds: number[]; cooldownRefunds: Refunds } {
    const primaryIds = new Set(hitIds);
    const primaryHits = enemies.filter((enemy) => primaryIds.has(enemy.id));
    const cooldownRefunds: Refunds = {};
    if (primaryHits.length > 0 && this.effects.arcEveryRounds > 0)
      this.arcCharge += 1 + (critical ? this.effects.criticalChargeBonus : 0);
    const arcIds = new Set<number>();
    if (
      primaryHits.length > 0 &&
      this.effects.arcEveryRounds > 0 &&
      this.arcCharge >= this.effects.arcEveryRounds
    ) {
      this.arcCharge = 0;
      let anchors = primaryHits;
      for (let hop = 0; hop < this.effects.arcTargets; hop++) {
        let next: EnemyState | undefined;
        let nearest = this.effects.arcRadius;
        for (const enemy of enemies) {
          if (enemy.hp <= 0 || primaryIds.has(enemy.id) || arcIds.has(enemy.id))
            continue;
          const point = combatPosition(enemy);
          const gap = Math.min(
            ...anchors.map((anchor) => {
              const start = combatPosition(anchor);
              return Math.hypot(start.x - point.x, start.y - point.y);
            }),
          );
          if (
            gap < nearest ||
            (gap === nearest && (!next || enemy.id < next.id))
          ) {
            nearest = gap;
            next = enemy;
          }
        }
        if (!next) break;
        arcIds.add(next.id);
        anchors = [next];
      }
      if (arcIds.size > 0 && this.effects.arcRefundMs > 0) {
        cooldownRefunds["frost-nova"] = this.effects.arcRefundMs;
        cooldownRefunds["chain-lightning"] = this.effects.arcRefundMs;
      }
    }
    return {
      enemies: enemies.map((enemy) =>
        arcIds.has(enemy.id)
          ? applyEffectDamage(enemy, this.effects.arcDamage)
          : enemy,
      ),
      hitIds: [...arcIds],
      cooldownRefunds,
    };
  }
}
