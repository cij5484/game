import { progressionBalance, upgrades } from "../data/upgrades";
import type {
  UpgradeAbility,
  UpgradeDefinition,
  UpgradeId,
  UpgradeRanks,
} from "../data/upgrades";

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
      (this.level - 1) * progressionBalance.xpPerLevel
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
      let roll =
        this.random() * pool.reduce((sum, card) => sum + card.weight, 0);
      let index = pool.length - 1;
      for (let i = 0; i < pool.length; i++) {
        roll -= pool[i]!.weight;
        if (roll < 0) {
          index = i;
          break;
        }
      }
      choices.push(pool.splice(index, 1)[0]!);
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

  private eligible(): UpgradeDefinition[] {
    return Object.values(upgrades).filter(
      (card) =>
        card.weight > 0 &&
        this.availableAbilities.includes(card.ability) &&
        (this.ranks[card.id] ?? 0) < card.maxRank,
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
