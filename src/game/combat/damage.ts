import { enemyConfigs } from "../data/enemies";
import type { EnemyState } from "../enemies/enemySimulation";

export function applyPrimaryDamage(
  enemy: EnemyState,
  damage: number,
): EnemyState {
  return {
    ...enemy,
    hp: Math.max(
      0,
      enemy.hp -
        Math.max(0, damage) * enemyConfigs[enemy.kind].primaryDamageMultiplier,
    ),
  };
}
