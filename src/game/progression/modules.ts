import { moduleBalance, modules } from "../data/modules";
import type {
  ModuleDefinition,
  ModuleEffects,
  ModuleId,
  ModuleLevels,
} from "../data/modules";

export function eligibleModules(
  levels: ModuleLevels,
  capacity: number = moduleBalance.maxTypes,
): ModuleDefinition[] {
  const ownedCount = Object.values(levels).filter((level) => level > 0).length;
  return Object.values(modules).filter((module) => {
    const level = levels[module.id] ?? 0;
    return level < module.maxLevel && (level > 0 || ownedCount < capacity);
  });
}

export class Modules {
  readonly levels: ModuleLevels = {};
  pendingRewards = 0;

  reward(): void {
    if (eligibleModules(this.levels).length > 0) this.pendingRewards++;
  }

  offer(): ModuleDefinition[] {
    if (this.pendingRewards === 0) return [];
    // Both prototype types fit in one offer; no random sampling is needed yet.
    return eligibleModules(this.levels);
  }

  choose(id: ModuleId): boolean {
    if (!this.offer().some((module) => module.id === id)) return false;
    this.levels[id] = (this.levels[id] ?? 0) + 1;
    this.pendingRewards--;
    if (eligibleModules(this.levels).length === 0) this.pendingRewards = 0;
    return true;
  }
}

export function moduleEffects(levels: ModuleLevels): ModuleEffects {
  const effects: ModuleEffects = {
    penetrationBonus: 0,
    widthBonus: 0,
    aftershockRadius: 0,
    aftershockDamageFactor: 0,
    ricochetRadiusBonus: 0,
    extraRicochet: 0,
  };
  for (const module of Object.values(modules)) {
    const level = Math.min(
      module.maxLevel,
      Math.max(0, levels[module.id] ?? 0),
    );
    const current = module.levels[level - 1]?.effects;
    if (!current) continue;
    for (const key of Object.keys(current) as (keyof ModuleEffects)[]) {
      effects[key] += current[key] ?? 0;
    }
  }
  return effects;
}
