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

/** A focus remains until a blank tap, death, or disappearance; no attack state lives here. */
export class TargetFocus {
  private id: number | null = null;
  get targetId() {
    return this.id;
  }
  set(id: number | null) {
    this.id = id;
  }
  resolve(enemies: readonly EnemyState[]): EnemyState | null {
    if (this.id !== null && !enemies.some((e) => e.id === this.id && e.hp > 0))
      this.id = null;
    return resolveAttackTarget(this.id, enemies);
  }
}
