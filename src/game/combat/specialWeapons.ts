import { combatGeometry, combatPosition } from "../battlefield/combatGeometry";
import { getMarineStats, type MarineGrowthState } from "../data/marineGrowth";
import {
  getSpecialWeaponStats,
  specialWeaponBalance as tune,
} from "../data/specialWeaponBalance";
import type {
  SpecialWeaponId,
  SpecialWeaponState,
} from "../data/specialWeapons";
import type { EnemyState } from "../enemies/enemySimulation";
import { applyPrimaryDamage } from "./damage";
import { highrollBalance, type PrototypeRelicId } from "../data/highroll";
import { applyImpact, precisionBonus, startAction } from "./actionRelics";
import type { PrototypeSynergies } from "./prototypeSynergies";

type Point = { x: number; y: number };
export interface SpecialEffect extends Point {
  kind: "explosion" | "shot" | "pull";
  weapon: SpecialWeaponId;
  radius?: number;
  toX?: number;
  toY?: number;
}
export interface SpecialVisual extends Point {
  id: number;
  kind: "grenade" | "missile" | "drone";
  size?: number;
}
export interface SpecialContext {
  weapons: readonly SpecialWeaponState[];
  growth: MarineGrowthState;
  enemies: readonly EnemyState[];
  focusId: number | null;
  random?: () => number;
  relics?: ReadonlySet<PrototypeRelicId>;
  synergy?: PrototypeSynergies;
}
export interface SpecialResult {
  enemies: readonly EnemyState[];
  effects: SpecialEffect[];
}
type Stats = ReturnType<typeof getSpecialWeaponStats>;
interface Grenade extends SpecialVisual {
  kind: "grenade";
  target: Point;
  from: Point;
  elapsed: number;
  delay: number;
  weapon: SpecialWeaponState;
  damage: number;
  radius: number;
  corrected: boolean;
  extraSubmunitions: number;
}
interface Missile extends SpecialVisual {
  kind: "missile";
  targetId: number;
  weapon: SpecialWeaponState;
  damage: number;
  lifetime: number;
  retargets: number;
  chains: number;
  hits: Set<number>;
  reservedDamage: number;
  maxLifetime: number;
  recoveries: number;
  speedBoostMs: number;
  rearmMs: number;
  hitsLeft: number;
}
interface MissileSalvo {
  weapon: SpecialWeaponState;
  stats: Stats;
  damageMultiplier: number;
  count: number;
  launched: number;
  interval: number;
  delay: number;
  assigned: Set<number> | undefined;
}
interface Drone extends SpecialVisual {
  kind: "drone";
  cooldown: number;
  targetId: number | null;
}
interface Area extends Point {
  delay: number;
  damage: number;
  radius: number;
  pull: number;
  ticks: number;
  interval: number;
  bypass: number;
}
const origin = { x: combatGeometry.width / 2, y: combatGeometry.depth };
const noRelics = new Set<PrototypeRelicId>();
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const complete = (w: SpecialWeaponState) => w.level >= 10;
const branch = (w: SpecialWeaponState, id: string, path: "a" | "b") =>
  w.tree === id && w.branch === path;
const grenadeTune = tune.grenadeBehavior;
const missileTune = tune.missileBehavior;
const droneTune = tune.droneBehavior;
const indexEnemies = (enemies: readonly EnemyState[]) => {
  const indices = new Map<number, number>();
  for (let i = 0; i < enemies.length; i++) indices.set(enemies[i]!.id, i);
  return indices;
};
const danger = (e: EnemyState) =>
  (e.elite ? tune.targeting.elite : 0) +
  (e.progress01 >= tune.targeting.wallProgress ? tune.targeting.wall : 0) +
  e.progress01 * tune.targeting.progress +
  (e.kind === "runner"
    ? tune.targeting.runner
    : e.kind === "shield"
      ? tune.targeting.shield
      : 0);

/** Event targeting is O(N); in-flight missiles reuse validated enemy indices. */
export class SpecialWeapons {
  private serial = 0;
  private grenades: Grenade[] = [];
  private missiles: Missile[] = [];
  private salvo: MissileSalvo | undefined;
  private reservations = new Map<number, number>();
  private drones: Drone[] = [];
  private areas: Area[] = [];
  private cooldown = { grenade: 0, missile: 0 };
  private marks = new Map<number, { remaining: number; multiplier: number }>();
  private enemyIndices = new Map<number, number>();
  private missilePressure = { targetId: -1, hits: 0 };

  get activeUnitCount(): number {
    let count = this.missiles.length + this.drones.length;
    for (const grenade of this.grenades) if (grenade.delay <= 0) count++;
    return count;
  }

  get visuals(): SpecialVisual[] {
    return [
      ...this.grenades.filter((g) => g.delay <= 0),
      ...this.missiles,
      ...this.drones,
    ].map(({ id, kind, x, y, size }) => ({
      id,
      kind,
      x,
      y,
      ...(size === undefined ? {} : { size }),
    }));
  }

