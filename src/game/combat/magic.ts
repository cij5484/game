import { activeSynergies } from "../progression/synergy";
import { combatPosition } from "../battlefield/combatGeometry";
import { magicConfigs, magicBehaviorBalance } from "../data/magic";
import { upgrades, type UpgradeRanks } from "../data/upgrades";
import type { EnemyState } from "../enemies/enemySimulation";
import { selectAutoTarget } from "./targeting";

export type MagicId = keyof typeof magicConfigs;

function distance(a: EnemyState, b: EnemyState): number {
  const start = combatPosition(a);
  const end = combatPosition(b);
  return Math.hypot(start.x - end.x, start.y - end.y);
}

export class Magic {
  private ranks: UpgradeRanks = {};
  private frostMs = 0;
  private frostSpeed = 1;
  private cooldowns: Record<MagicId, number> = {
    "frost-nova": 0,
    "chain-lightning": 0,
  };
  private cooldownTotals: Record<MagicId, number> = {
    "frost-nova": magicConfigs["frost-nova"].cooldownMs,
    "chain-lightning": magicConfigs["chain-lightning"].cooldownMs,
  };
  private coolingWindowMs = 0;
  private synergyMultiplier = 1;

  setSynergyMultiplier(value: number): void {
    this.synergyMultiplier = Math.max(1, Math.min(2, value));
  }

  private bonus(id: keyof UpgradeRanks): number {
    return (this.ranks[id] ?? 0) * upgrades[id].amount;
  }

  readyProgress(id: MagicId): number {
    return 1 - this.remaining(id) / this.cooldownTotals[id];
  }

  get primaryDamageMultiplier(): number {
    return (
      (this.frostMs > 0 ? 1 + this.bonus("frost-vulnerability") : 1) *
      (this.coolingWindowMs > 0 ? 1 + 0.25 * this.synergyMultiplier : 1)
    );
  }

  afterDeaths(enemies: readonly EnemyState[], killedIds: readonly number[]) {
    const damage = this.bonus("frost-deathburst");
    const centers =
      this.frostMs > 0 && damage > 0
        ? enemies
            .filter((e) => killedIds.includes(e.id))
            .slice(0, magicBehaviorBalance.maxFrostDeathCenters)
        : [];
    const hitIds: number[] = [];
    // One tier only: secondary kills never recursively trigger more frost bursts.
    return {
      centerIds: centers.map((e) => e.id),
      hitIds,
      enemies: enemies.map((enemy) => {
        if (
          enemy.hp <= 0 ||
          !centers.some(
            (center) =>
              distance(center, enemy) <= magicBehaviorBalance.frostDeathRadius,
          )
        )
          return enemy;
        hitIds.push(enemy.id);
        return { ...enemy, hp: Math.max(0, enemy.hp - damage) };
      }),
    };
  }

  setUpgrades(ranks: UpgradeRanks): void {
    this.ranks = { ...ranks };
  }

  advance(deltaMs: number): void {
    this.frostMs = Math.max(0, this.frostMs - Math.max(0, deltaMs));
    this.coolingWindowMs = Math.max(
      0,
      this.coolingWindowMs - Math.max(0, deltaMs),
    );
    for (const id of Object.keys(this.cooldowns) as MagicId[]) {
      this.cooldowns[id] = Math.max(
        0,
        this.cooldowns[id] - Math.max(0, deltaMs),
      );
    }
  }

  remaining(id: MagicId): number {
    return this.cooldowns[id];
  }

  refundCooldowns(refunds: Partial<Record<MagicId, number>>): void {
    for (const id of Object.keys(this.cooldowns) as MagicId[]) {
      this.cooldowns[id] = Math.max(
        0,
        this.cooldowns[id] - Math.max(0, refunds[id] ?? 0),
      );
    }
  }

  get frostRemainingMs(): number {
    return this.frostMs;
  }

  get movementMultiplier(): number {
    return this.frostMs > 0 ? this.frostSpeed : 1;
  }

