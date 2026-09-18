import {
  marineTraitIds,
  marineUpgrades,
  type MarineUpgradeId,
} from "../data/marineGrowth";
import { specialWeaponDefinitions } from "../data/specialWeapons";
import type { MarineProgression } from "../progression/marineProgression";
import type { BalanceTelemetry } from "./BalanceTelemetry";

export type GrowthInput = Parameters<BalanceTelemetry["growth"]>[0];
export type GrowthChoiceContext = Pick<GrowthInput, "choice" | "offered">;

/** Capture only at a DEV choice boundary, before progression mutates. */
export function captureGrowth(progression: MarineProgression) {
  return {
    ranks: { ...progression.ranks },
    weapons: progression.special.weapons.map((weapon) => ({ ...weapon })),
  };
}

/** Actual applied levels include Great Success and growth resumed after a branch. */
export function recordGrowthChanges(
  progression: MarineProgression,
  before: ReturnType<typeof captureGrowth>,
  emit: (event: GrowthInput, observe?: boolean) => void,
  context: GrowthChoiceContext = {},
): void {
  for (const [key, nextLevel] of Object.entries(progression.ranks)) {
    const id = key as MarineUpgradeId;
    const previousLevel = before.ranks[id] ?? 0;
    if (nextLevel === previousLevel) continue;
    const mod = marineTraitIds.some((trait) => trait === id);
    const history = progression.history.findLast((entry) => entry.id === id);
    const event: GrowthInput = {
      kind: mod
        ? previousLevel
          ? "basic-mod-growth"
          : "basic-mod-acquisition"
        : "regular-growth",
      id,
      name: marineUpgrades[id].title,
      level: progression.level,
      previousLevel,
      nextLevel,
      rarity: history?.rarity ?? null,
      ...context,
    };
    emit(event, mod);
    if (mod && previousLevel < 10 && nextLevel >= 10)
      emit({
        ...event,
        kind: "basic-mod-completion",
        choice:
          progression.branches[id as (typeof marineTraitIds)[number]] ?? "",
      });
  }
  for (const weapon of progression.special.weapons) {
    const previousLevel =
      before.weapons.find((entry) => entry.id === weapon.id)?.level ?? 0;
    if (previousLevel === weapon.level) continue;
    const history = progression.special.history.findLast(
      (entry) => entry.weaponId === weapon.id,
    );
    const event: GrowthInput = {
      kind: previousLevel ? "special-growth" : "special-acquisition",
      id: weapon.id,
      name: specialWeaponDefinitions[weapon.id].title,
      level: progression.level,
      previousLevel,
      nextLevel: weapon.level,
      rarity: previousLevel ? (history?.rarity ?? null) : null,
      ...context,
    };
    emit(event, !previousLevel);
    if (previousLevel < 10 && weapon.level >= 10)
      emit({
        ...event,
        kind: "special-completion",
        choice: [weapon.tree, weapon.branch].filter(Boolean).join(" / "),
      });
  }
}
