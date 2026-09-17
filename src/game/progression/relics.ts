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
  reward(): void {
    if (eligibleRelics(this.levels).length > 0) this.pendingRewards++;
  }
  offer(): RelicDefinition[] {
    return this.pendingRewards > 0 ? eligibleRelics(this.levels) : [];
  }
  choose(id: RelicId): boolean {
    if (!this.offer().some((relic) => relic.id === id)) return false;
    this.levels[id] = (this.levels[id] ?? 0) + 1;
    this.pendingRewards--;
    if (eligibleRelics(this.levels).length === 0) this.pendingRewards = 0;
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
  };
  for (const relic of Object.values(relics)) {
    const level = Math.min(relic.maxLevel, Math.max(0, levels[relic.id] ?? 0));
    Object.assign(effects, relic.levels[level - 1]?.effects);
  }
  return effects;
}
