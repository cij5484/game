import {
  upgrades,
  type UpgradeAbility,
  type UpgradeRanks,
} from "../data/upgrades";
import { modules, type ModuleLevels } from "../data/modules";
import { evolutionRecipes } from "../data/evolutions";

export interface RunResult {
  status: "cleared" | "failed";
  elapsedMs: number;
  kills: number;
  level: number;
  wallHp: number;
  ranks: UpgradeRanks;
  modules: ModuleLevels;
  evolutions: ReadonlySet<string>;
}

export class ResultView {
  private readonly dialog = document.createElement("dialog");
  constructor() {
    this.dialog.className = "level-up run-result";
    this.dialog.setAttribute("aria-label", "전투 결과");
    this.dialog.addEventListener("cancel", (event) => event.preventDefault());
    document.body.append(this.dialog);
  }

  show(result: RunResult, retry: () => void): void {
    this.dialog.replaceChildren();
    const title = document.createElement("h2");
    title.textContent =
      result.status === "cleared" ? "PROTOTYPE CLEAR" : "RUN FAILED";
    const stats = document.createElement("dl");
    const selections = (abilities: readonly UpgradeAbility[]) =>
      Object.values(upgrades)
        .filter(
          (upgrade) =>
            abilities.includes(upgrade.ability) &&
            (result.ranks[upgrade.id] ?? 0) > 0,
        )
        .map((upgrade) => `${upgrade.title} ${result.ranks[upgrade.id]}`)
        .join(" · ") || "없음";
    const primary = Object.values(upgrades).filter(
      (upgrade) => upgrade.ability === "gauss-rifle",
    );
    const tags = ["rapid", "penetration", "ricochet"];
    const direction =
      tags
        .map((tag) => ({
          tag,
          rank: primary
            .filter((upgrade) => upgrade.tag === tag)
            .reduce(
              (total, upgrade) => total + (result.ranks[upgrade.id] ?? 0),
              0,
            ),
        }))
        .filter((entry) => entry.rank > 0)
        .sort((a, b) => b.rank - a.rank)
        .map((entry) => `${entry.tag.toUpperCase()} ${entry.rank}`)
        .join(" / ") || "기본 Gauss Rifle";
    const seconds = Math.floor(result.elapsedMs / 1000);
    const rows = [
      [
        "전투 시간",
        `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
      ],
      ["처치 / Level", `${result.kills} / Lv.${result.level}`],
      ["남은 Wall HP", String(Math.ceil(result.wallHp))],
      ["Primary Build", direction],
      ["Primary 강화", selections(["gauss-rifle"])],
      ["Stimpack", selections(["stimpack"])],
      ["Magic 성장", selections(["frost-nova", "chain-lightning"])],
      [
        "Module",
        Object.values(modules)
          .filter((module) => (result.modules[module.id] ?? 0) > 0)
          .map(
            (module) => `${module.shortLabel} Lv${result.modules[module.id]}`,
          )
          .join(" · ") || "없음",
      ],
      [
        "Evolution",
        evolutionRecipes
          .filter((recipe) => result.evolutions.has(recipe.id))
          .map((recipe) => recipe.title)
          .join(" · ") || "없음",
      ],
    ];
    for (const [key, value] of rows) {
      const term = document.createElement("dt");
      term.textContent = key!;
      const detail = document.createElement("dd");
      detail.textContent = value!;
      stats.append(term, detail);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "RETRY · 다시 시작";
    button.addEventListener(
      "click",
      () => {
        button.disabled = true;
        retry();
      },
      { once: true },
    );
    this.dialog.append(title, stats, button);
    this.dialog.showModal();
  }
  destroy(): void {
    this.dialog.remove();
  }
}
