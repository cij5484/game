import type { EnemyState } from "../enemies/enemySimulation";
import { eliteBalance } from "../data/elite";

/** Primary hits drain the physical shield first; excess damage spills into body HP. */
export function applyPrimaryDamage(
  enemy: EnemyState,
  damage: number,
  shieldBypass = 0,
): EnemyState {
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
  return {
    ...enemy,
    hp: Math.max(
      0,
      enemy.hp - Math.max(0, damage) * (enemy.incomingDamageMultiplier ?? 1),
    ),
  };
}

export function shieldProtection(enemies: readonly EnemyState[]): EnemyState[] {
  const protectedBy = new Map<number, number>();
  const tune = eliteBalance.shield;
  for (const guard of enemies) {
    if (
      !guard.elite ||
      guard.kind !== "shield" ||
      guard.hp <= 0 ||
      (guard.shieldHp ?? 0) <= 0
    )
      continue;
    const behind = enemies
      .filter(
        (e) =>
          !e.elite &&
          e.hp > 0 &&
          e.lane === guard.lane &&
          e.progress01 <= guard.progress01 &&
          guard.progress01 - e.progress01 <= tune.protectionBehind01,
      )
      .sort((a, b) => b.progress01 - a.progress01 || a.id - b.id)
      .slice(0, tune.protectionTargets);
    for (const e of behind)
      if (!protectedBy.has(e.id)) protectedBy.set(e.id, guard.id);
  }
  return enemies.map((e) => ({
    ...e,
    protectedBy: protectedBy.get(e.id),
    incomingDamageMultiplier: protectedBy.has(e.id) ? tune.damageMultiplier : 1,
  }));
}
