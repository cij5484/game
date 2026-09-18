import { applyEffectDamage } from "./damage";
import { burstBalance } from "../data/burst";
import type { EnemyState } from "../enemies/enemySimulation";

/** Hitscan suppression volley; independent of primary upgrades and Shield armor. */
export function suppressiveBarrage(enemies: readonly EnemyState[]) {
  const { targets, damage } = burstBalance.ultimate;
  const hitIds = enemies
    .filter((enemy) => enemy.hp > 0)
    .sort((a, b) => b.progress01 - a.progress01 || a.id - b.id)
    .slice(0, targets)
    .map((enemy) => enemy.id);
  const hits = new Set(hitIds);
  return {
    hitIds,
    enemies: enemies.map((enemy) =>
      hits.has(enemy.id) ? applyEffectDamage(enemy, damage) : enemy,
    ),
  };
}
