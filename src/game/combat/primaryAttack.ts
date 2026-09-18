import {
  getMarineStats,
  getMarineTraitEffects,
  getMarineModBranch,
  type MarineGrowthState,
} from "../data/marineGrowth";
import { combatGeometry, combatPosition } from "../battlefield/combatGeometry";
import { primaryAttackBalance } from "../data/primaryAttack";
import { getTraitEffects } from "../data/traits";
import { getGeneralStats, type UpgradeRanks } from "../data/upgrades";
import { applyPrimaryDamage } from "./damage";
import { gaussRifleBalance } from "../data/weapons";
import { evolutionRecipes } from "../data/evolutions";
import { activeSynergies } from "../progression/synergy";
import type { EnemyState } from "../enemies/enemySimulation";
import type { GaussRifleConfig } from "../model/types";
import type { GrowthBranches } from "../data/growth";
import { enemyConfigs } from "../data/enemies";

export function deriveWeaponConfig(ranks: UpgradeRanks): GaussRifleConfig {
  const stats = getGeneralStats(ranks);
  return {
    ...gaussRifleBalance,
    shotIntervalMs:
      gaussRifleBalance.shotIntervalMs / stats.attackSpeedMultiplier,
  };
}

export function primaryAttack(
  target: EnemyState,
  enemies: readonly EnemyState[],
  ranks: UpgradeRanks,
  baseDamage: number,
  relicModifiers: {
    damageMultiplier?: number;
    shieldBypass?: number;
    shieldDamageMultiplier?: number;
  } = {},
  evolutionIds: readonly string[] = [],
  context: {
    growth?: MarineGrowthState;
    minTargetProgress01?: number;
    shotIndex: number;
    random: () => number;
    synergyMultiplier?: number;
    branches?: GrowthBranches;
    activeSynergyIds?: ReadonlySet<string>;
    targetDamageMultiplier?: (targetId: number) => number;
    criticalChanceBonus?: number;
  } = {
    shotIndex: 1,
    random: Math.random,
  },
): {
  enemies: EnemyState[];
  hitIds: number[];
  ricochetIds: number[];
  splashIds: number[];
  shotTargetIds: number[];
  criticalIds: number[];
  explosionIds: number[];
  executionIds: number[];
} {
  const traits = context.growth
    ? getMarineTraitEffects(context.growth)
    : getTraitEffects(ranks, context.branches);
  const stats = context.growth
    ? getMarineStats(context.growth)
    : getGeneralStats(ranks);
  const synergyMultiplier = Math.max(
    1,
    Math.min(2, context.synergyMultiplier ?? 1),
  );
  const synergies = context.growth
    ? []
    : activeSynergies(ranks, context.activeSynergyIds);
  const hasSynergy = (id: string) =>
    synergies.some((synergy) => synergy.id === id);
  const deepBlast = synergies.some((s) => s.effects.pierceExplosion);
  const lethal = synergies.find((s) => s.effects.propagateCritical)?.effects;
  const storm = synergies.find((s) => s.effects.everyRounds)?.effects;
  const stormRound =
    !!storm?.everyRounds &&
    context.shotIndex > 0 &&
    context.shotIndex % storm.everyRounds === 0;
  const evolutions = evolutionRecipes.filter(
    (recipe) => !context.growth && evolutionIds.includes(recipe.id),
  );
  const living = enemies.filter((enemy) => enemy.hp > 0);
  const points = new Map(
    living.map((enemy) => [enemy.id, combatPosition(enemy)]),
  );
  const point = (enemy: EnemyState) => points.get(enemy.id)!;
  const origin = {
    x: combatGeometry.width / 2,
    y: combatGeometry.depth + primaryAttackBalance.marineDepthOffset,
  };
  const direction = (enemy: EnemyState) =>
    Math.atan2(point(enemy).x - origin.x, origin.y - point(enemy).y);
  const nearby = (
    center: EnemyState,
    radius: number,
    excluded = new Set<number>(),
  ) => {
    const p = point(center);
    return living
      .filter((enemy) => enemy.id !== center.id && !excluded.has(enemy.id))
      .map((enemy) => ({
        enemy,
        distance: Math.hypot(point(enemy).x - p.x, point(enemy).y - p.y),
      }))
      .filter((entry) => entry.distance <= radius)
      .sort((a, b) => a.distance - b.distance || a.enemy.id - b.enemy.id)
      .map(({ enemy }) => enemy);
  };
  const roots: EnemyState[] =
    target.hp > 0 && target.progress01 >= (context.minTargetProgress01 ?? 0)
      ? [target]
      : [];
  const focusedMultishot =
    context.growth && getMarineModBranch(context.growth, "multishot") === "b";
  if (roots.length) {
    const angle = direction(target);
    const extra =
      traits.multishotTargets +
      (stormRound ? Math.ceil((storm?.extraRays ?? 0) * synergyMultiplier) : 0);
    const options = living.filter(
      (enemy) =>
        enemy.id !== target.id &&
        enemy.progress01 >= (context.minTargetProgress01 ?? 0) &&
        Math.abs(direction(enemy) - angle) <= traits.multishotSpreadRadians,
    );
    if (focusedMultishot) {
      // Concentrate on at most two close aim lines; remaining rounds can hit them again.
      options.sort(
        (a, b) =>
          Math.abs(direction(a) - angle) - Math.abs(direction(b) - angle) ||
          a.id - b.id,
      );
      const focused = [target, ...options.slice(0, 1)];
      for (let i = 0; i < extra; i++) roots.push(focused[i % focused.length]!);
    }
    // Distinct, spread-out aim rays. Logical angles never depend on screen aspect ratio.
    for (let i = 0; !focusedMultishot && i < extra && options.length; i++) {
      const rayAngle =
        angle +
        traits.multishotSpreadRadians *
          (i % 2 === 0 ? -1 : 1) *
          (1 - Math.floor(i / 2) / Math.max(1, extra));
      options.sort(
        (a, b) =>
          Math.abs(direction(a) - rayAngle) -
            Math.abs(direction(b) - rayAngle) || a.id - b.id,
      );
      roots.push(options.shift()!);
    }
  }
  const claimed = new Set(roots.map((enemy) => enemy.id));
  const hits = new Set<number>();
  const ricochets = new Set<number>();
  const splashes = new Set<number>();
  const criticals = new Set<number>();
  const executions = new Set<number>();
  const explosionCenters = new Set<number>();
  // Reserve the selected roots so a large secondary chain cannot starve its own volley.
  const factors = new Map<number, number>(roots.map((root) => [root.id, 0]));
  let focusedDirectFactors: Map<number, number> | undefined;
  let splashBudget: number = primaryAttackBalance.roundSplashBudget;
  // Merge intersecting effects by strongest damage once per enemy/round.
  const register = (
    enemy: EnemyState,
    factor: number,
    kind: "direct" | "bounce" | "splash",
    critical = false,
    additiveDirect = false,
  ) => {
    if (
      !factors.has(enemy.id) &&
      factors.size >= primaryAttackBalance.roundTargetBudget
    )
      return false;
    if (additiveDirect) {
      focusedDirectFactors ??= new Map();
      factor += focusedDirectFactors.get(enemy.id) ?? 0;
      focusedDirectFactors.set(enemy.id, factor);
    }
    factors.set(enemy.id, Math.max(factors.get(enemy.id) ?? 0, factor));
    if (kind === "splash") splashes.add(enemy.id);
    else hits.add(enemy.id);
    if (kind === "bounce") ricochets.add(enemy.id);
    if (critical) criticals.add(enemy.id);
    return true;
  };
  const splash = (center: EnemyState, radius: number, factor: number) => {
    const impacted: EnemyState[] = [];
    if (radius <= 0 || factor <= 0 || splashBudget <= 0) return impacted;
    splashBudget--;
    explosionCenters.add(center.id);
    for (const enemy of nearby(center, radius).slice(
      0,
      primaryAttackBalance.splashTargetCap,
    )) {
      if (register(enemy, factor, "splash")) impacted.push(enemy);
    }
    return impacted;
  };
  const damageAmount = (enemy: EnemyState, factor: number) => {
    const shieldBonus =
      enemy.kind === "shield"
        ? (relicModifiers.shieldDamageMultiplier ?? 1)
        : 1;
    const amount =
      baseDamage *
      stats.primaryDamageMultiplier *
      (relicModifiers.damageMultiplier ?? 1) *
      (context.targetDamageMultiplier?.(enemy.id) ?? 1) *
      (enemy.elite || enemy.boss
        ? (context.growth?.meta?.eliteBossDamageMultiplier ?? 1)
        : 1) *
      factor *
      shieldBonus;
    return executions.has(enemy.id) ? Math.max(enemy.hp, amount) : amount;
  };
  const explosion = (
    center: EnemyState,
    factor: number,
    radiusMultiplier = 1,
  ) => {
    const impacted = splash(
      center,
      traits.explosionRadius * radiusMultiplier,
      factor * traits.explosionDamageFactor,
    );
    // Secondary explosions have one bounded tier; they cannot trigger each other.
    for (const secondary of impacted
      .filter(
        (enemy) =>
          applyPrimaryDamage(
            enemy,
            damageAmount(enemy, factor * traits.explosionDamageFactor),
            traits.shieldBypass + (relicModifiers.shieldBypass ?? 0),
          ).hp <= 0,
      )
      .slice(0, traits.explosionChainTargets)) {
      splash(
        secondary,
        traits.explosionSecondaryRadius,
        factor * traits.explosionSecondaryDamageFactor,
      );
    }
  };
  const criticalHit = (
    enemy: EnemyState,
    factor: number,
    kind: "direct" | "bounce",
    critical: boolean,
    additiveDirect = false,
  ) => {
    const multiplier = critical ? stats.criticalMultiplier : 1;
    if (!register(enemy, factor * multiplier, kind, critical, additiveDirect))
      return;
    const maximumHp = enemy.maxHp ?? enemyConfigs[enemy.kind].hp;
    if (
      traits.executionThreshold > 0 &&
      enemy.hp <= maximumHp * traits.executionThreshold
    ) {
      executions.add(enemy.id);
      splash(
        enemy,
        traits.executionSplashRadius,
        factor * traits.executionSplashFactor,
      );
    }
    if (executions.has(enemy.id) && hasSynergy("execution-blast")) {
      splash(
        enemy,
        Math.max(traits.explosionRadius, 90) * 1.35,
        factor * 1.8 * synergyMultiplier,
      );
    }
  };
  const pierceCount =
    traits.pierceCount +
    evolutions.reduce(
      (sum, recipe) => sum + recipe.effects.penetrationBonus,
      0,
    );
  const halfWidth =
    primaryAttackBalance.penetrationHalfWidth *
    evolutions.reduce(
      (scale, recipe) => scale * recipe.effects.penetrationWidthMultiplier,
      1,
    );
  const pierceRetention = traits.pierceDamageRetention;
  for (const [rootIndex, root] of roots.entries()) {
    const rootFactor =
      rootIndex === 0
        ? traits.multishotPrimaryFactor
        : rootIndex <= traits.multishotTargets
          ? traits.multishotDamageFactor
          : (storm?.rayDamageFactor ?? 1);
    const critical =
      context.random() <
      Math.min(1, stats.criticalChance + (context.criticalChanceBonus ?? 0));
    criticalHit(root, rootFactor, "direct", critical, focusedMultishot);
    if (hasSynergy("focused-bombardment")) {
      // The central blast reaches a new ring; auxiliary blasts stay deliberately smaller.
      explosion(
        root,
        rootFactor * (root.id === target.id ? 1.5 * synergyMultiplier : 0.75),
        root.id === target.id ? 1.45 : 0.8,
      );
    } else explosion(root, rootFactor);
    const aim = point(root);
    const length = Math.hypot(aim.x - origin.x, aim.y - origin.y);
    const dx = (aim.x - origin.x) / length;
    const dy = (aim.y - origin.y) / length;
    const pierced = living
      .filter((enemy) => !claimed.has(enemy.id))
      .map((enemy) => {
        const x = point(enemy).x - origin.x,
          y = point(enemy).y - origin.y;
        return {
          enemy,
          projection: x * dx + y * dy,
          gap: Math.abs(x * dy - y * dx),
        };
      })
      .filter(
        ({ projection, gap }) =>
          projection >= length - 1e-6 && gap <= halfWidth,
      )
      .sort((a, b) => a.projection - b.projection || a.enemy.id - b.enemy.id)
      .slice(0, pierceCount)
      .map(({ enemy }) => enemy);
    for (const enemy of pierced) {
      claimed.add(enemy.id);
      criticalHit(enemy, rootFactor * pierceRetention, "direct", critical);
      if (context.growth || deepBlast)
        explosion(
          enemy,
          rootFactor * pierceRetention * (deepBlast ? synergyMultiplier : 1),
        );
    }
    let last = pierced.at(-1) ?? root;
    if (pierced.length)
      splash(
        last,
        traits.pierceShockwaveRadius,
        rootFactor * traits.pierceShockwaveFactor,
      );
    const bounceCount =
      traits.bounceCount +
      (critical
        ? Math.ceil((lethal?.criticalBounceBonus ?? 0) * synergyMultiplier)
        : 0);
    let didBounce = false;
    for (let i = 0; i < bounceCount; i++) {
      const next = nearby(
        last,
        primaryAttackBalance.ricochetRadius + traits.bounceRadiusBonus,
        claimed,
      )[0];
      if (!next) break;
      claimed.add(next.id);
      criticalHit(
        next,
        rootFactor *
          (traits.bounceDamageRetention + i * traits.bounceDamageGrowth),
        "bounce",
        critical && !!lethal?.propagateCritical,
      );
      if (context.growth)
        explosion(
          next,
          rootFactor *
            (traits.bounceDamageRetention + i * traits.bounceDamageGrowth),
        );
      last = next;
      didBounce = true;
    }
    if (didBounce) {
      splash(
        last,
        traits.bounceImpactRadius,
        rootFactor * traits.bounceImpactFactor,
      );
      const forkCount = traits.bounceForkTargets;
      const forkFactor = traits.bounceForkDamageFactor;
      for (const fork of nearby(
        last,
        primaryAttackBalance.ricochetRadius + traits.bounceRadiusBonus,
        claimed,
      ).slice(0, forkCount)) {
        claimed.add(fork.id);
        criticalHit(
          fork,
          rootFactor * forkFactor,
          "bounce",
          critical && !!lethal?.propagateCritical,
        );
      }
    }
  }
  let chainBudget = traits.executionChainTargets;
  const directExecutions = [...executions];
  for (const id of directExecutions) {
    if (chainBudget <= 0) break;
    const center = living.find((enemy) => enemy.id === id)!;
    for (const candidate of nearby(center, traits.executionSplashRadius)) {
      if (chainBudget <= 0) break;
      if (executions.has(candidate.id)) continue;
      const maximumHp = candidate.maxHp ?? enemyConfigs[candidate.kind].hp;
      const factor = factors.get(candidate.id) ?? 0;
      const remainingHp = applyPrimaryDamage(
        candidate,
        damageAmount(candidate, factor),
        traits.shieldBypass + (relicModifiers.shieldBypass ?? 0),
      ).hp;
      if (
        remainingHp <= 0 ||
        remainingHp > maximumHp * traits.executionThreshold
      )
        continue;
      if (register(candidate, factor, "splash")) {
        executions.add(candidate.id);
        chainBudget--;
      }
    }
  }
  const damage = (enemy: EnemyState, factor: number): EnemyState =>
    applyPrimaryDamage(
      enemy,
      damageAmount(enemy, factor),
      traits.shieldBypass + (relicModifiers.shieldBypass ?? 0),
    );
  const result = enemies.map((enemy) =>
    factors.has(enemy.id) ? damage(enemy, factors.get(enemy.id)!) : enemy,
  );
  return {
    enemies: result,
    executionIds: [...executions],
    hitIds: [...hits],
    ricochetIds: [...ricochets],
    splashIds: [...splashes].filter((id) => !hits.has(id)),
    shotTargetIds: roots.map((enemy) => enemy.id),
    criticalIds: [...criticals],
    explosionIds: [...explosionCenters],
  };
}
