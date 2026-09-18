import {
  deriveMarineWeaponConfig,
  describeMarineUpgrade,
  getMarineStats,
  marineGrowthBalance,
  marineQualityIncrements,
  marineStrength,
  marineTraitIds,
  marineUpgrades,
  marineUpgradeWeight,
  rollMarineRarity,
  type MarineGrowthState,
  type MarineRanks,
  type MarineTraitId,
  type MarineUpgradeDefinition,
  type MarineUpgradeId,
  type MarineChoice,
} from "../data/marineGrowth";
import type { UpgradeRarity } from "../data/upgrades";

export type { MarineChoice } from "../data/marineGrowth";
export class MarineProgression {
  level = 1;
  xp = 0;
  pendingChoices = 0;
  readonly ranks: MarineRanks = {};
  readonly quality: MarineGrowthState["quality"] = {};
  readonly legendary = new Set<MarineTraitId>();
  readonly branches = {};
  readonly activeSynergyIds = new Set<string>();
  readonly traitLimit = marineGrowthBalance.traitLimit;
  lastSelection: {
    id: MarineUpgradeId;
    levels: number;
    greatSuccess: boolean;
    rarity: UpgradeRarity;
  } | null = null;
  private choiceCount: number = marineGrowthBalance.choiceCount;
  private choices: MarineChoice[] | null = null;
  private readonly random: () => number;
  constructor(random = Math.random) {
    this.random = random;
  }
  get growth(): MarineGrowthState {
    return {
      ranks: this.ranks,
      quality: this.quality,
      legendary: this.legendary,
    };
  }
  get threshold() {
    return Math.ceil(
      marineGrowthBalance.initialXp +
        (this.level - 1) * marineGrowthBalance.xpPerLevel +
        (this.level - 1) ** 2 * marineGrowthBalance.xpQuadratic,
    );
  }
  get traitLevels(): Partial<Record<MarineTraitId, number>> {
    return Object.fromEntries(
      marineTraitIds
        .filter((id) => (this.ranks[id] ?? 0) > 0)
        .map((id) => [id, this.ranks[id]]),
    );
  }
  expandTraitLimit() {
    return false;
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
  }
  private preview(
    id: MarineUpgradeId,
    rarity: UpgradeRarity,
  ): MarineGrowthState {
    return {
      ranks: { ...this.ranks, [id]: (this.ranks[id] ?? 0) + 1 },
      quality: {
        ...this.quality,
        [id]:
          marineStrength(this.growth, id) + marineQualityIncrements[id][rarity],
      },
      legendary: new Set([
        ...this.legendary,
        ...(rarity === "LEGENDARY" &&
        marineUpgrades[id].category === "weapon-trait"
          ? [id as MarineTraitId]
          : []),
      ]),
    };
  }
  private eligible(card: MarineUpgradeDefinition) {
    if ((this.ranks[card.id] ?? 0) >= card.maxRank) return false;
    if (
      card.category === "weapon-trait" &&
      !(this.ranks[card.id] ?? 0) &&
      Object.keys(this.traitLevels).length >= this.traitLimit
    )
      return false;
    // A cycle at its safety floor must not advertise an ineffective speed card.
    if (card.id === "attack-speed")
      return (
        deriveMarineWeaponConfig(this.preview(card.id, "COMMON"))
          .shotIntervalMs < deriveMarineWeaponConfig(this.growth).shotIntervalMs
      );
    if (card.id === "crit-chance")
      return (
        getMarineStats(this.preview(card.id, "COMMON")).criticalChance >
        getMarineStats(this.growth).criticalChance
      );
    return true;
  }
  offer(): MarineChoice[] {
    if (this.pendingChoices <= 0) return [];
    if (this.choices) return this.choices;
    const pool = Object.values(marineUpgrades).filter((card) =>
      this.eligible(card),
    );
    const result: MarineChoice[] = [];
    while (result.length < this.choiceCount && pool.length) {
      let roll =
        this.random() *
        pool.reduce(
          (sum, card) => sum + marineUpgradeWeight(card, this.ranks),
          0,
        );
      const card =
        pool.find(
          (card) => (roll -= marineUpgradeWeight(card, this.ranks)) < 0,
        ) ?? pool.at(-1)!;
      pool.splice(pool.indexOf(card), 1);
      const rarity = rollMarineRarity(
        this.level,
        this.random,
        card.id === "range",
        this.legendary.has(card.id as MarineTraitId),
      );
      result.push({
        ...card,
        growthId: card.id,
        rarity,
        tag: card.category === "basic" ? "general" : card.id,
        ability: "gauss-rifle",
        amount: marineQualityIncrements[card.id][rarity],
        description: describeMarineUpgrade(
          card.id,
          this.preview(card.id, rarity),
        ),
      });
    }
    this.choices = result;
    return result;
  }
  choose(id: string): boolean {
    const card = this.offer().find((card) => card.id === id);
    if (!card || !this.eligible(card)) return false;
    const greatSuccess = this.random() < marineGrowthBalance.greatSuccessChance;
    const rank = this.ranks[card.id] ?? 0;
    const levels = Math.min(greatSuccess ? 2 : 1, card.maxRank - rank);
    this.quality[card.id] =
      marineStrength(this.growth, card.id) +
      levels * marineQualityIncrements[card.id][card.rarity];
    this.ranks[card.id] = rank + levels;
    if (card.rarity === "LEGENDARY" && card.category === "weapon-trait")
      this.legendary.add(card.id as MarineTraitId);
    this.lastSelection = {
      id: card.id,
      levels,
      greatSuccess,
      rarity: card.rarity,
    };
    this.pendingChoices--;
    this.choices = null;
    return true;
  }
}
