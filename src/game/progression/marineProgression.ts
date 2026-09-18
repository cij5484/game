import { neutralMetaModifiers, type MetaModifiers } from "../data/meta";
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
  marineRarityWeights,
  rollMarineRarity,
  type MarineGrowthState,
  type MarineRanks,
  type MarineTraitId,
  type MarineUpgradeDefinition,
  type MarineUpgradeId,
  type MarineChoice,
} from "../data/marineGrowth";
import type { UpgradeRarity } from "../data/upgrades";
import {
  specialQualityIncrements,
  specialWeaponDefinitions,
  type SpecialWeaponId,
  type SpecialWeaponState,
} from "../data/specialWeapons";
import { SpecialProgression } from "./specialProgression";
import { getSpecialWeaponStats } from "../data/specialWeaponBalance";
import {
  promoteRarity,
  prototypeCores,
  type PrototypeCoreId,
} from "../data/highroll";

export type { MarineChoice } from "../data/marineGrowth";
export interface SpecialGrowthChoice {
  id: `special-${SpecialWeaponId}`;
  growthId: `special-${SpecialWeaponId}`;
  weaponId: SpecialWeaponId;
  owner: SpecialWeaponId;
  category: "special-growth";
  title: string;
  symbol: string;
  description: string;
  currentLevel: number;
  nextLevel: number;
  maxRank: number;
  weight: number;
  rarity: UpgradeRarity;
  originalRarity: UpgradeRarity;
  tag: string;
  ability: SpecialWeaponId;
  amount: number;
}
export interface SpecialAcquisitionChoice {
  id: `acquire-${SpecialWeaponId}`;
  growthId: `acquire-${SpecialWeaponId}`;
  weaponId: SpecialWeaponId;
  ability: SpecialWeaponId;
  owner: SpecialWeaponId;
  category: "special-acquisition";
  title: string;
  symbol: string;
  description: string;
  currentLevel: 0;
  nextLevel: 1;
  rarity?: never;
  originalRarity?: never;
}
type GrowthChoice = (MarineChoice | SpecialGrowthChoice) & {
  originalRarity: UpgradeRarity;
};
export type MarineLevelChoice = GrowthChoice | SpecialAcquisitionChoice;
export interface MarineGrowthHistory {
  id: GrowthChoice["id"];
  levels: number;
  greatSuccess: boolean;
  originalRarity: UpgradeRarity;
  rarity: UpgradeRarity;
  amount: number;
}
export class MarineProgression {
  level = 1;
  xp = 0;
  pendingChoices = 0;
  readonly ranks: MarineRanks = {};
  readonly quality: MarineGrowthState["quality"] = {};
  readonly legendary = new Set<MarineTraitId>();
  readonly branches = {};
  readonly activeSynergyIds = new Set<string>();
  traitLimit: number = marineGrowthBalance.traitLimit;
  readonly special = new SpecialProgression();
  readonly history: MarineGrowthHistory[] = [];
  core: PrototypeCoreId | null = null;
  lastSelection: MarineGrowthHistory | null = null;
  private expandedChoices = false;
  private get choiceCount() {
    return Math.max(
      marineGrowthBalance.choiceCount,
      this.expandedChoices ? 4 : 0,
    );
  }
  private thresholdLevel = 0;
  private thresholdValue = 0;
  private offeredGreatSuccessChance = marineGrowthBalance.greatSuccessChance;
  private choices: MarineLevelChoice[] | null = null;
  private readonly random: () => number;
  readonly meta: Readonly<MetaModifiers>;
  rerollsRemaining: number;
  constructor(
    random = Math.random,
    meta: Readonly<MetaModifiers> = neutralMetaModifiers,
    rerolls = 0,
  ) {
    this.random = random;
    this.meta = Object.freeze({ ...meta });
    this.rerollsRemaining = Math.max(0, Math.min(3, Math.floor(rerolls)));
  }
  reroll(): boolean {
    if (
      !this.choices?.length ||
      this.pendingChoices <= 0 ||
      this.special.pending ||
      this.rerollsRemaining <= 0
    )
      return false;
    this.rerollsRemaining--;
    this.choices = null;
    this.offer();
    return true;
  }
  get growth(): MarineGrowthState {
    return {
      ranks: this.ranks,
      meta: this.meta,
      quality: this.quality,
      legendary: this.legendary,
    };
  }
  get threshold() {
    if (this.thresholdLevel !== this.level) {
      this.thresholdLevel = this.level;
      this.thresholdValue = Math.ceil(
        marineGrowthBalance.initialXp +
          (this.level - 1) * marineGrowthBalance.xpPerLevel +
          (this.level - 1) ** 2 * marineGrowthBalance.xpQuadratic,
      );
    }
    return this.thresholdValue;
  }
  get traitLevels(): Partial<Record<MarineTraitId, number>> {
    return Object.fromEntries(
      marineTraitIds
        .filter((id) => (this.ranks[id] ?? 0) > 0)
        .map((id) => [id, this.ranks[id]]),
    );
  }
  expandTraitLimit() {
    if (this.traitLimit >= 4) return false;
    this.traitLimit = 4;
    this.choices = null;
    return true;
  }
  get validCoreIds(): PrototypeCoreId[] {
    if (this.core) return [];
    return (Object.keys(prototypeCores) as PrototypeCoreId[]).filter((id) =>
      id === "armament"
        ? this.special.capacity < 3
        : id === "modification"
          ? this.traitLimit < 4
          : true,
    );
  }
  applyCore(id: PrototypeCoreId): boolean {
    if (!this.validCoreIds.includes(id)) return false;
    this.core = id;
    if (id === "armament") this.special.expandCapacity();
    else if (id === "modification") this.expandTraitLimit();
    else {
      for (const entry of this.history) {
        entry.rarity = promoteRarity(entry.originalRarity);
        if (entry.id.startsWith("special-"))
          entry.amount = specialQualityIncrements[entry.rarity];
        else {
          const upgradeId = entry.id as MarineUpgradeId;
          const amount = marineQualityIncrements[upgradeId][entry.rarity];
          this.quality[upgradeId] =
            marineStrength(this.growth, upgradeId) +
            entry.levels * (amount - entry.amount);
          entry.amount = amount;
          if (
            entry.rarity === "LEGENDARY" &&
            marineUpgrades[upgradeId].category === "weapon-trait"
          )
            this.legendary.add(upgradeId as MarineTraitId);
        }
      }
      this.special.liberateQuality();
      this.choices =
        this.choices?.map((card) => {
          if (card.category === "special-acquisition") return card;
          const rarity = promoteRarity(card.originalRarity);
          return card.category === "special-growth"
            ? this.specialCard(
                this.special.weapons.find((w) => w.id === card.weaponId)!,
                rarity,
                card.originalRarity,
              )
            : {
                ...card,
                rarity,
                amount: marineQualityIncrements[card.id][rarity],
                description: describeMarineUpgrade(
                  card.id,
                  this.preview(card.id, rarity),
                ),
              };
        }) ?? null;
    }
    return true;
  }
  expandChoices() {
    if (this.choiceCount === 4) return false;
    this.expandedChoices = true;
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
      meta: this.meta,
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
    // Keep common speed while any owned weapon can still shorten its cycle.
    if (card.id === "attack-speed")
      return (
        deriveMarineWeaponConfig(this.preview(card.id, "COMMON"))
          .shotIntervalMs <
          deriveMarineWeaponConfig(this.growth).shotIntervalMs ||
        this.special.weapons.some(
          (weapon) =>
            getSpecialWeaponStats(weapon, this.preview(card.id, "COMMON"))
              .cycleMs < getSpecialWeaponStats(weapon, this.growth).cycleMs,
        )
      );
    if (card.id === "crit-chance")
      return (
        getMarineStats(this.preview(card.id, "COMMON")).criticalChance >
        getMarineStats(this.growth).criticalChance
      );
    return true;
  }
  private specialCard(
    weapon: SpecialWeaponState,
    rarity: UpgradeRarity,
    originalRarity: UpgradeRarity = rarity,
  ): SpecialGrowthChoice {
    const definition = specialWeaponDefinitions[weapon.id];
    const tree = definition.trees.find((t) => t.id === weapon.tree);
    const direction =
      [
        tree?.title,
        weapon.branch ? tree?.branches[weapon.branch].title : undefined,
      ]
        .filter(Boolean)
        .join(" · ") || "기본형";
    const amount = specialQualityIncrements[rarity];
    const before = getSpecialWeaponStats(weapon, this.growth);
    const after = getSpecialWeaponStats(
      { ...weapon, quality: weapon.quality + amount },
      this.growth,
    );
    return {
      id: `special-${weapon.id}`,
      growthId: `special-${weapon.id}`,
      weaponId: weapon.id,
      owner: weapon.id,
      category: "special-growth",
      title: definition.title,
      symbol: definition.symbol,
      description: `${direction} · 기본 피해 ${Math.round(before.damage)} → ${Math.round(after.damage)} · 주기 ${(before.cycleMs / 1000).toFixed(2)} → ${(after.cycleMs / 1000).toFixed(2)}초`,
      currentLevel: weapon.level,
      nextLevel: weapon.level + 1,
      maxRank: Infinity,
      weight: 1.3,
      rarity,
      originalRarity,
      tag: weapon.id,
      ability: weapon.id,
      amount,
    };
  }
  offer(): MarineLevelChoice[] {
    if (this.pendingChoices <= 0) return [];
    if (this.choices) return this.choices;
    this.offeredGreatSuccessChance = marineGrowthBalance.greatSuccessChance;
    type Candidate =
      MarineUpgradeDefinition | SpecialGrowthChoice | SpecialAcquisitionChoice;
    const eligible = Object.values(marineUpgrades).filter(
      (card) =>
        this.eligible(card) &&
        marineRarityWeights(
          this.level,
          card.id === "range",
          this.legendary.has(card.id as MarineTraitId),
        ).some((weight) => weight > 0),
    );
    const pool: {
      kind: "card" | "mod" | "acquire";
      weight: number;
      cards: Candidate[];
    }[] = eligible
      .filter((card) => card.category === "basic")
      .map((card) => ({ kind: "card", weight: card.weight, cards: [card] }));
    for (const owned of [false, true]) {
      const cards = eligible.filter(
        (card) =>
          card.category === "weapon-trait" && !!this.ranks[card.id] === owned,
      );
      if (cards.length)
        pool.push({
          kind: "mod",
          weight: owned
            ? marineGrowthBalance.ownedModWeight
            : marineGrowthBalance.newModWeight,
          cards,
        });
    }
    for (const card of eligible.filter(
      (card) => card.category === "weapon-growth",
    ))
      pool.push({ kind: "card", weight: card.weight, cards: [card] });
    for (const weapon of this.special.weapons)
      pool.push({
        kind: "card",
        weight:
          1.3 *
          Math.min(
            marineGrowthBalance.maxInvestment,
            1 + (weapon.level - 1) * marineGrowthBalance.investmentPerRank,
          ),
        cards: [this.specialCard(weapon, "COMMON")],
      });
    const owned = this.special.weapons.length;
    if (
      owned < this.special.capacity &&
      this.level >=
        (owned === 0
          ? marineGrowthBalance.firstAcquisitionLevel
          : marineGrowthBalance.laterAcquisitionLevel)
    ) {
      const cards: SpecialAcquisitionChoice[] = Object.values(
        specialWeaponDefinitions,
      )
        .filter(
          (definition) =>
            !this.special.weapons.some((weapon) => weapon.id === definition.id),
        )
        .map((definition) => ({
          id: `acquire-${definition.id}`,
          growthId: `acquire-${definition.id}`,
          weaponId: definition.id,
          ability: definition.id,
          owner: definition.id,
          category: "special-acquisition",
          title: `${definition.title} 획득`,
          symbol: definition.symbol,
          description: definition.description,
          currentLevel: 0,
          nextLevel: 1,
        }));
      if (cards.length)
        pool.push({
          kind: "acquire",
          weight:
            owned === 0
              ? marineGrowthBalance.firstAcquisitionWeight
              : marineGrowthBalance.laterAcquisitionWeight,
          cards,
        });
    }
    const pick = <T>(
      items: T[],
      weight: (item: T) => number,
    ): T | undefined => {
      const available = items.filter((item) => weight(item) > 0);
      let roll =
        this.random() * available.reduce((sum, item) => sum + weight(item), 0);
      return (
        available.find((item) => (roll -= weight(item)) < 0) ?? available.at(-1)
      );
    };
    const result: MarineLevelChoice[] = [];
    while (result.length < this.choiceCount && pool.length) {
      const group = pick(pool, (group) => group.weight);
      if (!group) break;
      const card =
        group.kind === "card"
          ? group.cards[0]!
          : pick(group.cards, (candidate) =>
              candidate.category === "weapon-trait"
                ? marineUpgradeWeight(candidate, this.ranks)
                : 1,
            );
      for (let i = pool.length - 1; i >= 0; i--)
        if (
          pool[i] === group ||
          (group.kind === "mod" && pool[i]!.kind === "mod")
        )
          pool.splice(i, 1);
      if (!card) continue;
      if (card.category === "special-acquisition") {
        result.push(card);
        continue;
      }
      const originalRarity = rollMarineRarity(
        this.level,
        this.random,
        card.id === "range",
        this.legendary.has(card.id as MarineTraitId),
      );
      if (originalRarity === null) continue;
      const rarity =
        this.core === "quality"
          ? promoteRarity(originalRarity)
          : originalRarity;
      if (card.category === "special-growth") {
        result.push(
          this.specialCard(
            this.special.weapons.find((w) => w.id === card.weaponId)!,
            rarity,
            originalRarity,
          ),
        );
        continue;
      }
      result.push({
        ...card,
        growthId: card.id,
        rarity,
        originalRarity,
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
    if (!card) return false;
    if (card.category === "special-acquisition") {
      if (!this.special.acquireWeapon(card.weaponId)) return false;
      this.lastSelection = null;
      this.pendingChoices--;
      this.choices = null;
      return true;
    }
    const greatSuccess = this.random() < this.offeredGreatSuccessChance;
    let levels = greatSuccess ? 2 : 1;
    if (card.category === "special-growth") {
      this.special.addLevels(
        card.weaponId,
        levels,
        card.amount,
        card.originalRarity,
      );
    } else {
      const rank = this.ranks[card.id] ?? 0;
      levels = Math.min(levels, card.maxRank - rank);
      this.quality[card.id] =
        marineStrength(this.growth, card.id) + levels * card.amount;
      this.ranks[card.id] = rank + levels;
      if (card.rarity === "LEGENDARY" && card.category === "weapon-trait")
        this.legendary.add(card.id as MarineTraitId);
    }
    this.lastSelection = {
      id: card.id,
      levels,
      greatSuccess,
      rarity: card.rarity,
      originalRarity: card.originalRarity,
      amount: card.amount,
    };
    this.history.push(this.lastSelection);
    this.pendingChoices--;
    this.choices = null;
    return true;
  }
}
