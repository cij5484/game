import { progressionBalance, rarityWeights, upgrades } from "../data/upgrades";
import {
  traitBalance,
  weaponTraitIds,
  weaponTraits,
  type WeaponTraitId,
  type WeaponTraitLevels,
} from "../data/traits";
import type {
  UpgradeAbility,
  UpgradeDefinition,
  UpgradeId,
  UpgradeRanks,
  UpgradeRarity,
} from "../data/upgrades";

function tagRanks(tag: UpgradeDefinition["tag"], ranks: UpgradeRanks): number {
  return Object.values(upgrades).reduce(
    (sum, card) => sum + (card.tag === tag ? (ranks[card.id] ?? 0) : 0),
    0,
  );
}

export function effectiveUpgradeWeight(
  card: UpgradeDefinition,
  ranks: UpgradeRanks,
  rarityModifiers: Partial<Record<UpgradeRarity, number>> = {},
): number {
  const bias = Math.min(
    progressionBalance.maxBuildBias,
    1 + progressionBalance.buildBiasPerRank * tagRanks(card.tag, ranks),
  );
  return (
    card.weight *
    rarityWeights[card.rarity] *
    bias *
    (rarityModifiers[card.rarity] ?? 1) *
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
  traitLimit: number = traitBalance.initialLimit;
  private rarityModifiers: Partial<Record<UpgradeRarity, number>> = {};
  private choices: UpgradeDefinition[] | null = null;
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

  get threshold(): number {
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

  expandTraitLimit(): boolean {
    if (this.traitLimit >= traitBalance.maximumLimit) return false;
    this.traitLimit = traitBalance.maximumLimit;
    this.choices = null;
    return true;
  }

  growOwnedTraits(): number {
    let grown = 0;
    for (const id of weaponTraitIds) {
      const level = this.ranks[id] ?? 0;
      if (level > 0 && level < traitBalance.maxLevel) {
        this.ranks[id] = level + 1;
        grown++;
      }
    }
    this.choices = null;
    this.clearExhaustedChoices();
    return grown;
  }

  setRarityModifiers(modifiers: Partial<Record<UpgradeRarity, number>>): void {
    this.rarityModifiers = Object.fromEntries(
      Object.entries(modifiers).filter(
        ([, value]) => Number.isFinite(value) && value >= 0,
      ),
    );
    this.choices = null;
  }

  gainXp(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.xp += amount;
    while (this.xp >= this.threshold) {
      this.xp -= this.threshold;
      this.level++;
      this.pendingChoices++;
    }
    this.clearExhaustedChoices();
  }

  offer(): UpgradeDefinition[] {
    if (this.pendingChoices === 0) return [];
    if (this.choices) return this.choices;
    const pool = this.eligible().filter(
      (card) =>
        effectiveUpgradeWeight(card, this.ranks, this.rarityModifiers) > 0,
    );
    const choices: UpgradeDefinition[] = [];
    while (pool.length > 0 && choices.length < progressionBalance.choiceCount) {
      const candidates = pool;
      let roll =
        this.random() *
        candidates.reduce(
          (sum, card) =>
            sum +
            effectiveUpgradeWeight(card, this.ranks, this.rarityModifiers),
          0,
        );
      let selected = candidates[candidates.length - 1]!;
      for (const card of candidates) {
        roll -= effectiveUpgradeWeight(card, this.ranks, this.rarityModifiers);
        if (roll < 0) {
          selected = card;
          break;
        }
      }
      choices.push(selected);
      pool.splice(pool.indexOf(selected), 1);
    }
    this.choices = choices;
    if (choices.length === 0) this.pendingChoices = 0;
    return choices;
  }

  choose(id: UpgradeId): boolean {
    if (!this.offer().some((card) => card.id === id)) return false;
    this.ranks[id] = (this.ranks[id] ?? 0) + 1;
    this.pendingChoices--;
    this.choices = null;
    this.clearExhaustedChoices();
    return true;
  }

  private tagRanks(tag: UpgradeDefinition["tag"]): number {
    return tagRanks(tag, this.ranks);
  }

  private eligible(): UpgradeDefinition[] {
    const ownedTraits = Object.keys(this.traitLevels).length;
    return Object.values(upgrades)
      .filter(
        (card) =>
          card.weight > 0 &&
          this.availableAbilities.includes(card.ability) &&
          (this.ranks[card.id] ?? 0) < card.maxRank &&
          (!weaponTraitIds.includes(card.id as WeaponTraitId) ||
            (this.ranks[card.id] ?? 0) > 0 ||
            ownedTraits < this.traitLimit) &&
          (!card.requires ||
            (card.requires.upgrade
              ? (this.ranks[card.requires.upgrade] ?? 0)
              : weaponTraitIds.includes(card.requires.tag as WeaponTraitId)
                ? (this.ranks[card.requires.tag as WeaponTraitId] ?? 0)
                : this.tagRanks(card.requires.tag)) >= card.requires.ranks),
      )
      .map((card) => {
        if (!weaponTraitIds.includes(card.id as WeaponTraitId)) return card;
        const nextLevel = (this.ranks[card.id] ?? 0) + 1;
        return {
          ...card,
          description:
            weaponTraits[card.id as WeaponTraitId].levels[nextLevel - 1]!
              .description,
          rarity:
            weaponTraits[card.id as WeaponTraitId].levels[nextLevel - 1]!
              .rarity,
        };
      });
  }

  private clearExhaustedChoices(): void {
    // A finite prototype pool can run out: levels still grow without an empty modal.
    if (this.pendingChoices > 0 && this.eligible().length === 0) {
      this.pendingChoices = 0;
      this.choices = null;
    }
  }
}
