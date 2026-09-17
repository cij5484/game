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
  const owned = Object.values(levels).filter((level) => level > 0).length;
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
  constructor(random: () => number = Math.random) {
    this.random = random;
  }
  expandCapacity(): boolean {
    if (this.capacity >= relicBalance.expandedMaxTypes) return false;
    this.capacity = relicBalance.expandedMaxTypes;
    return true;
  }
  reward(): void {
    if (eligibleRelics(this.levels, this.capacity).length > 0)
      this.pendingRewards++;
  }
  offer(): RelicDefinition[] {
    if (this.pendingRewards <= 0) return [];
    if (!this.choices) {
      const candidates = eligibleRelics(this.levels, this.capacity);
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
    if (eligibleRelics(this.levels, this.capacity).length === 0)
      this.pendingRewards = 0;
    return true;
  }
}
export function relicEffects(levels: RelicLevels): RelicEffects {
  const effects: RelicEffects = {
    shieldHitRefundMs: 0,
    shieldRefundCapMs: 0,
    empoweredRounds: 0,
    shieldDamageMultiplier: 1,
    wallHealing: 0,
    arcEveryRounds: 0,
    arcTargets: 0,
    arcDamage: 0,
    arcRadius: 0,
    criticalChargeBonus: 0,
    lightningReadiesArc: false,
    arcRefundMs: 0,
    frostDurationBonusMs: 0,
    frostKillRefundMs: 0,
    frostKillRefundCapMs: 0,
    stimRefundMs: 0,
    boostKillHealing: 0,
    lowWallHealing: 0,
    lowWallDamageBonus: 0,
    stimWallCost: 0,
    boostDamageBonus: 0,
    alternatingRefundMs: 0,
    alternatingHealing: 0,
    magicKillXpMultiplier: 1,
    rarityModifiers: {},
  };
  for (const relic of Object.values(relics)) {
    const level = Math.min(relic.maxLevel, Math.max(0, levels[relic.id] ?? 0));
    Object.assign(effects, relic.levels[level - 1]?.effects);
  }
  return effects;
}
