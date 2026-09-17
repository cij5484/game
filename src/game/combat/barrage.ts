import { burstBalance } from "../data/burst";
import type { EnemyState } from "../enemies/enemySimulation";

/** Hitscan suppression volley; independent of primary upgrades and Shield armor. */
export function suppressiveBarrage(
  enemies: readonly EnemyState[],
  score: number,
) {
  const quality = Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0;
  const config = burstBalance.ultimate;
  const count =
    config.minimumTargets + Math.floor(config.bonusTargets * quality);
  const damage = config.minimumDamage + config.bonusDamage * quality;
  const hitIds = enemies
    .filter((enemy) => enemy.hp > 0)
    .sort((a, b) => b.progress01 - a.progress01 || a.id - b.id)
    .slice(0, count)
    .map((enemy) => enemy.id);
  const hits = new Set(hitIds);
  return {
    hitIds,
    enemies: enemies.map((enemy) =>
      hits.has(enemy.id)
        ? { ...enemy, hp: Math.max(0, enemy.hp - damage) }
        : enemy,
    ),
  };
}
