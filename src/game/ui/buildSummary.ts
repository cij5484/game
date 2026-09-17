import { upgrades, type UpgradeRanks } from "../data/upgrades";
import {
  weaponTraits,
  weaponTraitIds,
  traitLevel,
  type WeaponTraitId,
} from "../data/traits";
import { abilityGrowth, abilityLevel } from "../data/abilityGrowth";
import type { GrowthBranches } from "../data/growth";
import { relics, type RelicLevels } from "../data/relics";
import { cores, type CoreId } from "../data/cores";
import { choiceFaces, magicLabels } from "../data/display";
import { activeSynergies } from "../progression/synergy";
import { evolutionRecipes, type RecipeRequirements } from "../data/evolutions";
export interface BuildIcon {
  id: string;
  group: "upgrade" | "trait" | "relic" | "core" | "synergy" | "evolution";
  title: string;
  symbol: string;
  level?: number;
  detail: string;
}
export function buildSummary(
  ranks: UpgradeRanks,
  levels: RelicLevels,
  ownedCores: ReadonlySet<CoreId>,
  evolutions: ReadonlySet<string> = new Set(),
  branches: GrowthBranches = {},
  selectedSynergies: ReadonlySet<string> = new Set(),
): BuildIcon[] {
  const result: BuildIcon[] = [];
  for (const card of Object.values(upgrades)) {
    const level = ranks[card.id] ?? 0;
    if (!level) continue;
    const isTrait = weaponTraitIds.includes(card.id as WeaponTraitId);
    const branch = branches[card.id];
    const track = isTrait
      ? weaponTraits[card.id as WeaponTraitId]
      : card.id in abilityGrowth
        ? abilityGrowth[card.id as keyof typeof abilityGrowth]
        : undefined;
    const row = track
      ? isTrait
        ? traitLevel(card.id as WeaponTraitId, level, branch)
        : abilityLevel(card.id as keyof typeof abilityGrowth, level, branch)
      : undefined;
    result.push({
      id: card.id,
      group: isTrait ? "trait" : "upgrade",
      title:
        card.title +
        (track && branch ? ` · ${track.branches[branch].title}` : ""),
      symbol: choiceFaces[card.id]!.symbol,
      level,
      detail: row?.description ?? card.description,
    });
  }
  for (const relic of Object.values(relics)) {
    const level = levels[relic.id] ?? 0;
    if (level > 0)
      result.push({
        id: relic.id,
        group: "relic",
        title: relic.title,
        symbol: choiceFaces[relic.id]!.symbol,
        level,
        detail: relic.levels[Math.min(5, level) - 1]!.description,
      });
  }
  for (const id of ownedCores)
    result.push({
      id,
      group: "core",
      title: cores[id].title,
      symbol: cores[id].symbol,
      detail: cores[id].description,
    });
  for (const recipe of activeSynergies(ranks, selectedSynergies))
    result.push({
      id: recipe.id,
      group: "synergy",
      title: recipe.title,
      symbol: recipe.symbol,
      detail: `선택 완료 · 조건: ${recipeCondition(recipe.requires)}\n${recipe.description}`,
    });
  for (const recipe of evolutionRecipes.filter((r) => evolutions.has(r.id)))
    result.push({
      id: recipe.id,
      group: "evolution",
      title: recipe.title,
      symbol: "⇶",
      detail: `조건: ${recipeCondition(recipe.requires)}\n추가 관통 +${recipe.effects.penetrationBonus} · 관통 폭 ×${recipe.effects.penetrationWidthMultiplier}`,
    });
  return result;
}
export function recipeCondition(requires: RecipeRequirements) {
  return [
    ...Object.entries(requires.traits ?? {}).map(
      ([id, n]) => `${weaponTraits[id as WeaponTraitId]?.title ?? id} Lv.${n}`,
    ),
    ...Object.entries(requires.relics ?? {}).map(
      ([id, n]) => `${relics[id as keyof typeof relics]?.title ?? id} Lv.${n}`,
    ),
    ...Object.entries(requires.upgrades ?? {}).map(
      ([id, n]) =>
        `${upgrades[id as keyof UpgradeRanks]?.title ?? id} ${n}단계`,
    ),
    ...Object.keys(requires.magic ?? {}).map(
      (id) => `${magicLabels[id as keyof typeof magicLabels] ?? id} 장착`,
    ),
  ].join(" + ");
}
