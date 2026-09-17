import {
  progressionBalance,
  rarityWeights,
  upgrades,
  type UpgradeAbility,
  type UpgradeDefinition,
  type UpgradeId,
  type UpgradeRanks,
  type UpgradeChoice,
  type ChoiceId,
  type AbilityGrowthId,
} from "../data/upgrades";
import {
  traitBalance,
  weaponTraitIds,
  weaponTraits,
  traitLevel,
  type WeaponTraitId,
  type WeaponTraitLevels,
} from "../data/traits";
import { abilityGrowth, abilityLevel } from "../data/abilityGrowth";
import type { GrowthBranches, GrowthBranch } from "../data/growth";
import { unlockedSynergies } from "./synergy";

export function effectiveUpgradeWeight(
  card: UpgradeDefinition,
  ranks: UpgradeRanks,
): number {
  const investment = Object.values(upgrades).reduce(
    (sum, c) => sum + (c.tag === card.tag ? (ranks[c.id] ?? 0) : 0),
    0,
  );
  const bias = Math.min(
    progressionBalance.maxBuildBias,
    1 + progressionBalance.buildBiasPerRank * investment,
  );
  return (
    card.weight *
    rarityWeights[card.rarity] *
    bias *
    (weaponTraitIds.includes(card.id as WeaponTraitId)
      ? progressionBalance.traitWeightMultiplier
      : 1)
  );
}
export class Progression {
  level = 1;
  xp = 0;
  pendingChoices = 0;
  readonly ranks: UpgradeRanks = {};
  readonly branches: GrowthBranches = {};
  readonly activeSynergyIds = new Set<string>();
  traitLimit: number = traitBalance.initialLimit;
  private choiceCount: number = progressionBalance.choiceCount;
  private choices: UpgradeChoice[] | null = null;
  private synergyOffers = new Map<string, number>();
  private readonly random: () => number;
  private readonly availableAbilities: readonly UpgradeAbility[];
  constructor(
    random = Math.random,
    availableAbilities: readonly UpgradeAbility[] = [
      "gauss-rifle",
      "stimpack",
      "frost-nova",
      "chain-lightning",
    ],
  ) {
    this.random = random;
    this.availableAbilities = availableAbilities;
  }
  get threshold() {
    return (
      progressionBalance.initialXp +
      (this.level - 1) * progressionBalance.xpPerLevel +
      (this.level - 1) ** 2 * progressionBalance.xpQuadratic
    );
  }
  get traitLevels(): WeaponTraitLevels {
    return Object.fromEntries(
      weaponTraitIds
        .filter((id) => (this.ranks[id] ?? 0) > 0)
        .map((id) => [id, this.ranks[id]]),
    );
  }
  expandTraitLimit() {
    if (this.traitLimit >= traitBalance.maximumLimit) return false;
    this.traitLimit = traitBalance.maximumLimit;
    this.choices = null;
    return true;
  }
  expandChoices() {
    if (this.choiceCount === 4) return false;
    this.choiceCount = 4;
    this.choices = null;
    return true;
  }
  gainXp(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.xp += amount;
    while (this.xp >= this.threshold) {
      this.xp -= this.threshold;
      this.level++;
      this.pendingChoices++;
    }
    this.clearExhausted();
  }
  private growth(id: UpgradeId) {
    return weaponTraitIds.includes(id as WeaponTraitId)
      ? weaponTraits[id as WeaponTraitId]
      : id in abilityGrowth
        ? abilityGrowth[id as AbilityGrowthId]
        : undefined;
  }
  private description(id: UpgradeId, level: number, branch?: GrowthBranch) {
    return weaponTraitIds.includes(id as WeaponTraitId)
      ? traitLevel(id as WeaponTraitId, level, branch).description
      : abilityLevel(id as AbilityGrowthId, level, branch).description;
  }
  private eligible(): UpgradeDefinition[] {
    return Object.values(upgrades).filter(
      (card) =>
        card.weight > 0 &&
        this.availableAbilities.includes(card.ability) &&
        (this.ranks[card.id] ?? 0) < card.maxRank &&
        (!weaponTraitIds.includes(card.id as WeaponTraitId) ||
          (this.ranks[card.id] ?? 0) > 0 ||
          Object.keys(this.traitLevels).length < this.traitLimit),
    );
  }
  private unlocked() {
    return unlockedSynergies(this.ranks).filter(
      (s) => !this.activeSynergyIds.has(s.id),
    );
  }
  offer(): UpgradeChoice[] {
    if (this.pendingChoices <= 0) return [];
    if (this.choices) return this.choices;
    const result: UpgradeChoice[] = [];
    const synergy = this.unlocked().sort(
      (a, b) =>
        (this.synergyOffers.get(a.id) ?? 0) -
        (this.synergyOffers.get(b.id) ?? 0),
    )[0];
    if (synergy)
      result.push({
        id: `synergy:${synergy.id}`,
        synergyId: synergy.id,
        title: synergy.title,
        description: synergy.description,
        symbol: synergy.symbol,
        rarity: "EPIC",
        tag: "general",
        ability: "gauss-rifle",
        maxRank: 1,
        weight: 1,
        amount: 0,
      });
    const pool = this.eligible();
    while (result.length < this.choiceCount && pool.length) {
      // A branch is always a genuine A/B pair; never hide one behind RNG or a full row.
      const candidates = pool.filter(
        (c) =>
          (this.ranks[c.id] === 2 && this.growth(c.id) && !this.branches[c.id]
            ? 2
            : 1) <=
          this.choiceCount - result.length,
      );
      if (!candidates.length) break;
      let roll =
        this.random() *
        candidates.reduce(
          (sum, c) => sum + effectiveUpgradeWeight(c, this.ranks),
          0,
        );
      const card =
        candidates.find(
          (c) => (roll -= effectiveUpgradeWeight(c, this.ranks)) < 0,
        ) ?? candidates.at(-1)!;
      pool.splice(pool.indexOf(card), 1);
      const level = (this.ranks[card.id] ?? 0) + 1;
      const growth = this.growth(card.id);
      const branch = this.branches[card.id];
      if (growth && level === 3 && !branch) {
        for (const side of ["a", "b"] as const)
          result.push({
            ...card,
            id: `${card.id}:${side}`,
            growthId: card.id,
            branch: side,
            title: `${card.title} · ${growth.branches[side].title}`,
            description: this.description(card.id, level, side),
            rarity: "EPIC",
          });
      } else
        result.push({
          ...card,
          growthId: card.id,
          ...(growth
            ? {
                title: `${card.title}${branch ? ` · ${growth.branches[branch].title}` : ""}`,
                description: this.description(card.id, level, branch),
                rarity: level === 5 ? ("LEGENDARY" as const) : card.rarity,
              }
            : {}),
        });
    }
    this.choices = result;
    if (!result.length) this.pendingChoices = 0;
    return result;
  }
  choose(id: ChoiceId): boolean {
    const offered = this.offer();
    const card = offered.find((c) => c.id === id);
    if (!card) return false;
    if (card.synergyId) this.activeSynergyIds.add(card.synergyId);
    else {
      const base = card.growthId ?? (card.id as UpgradeId);
      if (card.branch) {
        if (this.branches[base] || this.ranks[base] !== 2) return false;
        this.branches[base] = card.branch;
      }
      this.ranks[base] = (this.ranks[base] ?? 0) + 1;
    }
    for (const shown of offered)
      if (shown.synergyId)
        this.synergyOffers.set(
          shown.synergyId,
          (this.synergyOffers.get(shown.synergyId) ?? 0) + 1,
        );
    this.pendingChoices--;
    this.choices = null;
    this.clearExhausted();
    return true;
  }
  private clearExhausted() {
    if (
      this.pendingChoices > 0 &&
      !this.eligible().length &&
      !this.unlocked().length
    )
      this.pendingChoices = 0;
  }
}
