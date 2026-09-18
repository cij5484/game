import {
  specialQualityIncrements,
  specialWeaponDefinitions,
  type SpecialOption,
  type SpecialWeaponId,
  type SpecialWeaponState,
} from "../data/specialWeapons";
import { promoteRarity } from "../data/highroll";
import { marineGrowthBalance } from "../data/marineGrowth";
import type { UpgradeRarity } from "../data/upgrades";

export interface SpecialGrowthHistory {
  weaponId: SpecialWeaponId;
  levels: number;
  appliedLevels: number;
  originalRarity: UpgradeRarity;
  rarity: UpgradeRarity;
  amount: number;
}

export interface SpecialSelection {
  title: string;
  weaponId?: SpecialWeaponId;
  kind: "acquire" | "tree" | "branch" | "transcendence" | "overclock";
  choices: SpecialOption[];
}
type QueueEntry =
  | { kind: "acquire" }
  | {
      kind: "growth";
      weaponId: SpecialWeaponId;
      levels: number;
      history: SpecialGrowthHistory;
    }
  | {
      kind: Exclude<SpecialSelection["kind"], "acquire">;
      weaponId: SpecialWeaponId;
    };

export class SpecialProgression {
  readonly weapons: SpecialWeaponState[] = [];
  readonly history: SpecialGrowthHistory[] = [];
  capacity = marineGrowthBalance.specialCapacity;
  private qualityLiberated = false;
  private readonly queue: QueueEntry[] = [];

  get pending(): boolean {
    return this.queue.length > 0;
  }

  expandCapacity(): boolean {
    if (this.capacity >= 3) return false;
    this.capacity = 3;
    this.queue.push({ kind: "acquire" });
    return true;
  }

  liberateQuality(): void {
    if (this.qualityLiberated) return;
    this.qualityLiberated = true;
    for (const entry of this.history) {
      entry.rarity = promoteRarity(entry.originalRarity);
      const amount = specialQualityIncrements[entry.rarity];
      const weapon = this.weapons.find((w) => w.id === entry.weaponId)!;
      weapon.quality += entry.appliedLevels * (amount - entry.amount);
      entry.amount = amount;
    }
  }

  acquireWeapon(id: SpecialWeaponId): boolean {
    if (
      !Object.hasOwn(specialWeaponDefinitions, id) ||
      this.weapons.length >= this.capacity ||
      this.weapons.some((weapon) => weapon.id === id)
    )
      return false;
    this.weapons.push({ id, level: 1, quality: 0 });
    return true;
  }

  addLevels(
    id: SpecialWeaponId,
    levels: number,
    qualityPerLevel: number,
    originalRarity: UpgradeRarity = (
      Object.keys(specialQualityIncrements) as UpgradeRarity[]
    ).find((rarity) => specialQualityIncrements[rarity] === qualityPerLevel) ??
      "COMMON",
  ): void {
    if (
      !this.weapons.some((w) => w.id === id) ||
      !Number.isSafeInteger(levels) ||
      levels <= 0 ||
      !Number.isFinite(qualityPerLevel) ||
      qualityPerLevel <= 0
    )
      return;
    const rarity = this.qualityLiberated
      ? promoteRarity(originalRarity)
      : originalRarity;
    const history: SpecialGrowthHistory = {
      weaponId: id,
      levels,
      appliedLevels: 0,
      originalRarity,
      rarity,
      amount: this.qualityLiberated
        ? specialQualityIncrements[rarity]
        : qualityPerLevel,
    };
    this.history.push(history);
    this.queue.push({
      kind: "growth",
      weaponId: id,
      levels,
      history,
    });
    this.applyGrowth();
  }

  private applyGrowth(): void {
    while (this.queue[0]?.kind === "growth") {
      const growth = this.queue[0];
      const weapon = this.weapons.find((w) => w.id === growth.weaponId)!;
      // Jump to the next choice boundary, retaining remaining growth and its rarity.
      const milestone = (
        [
          [3, "tree"],
          [6, "branch"],
          [15, "transcendence"],
          [20, "overclock"],
        ] as const
      ).find(([level]) => level > weapon.level);
      const levels = Math.min(
        growth.levels,
        milestone ? milestone[0] - weapon.level : growth.levels,
      );
      weapon.level += levels;
      weapon.quality += levels * growth.history.amount;
      growth.history.appliedLevels += levels;
      growth.levels -= levels;
      if (!growth.levels) this.queue.shift();
      if (milestone && weapon.level === milestone[0]) {
        this.queue.unshift({ kind: milestone[1], weaponId: weapon.id });
        return;
      }
    }
  }

  offer(): SpecialSelection | null {
    const event = this.queue[0];
    if (!event || event.kind === "growth") return null;
    if (event.kind === "acquire")
      return {
        title: `특수무기 ${this.weapons.length + 1} 획득`,
        kind: "acquire",
        choices: Object.values(specialWeaponDefinitions).filter(
          (d) => !this.weapons.some((w) => w.id === d.id),
        ),
      };
    const weapon = this.weapons.find((w) => w.id === event.weaponId)!;
    const definition = specialWeaponDefinitions[weapon.id];
    const choices =
      event.kind === "tree"
        ? definition.trees
        : event.kind === "branch"
          ? Object.values(
              definition.trees.find((t) => t.id === weapon.tree)!.branches,
            )
          : event.kind === "transcendence"
            ? definition.transcendences
            : definition.overclocks;
    const label = {
      tree: "주요 트리",
      branch: "세부 분기",
      transcendence: "초월",
      overclock: "오버클록",
    }[event.kind];
    return {
      title: `${definition.title} Lv${weapon.level} · ${label}`,
      weaponId: weapon.id,
      kind: event.kind,
      choices,
    };
  }

  choose(optionId: string): boolean {
    const selection = this.offer();
    if (!selection?.choices.some((c) => c.id === optionId)) return false;
    if (selection.kind === "acquire") {
      if (!this.acquireWeapon(optionId as SpecialWeaponId)) return false;
    } else {
      const weapon = this.weapons.find((w) => w.id === selection.weaponId)!;
      if (selection.kind === "branch") weapon.branch = optionId as "a" | "b";
      else weapon[selection.kind] = optionId;
    }
    this.queue.shift();
    this.applyGrowth();
    return true;
  }
}