  cast(
    id: MagicId,
    enemies: readonly EnemyState[],
  ): {
    enemies: EnemyState[];
    hitIds: number[];
    strikeIds: number[];
    thermalShockIds: number[];
    heatCooling: number;
  } | null {
    if (this.cooldowns[id] > 0) return null;
    const base = magicConfigs[id];
    const bonus = (upgrade: keyof UpgradeRanks) =>
      (this.ranks[upgrade] ?? 0) * upgrades[upgrade].amount;
    const config =
      base.effect === "global-slow"
        ? {
            ...base,
            durationMs: base.durationMs + bonus("frost-duration"),
            moveSpeedMultiplier: Math.max(
              magicBehaviorBalance.minimumFrostMoveSpeedMultiplier,
              base.moveSpeedMultiplier - bonus("frost-strength"),
            ),
          }
        : {
            ...base,
            maxTargets: base.maxTargets + bonus("chain-targets"),
            damagePerTarget: base.damagePerTarget + bonus("chain-damage"),
            chainRadiusPx: base.chainRadiusPx + bonus("chain-radius"),
          };
    this.cooldowns[id] = config.cooldownMs;
    this.cooldownTotals[id] = this.cooldowns[id];
    const synergies = activeSynergies(this.ranks);
    const thermal =
      id === "frost-nova"
        ? synergies.find((s) => s.id === "thermal-shock")?.effects
        : undefined;
    const cooling =
      id === "frost-nova"
        ? synergies.find((s) => s.id === "cryo-cooling")?.effects
        : undefined;
    const thermalShockIds = thermal
      ? enemies
          .filter((e) => e.hp > 0 && e.burn && e.burn.remainingMs > 0)
          .sort((a, b) => b.progress01 - a.progress01 || a.id - b.id)
          .slice(0, thermal.thermalShockTargets)
          .map((e) => e.id)
      : [];
    const heatCooling = (cooling?.coolingAmount ?? 0) * this.synergyMultiplier;
    if (cooling)
      this.coolingWindowMs =
        (cooling.coolingWindowMs ?? 0) * this.synergyMultiplier;
    const start = selectAutoTarget(enemies);
    const hits: EnemyState[] = [];
    const forkIds: number[] = [];
    if (config.effect === "global-slow") {
      this.frostMs = config.durationMs;
      this.frostSpeed = config.moveSpeedMultiplier;
      hits.push(...enemies.filter((enemy) => enemy.hp > 0));
    } else if (start && config.effect === "chain-damage") {
      hits.push(start);
      // ponytail: linear scan per hop suits the capped horde; spatial index only if counts grow.
      let killBonus =
        start.hp <= config.damagePerTarget ? bonus("chain-killchain") : 0;
      while (
        hits.length <
        config.maxTargets +
          Math.min(magicBehaviorBalance.maxKillChainBonus, killBonus)
      ) {
        const previous = hits[hits.length - 1]!;
        let next: EnemyState | null = null;
        let nearest: number = config.chainRadiusPx;
        for (const enemy of enemies) {
          if (enemy.hp <= 0 || hits.some((hit) => hit.id === enemy.id))
            continue;
          const gap = distance(previous, enemy);
          if (gap <= nearest) {
            next = enemy;
            nearest = gap;
          }
        }
        if (!next) break;
        hits.push(next);
        if (next.hp <= config.damagePerTarget)
          killBonus += bonus("chain-killchain");
      }
    }
    if (config.effect === "chain-damage" && bonus("storm-fork") > 0) {
      const anchors = [...hits];
      const forks = enemies
        .filter(
          (enemy) => enemy.hp > 0 && !hits.some((hit) => hit.id === enemy.id),
        )
        .map((enemy) => ({
          enemy,
          gap: Math.min(...anchors.map((anchor) => distance(anchor, enemy))),
        }))
        .filter((entry) => entry.gap <= config.chainRadiusPx)
        .sort((a, b) => a.gap - b.gap || a.enemy.id - b.enemy.id)
        .slice(0, bonus("storm-fork"));
      for (const { enemy } of forks) {
        hits.push(enemy);
        forkIds.push(enemy.id);
      }
    }
    const strikeCenters =
      config.effect === "chain-damage" && bonus("chain-strike") > 0
        ? hits.filter(
            (_, index) =>
              (index + 1) % magicBehaviorBalance.strikeEveryHits === 0,
          )
        : [];
    const strikeIds = strikeCenters.map((e) => e.id);
    const hitIds = hits.map((enemy) => enemy.id);
    const strikeVictims = enemies.filter(
      (e) =>
        e.hp > 0 &&
        !hitIds.includes(e.id) &&
        strikeCenters.some(
          (center) => distance(center, e) <= magicBehaviorBalance.strikeRadius,
        ),
    );
    hitIds.push(...strikeVictims.map((e) => e.id));
    return {
      hitIds,
      strikeIds,
      thermalShockIds,
      heatCooling,
      enemies: enemies.map((enemy) => {
        if (!hitIds.includes(enemy.id)) return enemy;
        return config.effect === "global-slow"
          ? {
              ...enemy,
              hp: Math.max(
                0,
                enemy.hp -
                  bonus("frost-shatter") -
                  (thermalShockIds.includes(enemy.id)
                    ? ((enemy.burn!.dps * enemy.burn!.remainingMs) / 1000) *
                      (thermal?.thermalShockFactor ?? 0) *
                      this.synergyMultiplier
                    : 0),
              ),
            }
          : {
              ...enemy,
              hp: Math.max(
                0,
                enemy.hp -
                  config.damagePerTarget *
                    (strikeVictims.some((e) => e.id === enemy.id)
                      ? bonus("chain-strike")
                      : forkIds.includes(enemy.id)
                        ? magicBehaviorBalance.forkDamageFactor
                        : 1),
              ),
            };
      }),
    };
  }
}
