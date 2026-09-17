import { combatPosition } from "../battlefield/combatGeometry";
import { getTraitEffects, type TraitEffects } from "../data/traits";
import type { UpgradeRanks } from "../data/upgrades";
import type { EnemyState } from "../enemies/enemySimulation";

export const traitCombatBalance = {
  deathEffectBudget: 64,
  roundTargetBudget: 128,
  roundSplashBudget: 64,
  splashTargetCap: 24,
  suppressionImmunityMs: 2400,
  eliteControlFactor: 0.5,
  heatCoolingDelayMs: 400,
  highHeatRatio: 0.65,
} as const;

export function applyBurn(
  enemy: EnemyState,
  burn: NonNullable<EnemyState["burn"]>,
): EnemyState {
  const previous = enemy.burn;
  return {
    ...enemy,
    burn: {
      ...burn,
      dps: Math.max(previous?.dps ?? 0, burn.dps),
      remainingMs: Math.max(previous?.remainingMs ?? 0, burn.remainingMs),
      depth: Math.min(previous?.depth ?? burn.depth, burn.depth),
    },
  };
}

export function applySuppression(
  enemy: EnemyState,
  traits: TraitEffects,
  force = false,
): EnemyState {
  if (!traits.suppressionThreshold || (enemy.suppressionImmunityMs ?? 0) > 0)
    return enemy;
  const stacks = (enemy.suppressionStacks ?? 0) + 1;
  if (!force && stacks < traits.suppressionThreshold)
    return { ...enemy, suppressionStacks: stacks };
  const resistance = enemy.elite ? traitCombatBalance.eliteControlFactor : 1;
  const push = traits.suppressionPushback * resistance;
  return {
    ...enemy,
    suppressionStacks: 0,
    suppressionMs: traits.suppressionDurationMs * resistance,
    suppressionSlow: traits.suppressionSlow * resistance,
    suppressionImmunityMs:
      traits.suppressionDurationMs * resistance +
      traitCombatBalance.suppressionImmunityMs,
    suppressionAttackDelayMs:
      (enemy.suppressionAttackDelayMs ?? 0) +
      traits.suppressionAttackDelayMs * resistance,
    progress01: Math.max(0, enemy.progress01 - push),
    phase: push > 0 ? "moving" : enemy.phase,
  };
}

export function tickTraitStatuses(
  enemies: readonly EnemyState[],
  deltaMs: number,
) {
  const hitIds: number[] = [];
  const burnIds: number[] = [];
  const elapsed = Math.max(0, deltaMs);
  const result = enemies.map((enemy) => {
    if (enemy.hp <= 0) return enemy;
    const next = { ...enemy };
    if (enemy.burn) {
      const activeMs = Math.min(elapsed, enemy.burn.remainingMs);
      next.hp = Math.max(0, enemy.hp - (enemy.burn.dps * activeMs) / 1000);
      if (next.hp < enemy.hp) hitIds.push(enemy.id);
      // Keep the burn on a dead enemy for on-death transmission even at expiry.
      if (enemy.burn.remainingMs <= elapsed && next.hp > 0) delete next.burn;
      else
        next.burn = {
          ...enemy.burn,
          remainingMs: Math.max(0, enemy.burn.remainingMs - elapsed),
        };
      if (next.burn) burnIds.push(enemy.id);
    }
    if (enemy.suppressionMs !== undefined)
      next.suppressionMs = Math.max(0, enemy.suppressionMs - elapsed);
    if (enemy.suppressionImmunityMs !== undefined)
      next.suppressionImmunityMs = Math.max(
        0,
        enemy.suppressionImmunityMs - elapsed,
      );
    return next;
  });
  return { enemies: result, hitIds, burnIds };
}

