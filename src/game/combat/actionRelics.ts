import { highrollBalance, type PrototypeRelicId } from "../data/highroll";
import type { EnemyState } from "../enemies/enemySimulation";

export function startAction(
  owned: ReadonlySet<PrototypeRelicId>,
  random = Math.random,
  options: { basic?: boolean; replicated?: boolean } = {},
) {
  return {
    damageMultiplier:
      owned.has("capacitor") && random() < highrollBalance.overchargeChance
        ? highrollBalance.overchargeMultiplier
        : 1,
    repeat:
      !!options.basic &&
      !options.replicated &&
      owned.has("replicator") &&
      random() < highrollBalance.replicationChance,
  };
}

export const precisionBonus = (owned: ReadonlySet<PrototypeRelicId>) =>
  owned.has("precision") ? highrollBalance.precisionBonus : 0;

export function applyImpact(
  before: readonly EnemyState[],
  after: readonly EnemyState[],
  owned: ReadonlySet<PrototypeRelicId>,
  random = Math.random,
): EnemyState[] {
  if (!owned.has("impact")) return [...after];
  const old = new Map(before.map((enemy) => [enemy.id, enemy]));
  return after.map((enemy) => {
    const previous = old.get(enemy.id);
    if (
      !previous ||
      enemy.hp <= 0 ||
      (enemy.hp >= previous.hp &&
        (enemy.shieldHp ?? 0) >= (previous.shieldHp ?? 0)) ||
      random() >= highrollBalance.impactChance
    )
      return enemy;
    const progress01 = Math.max(
      0,
      enemy.progress01 -
        highrollBalance.impactPush *
          (enemy.elite ? highrollBalance.eliteKnockbackMultiplier : 1),
    );
    return {
      ...enemy,
      progress01,
      phase: progress01 >= 1 ? "attacking" : "moving",
    };
  });
}
