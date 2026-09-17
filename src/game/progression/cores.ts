import { coreBalance, cores, type CoreId } from "../data/cores";
import type { WeaponTraitLevels } from "../data/traits";

export class Cores {
  readonly owned = new Set<CoreId>();

  tryDrop(traits: WeaponTraitLevels, random = Math.random) {
    if (
      this.owned.size >= coreBalance.maxPerRun ||
      random() >= coreBalance.eliteDropChance
    )
      return null;
    const pool = Object.values(cores).filter(
      (core) =>
        !this.owned.has(core.id) &&
        (core.id !== "overload" ||
          Object.values(traits).some((level) => level > 0 && level < 5)),
    );
    let roll = random() * pool.reduce((sum, core) => sum + core.weight, 0);
    const picked =
      pool.find((core) => (roll -= core.weight) < 0) ?? pool.at(-1);
    if (!picked) return null;
    this.owned.add(picked.id);
    return picked;
  }
}