  gaussDamageMultiplier(targetId: number) {
    return this.marks.get(targetId)?.multiplier ?? 1;
  }

  advance(deltaMs: number, context: SpecialContext): SpecialResult {
    const result: SpecialResult = {
      enemies: context.enemies,
      effects: [],
    };
    if (!Number.isFinite(deltaMs) || deltaMs < 0) return result;
    let indexed = false;
    const enemyIndex = (id: number) => {
      const cached = this.enemyIndices.get(id);
      if (cached !== undefined && result.enemies[cached]?.id === id)
        return cached;
      if (!indexed) {
        this.enemyIndices = indexEnemies(result.enemies);
        indexed = true;
      }
      return this.enemyIndices.get(id);
    };
    for (const [id, mark] of this.marks) {
      mark.remaining -= deltaMs;
      if (
        mark.remaining <= 0 ||
        !((result.enemies[enemyIndex(id) ?? -1]?.hp ?? 0) > 0)
      )
        this.marks.delete(id);
    }
    const drone = context.weapons.find((w) => w.id === "drone");
    this.prepareDrones(drone);
    // ponytail: at most 50ms internal steps for visible homing; no physics system needed.
    let remaining = deltaMs;
    do {
      const step = Math.min(50, remaining);
      for (const weapon of context.weapons) {
        if (weapon.id === "drone")
          this.fireDrones(weapon, step, context, result);
        else {
          this.cooldown[weapon.id] = Math.max(
            0,
            this.cooldown[weapon.id] - step,
          );
          if (
            this.cooldown[weapon.id] === 0 &&
            (weapon.id !== "missile" || !this.salvo) &&
            result.enemies.some((e) => e.hp > 0)
          ) {
            const stats = getSpecialWeaponStats(weapon, context.growth);
            if (weapon.id === "grenade")
              this.throwGrenades(weapon, stats, context, result);
            else this.launchMissiles(weapon, stats, context, result);
          }
        }
      }
      this.advanceAreas(step, context, result);
      this.advanceGrenades(step, context, result);
      this.advanceMissileSalvo(step, context, result, enemyIndex);
      remaining -= step;
    } while (remaining > 0);
    return result;
  }

  /** Called only for a real Gauss round. Special damage never calls this hook. */
  onPrimary(targetId: number, context: SpecialContext): SpecialResult {
    const result: SpecialResult = {
      enemies: context.enemies,
      effects: [],
    };
    const weapon = context.weapons.find((w) => w.id === "drone");
    if (!weapon) return result;
    const mirror = branch(weapon, "escort", "a");
    const sync = weapon.overclock === "synchronization";
    if (!mirror && !sync) return result;
    this.prepareDrones(weapon);
    const stats = getSpecialWeaponStats(weapon, context.growth);
    const index = result.enemies.findIndex((e) => e.id === targetId);
    for (const drone of this.drones) {
      const target = result.enemies[index];
      if (target && target.hp > 0)
        this.droneHit(
          drone,
          target,
          weapon,
          stats,
          context,
          result,
          sync
            ? droneTune.synchronizationDamage
            : droneTune.escort.mirrorDamage[Number(complete(weapon))]!,
        );
    }
    return result;
  }

  private replaceEnemy(
    result: SpecialResult,
    context: SpecialContext,
    index: number,
    enemy: EnemyState,
  ) {
    // Only a changed result owns its array; input snapshots stay readonly.
    const enemies =
      result.enemies === context.enemies
        ? [...result.enemies]
        : (result.enemies as EnemyState[]);
    enemies[index] = enemy;
    result.enemies = enemies;
  }

  private critical(stats: Stats, context: SpecialContext) {
    return (context.random ?? Math.random)() <
      Math.min(
        1,
        stats.criticalChance + precisionBonus(context.relics ?? noRelics),
      )
      ? tune.criticalMultiplier +
          (context.growth.meta?.criticalMultiplierBonus ?? 0)
      : 1;
  }

  private cycleMultiplier(context: SpecialContext) {
    return context.relics?.has("loader")
      ? highrollBalance.loaderCycleMultiplier
      : 1;
  }

  private hit(
    enemy: EnemyState,
    damage: number,
    bypass: number,
    context: SpecialContext,
    weapon: SpecialWeaponId,
  ) {
    const multiplier =
      weapon === "grenade"
        ? 1
        : (context.synergy?.huntDamageMultiplier(enemy) ?? 1) *
          (weapon === "drone"
            ? (context.synergy?.killZoneDamageMultiplier(enemy) ?? 1)
            : 1);
    const threatMultiplier =
      enemy.elite || enemy.boss
        ? (context.growth.meta?.eliteBossDamageMultiplier ?? 1)
        : 1;
    const next = applyPrimaryDamage(
      enemy,
      damage * multiplier * threatMultiplier,
      bypass,
    );
    if (next.hp < enemy.hp || (next.shieldHp ?? 0) < (enemy.shieldHp ?? 0))
      context.synergy?.registerHits([enemy.id]);
    return applyImpact(
      [enemy],
      [next],
      context.relics ?? noRelics,
      context.random,
    )[0]!;
  }