/** Called once on the scene's collected deaths, before removal; children never die recursively here. */
export function propagateTraitDeaths(
  enemies: readonly EnemyState[],
  dead: readonly EnemyState[],
  ranks: UpgradeRanks,
) {
  const traits = getTraitEffects(ranks);
  const result = enemies.slice();
  const burnIds = new Set<number>();
  const markIds = new Set<number>();
  let budget = traitCombatBalance.deathEffectBudget as number;
  for (const source of dead) {
    if (budget <= 0) break;
    const transfer =
      traits.markTransferStacks || (ranks.marking && ranks.execution ? 1 : 0);
    const canSpread = source.burn && source.burn.depth < source.burn.maxDepth;
    if (!canSpread && !(transfer && (source.markStacks ?? 0) > 0)) continue;
    const position = combatPosition(source);
    const radius = Math.max(
      source.burn?.spreadRadius ?? 0,
      traits.markTransferRadius,
    );
    const nearby = result
      .map((enemy, index) => ({
        enemy,
        index,
        position: combatPosition(enemy),
      }))
      .filter(
        ({ enemy, position: other }) =>
          enemy.id !== source.id &&
          enemy.hp > 0 &&
          Math.hypot(other.x - position.x, other.y - position.y) <= radius,
      );
    if (source.burn && source.burn.depth < source.burn.maxDepth) {
      const burn = source.burn;
      const spread = nearby
        .filter(
          ({ position: other }) =>
            Math.hypot(other.x - position.x, other.y - position.y) <=
            burn.spreadRadius,
        )
        .sort(
          (a, b) =>
            b.enemy.progress01 - a.enemy.progress01 || a.enemy.id - b.enemy.id,
        )
        .slice(0, Math.min(burn.spreadTargets, budget));
      for (const candidate of spread) {
        result[candidate.index] = applyBurn(result[candidate.index]!, {
          ...burn,
          remainingMs: traits.burnDurationMs || 2000,
          dps: burn.dps * 0.8,
          depth: burn.depth + 1,
        });
        burnIds.add(candidate.enemy.id);
        budget--;
      }
    }
    if (transfer && (source.markStacks ?? 0) > 0 && budget > 0) {
      const candidate = nearby
        .filter(
          ({ position: other }) =>
            Math.hypot(other.x - position.x, other.y - position.y) <=
            traits.markTransferRadius,
        )
        .sort(
          (a, b) =>
            b.enemy.progress01 - a.enemy.progress01 || a.enemy.id - b.enemy.id,
        )[0];
      if (candidate) {
        result[candidate.index] = {
          ...result[candidate.index]!,
          markStacks: Math.max(
            candidate.enemy.markStacks ?? 0,
            Math.min(transfer, source.markStacks ?? 0),
          ),
          markShotIndex: -1,
        };
        markIds.add(candidate.enemy.id);
        budget--;
      }
    }
  }
  return { enemies: result, burnIds: [...burnIds], markIds: [...markIds] };
}

/** Advances only simulation time, so pause, magic gestures and upgrade panels do not cool Heat. */
export class WeaponHeat {
  private value = 0;
  private capacity = 100;
  private idleMs = 0;
  private lockMs = 0;
  get heat() {
    return this.value;
  }
  get ratio() {
    return Math.min(1, this.value / this.capacity);
  }
  get locked() {
    return this.lockMs > 0;
  }
  get remainingLockMs() {
    return this.lockMs;
  }
  tick(deltaMs: number, ranks: UpgradeRanks) {
    const effects = getTraitEffects(ranks);
    const elapsed = Math.max(0, deltaMs);
    const coolingMs =
      Math.max(
        0,
        this.idleMs + elapsed - traitCombatBalance.heatCoolingDelayMs,
      ) - Math.max(0, this.idleMs - traitCombatBalance.heatCoolingDelayMs);
    this.idleMs += elapsed;
    this.lockMs = Math.max(0, this.lockMs - elapsed);
    this.cool((coolingMs * effects.heatCoolingPerSecond) / 1000);
  }
  fire(ranks: UpgradeRanks, extraHeat = false): boolean {
    if (this.locked) return false;
    const effects = getTraitEffects(ranks);
    if (!effects.heatCapacity) return true;
    this.capacity = effects.heatCapacity;
    this.idleMs = 0;
    this.value = Math.min(
      this.capacity,
      this.value + effects.heatPerShot * (extraHeat ? 1.4 : 1),
    );
    if (this.value >= this.capacity) this.lockMs = effects.heatLockMs;
    return true;
  }
  cool(amount: number) {
    this.value = Math.max(0, this.value - Math.max(0, amount));
  }
  damageMultiplier(ranks: UpgradeRanks) {
    return 1 + this.ratio * getTraitEffects(ranks).heatDamageBonus;
  }
}
