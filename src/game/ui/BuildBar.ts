import type { BuildIcon } from "./buildSummary";
import "./buildBar.css";

export class BuildBar {
  private readonly root = document.createElement("div");
  constructor() {
    this.root.className = "build-bar";
    this.root.setAttribute("role", "list");
    this.root.setAttribute(
      "aria-label",
      "현재 빌드 · 자세한 효과는 일시정지에서 확인",
    );
    document.body.append(this.root);
  }
  render(entries: readonly BuildIcon[]): void {
    this.root.replaceChildren();
    this.root.hidden = entries.length === 0;
    let last = "";
    for (const entry of entries) {
      const icon = document.createElement("span");
      icon.className = "build-icon";
      icon.dataset.group = entry.group;
      icon.classList.toggle("group-start", last !== "" && last !== entry.group);
      last = entry.group;
      icon.setAttribute("role", "listitem");
      icon.setAttribute(
        "aria-label",
        `${entry.title}${entry.level ? ` ${entry.level}` : ""}`,
      );
      const symbol = document.createElement("i");
      symbol.textContent = entry.symbol;
      symbol.setAttribute("aria-hidden", "true");
      icon.append(symbol);
      if (entry.level !== undefined) {
        const level = document.createElement("b");
        level.textContent = String(entry.level);
        icon.append(level);
      }
      this.root.append(icon);
    }
  }
  destroy(): void {
    this.root.remove();
  }
}
