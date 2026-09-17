import type { UpgradeDefinition } from "../data/upgrades";
import type { ModuleDefinition, ModuleId, ModuleLevels } from "../data/modules";

export class LevelUpView {
  private readonly dialog = document.createElement("dialog");

  constructor() {
    this.dialog.className = "level-up";
    this.dialog.setAttribute("aria-label", "레벨업 강화 선택");
    this.dialog.addEventListener("cancel", (event) => event.preventDefault());
    document.body.append(this.dialog);
  }

  show(
    level: number,
    choices: readonly UpgradeDefinition[],
    select: (id: UpgradeDefinition["id"]) => void,
  ): void {
    this.render(
      `LEVEL ${level} · 강화 선택`,
      choices.map((choice) => ({
        id: choice.id,
        title: `${choice.tag.toUpperCase()} · ${choice.title}`,
        description: choice.description,
        rarity: choice.rarity,
      })),
      select,
    );
  }

  showModules(
    choices: readonly ModuleDefinition[],
    levels: ModuleLevels,
    select: (id: ModuleId) => void,
  ): void {
    this.render(
      "ELITE 격파 · MODULE 보상",
      choices.map((choice) => {
        const nextLevel = (levels[choice.id] ?? 0) + 1;
        return {
          id: choice.id,
          title: `${choice.title} · Lv.${nextLevel}`,
          description: choice.levels[nextLevel - 1]!.description,
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
      rarity?: UpgradeDefinition["rarity"];
    }[],
    select: (id: T) => void,
  ): void {
    this.dialog.replaceChildren();
    this.dialog.setAttribute("aria-label", title);
    const heading = document.createElement("h2");
    heading.textContent = title;
    const note = document.createElement("p");
    note.textContent = "전투 일시정지 · 하나를 선택하세요";
    this.dialog.append(heading, note);
    for (const choice of choices) {
      const card = document.createElement("button");
      card.type = "button";
      if (choice.rarity) {
        card.dataset.rarity = choice.rarity;
        const badge = document.createElement("small");
        badge.textContent = choice.rarity;
        card.append(badge);
      }
      const title = document.createElement("strong");
      title.textContent = choice.title;
      const detail = document.createElement("span");
      detail.textContent = choice.description;
      card.append(title, detail);
      card.addEventListener("click", () => select(choice.id), { once: true });
      this.dialog.append(card);
    }
    if (!this.dialog.open) this.dialog.showModal();
  }

  hide(): void {
    this.dialog.close();
  }
  destroy(): void {
    this.dialog.remove();
  }
}
