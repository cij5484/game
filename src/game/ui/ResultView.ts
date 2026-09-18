import type { RunSettlement } from "../meta/metaSave";
import { operationRecords } from "../data/operations";
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
  eliteKills?: number;
  settlement?: RunSettlement;
  settlementError?: string;
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

  show(
    result: RunResult,
    retry: () => void,
    main?: () => void,
    retrySettlement?: () => void,
  ): void {
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
      ["정예 처치", String(result.eliteKills ?? 0)],
      ...(result.settlement
        ? [
            [
              "획득 Gold / Credits",
              `${result.settlement.reward.gold} / ${result.settlement.reward.credits}`,
            ],
            [
              "보유 Gold / Credits",
              `${result.settlement.save.account.gold} / ${result.settlement.save.account.credits}`,
            ],
          ]
        : []),
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
    this.dialog.append(title, stats);
    const operations = result.settlement?.operations;
    if (operations) {
      const summary = document.createElement("section");
      summary.setAttribute("aria-label", "이번 Run 작전 기록");
      const heading = document.createElement("h3");
      heading.textContent = `이번 Run 작전 기록 완료 ${operations.completed.length} · 숙련 +${operations.points}`;
      const completed = document.createElement("p");
      completed.textContent =
        operations.completed
          .map(
            (id) => operationRecords.find((record) => record.id === id)!.title,
          )
          .join(" · ") || "새 완료 기록 없음";
      const unlocked = document.createElement("p");
      unlocked.textContent = `신규 해금: ${operations.unlocked.join(" · ") || "없음"}`;
      summary.append(heading, completed, unlocked);
      this.dialog.append(summary);
    }
    const actions = document.createElement("div");
    const addAction = (label: string, run: () => void) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => {
        for (const action of actions.querySelectorAll("button"))
          action.disabled = true;
        run();
      });
      actions.append(button);
    };
    if (result.settlementError) {
      const error = document.createElement("p");
      error.setAttribute("role", "alert");
      error.textContent = `보상 저장 실패: ${result.settlementError}`;
      this.dialog.append(error);
      if (retrySettlement) addAction("보상 저장 다시 시도", retrySettlement);
      if (main)
        addAction("보상 포기 · 메인으로", () => {
          if (
            window.confirm("저장되지 않은 보상을 포기하고 메인으로 이동할까요?")
          )
            main();
          else
            for (const action of actions.querySelectorAll("button"))
              action.disabled = false;
        });
    } else {
      addAction(display.retry, retry);
      if (main) addAction("메인으로", main);
    }
    this.dialog.append(actions);
    if (!this.dialog.open) this.dialog.showModal();
  }

  destroy(): void {
    this.dialog.remove();
  }
}
