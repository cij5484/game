import type { UpgradeDefinition } from "../data/upgrades";

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
    this.dialog.replaceChildren();
    const heading = document.createElement("h2");
    heading.textContent = `LEVEL ${level} · 강화 선택`;
    const note = document.createElement("p");
    note.textContent = "전투 일시정지 · 하나를 선택하세요";
    this.dialog.append(heading, note);
    for (const choice of choices) {
      const card = document.createElement("button");
      card.type = "button";
      const title = document.createElement("strong");
      title.textContent = `${choice.tag.toUpperCase()} · ${choice.title}`;
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
