import type { EnemyState } from "../enemies/enemySimulation";

export function selectAutoTarget(
  enemies: readonly EnemyState[],
  minProgress01 = 0,
): EnemyState | null {
  let target: EnemyState | null = null;
  for (const enemy of enemies) {
    if (
      enemy.hp > 0 &&
      enemy.progress01 >= minProgress01 &&
      (!target || enemy.progress01 > target.progress01)
    ) {
      target = enemy;
    }
  }
  return target;
}

export function resolveAttackTarget(
  manualTargetId: number | null,
  enemies: readonly EnemyState[],
  minProgress01 = 0,
): EnemyState | null {
  const focused = enemies.find(
    (enemy) => enemy.id === manualTargetId && enemy.hp > 0,
  );
  // A living focus outside range waits instead of silently firing at another enemy.
  if (focused) return focused.progress01 >= minProgress01 ? focused : null;
  return selectAutoTarget(enemies, minProgress01);
}

/** A focus remains until a blank tap, death, or disappearance; no attack state lives here. */
export class TargetFocus {
  private id: number | null = null;
  get targetId() {
    return this.id;
  }
  set(id: number | null) {
    this.id = id;
  }
  resolve(
    enemies: readonly EnemyState[],
    minProgress01 = 0,
  ): EnemyState | null {
    if (this.id !== null && !enemies.some((e) => e.id === this.id && e.hp > 0))
      this.id = null;
    return resolveAttackTarget(this.id, enemies, minProgress01);
  }
}
