import type { EnemyState } from "../enemies/enemySimulation";
import { eliteBalance } from "../data/elite";
import { applyBossDamage } from "../enemies/siegeBoss";

/** Primary hits drain the physical shield first; excess damage spills into body HP. */
export function applyPrimaryDamage(
  enemy: EnemyState,
  damage: number,
  shieldBypass = 0,
): EnemyState {
  if (enemy.boss) return applyBossDamage(enemy, damage);
  const amount = Math.max(0, damage) * (enemy.incomingDamageMultiplier ?? 1);
  const bypass = Math.max(0, Math.min(1, shieldBypass));
  const shieldDamage = Math.min(enemy.shieldHp ?? 0, amount * (1 - bypass));
  return {
    ...enemy,
    ...(enemy.shieldHp !== undefined
      ? { shieldHp: Math.max(0, enemy.shieldHp - shieldDamage) }
      : {}),
    hp: Math.max(0, enemy.hp - (amount - shieldDamage)),
  };
}

/** Legacy non-primary effects bypass personal shields, but not the bounded protection aura. */
export function applyEffectDamage(
  enemy: EnemyState,
  damage: number,
): EnemyState {
  if (enemy.boss) return applyBossDamage(enemy, damage);
  return {
    ...enemy,
    hp: Math.max(
      0,
      enemy.hp - Math.max(0, damage) * (enemy.incomingDamageMultiplier ?? 1),
    ),
  };
}

export function shieldProtection(
  enemies: readonly EnemyState[],
): readonly EnemyState[] {
  const tune = eliteBalance.shield;
  const guards = enemies.filter(
    (e) => e.elite && e.kind === "shield" && e.hp > 0 && (e.shieldHp ?? 0) > 0,
  );
  let protectedBy: Map<number, number> | undefined;
  if (guards.length) {
    protectedBy = new Map();
    const lanes: Record<EnemyState["lane"], EnemyState[]> = {
      left: [],
      center: [],
      right: [],
    };
    for (const enemy of enemies)
      if (!enemy.elite && !enemy.boss && enemy.hp > 0)
        lanes[enemy.lane].push(enemy);
    for (const lane of Object.values(lanes))
      lane.sort((a, b) => b.progress01 - a.progress01 || a.id - b.id);
    // Preserve guard order, nearest-behind priority, tie breaks and each guard's target budget.
    for (const guard of guards) {
      let count = 0;
      for (const enemy of lanes[guard.lane]) {
        if (enemy.progress01 > guard.progress01) continue;
        if (
          guard.progress01 - enemy.progress01 > tune.protectionBehind01 ||
          count >= tune.protectionTargets
        )
          break;
        if (!protectedBy.has(enemy.id)) protectedBy.set(enemy.id, guard.id);
        count++;
      }
    }
  }
  let result: EnemyState[] | undefined;
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i]!;
    const guard = protectedBy?.get(enemy.id);
    const multiplier = guard === undefined ? 1 : tune.damageMultiplier;
    if (
      enemy.protectedBy === guard &&
      enemy.incomingDamageMultiplier === multiplier
    )
      continue;
    result ??= [...enemies];
    result[i] = {
      ...enemy,
      protectedBy: guard,
      incomingDamageMultiplier: multiplier,
    };
  }
  return result ?? enemies;
}
