import { combatPosition } from "../battlefield/combatGeometry";
import { relicBalance, type RelicLevels } from "../data/relics";
import { relicEffects } from "../progression/relics";
import type { EnemyState } from "../enemies/enemySimulation";
import type { MagicId } from "./magic";

export class RelicCombat {
  private effects = relicEffects({});
  private empoweredRounds = 0;
  private arcCharge = 0;
  private previousMagic: MagicId | undefined;

  setLevels(levels: RelicLevels): void {
    this.effects = relicEffects(levels);
  }

  get primaryModifiers(): {
    shieldBypass: number;
    shieldDamageMultiplier: number;
  } {
    return {
      shieldBypass: this.empoweredRounds > 0 ? 1 : 0,
      shieldDamageMultiplier:
        this.empoweredRounds > 0 ? this.effects.shieldDamageMultiplier : 1,
    };
  }

  primaryModifiersFor(wallRatio: number, boost: boolean) {
    return {
      ...this.primaryModifiers,
      damageMultiplier:
        1 +
        (wallRatio <= relicBalance.lowWallRatio
          ? this.effects.lowWallDamageBonus
          : 0) +
        (boost ? this.effects.boostDamageBonus : 0),
    };
  }

  // Only successful casts trigger relic effects; cooldown-blocked input never calls this.
  onMagic(
    id: MagicId,
    wallRatio = 1,
  ): {
    wallHealing: number;
    cooldownRefunds: Partial<Record<MagicId, number>>;
  } {
    this.empoweredRounds = this.effects.empoweredRounds;
    if (id === "chain-lightning" && this.effects.lightningReadiesArc) {
      this.arcCharge = this.effects.arcEveryRounds;
    }
    const cooldownRefunds: Partial<Record<MagicId, number>> = {};
    const alternating =
      this.previousMagic !== undefined && this.previousMagic !== id;
    if (alternating && this.effects.alternatingRefundMs > 0) {
      cooldownRefunds[this.previousMagic!] = this.effects.alternatingRefundMs;
    }
    this.previousMagic = id;
    return {
      wallHealing:
        this.effects.wallHealing +
        (wallRatio <= relicBalance.lowWallRatio
          ? this.effects.lowWallHealing
          : 0) +
        (alternating ? this.effects.alternatingHealing : 0),
      cooldownRefunds,
    };
  }

  // Called only after the normal Stim system accepts activation.
  onStim(): {
    wallCost: number;
    cooldownRefunds: Partial<Record<MagicId, number>>;
  } {
    return {
      wallCost: this.effects.stimWallCost,
      cooldownRefunds:
        this.effects.stimRefundMs > 0
          ? {
              "frost-nova": this.effects.stimRefundMs,
              "chain-lightning": this.effects.stimRefundMs,
            }
          : {},
    };
  }

  // A kill transaction calls this once; returned effects never create new kills.
  onKills(
    kills: number,
    context: { frost: boolean; boost: boolean; magic: boolean },
  ): {
    wallHealing: number;
    cooldownRefunds: Partial<Record<MagicId, number>>;
    xpMultiplier: number;
  } {
    const count = Number.isFinite(kills) ? Math.max(0, Math.floor(kills)) : 0;
    const refund = context.frost
      ? Math.min(
          this.effects.frostKillRefundCapMs,
          count * this.effects.frostKillRefundMs,
        )
      : 0;
    return {
      wallHealing: context.boost ? count * this.effects.boostKillHealing : 0,
      cooldownRefunds: refund > 0 ? { "frost-nova": refund } : {},
      xpMultiplier: context.magic ? this.effects.magicKillXpMultiplier : 1,
    };
  }

  // Call once per fired primary round, after its damage but before removing dead enemies.
  // Arc damage is returned once and never re-enters this method.
  afterPrimary(
    enemies: readonly EnemyState[],
    hitIds: readonly number[],
    critical: boolean,
  ): {
    enemies: EnemyState[];
    hitIds: number[];
    cooldownRefunds: Partial<Record<MagicId, number>>;
  } {
    this.empoweredRounds = Math.max(0, this.empoweredRounds - 1);
    const primaryIds = new Set(hitIds);
    const primaryHits = enemies.filter((enemy) => primaryIds.has(enemy.id));
    const cooldownRefunds: Partial<Record<MagicId, number>> = {};
    const shieldRefund = Math.min(
      this.effects.shieldRefundCapMs,
      primaryHits.filter((enemy) => enemy.kind === "shield").length *
        this.effects.shieldHitRefundMs,
    );
    if (shieldRefund > 0) cooldownRefunds["chain-lightning"] = shieldRefund;
    if (primaryHits.length > 0 && this.effects.arcEveryRounds > 0) {
      this.arcCharge += 1 + (critical ? this.effects.criticalChargeBonus : 0);
    }
    const arcIds = new Set<number>();
    if (
      primaryHits.length > 0 &&
      this.effects.arcEveryRounds > 0 &&
      this.arcCharge >= this.effects.arcEveryRounds
    ) {
      this.arcCharge = 0;
      let anchors = primaryHits;
      // The capped horde needs only one nearest-neighbor scan per arc hop.
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
        cooldownRefunds["chain-lightning"] =
          (cooldownRefunds["chain-lightning"] ?? 0) + this.effects.arcRefundMs;
      }
    }
    return {
      enemies: enemies.map((enemy) =>
        arcIds.has(enemy.id)
          ? { ...enemy, hp: Math.max(0, enemy.hp - this.effects.arcDamage) }
          : enemy,
      ),
      hitIds: [...arcIds],
      cooldownRefunds,
    };
  }
}
