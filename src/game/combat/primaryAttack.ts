import { combatGeometry, combatPosition } from "../battlefield/combatGeometry";
import { primaryAttackBalance } from "../data/primaryAttack";
import { upgrades, type UpgradeRanks } from "../data/upgrades";
import { gaussRifleBalance } from "../data/weapons";
import type { EnemyState } from "../enemies/enemySimulation";
import type { GaussRifleConfig } from "../model/types";
import { applyPrimaryDamage } from "./damage";

export function deriveWeaponConfig(ranks: UpgradeRanks): GaussRifleConfig {
  return {
    ...gaussRifleBalance,
    roundsPerBurst:
      gaussRifleBalance.roundsPerBurst +
      (ranks["extended-burst"] ?? 0) * upgrades["extended-burst"].amount,
    burstRecoveryMs:
      gaussRifleBalance.burstRecoveryMs -
      (ranks["faster-cycle"] ?? 0) * upgrades["faster-cycle"].amount,
  };
}

export function primaryAttack(
  target: EnemyState,
  enemies: readonly EnemyState[],
  ranks: UpgradeRanks,
  baseDamage: number,
): { enemies: EnemyState[]; hitIds: number[]; ricochetIds: number[] } {
  const hits: EnemyState[] = target.hp > 0 ? [target] : [];
  const ricochetIds: number[] = [];
  if (hits.length) {
    const origin = {
      x: combatGeometry.width / 2,
      y: combatGeometry.depth + primaryAttackBalance.marineDepthOffset,
    };
    const aim = combatPosition(target);
    const length = Math.hypot(aim.x - origin.x, aim.y - origin.y);
    const dx = (aim.x - origin.x) / length;
    const dy = (aim.y - origin.y) / length;
    const penetration = (ranks.penetration ?? 0) * upgrades.penetration.amount;
    const candidates = enemies.flatMap((enemy) => {
      if (enemy.hp <= 0 || enemy.id === target.id) return [];
      const point = combatPosition(enemy);
      const x = point.x - origin.x;
      const y = point.y - origin.y;
      const projection = x * dx + y * dy;
      const gap = Math.abs(x * dy - y * dx);
      return projection >= length - 1e-6 &&
        gap <= primaryAttackBalance.penetrationHalfWidth
        ? [{ enemy, projection }]
        : [];
    });
    candidates.sort(
      (a, b) => a.projection - b.projection || a.enemy.id - b.enemy.id,
    );
    hits.push(...candidates.slice(0, penetration).map(({ enemy }) => enemy));

    if ((ranks.ricochet ?? 0) > 0) {
      const last = combatPosition(hits[hits.length - 1]!);
      let nearest: EnemyState | undefined;
      let nearestDistance: number = primaryAttackBalance.ricochetRadius;
      for (const enemy of enemies) {
        if (enemy.hp <= 0 || hits.some((hit) => hit.id === enemy.id)) continue;
        const point = combatPosition(enemy);
        const distance = Math.hypot(point.x - last.x, point.y - last.y);
        if (
          distance < nearestDistance ||
          (distance === nearestDistance && (!nearest || enemy.id < nearest.id))
        ) {
          nearest = enemy;
          nearestDistance = distance;
        }
      }
      if (nearest) {
        hits.push(nearest);
        ricochetIds.push(nearest.id);
      }
    }
  }
  const hitIds = hits.map((enemy) => enemy.id);
  return {
    hitIds,
    ricochetIds,
    enemies: enemies.map((enemy) =>
      hitIds.includes(enemy.id) ? applyPrimaryDamage(enemy, baseDamage) : enemy,
    ),
  };
}
