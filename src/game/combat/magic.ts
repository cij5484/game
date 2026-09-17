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

  setUpgrades(ranks: UpgradeRanks): void {
    this.ranks = { ...ranks };
  }

  advance(deltaMs: number): void {
    this.frostMs = Math.max(0, this.frostMs - Math.max(0, deltaMs));
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

  get frostRemainingMs(): number {
    return this.frostMs;
  }

  get movementMultiplier(): number {
    return this.frostMs > 0 ? this.frostSpeed : 1;
  }

  cast(
    id: MagicId,
    enemies: readonly EnemyState[],
  ): { enemies: EnemyState[]; hitIds: number[] } | null {
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
      while (hits.length < config.maxTargets) {
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
    const hitIds = hits.map((enemy) => enemy.id);
    return {
      hitIds,
      enemies: enemies.map((enemy) => {
        if (!hitIds.includes(enemy.id)) return enemy;
        return config.effect === "global-slow"
          ? {
              ...enemy,
              hp: Math.max(0, enemy.hp - bonus("frost-shatter")),
            }
          : {
              ...enemy,
              hp: Math.max(
                0,
                enemy.hp -
                  config.damagePerTarget *
                    (forkIds.includes(enemy.id)
                      ? magicBehaviorBalance.forkDamageFactor
                      : 1),
              ),
            };
      }),
    };
  }
}
