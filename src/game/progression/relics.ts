import {
  relicBalance,
  relics,
  type RelicDefinition,
  type RelicEffects,
  type RelicId,
  type RelicLevels,
} from "../data/relics";
export function eligibleRelics(
  levels: RelicLevels,
  capacity: number = relicBalance.maxTypes,
): RelicDefinition[] {
  const owned = Object.values(relics).filter(
    (relic) => (levels[relic.id] ?? 0) > 0,
  ).length;
  return Object.values(relics).filter((relic) => {
    const level = levels[relic.id] ?? 0;
    return level < relic.maxLevel && (level > 0 || owned < capacity);
  });
}
export class Relics {
  readonly levels: RelicLevels = {};
  pendingRewards = 0;
  capacity: number = relicBalance.maxTypes;
  private choices: RelicDefinition[] | undefined;
  private random: () => number;
  private readonly excluded: readonly RelicId[];
  constructor(
    random: () => number = Math.random,
    excluded: readonly RelicId[] = [],
  ) {
    this.random = random;
    this.excluded = excluded;
  }
  private eligible(): RelicDefinition[] {
    return eligibleRelics(this.levels, this.capacity).filter(
      (r) => !this.excluded.includes(r.id),
    );
  }
  expandCapacity(): boolean {
    if (this.capacity >= relicBalance.expandedMaxTypes) return false;
    this.capacity = relicBalance.expandedMaxTypes;
    return true;
  }
  reward(): void {
    if (this.eligible().length > 0) this.pendingRewards++;
  }
  offer(): RelicDefinition[] {
    if (this.pendingRewards <= 0) return [];
    if (!this.choices) {
      const candidates = this.eligible();
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
      }
      this.choices = candidates.slice(0, 3);
    }
    return [...this.choices];
  }
  choose(id: RelicId): boolean {
    if (!this.offer().some((relic) => relic.id === id)) return false;
    this.levels[id] = (this.levels[id] ?? 0) + 1;
    this.pendingRewards--;
    this.choices = undefined;
    if (this.eligible().length === 0) this.pendingRewards = 0;
    return true;
  }
}
export function relicEffects(levels: RelicLevels): RelicEffects {
  const effects: RelicEffects = {
    arcEveryRounds: 0,
    arcTargets: 0,
    arcDamage: 0,
    arcRadius: 0,
    criticalChargeBonus: 0,
    arcRefundMs: 0,
    stimWallCost: 0,
    boostDamageBonus: 0,
    alternatingRefundMs: 0,
    alternatingHealing: 0,
    crisisDurationMs: 0,
    crisisSpeedBonus: 0,
    crisisDamageReduction: 0,
    crisisPushback: 0,
    crisisRefundMs: 0,
    echoEveryVolleys: 0,
    echoDamageMultiplier: 0,
    echoTraitLevel: 0,
    echoRoundCap: 0,
    brittleThreshold: 0,
    shatterDamage: 0,
    shatterRadius: 0,
    shatterWaves: 0,
    shatterTargets: 0,
    shatterChainStacks: 0,
    boostExtensionPerKillMs: 0,
    boostExtensionCapMs: 0,
    recoveryCostRatio: 0,
    pumpDamageBonus: 0,
    reclaimHealing: 0,
    reclaimEnergy: 0,
    reclaimKillsPerSecond: 0,
    lightningReadiesArc: false,
    lethalSave: false,
  };
  for (const relic of Object.values(relics)) {
    const level = Math.min(relic.maxLevel, Math.max(0, levels[relic.id] ?? 0));
    Object.assign(effects, relic.levels[level - 1]?.effects);
  }
  return effects;
}
