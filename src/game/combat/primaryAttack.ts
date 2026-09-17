import { combatGeometry, combatPosition } from "../battlefield/combatGeometry";
import { primaryAttackBalance } from "../data/primaryAttack";
import { upgrades, type UpgradeRanks } from "../data/upgrades";
import { gaussRifleBalance } from "../data/weapons";
import { evolutionRecipes } from "../data/evolutions";
import type { ModuleLevels } from "../data/modules";
import { moduleEffects } from "../progression/modules";
import type { EnemyState } from "../enemies/enemySimulation";
import type { GaussRifleConfig } from "../model/types";
import { enemyConfigs } from "../data/enemies";
import { applyPrimaryDamage } from "./damage";

export function deriveWeaponConfig(ranks: UpgradeRanks): GaussRifleConfig {
  return {
    ...gaussRifleBalance,
    roundsPerBurst:
      gaussRifleBalance.roundsPerBurst +
      (ranks["extended-burst"] ?? 0) * upgrades["extended-burst"].amount,
    roundIntervalMs:
      gaussRifleBalance.roundIntervalMs -
      (ranks["round-interval"] ?? 0) * upgrades["round-interval"].amount,
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
  moduleLevels: ModuleLevels = {},
  evolutionIds: readonly string[] = [],
  frostActive = false,
): {
  enemies: EnemyState[];
  hitIds: number[];
  ricochetIds: number[];
  splashIds: number[];
} {
  const bonus = (id: keyof UpgradeRanks) =>
    (ranks[id] ?? 0) * upgrades[id].amount;
  const modules = moduleEffects(moduleLevels);
  const evolutions = evolutionRecipes.filter((recipe) =>
    evolutionIds.includes(recipe.id),
  );
  const hits: EnemyState[] = target.hp > 0 ? [target] : [];
  const ricochetIds: number[] = [];
  const splashIds: number[] = [];
  const forkIds: number[] = [];
  const shockwaveRadius = Math.max(
    modules.aftershockRadius,
    bonus("siege-lance") > 0
      ? primaryAttackBalance.legendaryShockwaveRadius
      : 0,
  );
  const shockwaveDamage = Math.max(
    modules.aftershockDamageFactor,
    bonus("siege-lance") > 0
      ? primaryAttackBalance.legendaryShockwaveDamageFactor
      : 0,
  );
  if (hits.length) {
    const origin = {
      x: combatGeometry.width / 2,
      y: combatGeometry.depth + primaryAttackBalance.marineDepthOffset,
    };
    const aim = combatPosition(target);
    const length = Math.hypot(aim.x - origin.x, aim.y - origin.y);
    const dx = (aim.x - origin.x) / length;
    const dy = (aim.y - origin.y) / length;
    const penetration =
      (ranks.penetration ?? 0) * upgrades.penetration.amount +
      modules.penetrationBonus +
      evolutions.reduce(
        (sum, recipe) => sum + recipe.effects.penetrationBonus,
        0,
      );
    const halfWidth =
      (primaryAttackBalance.penetrationHalfWidth + modules.widthBonus) *
      evolutions.reduce(
        (scale, recipe) => scale * recipe.effects.penetrationWidthMultiplier,
        1,
      );
    const candidates = enemies.flatMap((enemy) => {
      if (enemy.hp <= 0 || enemy.id === target.id) return [];
      const point = combatPosition(enemy);
      const x = point.x - origin.x;
      const y = point.y - origin.y;
      const projection = x * dx + y * dy;
      const gap = Math.abs(x * dy - y * dx);
      return projection >= length - 1e-6 && gap <= halfWidth
        ? [{ enemy, projection }]
        : [];
    });
    candidates.sort(
      (a, b) => a.projection - b.projection || a.enemy.id - b.enemy.id,
    );
    hits.push(...candidates.slice(0, penetration).map(({ enemy }) => enemy));

    const lastPierced = hits.length > 1 ? hits[hits.length - 1] : undefined;
    const bounces =
      bonus("ricochet") +
      modules.extraRicochet +
      (frostActive ? bonus("frozen-ricochet") : 0);
    for (let bounce = 0; bounce < bounces; bounce++) {
      const last = combatPosition(hits[hits.length - 1]!);
      let nearest: EnemyState | undefined;
      let nearestDistance: number =
        primaryAttackBalance.ricochetRadius +
        modules.ricochetRadiusBonus +
        bonus("bounce-radius");
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
    // A single fork from the final ordinary bounce; fork targets never fork again.
    if (ricochetIds.length > 0 && bonus("ricochet-cascade") > 0) {
      const center = combatPosition(hits[hits.length - 1]!);
      const fork = enemies
        .filter(
          (enemy) => enemy.hp > 0 && !hits.some((hit) => hit.id === enemy.id),
        )
        .map((enemy) => ({
          enemy,
          distance: Math.hypot(
            combatPosition(enemy).x - center.x,
            combatPosition(enemy).y - center.y,
          ),
        }))
        .filter(
          (entry) => entry.distance <= primaryAttackBalance.legendaryForkRadius,
        )
        .sort((a, b) => a.distance - b.distance || a.enemy.id - b.enemy.id)
        .slice(0, bonus("ricochet-cascade"));
      for (const { enemy } of fork) {
        hits.push(enemy);
        ricochetIds.push(enemy.id);
        forkIds.push(enemy.id);
      }
    }
    if (lastPierced && shockwaveRadius > 0) {
      const center = combatPosition(lastPierced);
      for (const enemy of enemies) {
        if (enemy.hp <= 0 || hits.some((hit) => hit.id === enemy.id)) continue;
        const point = combatPosition(enemy);
        if (
          Math.hypot(point.x - center.x, point.y - center.y) <= shockwaveRadius
        ) {
          splashIds.push(enemy.id);
        }
      }
    }
  }
  const hitIds = hits.map((enemy) => enemy.id);
  const pierceFactor = Math.min(
    1,
    Math.max(
      primaryAttackBalance.pierceRetention + bonus("pierce-retention"),
      bonus("siege-lance") > 0
        ? primaryAttackBalance.legendaryPierceRetention
        : 0,
    ),
  );
  const bounceFactor = Math.min(
    1,
    primaryAttackBalance.bounceRetention + bonus("bounce-retention"),
  );
  const damage = (enemy: EnemyState, factor: number) => {
    const armor = enemyConfigs[enemy.kind].primaryDamageMultiplier;
    const armorBonus = Math.min(1, bonus("armor-piercing"));
    return applyPrimaryDamage(
      enemy,
      (baseDamage * factor * (armor + (1 - armor) * armorBonus)) / armor,
    );
  };
  const result = enemies.map((enemy) =>
    hitIds.includes(enemy.id)
      ? damage(
          enemy,
          enemy.id === target.id
            ? 1
            : forkIds.includes(enemy.id)
              ? primaryAttackBalance.legendaryForkDamageFactor
              : ricochetIds.includes(enemy.id)
                ? bounceFactor
                : pierceFactor,
        )
      : splashIds.includes(enemy.id)
        ? damage(enemy, shockwaveDamage)
        : enemy,
  );
  // A kill can relay once per round; relay kills never recursively trigger it.
  if (bonus("rapid-relay") > 0 || bonus("rapid-overdrive") > 0) {
    const killed = result.find(
      (enemy) => enemy.hp <= 0 && hitIds.includes(enemy.id),
    );
    if (killed) {
      const point = combatPosition(killed);
      const relays = result
        .filter(
          (enemy) =>
            enemy.hp > 0 &&
            !hitIds.includes(enemy.id) &&
            !splashIds.includes(enemy.id),
        )
        .map((enemy) => ({
          enemy,
          distance: Math.hypot(
            combatPosition(enemy).x - point.x,
            combatPosition(enemy).y - point.y,
          ),
        }))
        .filter((entry) => entry.distance <= primaryAttackBalance.relayRadius)
        .sort((a, b) => a.distance - b.distance || a.enemy.id - b.enemy.id)
        .slice(0, bonus("rapid-overdrive") || 1);
      for (const relay of relays) {
        const index = result.findIndex((enemy) => enemy.id === relay.enemy.id);
        result[index] = damage(
          relay.enemy,
          bonus("rapid-overdrive") > 0
            ? primaryAttackBalance.legendaryRelayDamageFactor
            : bonus("rapid-relay"),
        );
        hitIds.push(relay.enemy.id);
        ricochetIds.push(relay.enemy.id);
      }
    }
  }
  return { hitIds, ricochetIds, splashIds, enemies: result };
}