  private target(
    enemies: readonly EnemyState[],
    focusId: number | null,
    excluded?: ReadonlySet<number>,
    from?: Point,
    forward = false,
  ) {
    let best: EnemyState | undefined;
    let score = -Infinity;
    for (const enemy of enemies) {
      if (enemy.hp <= 0 || excluded?.has(enemy.id)) continue;
      const value =
        danger(enemy) +
        (enemy.id === focusId ? tune.targeting.focus : 0) +
        (from
          ? -distance(from, combatPosition(enemy)) * tune.targeting.distance
          : 0) +
        (forward ? (1 - enemy.progress01) * tune.targeting.forward : 0);
      if (value > score) {
        score = value;
        best = enemy;
      }
    }
    return best;
  }

  private denseAreas(enemies: readonly EnemyState[]): Point[] {
    const bins = new Map<string, { x: number; y: number; count: number }>();
    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      const point = combatPosition(enemy);
      const key = `${Math.floor(point.x / tune.targeting.binSize)},${Math.floor(point.y / tune.targeting.binSize)}`;
      const bin = bins.get(key) ?? { x: 0, y: 0, count: 0 };
      bin.x += point.x;
      bin.y += point.y;
      bin.count++;
      bins.set(key, bin);
    }
    // Fixed battlefield bins (at most 40), not enemy-pair comparisons.
    return [...bins.values()]
      .sort((a, b) => b.count - a.count)
      .map((bin) => ({ x: bin.x / bin.count, y: bin.y / bin.count }));
  }

  private throwGrenades(
    weapon: SpecialWeaponState,
    stats: Stats,
    context: SpecialContext,
    result: SpecialResult,
  ) {
    const points = this.denseAreas(result.enemies);
    if (!points.length) return;
    const action = startAction(context.relics ?? noRelics, context.random);
    const barrage = weapon.overclock === "barrage",
      triple = weapon.overclock === "triple";
    const count = barrage
      ? grenadeTune.barrage.count
      : triple
        ? grenadeTune.triple.count
        : 1;
    const nuclear = weapon.overclock === "nuclear";
    this.cooldown.grenade =
      stats.cycleMs *
      (nuclear ? grenadeTune.nuclear.cycle : 1) *
      this.cycleMultiplier(context);
    for (let i = 0; i < count; i++) {
      const anchor = points[i % points.length]!;
      const point =
        triple && points.length < 3
          ? {
              x: Math.max(
                20,
                Math.min(628, anchor.x + (i - 1) * grenadeTune.triple.spacing),
              ),
              y: anchor.y,
            }
          : anchor;
      this.grenades.push({
        id: ++this.serial,
        kind: "grenade",
        ...origin,
        from: origin,
        target: point,
        elapsed: 0,
        delay: barrage ? i * grenadeTune.barrage.intervalMs : 0,
        weapon: { ...weapon },
        damage:
          stats.damage *
          action.damageMultiplier *
          this.critical(stats, context) *
          (nuclear
            ? grenadeTune.nuclear.damage
            : barrage
              ? grenadeTune.barrage.damage
              : 1),
        radius:
          stats.radius *
          (nuclear
            ? grenadeTune.nuclear.radius
            : barrage
              ? grenadeTune.barrage.radius
              : 1),
        corrected: false,
        extraSubmunitions: context.synergy?.grenadeExtraSubmunitions ?? 0,
        size: nuclear ? 1.6 : 1,
      });
    }
  }

  private advanceGrenades(
    delta: number,
    context: SpecialContext,
    result: SpecialResult,
  ) {
    this.grenades = this.grenades.filter((g) => {
      if (g.delay > 0) {
        g.delay -= delta;
        return true;
      }
      g.elapsed += delta;
      if (
        g.weapon.transcendence === "smart-fuse" &&
        !g.corrected &&
        g.elapsed >= tune.grenadeFlightMs * grenadeTune.smartFuseCheck &&
        !result.enemies.some(
          (e) => e.hp > 0 && distance(combatPosition(e), g.target) < g.radius,
        )
      ) {
        const next = this.denseAreas(result.enemies)[0];
        if (next) {
          g.from = { x: g.x, y: g.y };
          g.target = next;
          g.elapsed = 0;
          g.corrected = true;
        }
      }
      const t = Math.min(1, g.elapsed / tune.grenadeFlightMs);
      g.x = g.from.x + (g.target.x - g.from.x) * t;
      g.y = g.from.y + (g.target.y - g.from.y) * t;
      if (g.elapsed < tune.grenadeFlightMs) return true;
      this.grenadeImpact(g, context, result);
      return false;
    });
  }

  private grenadeImpact(
    g: Grenade,
    context: SpecialContext,
    result: SpecialResult,
  ) {
    const w = g.weapon,
      done = complete(w);
    let damage = g.damage,
      radius = g.radius;
    if (w.tree === "high-explosive") {
      damage *= grenadeTune.highExplosive.damage;
      radius *= grenadeTune.highExplosive.radius;
      if (w.branch === "a") {
        radius *= grenadeTune.highExplosive.largeRadius[Number(done)]!;
        damage *= grenadeTune.highExplosive.largeDamage[Number(done)]!;
      }
      if (w.branch === "b") {
        damage *= grenadeTune.highExplosive.siegeDamage;
        radius *= grenadeTune.highExplosive.siegeRadius;
      }
    }
    if (w.transcendence === "magnetic")
      this.area(
        {
          ...g.target,
          damage: 0,
          radius: radius * grenadeTune.magnetic.radius,
          pull: grenadeTune.magnetic.pull,
          bypass: 0,
        },
        context,
        result,
      );
    if (w.tree === "tactical") {
      if (done && w.branch === "a")
        context.synergy?.addZone(
          g.target.x,
          g.target.y,
          radius * grenadeTune.tactical.radius,
          grenadeTune.tactical.tickMs * grenadeTune.tactical.ticks[2],
        );
      this.area(
        {
          ...g.target,
          damage: damage * grenadeTune.tactical.damage,
          radius: radius * grenadeTune.tactical.radius,
          pull: grenadeTune.tactical.pull,
          bypass: 0,
        },
        context,
        result,
      );
      if (w.branch === "b") {
        this.areas.push({
          ...g.target,
          delay: grenadeTune.tactical.collapseDelayMs[Number(done)]!,
          damage: damage * grenadeTune.tactical.collapseDamage[Number(done)]!,
          radius: radius * grenadeTune.tactical.collapseRadius,
          pull: 0,
          ticks: 1,
          interval: 0,
          bypass: grenadeTune.tactical.collapseBypass,
        });
      } else {
        this.areas.push({
          ...g.target,
          delay: grenadeTune.tactical.tickMs,
          damage: damage * grenadeTune.tactical.tickDamage,
          radius: radius * grenadeTune.tactical.radius,
          pull: grenadeTune.tactical.tickPull[Number(done)]!,
          ticks: grenadeTune.tactical.ticks[done ? 2 : w.branch ? 1 : 0],
          interval: grenadeTune.tactical.tickMs,
          bypass: 0,
        });
      }
    } else {
      this.area(
        { ...g.target, damage, radius, pull: 0, bypass: 0 },
        context,
        result,
      );
      if (branch(w, "high-explosive", "b"))
        this.area(
          {
            ...g.target,
            damage:
              damage * grenadeTune.highExplosive.coreDamage[Number(done)]!,
            radius: radius * grenadeTune.highExplosive.coreRadius,
            pull: 0,
            bypass: grenadeTune.highExplosive.bypass[Number(done)]!,
          },
          context,
          result,
        );
      if (w.tree === "cluster") {
        const heavy = w.branch === "b";
        const count =
          (heavy
            ? grenadeTune.cluster.heavyCount
            : grenadeTune.cluster.count[done ? 2 : w.branch ? 1 : 0]) +
          (done && w.branch === "a" ? g.extraSubmunitions : 0);
        for (let i = 0; i < count; i++) {
          const angle = (i * Math.PI * 2) / count;
          this.areas.push({
            x: Math.max(
              0,
              Math.min(
                648,
                g.target.x +
                  Math.cos(angle) *
                    radius *
                    (heavy ? grenadeTune.cluster.heavySpread : 1),
              ),
            ),
            y: Math.max(
              0,
              Math.min(1075, g.target.y + Math.sin(angle) * radius),
            ),
            delay:
              grenadeTune.cluster.delayMs +
              i *
                (heavy
                  ? grenadeTune.cluster.heavyIntervalMs
                  : grenadeTune.cluster.intervalMs),
            damage:
              damage *
              (heavy
                ? grenadeTune.cluster.heavyDamage[Number(done)]!
                : grenadeTune.cluster.damage),
            radius:
              radius *
              (heavy
                ? grenadeTune.cluster.heavyRadius
                : grenadeTune.cluster.radius),
            pull: 0,
            ticks: 1,
            interval: 0,
            bypass: 0,
          });
        }
      }
    }
    if (w.transcendence === "aftershock")
      this.areas.push({
        ...g.target,
        delay: grenadeTune.aftershock.delayMs,
        damage: damage * grenadeTune.aftershock.damage,
        radius: radius * grenadeTune.aftershock.radius,
        pull: 0,
        ticks: 1,
        interval: 0,
        bypass: 0,
      });
  }

  private advanceAreas(
    delta: number,
    context: SpecialContext,
    result: SpecialResult,
  ) {
    this.areas = this.areas.filter((area) => {
      area.delay -= delta;
      if (area.delay > 0) return true;
      this.area(area, context, result);
      area.ticks--;
      area.delay += area.interval;
      return area.ticks > 0;
    });
  }

  private area(
    area: Point & {
      damage: number;
      radius: number;
      pull: number;
      bypass: number;
    },
    context: SpecialContext,
    result: SpecialResult,
    weapon: SpecialWeaponId = "grenade",
  ) {
    result.effects.push({
      kind: area.pull ? "pull" : "explosion",
      weapon,
      x: area.x,
      y: area.y,
      radius: area.radius,
    });
    result.enemies = result.enemies.map((enemy) => {
      if (enemy.hp <= 0 || distance(combatPosition(enemy), area) > area.radius)
        return enemy;
      let next = this.hit(enemy, area.damage, area.bypass, context, weapon);
      if (area.pull && !next.boss) {
        const old = combatPosition(next);
        const x = Math.max(
          0,
          Math.min(647.999, old.x + (area.x - old.x) * area.pull),
        );
        const lane = Math.floor(x / 216);
        next = {
          ...next,
          lane: (["left", "center", "right"] as const)[lane]!,
          offset01: (x - lane * 216) / 216,
          progress01: Math.max(
            0,
            Math.min(1, (old.y + (area.y - old.y) * area.pull) / 1075),
          ),
        };
        next.phase = next.progress01 >= 1 ? "attacking" : "moving";
      }
      return next;
    });
  }

  private launchMissiles(
    weapon: SpecialWeaponState,
    stats: Stats,
    context: SpecialContext,
    result: SpecialResult,
  ) {
    const saturation = weapon.tree === "saturation";
    const network = weapon.overclock === "network";
    const count =
      missileTune.baseSalvoCount +
      (saturation
        ? missileTune.saturation.additionalCount[
            complete(weapon) ? 2 : weapon.branch ? 1 : 0
          ]!
        : 0) +
      (network ? missileTune.network.additionalCount : 0) +
      (branch(weapon, "saturation", "a") && complete(weapon)
        ? (context.synergy?.missileExtraCount ?? 0)
        : 0);
    const action = startAction(context.relics ?? noRelics, context.random);
    this.salvo = {
      weapon: { ...weapon },
      stats,
      count,
      launched: 0,
      damageMultiplier:
        action.damageMultiplier *
        (network ? missileTune.network.damage : 1) *
        (saturation ? missileTune.saturation.damage : 1),
      interval: missileTune.salvoIntervalMs,
      delay: 0,
      assigned:
        network || (saturation && weapon.branch !== "b")
          ? new Set()
          : undefined,
    };
    // A single pending salvo bounds the queue even below its firing duration.
    this.cooldown.missile = Math.max(
      stats.cycleMs * this.cycleMultiplier(context),
      (count - 1) * this.salvo.interval,
    );
    this.launchSalvoRound(context, result);
  }

  private missileThreat(enemy: EnemyState) {
    return (
      !!enemy.boss ||
      !!enemy.elite ||
      enemy.kind !== "grunt" ||
      enemy.progress01 >= tune.targeting.wallProgress
    );
  }

  private missileTarget(
    enemies: readonly EnemyState[],
    weapon: SpecialWeaponState,
    context: SpecialContext,
    from: Point,
    assigned?: ReadonlySet<number>,
  ) {
    let best: EnemyState | undefined, fallback: EnemyState | undefined;
    let bestScore = -Infinity,
      fallbackScore = -Infinity;
    const focus = context.focusId ?? context.synergy?.focusId ?? null;
    for (const enemy of enemies) {
      if (
        enemy.hp <= 0 ||
        (missileTune.damageReservation &&
          enemy.hp + (enemy.shieldHp ?? 0) <=
            (this.reservations.get(enemy.id) ?? 0))
      )
        continue;
      const score =
        danger(enemy) +
        (enemy.boss ? missileTune.bossPriority : 0) +
        (weapon.tree === "hunter" && this.missileThreat(enemy)
          ? missileTune.hunter.threatPriority
          : 0) +
        (enemy.id === focus ? tune.targeting.focus : 0) -
        distance(from, combatPosition(enemy)) * tune.targeting.distance;
      if (score > fallbackScore) {
        fallbackScore = score;
        fallback = enemy;
      }
      if (!assigned?.has(enemy.id) && score > bestScore) {
        bestScore = score;
        best = enemy;
      }
    }
    // Spread first, then reuse a high-HP target that still needs damage.
    return best ?? fallback;
  }

  private missileDamage(
    missile: Missile,
    target: EnemyState,
    consecutive: number,
  ) {
    const w = missile.weapon;
    let damage = missile.damage;
    if (w.tree === "hunter")
      damage *= this.missileThreat(target)
        ? missileTune.hunter.threatDamage
        : missileTune.hunter.gruntDamage;
    if (branch(w, "hunter", "b"))
      damage *=
        1 + consecutive * missileTune.hunter.pressure[Number(complete(w))]!;
    if (w.transcendence === "weakpoint-lock")
      damage *= 1 + consecutive * missileTune.weakpointPressure;
    if (w.overclock === "hunting" && this.missileThreat(target))
      damage *=
        missileTune.hunting.damage + consecutive * missileTune.hunting.pressure;
    return damage;
  }

  private reserveMissile(
    missile: Missile,
    target: EnemyState,
    context: SpecialContext,
  ) {
    missile.targetId = target.id;
    missile.reservedDamage =
      this.missileDamage(
        missile,
        target,
        Math.min(
          missileTune.pressureCap,
          this.missilePressure.targetId === target.id
            ? this.missilePressure.hits
            : 0,
        ),
      ) *
      (context.synergy?.huntDamageMultiplier(target) ?? 1) *
      (target.elite || target.boss
        ? (context.growth.meta?.eliteBossDamageMultiplier ?? 1)
        : 1) *
      (target.incomingDamageMultiplier ?? 1);
    this.reservations.set(
      target.id,
      (this.reservations.get(target.id) ?? 0) + missile.reservedDamage,
    );
  }

  private releaseMissile(missile: Missile) {
    const remaining =
      (this.reservations.get(missile.targetId) ?? 0) - missile.reservedDamage;
    if (remaining > 1e-8) this.reservations.set(missile.targetId, remaining);
    else this.reservations.delete(missile.targetId);
    missile.reservedDamage = 0;
  }

  private redirectMissile(
    missile: Missile,
    target: EnemyState,
    context: SpecialContext,
  ) {
    this.reserveMissile(missile, target, context);
    if (missile.weapon.transcendence === "emergency-retarget") {
      missile.speedBoostMs = missileTune.emergencySpeedMs;
      if (missile.recoveries > 0) {
        missile.recoveries--;
        missile.lifetime = Math.min(
          missile.maxLifetime,
          missile.lifetime + missileTune.emergencyLifetimeRecoveryMs,
        );
      }
    }
  }

  private launchSalvoRound(context: SpecialContext, result: SpecialResult) {
    const salvo = this.salvo!;
    const w = salvo.weapon;
    const target = this.missileTarget(
      result.enemies,
      w,
      context,
      origin,
      salvo.assigned,
    );
    const i = salvo.launched++;
    if (target) {
      salvo.assigned?.add(target.id);
      const immortal = w.overclock === "immortal";
      const phoenix = branch(w, "tracking", "b");
      const done = Number(complete(w));
      const lifetime =
        tune.missileLifetimeMs *
        Math.max(
          w.tree === "tracking" ? missileTune.tracking.lifetimeMultiplier : 1,
          immortal ? missileTune.immortal.lifetimeMultiplier : 1,
        );
      const chains = immortal
        ? missileTune.immortal.chains
        : branch(w, "tracking", "a")
          ? missileTune.tracking.chains[done]!
          : branch(w, "hunter", "a")
            ? missileTune.hunter.chains[done]!
            : 0;
      const missile: Missile = {
        id: ++this.serial,
        kind: "missile",
        weapon: w,
        x: origin.x + ((i % 3) - 1) * 14,
        y: origin.y,
        targetId: target.id,
        damage:
          salvo.stats.damage *
          salvo.damageMultiplier *
          this.critical(salvo.stats, context),
        lifetime,
        maxLifetime: lifetime,
        retargets:
          missileTune.baseRetargets +
          (w.tree === "tracking"
            ? phoenix
              ? missileTune.tracking.phoenixRetargets[done]!
              : missileTune.tracking.retargets
            : 0) +
          (w.transcendence === "emergency-retarget"
            ? missileTune.emergencyRetargets
            : 0) +
          (immortal
            ? missileTune.immortal.retargets
            : w.overclock === "hunting"
              ? missileTune.hunting.retargets
              : 0),
        chains,
        hits: new Set(),
        reservedDamage: 0,
        hitsLeft: immortal
          ? missileTune.immortal.maxHits
          : phoenix
            ? missileTune.tracking.phoenixMaxHits[done]!
            : chains + 1,
        recoveries:
          w.transcendence === "emergency-retarget"
            ? missileTune.emergencyRetargets
            : 0,
        speedBoostMs: 0,
        rearmMs: 0,
        size: w.overclock === "hunting" ? 1.5 : 1.15,
      };
      this.reserveMissile(missile, target, context);
      this.missiles.push(missile);
    }
    salvo.delay = salvo.interval;
    if (salvo.launched >= salvo.count) this.salvo = undefined;
  }

  private advanceMissileSalvo(
    delta: number,
    context: SpecialContext,
    result: SpecialResult,
    enemyIndex: (id: number) => number | undefined,
  ) {
    // Split only missile flight at launch boundaries; other weapon substeps stay unchanged.
    let remaining = delta;
    do {
      const step = this.salvo
        ? Math.min(remaining, Math.max(0, this.salvo.delay))
        : remaining;
      if (this.missiles.length)
        this.advanceMissiles(step, context, result, enemyIndex);
      remaining -= step;
      if (this.salvo) {
        this.salvo.delay -= step;
        if (this.salvo.delay <= 0) this.launchSalvoRound(context, result);
      }
    } while (remaining > 0);
  }

  private advanceMissiles(
    delta: number,
    context: SpecialContext,
    result: SpecialResult,
    enemyIndex: (id: number) => number | undefined,
  ) {
    this.missiles = this.missiles.filter((missile) => {
      missile.lifetime -= delta;
      if (missile.lifetime <= 0) {
        this.releaseMissile(missile);
        return false;
      }
      let target = result.enemies[enemyIndex(missile.targetId) ?? -1];
      if (!target || target.hp <= 0) {
        this.releaseMissile(missile);
        if (missile.retargets <= 0) return false;
        target = this.missileTarget(
          result.enemies,
          missile.weapon,
          context,
          missile,
          missile.hits,
        );
        if (!target) return false;
        missile.retargets--;
        this.redirectMissile(missile, target, context);
      }
      const wait = Math.min(delta, missile.rearmMs);
      missile.rearmMs -= wait;
      missile.speedBoostMs = Math.max(0, missile.speedBoostMs - wait);
      const flightDelta = delta - wait;
      if (missile.rearmMs > 0 || (wait > 0 && flightDelta === 0)) return true;
      const point = combatPosition(target),
        gap = distance(missile, point);
      const boosted = Math.min(flightDelta, missile.speedBoostMs);
      missile.speedBoostMs = Math.max(0, missile.speedBoostMs - flightDelta);
      const step =
        ((tune.missileSpeed *
          (flightDelta +
            boosted * (missileTune.emergencySpeedMultiplier - 1))) /
          1000) *
        (missile.weapon.overclock === "hunting"
          ? missileTune.hunting.speedMultiplier
          : 1);
      if (gap > Math.max(8, step)) {
        missile.x += ((point.x - missile.x) * step) / gap;
        missile.y += ((point.y - missile.y) * step) / gap;
        return true;
      }
      const w = missile.weapon;
      if (this.missilePressure.targetId === target.id)
        this.missilePressure.hits++;
      else this.missilePressure = { targetId: target.id, hits: 1 };
      const consecutive = Math.min(
        missileTune.pressureCap,
        this.missilePressure.hits - 1,
      );
      const damage = this.missileDamage(missile, target, consecutive);
      this.releaseMissile(missile);
      const next = this.hit(
        target,
        damage,
        w.tree === "hunter" ? missileTune.hunter.bypass : 0,
        context,
        "missile",
      );
      this.replaceEnemy(result, context, enemyIndex(target.id)!, next);
      result.effects.push({
        kind: "explosion",
        weapon: "missile",
        ...point,
        radius: 28,
      });
      missile.hits.add(target.id);
      missile.hitsLeft--;
      missile.x = point.x;
      missile.y = point.y;
      if (
        next.hp <= 0 &&
        w.transcendence === "threat-relay" &&
        this.missileThreat(target)
      )
        this.cooldown.missile = Math.max(
          0,
          this.cooldown.missile - missileTune.relayMs,
        );
      if (missile.hitsLeft <= 0) return false;
      if (next.hp <= 0 && missile.chains > 0) {
        const nextTarget = this.missileTarget(
          result.enemies,
          w,
          context,
          missile,
          missile.hits,
        );
        if (nextTarget) {
          missile.chains--;
          const replacement =
            branch(w, "hunter", "a") && w.overclock !== "immortal";
          // Hunter launches a replacement attack; tracking/immortal continue the same projectile.
          if (replacement) {
            missile.id = ++this.serial;
            missile.x = origin.x;
            missile.y = origin.y;
            missile.damage *=
              missileTune.hunter.killChainDamage[Number(complete(w))]!;
          } else if (branch(w, "tracking", "a"))
            missile.damage *=
              missileTune.tracking.chainDamage[Number(complete(w))]!;
          this.redirectMissile(missile, nextTarget, context);
          return true;
        }
      }
      if (
        missile.retargets > 0 &&
        (branch(w, "tracking", "b") || w.overclock === "immortal")
      ) {
        const nextTarget = this.missileTarget(
          result.enemies,
          w,
          context,
          missile,
          missile.hits,
        );
        if (nextTarget) {
          missile.retargets--;
          if (w.overclock !== "immortal")
            missile.damage *= missileTune.tracking.phoenixDamage;
          missile.rearmMs = missileTune.tracking.phoenixRearmMs;
          this.redirectMissile(missile, nextTarget, context);
          return true;
        }
      }
      return false;
    });
  }

  private prepareDrones(weapon: SpecialWeaponState | undefined) {
    let count = !weapon
      ? 0
      : weapon.tree === "squadron"
        ? droneTune.squadron.count[complete(weapon) ? 2 : weapon.branch ? 1 : 0]
        : tune.droneBaseCount;
    if (weapon?.overclock === "army") count += droneTune.army.extraCount;
    if (weapon?.overclock === "cruiser") count = 1;
    this.drones.length = Math.min(this.drones.length, count);
    while (this.drones.length < count)
      this.drones.push({
        id: ++this.serial,
        kind: "drone",
        ...origin,
        cooldown: 0,
        targetId: null,
      });
    for (let i = 0; i < count; i++) {
      const drone = this.drones[i]!;
      drone.x = (648 * (i + 1)) / (count + 1);
      drone.y =
        weapon?.transcendence === "forward-deployment"
          ? droneTune.forward.depth
          : weapon?.tree === "escort"
            ? droneTune.escortDepth
            : droneTune.defaultDepth;
      drone.size =
        weapon?.overclock === "cruiser"
          ? 2.5
          : weapon?.tree === "gunship"
            ? 1.5
            : 1;
    }
  }

  private fireDrones(
    weapon: SpecialWeaponState,
    delta: number,
    context: SpecialContext,
    result: SpecialResult,
  ) {
    let assigned: Set<number> | undefined;
    let stats: Stats | undefined;
    const packTarget =
      branch(weapon, "squadron", "b") &&
      this.drones.some((drone) => drone.cooldown <= delta)
        ? this.target(
            result.enemies,
            context.focusId ?? context.synergy?.focusId ?? null,
          )?.id
        : undefined;
    for (const drone of this.drones) {
      drone.cooldown = Math.max(0, drone.cooldown - delta);
      if (drone.cooldown > 0) continue;
      const spread = weapon.tree === "squadron" && weapon.branch !== "b";
      const focus =
        context.focusId ??
        context.synergy?.focusId ??
        (branch(weapon, "gunship", "a")
          ? context.synergy?.preferredZoneTarget(result.enemies)
          : null) ??
        packTarget ??
        (weapon.tree === "escort" ||
        weapon.transcendence === "combat-link" ||
        branch(weapon, "squadron", "b")
          ? context.focusId
          : null);
      const target =
        this.target(
          result.enemies,
          focus,
          spread ? (assigned ??= new Set()) : undefined,
          drone,
          weapon.transcendence === "forward-deployment",
        ) ?? this.target(result.enemies, focus, undefined, drone);
      if (!target) continue;
      assigned?.add(target.id);
      drone.targetId = target.id;
      stats ??= getSpecialWeaponStats(weapon, context.growth);
      this.droneHit(drone, target, weapon, stats, context, result, 1);
      let cycle = stats.cycleMs * this.cycleMultiplier(context);
      if (branch(weapon, "gunship", "a"))
        cycle *= droneTune.gunship.gatlingCycle[Number(complete(weapon))]!;
      if (branch(weapon, "gunship", "b"))
        cycle *= droneTune.gunship.siegeCycle[Number(complete(weapon))]!;
      if (weapon.overclock === "cruiser") cycle *= droneTune.cruiser.cycle;
      if (
        weapon.transcendence === "combat-link" &&
        target.id === context.focusId
      )
        cycle *= droneTune.combatLink.cycle;
      drone.cooldown = Math.max(droneTune.minimumCycleMs, cycle);
    }
  }

  private droneHit(
    drone: Drone,
    target: EnemyState,
    weapon: SpecialWeaponState,
    stats: Stats,
    context: SpecialContext,
    result: SpecialResult,
    factor: number,
  ) {
    const action = startAction(context.relics ?? noRelics, context.random);
    let damage =
      stats.damage *
      factor *
      action.damageMultiplier *
      this.critical(stats, context);
    let bypass = 0;
    if (weapon.tree === "gunship") damage *= droneTune.gunship.damage;
    if (branch(weapon, "gunship", "b")) {
      damage *= droneTune.gunship.siegeDamage[Number(complete(weapon))]!;
      bypass = droneTune.gunship.siegeBypass[Number(complete(weapon))]!;
    }
    if (branch(weapon, "squadron", "b"))
      damage *= droneTune.squadron.wolfpackDamage[Number(complete(weapon))]!;
    if (
      weapon.transcendence === "forward-deployment" &&
      target.progress01 < getMarineStats(context.growth).minTargetProgress01
    )
      damage *= droneTune.forward.damage;
    if (weapon.transcendence === "combat-link" && target.id === context.focusId)
      damage *= droneTune.combatLink.damage;
    if (weapon.overclock === "army") damage *= droneTune.army.damage;
    if (weapon.overclock === "cruiser") {
      damage *= droneTune.cruiser.damage;
      bypass = droneTune.cruiser.bypass;
    }
    const point = combatPosition(target);
    const index = result.enemies.findIndex((e) => e.id === target.id);
    this.replaceEnemy(
      result,
      context,
      index,
      this.hit(target, damage, bypass, context, "drone"),
    );
    result.effects.push({
      kind: "shot",
      weapon: "drone",
      x: drone.x,
      y: drone.y,
      toX: point.x,
      toY: point.y,
    });
    if (weapon.overclock === "cruiser")
      this.area(
        {
          ...point,
          radius: droneTune.cruiser.radius,
          damage: damage * droneTune.cruiser.splashDamage,
          bypass,
          pull: 0,
        },
        context,
        result,
        "drone",
      );
    const wingman = branch(weapon, "escort", "b");
    if (weapon.transcendence === "target-painter" || wingman) {
      const multiplier =
        (weapon.transcendence === "target-painter"
          ? tune.painterMultiplier
          : 1) *
        (wingman
          ? droneTune.escort.wingmanMultiplier[Number(complete(weapon))]!
          : 1);
      this.marks.set(target.id, {
        remaining: tune.painterDurationMs,
        multiplier,
      });
    }
  }
}
