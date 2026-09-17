import { progressionBalance, rarityWeights, upgrades } from "../data/upgrades";
import type {
  UpgradeAbility,
  UpgradeDefinition,
  UpgradeId,
  UpgradeRanks,
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
): number {
  const bias = Math.min(
    progressionBalance.maxBuildBias,
    1 + progressionBalance.buildBiasPerRank * tagRanks(card.tag, ranks),
  );
  return card.weight * rarityWeights[card.rarity] * bias;
}

export class Progression {
  level = 1;
  xp = 0;
  pendingChoices = 0;
  readonly ranks: UpgradeRanks = {};
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
    const pool = this.eligible();
    const choices: UpgradeDefinition[] = [];
    while (pool.length > 0 && choices.length < progressionBalance.choiceCount) {
      // One build-related slot; remaining slots stay open to hybrid directions.
      const invested =
        choices.length === 0
          ? pool.filter((card) => this.tagRanks(card.tag) > 0)
          : [];
      const candidates = invested.length > 0 ? invested : pool;
      let roll =
        this.random() *
        candidates.reduce(
          (sum, card) => sum + effectiveUpgradeWeight(card, this.ranks),
          0,
        );
      let selected = candidates[candidates.length - 1]!;
      for (const card of candidates) {
        roll -= effectiveUpgradeWeight(card, this.ranks);
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
    return Object.values(upgrades).filter(
      (card) =>
        card.weight > 0 &&
        this.availableAbilities.includes(card.ability) &&
        (this.ranks[card.id] ?? 0) < card.maxRank &&
        (!card.requires ||
          this.tagRanks(card.requires.tag) >= card.requires.ranks),
    );
  }

  private clearExhaustedChoices(): void {
    // A finite prototype pool can run out: levels still grow without an empty modal.
    if (this.pendingChoices > 0 && this.eligible().length === 0) {
      this.pendingChoices = 0;
      this.choices = null;
    }
  }
}
