import type { BuildIcon } from "./buildSummary";
import "./buildBar.css";

export class BuildBar {
  private readonly heat = document.createElement("div");
  private readonly heatMeter = document.createElement("meter");
  private readonly heatLabel = document.createElement("span");
  private readonly root = document.createElement("div");
  constructor() {
    this.root.className = "build-bar";
    this.root.setAttribute("role", "list");
    this.root.setAttribute(
      "aria-label",
      "현재 빌드 · 자세한 효과는 일시정지에서 확인",
    );
    this.heat.className = "weapon-heat";
    this.heat.hidden = true;
    this.heatMeter.min = 0;
    this.heatMeter.max = 1;
    this.heatMeter.setAttribute("aria-label", "무기 열");
    this.heat.append(this.heatMeter, this.heatLabel);
    document.body.append(this.root, this.heat);
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
  renderHeat(enabled: boolean, ratio: number, locked: boolean): void {
    this.heat.hidden = !enabled;
    this.heat.dataset.locked = String(locked);
    this.heatMeter.value = ratio;
    this.heatLabel.textContent = locked
      ? "과열 · 냉각 중"
      : `열 ${Math.round(ratio * 100)}% · 쉬면 냉각`;
  }
  destroy(): void {
    this.heat.remove();
    this.root.remove();
  }
}
