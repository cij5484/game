import type { BuildIcon } from "./buildSummary";
import { battlefieldLayout, readSafeArea } from "../battlefield/layout";
import "./buildBar.css";

export function buildBadge(
  entry: BuildIcon,
  inspect: (entries: readonly BuildIcon[]) => void,
) {
  const icon = document.createElement("button");
  icon.type = "button";
  icon.className = "build-icon";
  icon.dataset.group = entry.group;
  icon.title = `${entry.title}${entry.level ? ` · Lv.${entry.level}` : ""} — ${entry.detail}`;
  icon.setAttribute("aria-label", icon.title);
  const symbol = document.createElement("i");
  symbol.textContent = entry.symbol;
  symbol.setAttribute("aria-hidden", "true");
  icon.append(symbol);
  if (entry.level !== undefined) {
    const level = document.createElement("b");
    level.textContent = String(entry.level);
    icon.append(level);
  }
  icon.addEventListener("click", () => inspect([entry]));
  return icon;
}
export class BuildBar {
  private readonly root = document.createElement("header");
  private readonly row = document.createElement("div");
  constructor(
    privateInspect: (entries: readonly BuildIcon[]) => void = () => {},
  ) {
    this.inspect = privateInspect;
    this.root.className = "run-header";
    this.root.setAttribute("aria-label", "Run 정보 및 Global Build");
    this.row.className = "build-bar";
    this.row.setAttribute("aria-label", "공용 강화 · 유물 · 코어 · 시너지");
    this.root.append(this.row);
    document.body.append(this.root);
  }
  private readonly inspect: (entries: readonly BuildIcon[]) => void;
  render(entries: readonly BuildIcon[]) {
    this.row.replaceChildren(
      ...entries
        .filter((e) => e.owner === "global")
        .map((e) => buildBadge(e, this.inspect)),
    );
  }
  resize(width: number, height: number) {
    const l = battlefieldLayout(width, height, readSafeArea());
    Object.assign(this.root.style, {
      left: `${l.header.x}px`,
      top: `${l.header.y}px`,
      width: `${l.header.width}px`,
      height: `${l.header.height}px`,
    });
    this.row.style.top = `${Math.max(35, 64 * l.scale)}px`;
  }
  destroy() {
    this.root.remove();
  }
}
