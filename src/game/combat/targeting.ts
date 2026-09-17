import type { EnemyState } from "../enemies/enemySimulation";

export function selectAutoTarget(
  enemies: readonly EnemyState[],
): EnemyState | null {
  let target: EnemyState | null = null;
  for (const enemy of enemies) {
    if (enemy.hp > 0 && (!target || enemy.progress01 > target.progress01)) {
      target = enemy;
    }
  }
  return target;
}

export function resolveAttackTarget(
  manualTargetId: number | null,
  enemies: readonly EnemyState[],
): EnemyState | null {
  return (
    enemies.find((enemy) => enemy.id === manualTargetId && enemy.hp > 0) ??
    selectAutoTarget(enemies)
  );
}
