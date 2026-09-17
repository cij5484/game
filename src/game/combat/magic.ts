import { combatPosition } from "../battlefield/combatGeometry";
import { magicConfigs } from "../data/magic";
import type { EnemyState } from "../enemies/enemySimulation";
import { selectAutoTarget } from "./targeting";

export type MagicId = keyof typeof magicConfigs;

function distance(a: EnemyState, b: EnemyState): number {
  const start = combatPosition(a);
  const end = combatPosition(b);
  return Math.hypot(start.x - end.x, start.y - end.y);
}

export class Magic {
  private cooldowns: Record<MagicId, number> = {
    "frost-nova": 0,
    "chain-lightning": 0,
  };

  advance(deltaMs: number): void {
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

  cast(
    id: MagicId,
    enemies: readonly EnemyState[],
  ): { enemies: EnemyState[]; hitIds: number[] } | null {
    if (this.cooldowns[id] > 0) return null;
    const config = magicConfigs[id];
    this.cooldowns[id] = config.cooldownMs;
    const start = selectAutoTarget(enemies);
    const hits: EnemyState[] = [];
    if (start && config.effect === "freeze") {
      hits.push(
        ...enemies.filter(
          (enemy) => enemy.hp > 0 && distance(start, enemy) <= config.radiusPx,
        ),
      );
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
    const hitIds = hits.map((enemy) => enemy.id);
    return {
      hitIds,
      enemies: enemies.map((enemy) => {
        if (!hitIds.includes(enemy.id)) return enemy;
        return config.effect === "freeze"
          ? {
              ...enemy,
              frozenMs: Math.max(enemy.frozenMs, config.freezeDurationMs),
            }
          : { ...enemy, hp: Math.max(0, enemy.hp - config.damagePerTarget) };
      }),
    };
  }
}
