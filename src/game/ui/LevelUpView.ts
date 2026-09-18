import type { MarineLevelChoice } from "../progression/marineProgression";
import type { SpecialSelection } from "../progression/specialProgression";
import {
  marineTraitIds,
  marineUpgrades,
  type MarineRanks,
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
import type {
  PrototypeRelicDefinition,
  PrototypeRelicId,
} from "../data/highroll";

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
    choices: readonly MarineLevelChoice[],
    ranks: MarineRanks,
    select: (id: string) => void,
    traitLimit: number,
    reroll?: { remaining: number; run: () => void },
  ): void {
    this.render(
      `${levelLabel(level)} · ${display.choose}`,
      choices.map((choice) => ({
        id: choice.id,
        title: choice.title,
        level:
          choice.category === "special-acquisition"
            ? "신규 무장 · Lv1 획득"
            : choice.category === "special-growth"
              ? `${choice.currentLevel} → ${choice.nextLevel}레벨`
              : levelChange(ranks[choice.id] ?? 0, choice.maxRank),
        symbol: choice.symbol,
        compact: choice.description,
        description: choice.description,
        ...(choice.rarity ? { rarity: choice.rarity } : {}),
        category:
          choice.category === "special-acquisition"
            ? "신규 무장 · 일반 선택 1회"
            : choice.category === "special-growth"
              ? `특수무기 강화 · ${choice.title}`
              : choice.owner === "global"
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
    if (reroll) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `새로고침 ${reroll.remaining}`;
      button.disabled = reroll.remaining <= 0;
      button.addEventListener(
        "click",
        () => {
          button.disabled = true;
          reroll.run();
        },
        { once: true },
      );
      this.dialog.append(button);
    }
  }

  showSpecial(selection: SpecialSelection, select: (id: string) => void) {
    this.render(
      selection.title,
      selection.choices.map((choice) => ({
        ...choice,
        level: "특별 선택 · 일반 강화 소모 없음",
        compact: choice.description,
        category:
          selection.kind === "acquire" ? "특수무기 획득" : "특수무기 개조",
      })),
      select,
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

  showPrototypeRelics(
    choices: readonly PrototypeRelicDefinition[],
    select: (id: PrototypeRelicId) => void,
  ): void {
    this.render(
      "유물 획득",
      choices.map((choice) => ({
        ...choice,
        level: "즉시 완성",
        compact: choice.summary,
        category: display.relic,
      })),
      select,
      "무레벨 유물 · 최대 2개 · 중복 없음",
    );
  }

  showRelicReplacement(
    incoming: PrototypeRelicDefinition,
    owned: readonly PrototypeRelicDefinition[],
    replace: (id: PrototypeRelicId) => void,
    skip: () => void,
  ): void {
    this.render<PrototypeRelicId | "skip">(
      "유물 교체 또는 포기",
      [
        ...owned.map((relic) => ({
          ...relic,
          title: relic.title,
          level: "이 유물 교체",
          compact: relic.summary,
          category: display.relic,
        })),
        {
          id: "skip",
          title: "새 유물 포기",
          level: "기존 유물 유지",
          symbol: "×",
          compact: `${incoming.title} 포기`,
          description: "보유한 유물 2개를 유지합니다.",
          category: display.relic,
        },
      ],
      (id) => (id === "skip" ? skip() : replace(id)),
      `새 유물: ${incoming.title}\n${incoming.description}`,
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
          choice.rarity ? rarityLabels[choice.rarity] : choice.category,
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
