import { combatGeometry, combatPosition } from "../battlefield/combatGeometry";
import { primaryAttackBalance } from "../data/primaryAttack";
import { getTraitEffects } from "../data/traits";
import { getGeneralStats, type UpgradeRanks } from "../data/upgrades";
import { eliteBalance } from "../data/elite";
import { gaussRifleBalance } from "../data/weapons";
import { evolutionRecipes } from "../data/evolutions";
import { activeSynergies } from "../progression/synergy";
import type { EnemyState } from "../enemies/enemySimulation";
import type { GaussRifleConfig } from "../model/types";
import { applyBurn, applySuppression, traitCombatBalance } from "./traitCombat";
import { enemyConfigs } from "../data/enemies";

export function deriveWeaponConfig(ranks: UpgradeRanks): GaussRifleConfig {
  const stats = getGeneralStats(ranks);
  return {
    ...gaussRifleBalance,
    roundIntervalMs:
      gaussRifleBalance.roundIntervalMs / stats.attackSpeedMultiplier,
    burstRecoveryMs:
      gaussRifleBalance.burstRecoveryMs / stats.attackSpeedMultiplier,
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
    shotIndex: number;
    random: () => number;
    synergyMultiplier?: number;
    heatRatio?: number;
    /** Echoes inherit mark benefits without changing the player's focus streak. */
    isEcho?: boolean;
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
  burnIds: number[];
  markIds: number[];
  suppressionIds: number[];
  executionIds: number[];
} {
  const traits = getTraitEffects(ranks);
  const stats = getGeneralStats(ranks);
  const synergyMultiplier = Math.max(
    1,
    Math.min(2, context.synergyMultiplier ?? 1),
  );
  const synergies = activeSynergies(ranks);
  const hasSynergy = (id: string) =>
    synergies.some((synergy) => synergy.id === id);
  const heatBarrage =
    hasSynergy("heat-barrage") &&
    (context.heatRatio ?? 0) >= traitCombatBalance.highHeatRatio;
  const deepBlast = synergies.some((s) => s.effects.pierceExplosion);
  const lethal = synergies.find((s) => s.effects.propagateCritical)?.effects;
  const storm = synergies.find((s) => s.effects.everyRounds)?.effects;
  const stormRound =
    !!storm?.everyRounds &&
    context.shotIndex > 0 &&
    context.shotIndex % storm.everyRounds === 0;
  const evolutions = evolutionRecipes.filter((recipe) =>
    evolutionIds.includes(recipe.id),
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
  const roots: EnemyState[] = target.hp > 0 ? [target] : [];
  if (roots.length) {
    const angle = direction(target);
    const extra =
      traits.multishotTargets +
      (heatBarrage ? Math.ceil(2 * synergyMultiplier) : 0) +
      (stormRound ? Math.ceil((storm?.extraRays ?? 0) * synergyMultiplier) : 0);
    const options = living.filter(
      (enemy) =>
        enemy.id !== target.id &&
        Math.abs(direction(enemy) - angle) <= traits.multishotSpreadRadians,
    );
    // Distinct, spread-out aim rays. Logical angles never depend on screen aspect ratio.
    for (let i = 0; i < extra && options.length; i++) {
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
  const burns = new Map<number, number>();
  const suppressionWaves = new Set<number>();
  const nextMarkStacks = context.isEcho
    ? (target.markStacks ?? 0)
    : traits.markMaxStacks > 0
      ? Math.min(
          traits.markMaxStacks,
          (target.markShotIndex === context.shotIndex - 1 ||
          target.markShotIndex === -1
            ? (target.markStacks ?? 0)
            : 0) + 1,
        )
      : 0;
  const maxMarked = (enemy: EnemyState) =>
    traits.markMaxStacks > 0 &&
    (enemy.id === target.id ? nextMarkStacks : (enemy.markStacks ?? 0)) >=
      traits.markMaxStacks;
  const explosionCenters = new Set<number>();
  // Reserve the selected roots so a large secondary chain cannot starve its own volley.
  const factors = new Map<number, number>(roots.map((root) => [root.id, 0]));
  let splashBudget: number = traitCombatBalance.roundSplashBudget;
  // Merge intersecting effects by strongest damage once per enemy/round.
  const register = (
    enemy: EnemyState,
    factor: number,
    kind: "direct" | "bounce" | "splash",
    critical = false,
  ) => {
    if (
      !factors.has(enemy.id) &&
      factors.size >= traitCombatBalance.roundTargetBudget
    )
      return false;
    factors.set(enemy.id, Math.max(factors.get(enemy.id) ?? 0, factor));
    if (kind === "splash") splashes.add(enemy.id);
    else hits.add(enemy.id);
    if (kind === "bounce") ricochets.add(enemy.id);
    if (critical) criticals.add(enemy.id);
    return true;
  };
  const splash = (center: EnemyState, radius: number, factor: number) => {
    if (radius <= 0 || factor <= 0 || splashBudget <= 0) return;
    splashBudget--;
    explosionCenters.add(center.id);
    for (const enemy of nearby(center, radius).slice(
      0,
      traitCombatBalance.splashTargetCap,
    ))
      register(enemy, factor, "splash");
  };
  const damageAmount = (enemy: EnemyState, factor: number) => {
    const armor = enemyConfigs[enemy.kind].primaryDamageMultiplier;
    const bypass = Math.min(
      1,
      traits.shieldBypass +
        (relicModifiers.shieldBypass ?? 0) +
        (maxMarked(enemy) ? traits.markShieldBypass : 0),
    );
    const shieldBonus =
      enemy.kind === "shield"
        ? (relicModifiers.shieldDamageMultiplier ?? 1)
        : 1;
    const amount =
      baseDamage *
      stats.primaryDamageMultiplier *
      (relicModifiers.damageMultiplier ?? 1) *
      factor *
      (armor + (1 - armor) * bypass) *
      shieldBonus;
    return executions.has(enemy.id) ? Math.max(enemy.hp, amount) : amount;
  };
  const explosion = (center: EnemyState, factor: number) => {
    splash(
      center,
      traits.explosionRadius,
      factor * traits.explosionDamageFactor,
    );
    // Secondary explosions have one bounded tier; they cannot trigger each other.
    for (const secondary of nearby(center, traits.explosionRadius)
      .filter(
        (enemy) =>
          enemy.hp <=
          damageAmount(enemy, factor * traits.explosionDamageFactor),
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
  ) => {
    const multiplier = critical ? stats.criticalMultiplier : 1;
    if (
      !register(
        enemy,
        factor *
          multiplier *
          (1 +
            (enemy.id === target.id
              ? nextMarkStacks
              : (enemy.markStacks ?? 0)) *
              traits.markDamagePerStack +
            (maxMarked(enemy) ? traits.markFinisherFactor : 0)),
        kind,
        critical,
      )
    )
      return;
    const maximumHp =
      enemy.maxHp ??
      enemyConfigs[enemy.kind].hp *
        (enemy.elite ? eliteBalance.hpMultiplier : 1);
    if (
      traits.executionThreshold > 0 &&
      enemy.hp <=
        maximumHp *
          Math.min(
            0.55,
            traits.executionThreshold +
              (hasSynergy("marked-execution") && maxMarked(enemy)
                ? 0.12 * synergyMultiplier
                : 0),
          )
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
  const pierceRetention = ranks["siege-lance"]
    ? primaryAttackBalance.legendaryPierceRetention
    : traits.pierceDamageRetention;
  for (const root of roots) {
    const rootFactor =
      root.id === target.id
        ? 1
        : stormRound
          ? (storm?.rayDamageFactor ?? 1)
          : traits.multishotDamageFactor;
    const critical = context.random() < stats.criticalChance;
    criticalHit(root, rootFactor, "direct", critical);
    if (hasSynergy("focused-bombardment")) {
      // The central blast reaches a new ring; auxiliary blasts stay deliberately smaller.
      splash(
        root,
        traits.explosionRadius * (root.id === target.id ? 1.45 : 0.8),
        rootFactor *
          traits.explosionDamageFactor *
          (root.id === target.id ? 1.5 * synergyMultiplier : 0.75),
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
      if (hasSynergy("flame-pierce"))
        burns.set(enemy.id, 1.5 * synergyMultiplier);
      if (deepBlast)
        explosion(enemy, rootFactor * pierceRetention * synergyMultiplier);
    }
    let last = pierced.at(-1) ?? root;
    if (pierced.length && hasSynergy("flame-pierce")) {
      for (const other of nearby(last, 90).slice(0, 4))
        burns.set(other.id, 1.25 * synergyMultiplier);
    }
    if (pierced.length && hasSynergy("suppression-pierce")) {
      for (const other of nearby(last, 110).slice(
        0,
        Math.ceil(4 * synergyMultiplier),
      ))
        suppressionWaves.add(other.id);
      suppressionWaves.add(last.id);
    }
    if (pierced.length) {
      splash(
        last,
        ranks["siege-lance"]
          ? primaryAttackBalance.legendaryShockwaveRadius
          : traits.pierceShockwaveRadius,
        rootFactor *
          (ranks["siege-lance"]
            ? primaryAttackBalance.legendaryShockwaveDamageFactor
            : traits.pierceShockwaveFactor),
      );
    }
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
        rootFactor * traits.bounceDamageRetention,
        "bounce",
        critical && !!lethal?.propagateCritical,
      );
      last = next;
      didBounce = true;
    }
    if (didBounce && hasSynergy("flame-bounce")) {
      for (const other of nearby(last, 110).slice(0, 3))
        burns.set(other.id, 1.25 * synergyMultiplier);
      burns.set(last.id, 1.5 * synergyMultiplier);
    }
    if (didBounce) {
      const forkCount = Math.max(
        traits.bounceForkTargets,
        ranks["ricochet-cascade"]
          ? primaryAttackBalance.legendaryForkTargets
          : 0,
      );
      const forkFactor = ranks["ricochet-cascade"]
        ? Math.max(
            primaryAttackBalance.legendaryForkDamageFactor,
            traits.bounceForkDamageFactor,
          )
        : traits.bounceForkDamageFactor;
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
  const damage = (enemy: EnemyState, factor: number): EnemyState => ({
    ...enemy,
    hp: Math.max(0, enemy.hp - damageAmount(enemy, factor)),
  });
  const result = enemies.map((enemy) =>
    factors.has(enemy.id) ? damage(enemy, factors.get(enemy.id)!) : enemy,
  );
  const killed = result.find((enemy) => enemy.hp <= 0 && hits.has(enemy.id));
  const relayCount = ranks["rapid-overdrive"]
    ? primaryAttackBalance.legendaryRelayTargets
    : 0;
  if (killed && relayCount > 0) {
    const excluded = new Set(factors.keys());
    for (const relay of nearby(
      killed,
      primaryAttackBalance.relayRadius,
      excluded,
    ).slice(0, relayCount)) {
      if (factors.size >= traitCombatBalance.roundTargetBudget) break;
      const factor = primaryAttackBalance.legendaryRelayDamageFactor;
      factors.set(relay.id, factor);
      result[result.findIndex((enemy) => enemy.id === relay.id)] = damage(
        relay,
        factor,
      );
      hits.add(relay.id);
      ricochets.add(relay.id);
    }
  }
  const burnIds: number[] = [];
  const markIds: number[] = [];
  const suppressionIds: number[] = [];
  // Status effects are one bounded generation; splash cannot trigger direct-hit traits.
  for (let i = 0; i < result.length; i++) {
    let enemy = result[i]!;
    if (!context.isEcho && enemy.id === target.id && nextMarkStacks > 0) {
      enemy = {
        ...enemy,
        markStacks: nextMarkStacks,
        markShotIndex: context.shotIndex,
      };
      markIds.push(enemy.id);
    }
    const direct = hits.has(enemy.id);
    const hotBurn =
      direct && (context.heatRatio ?? 0) >= traitCombatBalance.highHeatRatio
        ? traits.heatPulseFactor
        : 0;
    if (
      (direct || burns.has(enemy.id)) &&
      (traits.burnDpsFactor > 0 || hotBurn > 0)
    ) {
      enemy = applyBurn(enemy, {
        dps:
          baseDamage *
          stats.primaryDamageMultiplier *
          (relicModifiers.damageMultiplier ?? 1) *
          Math.max(traits.burnDpsFactor, hotBurn) *
          (burns.get(enemy.id) ?? 1),
        remainingMs: traits.burnDurationMs || 1400,
        depth: 0,
        spreadTargets: traits.burnSpreadTargets,
        spreadRadius: traits.burnSpreadRadius,
        maxDepth: traits.burnMaxDepth,
      });
      burnIds.push(enemy.id);
    }
    if (direct || suppressionWaves.has(enemy.id)) {
      const before = enemy.suppressionImmunityMs ?? 0;
      enemy = applySuppression(enemy, traits, suppressionWaves.has(enemy.id));
      if (before <= 0 && (enemy.suppressionImmunityMs ?? 0) > 0) {
        suppressionIds.push(enemy.id);
        if (direct && traits.suppressionWaveTargets > 0) {
          const source = living.find((other) => other.id === enemy.id)!;
          for (const other of nearby(source, traits.suppressionWaveRadius)
            .filter((other) => other.progress01 < source.progress01)
            .slice(0, traits.suppressionWaveTargets))
            suppressionWaves.add(other.id);
        }
      }
    }
    result[i] = enemy;
  }
  // Apply generated waves once after all direct hits, independent of enemy array order.
  for (let i = 0; i < result.length; i++) {
    if (!suppressionWaves.has(result[i]!.id)) continue;
    const before = result[i]!;
    result[i] = applySuppression(before, traits, true);
    if (
      (before.suppressionImmunityMs ?? 0) <= 0 &&
      (result[i]!.suppressionImmunityMs ?? 0) > 0
    )
      suppressionIds.push(before.id);
  }
  return {
    enemies: result,
    burnIds,
    markIds,
    suppressionIds,
    executionIds: [...executions],
    hitIds: [...hits],
    ricochetIds: [...ricochets],
    splashIds: [...splashes].filter((id) => !hits.has(id)),
    shotTargetIds: roots.map((enemy) => enemy.id),
    criticalIds: [...criticals],
    explosionIds: [...explosionCenters],
  };
}
