import { specialBuildSummary, type BuildIcon } from "./buildSummary";
import type { SpecialWeaponState } from "../data/specialWeapons";
import {
  marineUpgrades,
  marineTraitIds,
  type MarineGrowthState,
} from "../data/marineGrowth";
import {
  upgrades,
  type UpgradeAbility,
  type UpgradeRanks,
} from "../data/upgrades";
import { relics, type RelicLevels } from "../data/relics";
import { weaponTraits, weaponTraitIds } from "../data/traits";
import type { GrowthBranches } from "../data/growth";
import { abilityGrowth } from "../data/abilityGrowth";
import { activeSynergies } from "../progression/synergy";
import { display, levelLabel } from "../data/display";
import { evolutionRecipes } from "../data/evolutions";
import { cores, type CoreId } from "../data/cores";

export interface RunResult {
  status: "cleared" | "failed";
  elapsedMs: number;
  kills: number;
  bossKilled?: boolean;
  level: number;
  wallHp: number;
  ranks: UpgradeRanks;
  growth?: MarineGrowthState;
  specialWeapons?: readonly SpecialWeaponState[];
  highroll?: readonly BuildIcon[];
  branches: GrowthBranches;
  activeSynergyIds: ReadonlySet<string>;
  relics: RelicLevels;
  traitLimit: number;
  cores: ReadonlySet<CoreId>;
  evolutions: ReadonlySet<string>;
}

export class ResultView {
  private readonly dialog = document.createElement("dialog");
  constructor() {
    this.dialog.className = "level-up run-result";
    this.dialog.setAttribute("aria-label", display.result);
    this.dialog.addEventListener("cancel", (event) => event.preventDefault());
    document.body.append(this.dialog);
  }

  show(result: RunResult, retry: () => void): void {
    this.dialog.replaceChildren();
    const title = document.createElement("h2");
    title.textContent =
      result.status === "cleared" ? display.cleared : display.failed;
    const stats = document.createElement("dl");
    const selections = (abilities: readonly UpgradeAbility[]) =>
      Object.values(upgrades)
        .filter(
          (upgrade) =>
            abilities.includes(upgrade.ability) &&
            (result.ranks[upgrade.id] ?? 0) > 0,
        )
        .map(
          (upgrade) =>
            `${upgrade.title} ${levelLabel(result.ranks[upgrade.id]!)}${result.branches[upgrade.id] && upgrade.id in abilityGrowth ? ` · ${abilityGrowth[upgrade.id as keyof typeof abilityGrowth].branches[result.branches[upgrade.id]!].title}` : ""}`,
        )
        .join(" · ") || display.none;
    const direction = result.growth
      ? marineTraitIds
          .filter((id) => (result.growth!.ranks[id] ?? 0) > 0)
          .map(
            (id) =>
              `${marineUpgrades[id].title} ${levelLabel(result.growth!.ranks[id]!)}${result.growth!.legendary.has(id) ? " ★전설" : ""}`,
          )
          .join(" · ") || display.baseWeapon
      : weaponTraitIds
          .filter((id) => (result.ranks[id] ?? 0) > 0)
          .map(
            (id) =>
              `${weaponTraits[id].title} ${levelLabel(result.ranks[id]!)}${result.branches[id] ? ` · ${weaponTraits[id].branches[result.branches[id]!].title}` : ""}`,
          )
          .join(" · ") || display.baseWeapon;
    const seconds = Math.floor(result.elapsedMs / 1000);
    const highroll = (group: BuildIcon["group"]) =>
      result.highroll === undefined
        ? undefined
        : result.highroll
            .filter((entry) => entry.group === group)
            .map((entry) => entry.title)
            .join(" · ") || display.none;
    const rows = [
      [
        display.time,
        `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
      ],
      [display.killsLevel, `${result.kills} / ${levelLabel(result.level)}`],
      ["공성 거인", result.bossKilled ? "처치 완료" : "미처치"],
      [display.wall, String(Math.ceil(result.wallHp))],
      [`${display.trait} (${result.traitLimit})`, direction],
      [
        display.primary,
        result.growth
          ? Object.values(marineUpgrades)
              .filter(
                (c) =>
                  c.category !== "weapon-trait" &&
                  (result.growth!.ranks[c.id] ?? 0) > 0,
              )
              .map(
                (c) => `${c.title} ${levelLabel(result.growth!.ranks[c.id]!)}`,
              )
              .join(" · ") || display.none
          : selections(["gauss-rifle"]),
      ],
      [
        "특수무기",
        (result.specialWeapons ?? [])
          .map((w) =>
            specialBuildSummary(w)
              .map((e) => `${e.title}${e.level ? ` Lv${e.level}` : ""}`)
              .join(" / "),
          )
          .join(" · ") || display.none,
      ],
      [display.stimpack, selections(["stimpack"])],
      [display.magicGrowth, selections(["frost-nova", "chain-lightning"])],
      [
        display.relic,
        highroll("relic") ??
          (Object.values(relics)
            .filter((module) => (result.relics[module.id] ?? 0) > 0)
            .map(
              (module) =>
                `${module.title} ${levelLabel(result.relics[module.id]!)}`,
            )
            .join(" · ") ||
            display.none),
      ],
      [
        display.core,
        highroll("core") ??
          ([...result.cores].map((id) => cores[id].title).join(" · ") ||
            display.none),
      ],
      [
        display.synergy,
        highroll("synergy") ??
          (activeSynergies(result.ranks, result.activeSynergyIds)
            .map((recipe) => recipe.title)
            .join(" · ") ||
            display.none),
      ],
      [
        display.evolution,
        evolutionRecipes
          .filter((recipe) => result.evolutions.has(recipe.id))
          .map((recipe) => recipe.title)
          .join(" · ") || display.none,
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
    button.textContent = display.retry;
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
