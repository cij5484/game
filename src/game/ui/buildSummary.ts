import {
  specialWeaponDefinitions,
  getSpecialCompletion,
  type SpecialWeaponState,
  type SpecialWeaponId,
} from "../data/specialWeapons";
import {
  marineUpgrades,
  marineModBranches,
  marineTraitIds,
  describeMarineUpgrade,
  type MarineGrowthState,
  type MarineTraitId,
} from "../data/marineGrowth";
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
import { choiceFaces, magicLabels, levelLabel } from "../data/display";
import { activeSynergies } from "../progression/synergy";
import { evolutionRecipes, type RecipeRequirements } from "../data/evolutions";
import {
  prototypeCores,
  prototypeRelics,
  type PrototypeCoreId,
  type PrototypeRelicId,
} from "../data/highroll";
import {
  prototypeSynergyDefinitions,
  type PrototypeSynergyId,
} from "../data/prototypeSynergies";
export interface BuildIcon {
  id: string;
  owner:
    "global" | "basicWeapon" | "stimpack" | "legacyMagic" | SpecialWeaponId;
  group: "upgrade" | "trait" | "relic" | "core" | "synergy" | "evolution";
  title: string;
  symbol: string;
  level?: number;
  detail: string;
}

export function highrollBuildSummary(
  relics: ReadonlySet<PrototypeRelicId>,
  cores: ReadonlySet<PrototypeCoreId>,
  synergies: ReadonlySet<PrototypeSynergyId>,
): BuildIcon[] {
  return [
    ...[...relics].map((id) => ({
      ...prototypeRelics[id],
      group: "relic" as const,
    })),
    ...[...cores].map((id) => ({
      ...prototypeCores[id],
      group: "core" as const,
    })),
    ...[...synergies].map((id) => ({
      ...prototypeSynergyDefinitions[id],
      group: "synergy" as const,
    })),
  ].map(({ id, title, symbol, description, group }) => ({
    id,
    title,
    symbol,
    detail: description,
    group,
    owner: "global",
  }));
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
      owner: isTrait
        ? "basicWeapon"
        : card.ability === "stimpack"
          ? "stimpack"
          : card.ability === "frost-nova" || card.ability === "chain-lightning"
            ? "legacyMagic"
            : "global",
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
        owner: "global",
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
      owner: "global",
      title: cores[id].title,
      symbol: cores[id].symbol,
      detail: cores[id].description,
    });
  for (const recipe of activeSynergies(ranks, selectedSynergies))
    result.push({
      id: recipe.id,
      group: "synergy",
      owner: "global",
      title: recipe.title,
      symbol: recipe.symbol,
      detail: `선택 완료 · 조건: ${recipeCondition(recipe.requires)}\n${recipe.description}`,
    });
  for (const recipe of evolutionRecipes.filter((r) => evolutions.has(r.id)))
    result.push({
      id: recipe.id,
      group: "evolution",
      owner: "basicWeapon",
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

/** Active Marine ownership; Legacy entries remain available to their existing callers. */
export function marineBuildSummary(
  growth: MarineGrowthState,
  relicLevels: RelicLevels,
  ownedCores: ReadonlySet<CoreId>,
  specialWeapons: readonly SpecialWeaponState[] = [],
): BuildIcon[] {
  const items: BuildIcon[] = Object.values(marineUpgrades)
    .filter((card) => (growth.ranks[card.id] ?? 0) > 0)
    .map((card) => ({
      id: card.id,
      owner: card.owner,
      group: card.category === "weapon-trait" ? "trait" : "upgrade",
      title:
        card.title +
        (growth.legendary.has(card.id as MarineTraitId) ? " · 전설" : ""),
      symbol:
        card.symbol +
        (growth.legendary.has(card.id as MarineTraitId) ? "★" : ""),
      level: growth.ranks[card.id]!,
      detail: describeMarineUpgrade(card.id, growth),
    }));
  for (const id of marineTraitIds) {
    const branchId = growth.branches?.[id];
    if (!branchId || (growth.ranks[id] ?? 0) < 5) continue;
    const branch = marineModBranches[id][branchId];
    items.push({
      id: `${id}-branch`,
      owner: "basicWeapon",
      group: "trait",
      title: branch.title,
      symbol: branchId.toUpperCase(),
      detail: `${marineUpgrades[id].title} · ${levelLabel(5)} 분기 ${branchId.toUpperCase()}\n${branch.description}`,
    });
    if ((growth.ranks[id] ?? 0) >= 10)
      items.push({
        id: `${id}-complete`,
        owner: "basicWeapon",
        group: "trait",
        title: branch.completion,
        symbol: "◆",
        detail: `${marineUpgrades[id].title} · ${levelLabel(10)} 완성형 · ${branch.title}\n${levelLabel(11)} 이후에도 선택한 방향으로 성장합니다.`,
      });
  }
  return [
    ...items,
    ...buildSummary({}, relicLevels, ownedCores),
    ...specialWeapons.flatMap(specialBuildSummary),
  ];
}

export function specialBuildSummary(weapon: SpecialWeaponState): BuildIcon[] {
  const definition = specialWeaponDefinitions[weapon.id];
  const tree = definition.trees.find((t) => t.id === weapon.tree);
  const branch = weapon.branch ? tree?.branches[weapon.branch] : undefined;
  const completion = getSpecialCompletion(weapon);
  const options = [
    tree,
    branch,
    definition.transcendences.find((t) => t.id === weapon.transcendence),
    definition.overclocks.find((t) => t.id === weapon.overclock),
  ].filter((x) => x !== undefined);
  return [
    {
      id: weapon.id,
      owner: weapon.id,
      group: "upgrade",
      title: definition.title,
      symbol: definition.symbol,
      level: weapon.level,
      detail: definition.description,
    },
    ...options.map((option) => ({
      id: `${weapon.id}-${option.id}`,
      owner: weapon.id,
      group: "upgrade" as const,
      title: option.title,
      symbol: option.symbol,
      detail: option.description,
    })),
    ...(completion
      ? [
          {
            id: `${weapon.id}-complete`,
            owner: weapon.id,
            group: "upgrade" as const,
            title: completion,
            symbol: "★",
            detail: "Lv10 완성형 · 선택한 주요 트리와 세부 분기의 행동 강화",
          },
        ]
      : []),
  ];
}
