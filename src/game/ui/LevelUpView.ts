import {
  marineTraitIds,
  marineUpgrades,
  type MarineRanks,
  type MarineChoice,
} from "../data/marineGrowth";
import {
  upgradeCategory,
  type UpgradeDefinition,
  type UpgradeChoice,
  type ChoiceId,
  type UpgradeRanks,
} from "../data/upgrades";
import type { RelicDefinition, RelicId, RelicLevels } from "../data/relics";
import {
  display,
  rarityLabels,
  levelChange,
  levelLabel,
  choiceFaces,
  upgradeCategoryLabels,
} from "../data/display";
import { weaponTraitIds, weaponTraits } from "../data/traits";

export class LevelUpView {
  private readonly dialog = document.createElement("dialog");

  constructor() {
    this.dialog.className = "level-up upgrade-picker";
    this.dialog.setAttribute("aria-label", display.choose);
    this.dialog.addEventListener("cancel", (event) => event.preventDefault());
    document.body.append(this.dialog);
  }

  show(
    level: number,
    choices: readonly UpgradeChoice[],
    ranks: UpgradeRanks,
    select: (id: ChoiceId) => void,
    traitLimit: number,
  ): void {
    this.render(
      `${levelLabel(level)} · ${display.choose}`,
      choices.map((choice) => ({
        id: choice.id,
        title: choice.title,
        level: choice.synergyId
          ? "조합 완성 · 특성 슬롯 미사용"
          : levelChange(
              ranks[choice.growthId ?? (choice.id as keyof UpgradeRanks)] ?? 0,
              choice.maxRank,
            ),
        symbol:
          choice.symbol ??
          choiceFaces[choice.growthId ?? choice.id]?.symbol ??
          "✧",
        compact: choice.description,
        description: choice.description,
        rarity: choice.rarity,
        category: choice.synergyId
          ? display.synergy
          : choice.branch && choice.ability === "gauss-rifle"
            ? display.traitModification
            : upgradeCategoryLabels[upgradeCategory(choice)],
      })),
      select,
      `${display.trait} ${weaponTraitIds.filter((id) => (ranks[id] ?? 0) > 0).length}/${traitLimit} · ${
        weaponTraitIds
          .filter((id) => (ranks[id] ?? 0) > 0)
          .map((id) => weaponTraits[id].title)
          .join(" + ") || display.none
      }`,
    );
  }

  showMarine(
    level: number,
    choices: readonly MarineChoice[],
    ranks: MarineRanks,
    select: (id: string) => void,
    traitLimit: number,
  ): void {
    this.render(
      `${levelLabel(level)} · ${display.choose}`,
      choices.map((choice) => ({
        id: choice.id,
        title: choice.title,
        level: levelChange(ranks[choice.id] ?? 0, choice.maxRank),
        symbol: choice.symbol,
        compact: choice.description,
        description: choice.description,
        rarity: choice.rarity,
        category:
          choice.owner === "global"
            ? "기본 강화 · 공용"
            : choice.id === "range"
              ? "사거리 성장 · 가우스"
              : "무기 특성 · 가우스",
      })),
      select,
      `${display.trait} ${marineTraitIds.filter((id) => (ranks[id] ?? 0) > 0).length}/${traitLimit} · ${
        marineTraitIds
          .filter((id) => (ranks[id] ?? 0) > 0)
          .map((id) => marineUpgrades[id].title)
          .join(" + ") || display.none
      }`,
    );
  }

  showRelics(
    choices: readonly RelicDefinition[],
    levels: RelicLevels,
    select: (id: RelicId) => void,
  ): void {
    this.render(
      display.reward,
      choices.map((choice) => {
        const nextLevel = (levels[choice.id] ?? 0) + 1;
        return {
          id: choice.id,
          title: choice.title,
          level: levelChange(nextLevel - 1, choice.maxLevel),
          symbol: choiceFaces[choice.id]!.symbol,
          compact: choiceFaces[choice.id]!.lines[nextLevel - 1]!,
          description: choice.levels[nextLevel - 1]!.description,
          category: display.relic,
        };
      }),
      select,
    );
  }

  private render<T extends string>(
    title: string,
    choices: readonly {
      id: T;
      title: string;
      description: string;
      level: string;
      symbol: string;
      compact: string;
      category: string;
      rarity?: UpgradeDefinition["rarity"];
    }[],
    select: (id: T) => void,
    summary = "",
  ): void {
    this.dialog.replaceChildren();
    this.dialog.setAttribute("aria-label", title);
    const heading = document.createElement("h2");
    heading.textContent = title;
    const note = document.createElement("p");
    note.textContent = [display.paused, summary].filter(Boolean).join("\n");
    note.style.whiteSpace = "pre-line";
    this.dialog.append(heading, note);
    const row = document.createElement("div");
    row.className = "upgrade-cards";
    row.dataset.count = String(choices.length);
    row.style.setProperty("--choice-count", String(choices.length));
    for (const choice of choices) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "upgrade-card";
      card.title = choice.description;
      card.setAttribute(
        "aria-label",
        [
          choice.title,
          choice.category,
          choice.level,
          choice.rarity ? rarityLabels[choice.rarity] : display.relic,
          choice.description,
        ].join(" · "),
      );
      if (choice.rarity) card.dataset.rarity = choice.rarity;
      card.dataset.category = choice.category;
      const icon = document.createElement("b");
      icon.className = "choice-symbol";
      icon.textContent = choice.symbol;
      icon.setAttribute("aria-hidden", "true");
      const title = document.createElement("strong");
      title.textContent = choice.title;
      const level = document.createElement("small");
      level.textContent = choice.level;
      const detail = document.createElement("span");
      detail.textContent = choice.compact;
      const tags = document.createElement("div");
      tags.className = "choice-tags";
      const category = document.createElement("small");
      category.className = "choice-category";
      category.textContent = choice.category;
      tags.append(category);
      if (choice.rarity) {
        const rarity = document.createElement("small");
        rarity.className = "choice-rarity";
        rarity.textContent = rarityLabels[choice.rarity];
        tags.append(rarity);
      }
      card.append(icon, title, detail, tags, level);
      card.addEventListener("click", () => select(choice.id), { once: true });
      row.append(card);
    }
    this.dialog.append(row);
    if (!this.dialog.open) this.dialog.showModal();
  }

  hide(): void {
    this.dialog.close();
  }
  destroy(): void {
    this.dialog.remove();
  }
}
