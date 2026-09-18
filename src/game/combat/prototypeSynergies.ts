import { combatGeometry, combatPosition } from "../battlefield/combatGeometry";
import type { MarineGrowthState } from "../data/marineGrowth";
import {
  prototypeSynergyBalance as tune,
  prototypeSynergyDefinitions,
  type PrototypeSynergyId,
} from "../data/prototypeSynergies";
import { specialWeaponBalance } from "../data/specialWeaponBalance";
import type { SpecialWeaponState } from "../data/specialWeapons";
import type { EnemyState } from "../enemies/enemySimulation";

interface Zone {
  x: number;
  y: number;
  radius: number;
  remainingMs: number;
}
export interface SynergyVisual extends Zone {
  kind: "zone" | "hunt" | "saturation";
  targetId?: number;
}

const danger = (enemy: EnemyState) => {
  const score = specialWeaponBalance.targeting;
  return (
    (enemy.elite ? score.elite : 0) +
    (enemy.progress01 >= score.wallProgress ? score.wall : 0) +
    enemy.progress01 * score.progress +
    (enemy.kind === "runner"
      ? score.runner
      : enemy.kind === "shield"
        ? score.shield
        : 0)
  );
};
const mostDangerous = (enemies: readonly EnemyState[]) => {
  let best: EnemyState | undefined;
  for (const enemy of enemies)
    if (enemy.hp > 0 && (!best || danger(enemy) > danger(best))) best = enemy;
  return best;
};

/** Run-owned, automatically latched recipes; never part of a card pool. */
export class PrototypeSynergies {
  readonly active = new Set<PrototypeSynergyId>();
  private now = 0;
  private saturationUntil = 0;
  private recentHits = new Map<number, number>();
  private zones: Zone[] = [];
  private huntTarget: EnemyState | undefined;

  updateBuild(
    growth: MarineGrowthState,
    weapons: readonly SpecialWeaponState[],
  ): PrototypeSynergyId[] {
    const added: PrototypeSynergyId[] = [];
    for (const recipe of Object.values(prototypeSynergyDefinitions)) {
      if (
        !this.active.has(recipe.id) &&
        recipe.mods.every((id) => (growth.ranks[id] ?? 0) >= 1) &&
        recipe.completions.every((required) =>
          weapons.some(
            (weapon) =>
              weapon.id === required.id &&
              weapon.tree === required.tree &&
              weapon.branch === required.branch &&
              weapon.level >= 10,
          ),
        )
      ) {
        this.active.add(recipe.id);
        added.push(recipe.id);
      }
    }
    return added;
  }

  advance(deltaMs: number, enemies: readonly EnemyState[]): void {
    if (!Number.isFinite(deltaMs) || deltaMs < 0) return;
    this.now += deltaMs;
    for (const [id, time] of this.recentHits)
      if (this.now - time > tune.saturation.windowMs)
        this.recentHits.delete(id);
    this.zones = this.zones.filter((zone) => (zone.remainingMs -= deltaMs) > 0);
    if (this.active.has("hunt") && tune.enabled.hunt)
      this.huntTarget =
        enemies.find(
          (enemy) => enemy.id === this.huntTarget?.id && enemy.hp > 0,
        ) ?? mostDangerous(enemies);
  }

  registerHits(ids: Iterable<number>): void {
    if (!tune.enabled.saturation || !this.active.has("saturation") || this.saturation) return;
    for (const id of ids)
      if (Number.isSafeInteger(id)) this.recentHits.set(id, this.now);
    if (this.recentHits.size >= tune.saturation.distinctHits) {
      this.saturationUntil = this.now + tune.saturation.durationMs;
      this.recentHits.clear();
    }
  }

  get saturation(): boolean {
    return tune.enabled.saturation && this.now < this.saturationUntil;
  }
  get extraBurstRounds(): number {
    return this.saturation ? tune.saturation.extraBurstRounds : 0;
  }
  get grenadeExtraSubmunitions(): number {
    return this.saturation ? tune.saturation.extraSubmunitions : 0;
  }
  get missileExtraCount(): number {
    return this.saturation ? tune.saturation.extraMissiles : 0;
  }
  get focusId(): number | null {
    return tune.enabled.hunt ? this.huntTarget?.id ?? null : null;
  }

  addZone(x: number, y: number, radius: number, durationMs: number): void {
    if (
      !tune.enabled["kill-zone"] || !this.active.has("kill-zone") ||
      ![x, y, radius, durationMs].every(Number.isFinite) ||
      radius <= 0 ||
      durationMs <= 0
    )
      return;
    this.zones.push({ x, y, radius, remainingMs: durationMs });
  }

  inKillZone(enemy: EnemyState): boolean {
    const point = combatPosition(enemy);
    return (
      tune.enabled["kill-zone"] && enemy.hp > 0 &&
      this.zones.some(
        (zone) => Math.hypot(point.x - zone.x, point.y - zone.y) <= zone.radius,
      )
    );
  }

  preferredZoneTarget(enemies: readonly EnemyState[]): number | null {
    return (
      mostDangerous(enemies.filter((enemy) => this.inKillZone(enemy)))?.id ??
      null
    );
  }

  killZoneDamageMultiplier(enemy: EnemyState): number {
    return this.inKillZone(enemy) ? tune.killZoneMultiplier : 1;
  }

  huntDamageMultiplier(enemy: EnemyState): number {
    return enemy.hp > 0 && enemy.id === this.focusId ? tune.huntMultiplier : 1;
  }

  targetMultiplier(enemy: EnemyState): number {
    return (
      this.killZoneDamageMultiplier(enemy) * this.huntDamageMultiplier(enemy)
    );
  }

  get visuals(): SynergyVisual[] {
    const visuals: SynergyVisual[] = (tune.enabled["kill-zone"] ? this.zones : []).map((zone) => ({
      ...zone,
      kind: "zone",
    }));
    if (this.huntTarget && tune.enabled.hunt)
      visuals.push({
        kind: "hunt",
        ...combatPosition(this.huntTarget),
        radius: 30,
        remainingMs: 0,
        targetId: this.huntTarget.id,
      });
    if (this.saturation)
      visuals.push({
        kind: "saturation",
        x: combatGeometry.width / 2,
        y: combatGeometry.depth,
        radius: 80,
        remainingMs: this.saturationUntil - this.now,
      });
    return visuals;
  }
}
