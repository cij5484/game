import { upgrades, type UpgradeRanks } from "../data/upgrades";
import {
  weaponTraitIds,
  weaponTraits,
  type WeaponTraitId,
} from "../data/traits";
import { relics, type RelicLevels } from "../data/relics";
import { cores, type CoreId } from "../data/cores";
import { choiceFaces } from "../data/display";

export interface BuildIcon {
  id: string;
  group: "upgrade" | "trait" | "relic" | "core";
  title: string;
  symbol: string;
  level?: number;
  detail: string;
}

const groups = {
  damage: { title: "공격력 강화", symbol: "⚔" },
  speed: { title: "공격 속도 강화", symbol: "»" },
  critical: { title: "치명타 확률 강화", symbol: "✦" },
  stim: { title: "스팀팩 강화", symbol: "+" },
  frost: { title: "서리장 강화", symbol: "❄" },
  lightning: { title: "번개 강화", symbol: "ϟ" },
  weapon: { title: "특수 무기 강화", symbol: "✧" },
};

export function buildSummary(
  ranks: UpgradeRanks,
  levels: RelicLevels,
  ownedCores: ReadonlySet<CoreId>,
): BuildIcon[] {
  const result: BuildIcon[] = [];
  const grouped = new Map<keyof typeof groups, BuildIcon>();
  for (const card of Object.values(upgrades)) {
    const rank = ranks[card.id] ?? 0;
    if (rank <= 0 || weaponTraitIds.includes(card.id as WeaponTraitId))
      continue;
    const key =
      card.id === "primary-damage"
        ? "damage"
        : card.id === "attack-speed"
          ? "speed"
          : card.id.startsWith("crit-")
            ? "critical"
            : card.tag === "stim"
              ? "stim"
              : card.tag === "frost"
                ? "frost"
                : card.tag === "lightning"
                  ? "lightning"
                  : "weapon";
    const group = grouped.get(key) ?? {
      id: key,
      group: "upgrade",
      ...groups[key],
      level: 0,
      detail: "",
    };
    group.level = (group.level ?? 0) + rank;
    group.detail += `${card.title} ${rank}레벨: ${card.description}\n`;
    grouped.set(key, group);
  }
  result.push(...grouped.values());
  for (const id of weaponTraitIds) {
    const level = ranks[id] ?? 0;
    if (level > 0)
      result.push({
        id,
        group: "trait",
        title: weaponTraits[id].title,
        symbol: choiceFaces[id].symbol,
        level,
        detail: weaponTraits[id].levels[level - 1]!.description,
      });
  }
  for (const relic of Object.values(relics)) {
    const level = levels[relic.id] ?? 0;
    if (level > 0)
      result.push({
        id: relic.id,
        group: "relic",
        title: relic.title,
        symbol: choiceFaces[relic.id].symbol,
        level,
        detail: relic.levels[level - 1]!.description,
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
  return result;
}
