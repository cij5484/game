import { runtimeObject } from "../dev/runtimeBalance";
import { marineStrength, type MarineGrowthState } from "./marineGrowth";
import type { SpecialWeaponState } from "./specialWeapons";

/** Prototype special-weapon tuning; spawn HP scaling lives in enemyScaling.ts. */
export const specialWeaponBalance = runtimeObject("special", {
  grenade: {
    damage: 65,
    cycleMs: 7800, // 5.2 real seconds at base combat tempo 1.5, before growth.
    radius: 110,
    damageCoefficient: 0.8,
    speedCoefficient: 0.55,
    critCoefficient: 0.8,
  },
  missile: {
    damage: 90,
    cycleMs: 4500, // 3 real seconds at base combat tempo 1.5, before growth.
    radius: 0,
    damageCoefficient: 1,
    speedCoefficient: 0.7,
    critCoefficient: 1,
  },
  drone: {
    damage: 24,
    cycleMs: 900,
    radius: 0,
    damageCoefficient: 0.75,
    speedCoefficient: 0.85,
    critCoefficient: 0.9,
  },
  droneBaseCount: 1,
  criticalMultiplier: 1.75,
  grenadeFlightMs: 720,
  missileSpeed: 680,
  missileLifetimeMs: 6000,
  painterDurationMs: 1800,
  painterMultiplier: 1.2,
  minimumCycleMs: 180,
  targeting: {
    elite: 600,
    wall: 450,
    wallProgress: 0.9,
    progress: 100,
    runner: 90,
    shield: 70,
    focus: 2000,
    distance: 0.25,
    forward: 550,
    binSize: 150,
  },
  // Two-value arrays are Lv6/Lv10; three-value counts are Lv3/Lv6/Lv10.
  grenadeBehavior: {
    nuclear: { damage: 3.3, radius: 1.65, cycle: 2 },
    barrage: { count: 4, intervalMs: 180, damage: 0.62, radius: 0.78 },
    triple: { count: 3, spacing: 115 },
    smartFuseCheck: 0.7,
    magnetic: { radius: 1.35, pull: 0.22 },
    aftershock: { delayMs: 450, damage: 0.45, radius: 0.8 },
    highExplosive: {
      damage: 1.5,
      radius: 1.2,
      largeRadius: [1.2, 1.5],
      largeDamage: [1.1, 1.5],
      siegeDamage: 1.4,
      siegeRadius: 0.8,
      coreDamage: [0.8, 2],
      coreRadius: 0.35,
      bypass: [0.4, 0.8],
    },
    tactical: {
      damage: 0.35,
      radius: 1.25,
      pull: 0.25,
      collapseDelayMs: [500, 700],
      collapseDamage: [1.8, 3],
      collapseRadius: 0.9,
      collapseBypass: 0.4,
      tickMs: 200,
      tickDamage: 0.12,
      tickPull: [0.09, 0.16],
      ticks: [3, 8, 15],
    },
    cluster: {
      count: [4, 6, 9],
      heavyCount: 3,
      heavySpread: 0.5,
      delayMs: 150,
      intervalMs: 65,
      heavyIntervalMs: 90,
      damage: 0.4,
      heavyDamage: [0.75, 1.25],
      radius: 0.48,
      heavyRadius: 0.7,
    },
  },
  missileBehavior: {
    baseSalvoCount: 3,
    salvoIntervalMs: 270, // 0.18 real seconds at base combat tempo 1.5.
    baseRetargets: 1,
    damageReservation: true,
    bossPriority: 900,
    saturation: { additionalCount: [1, 2, 4], damage: 0.85 },
    hunter: {
      threatPriority: 350,
      threatDamage: 1.7,
      gruntDamage: 1.15,
      pressure: [0.12, 0.3],
      chains: [1, 3],
      killChainDamage: [1.1, 1.25],
      bypass: 0.35,
    },
    tracking: {
      retargets: 2,
      lifetimeMultiplier: 1.5,
      phoenixRetargets: [4, 6],
      chains: [2, 4],
      chainDamage: [1.1, 1.2],
      phoenixDamage: 0.7,
      phoenixMaxHits: [3, 5],
      phoenixRearmMs: 150,
    },
    emergencyRetargets: 4,
    emergencySpeedMultiplier: 1.5,
    emergencySpeedMs: 450,
    emergencyLifetimeRecoveryMs: 600,
    pressureCap: 5,
    weakpointPressure: 0.18,
    relayMs: 750,
    hunting: {
      damage: 1.5,
      pressure: 0.4,
      speedMultiplier: 1.25,
      retargets: 2,
    },
    network: { additionalCount: 3, damage: 0.85 },
    immortal: { retargets: 8, chains: 6, lifetimeMultiplier: 2, maxHits: 8 },
  },
  droneBehavior: {
    squadron: { count: [2, 3, 4], wolfpackDamage: [1.2, 1.55] },
    gunship: {
      damage: 2,
      gatlingCycle: [0.6, 0.32],
      siegeCycle: [1.5, 2],
      siegeDamage: [2, 3.4],
      siegeBypass: [0.3, 0.65],
    },
    escort: { mirrorDamage: [0.3, 0.65], wingmanMultiplier: [1.07, 1.15] },
    forward: { depth: 330, damage: 1.6 },
    escortDepth: 920,
    defaultDepth: 740,
    combatLink: { damage: 1.4, cycle: 0.7 },
    army: { extraCount: 5, damage: 0.7 },
    cruiser: {
      cycle: 2.2,
      damage: 6,
      bypass: 0.5,
      radius: 85,
      splashDamage: 0.3,
    },
    synchronizationDamage: 1.3,
    minimumCycleMs: 90,
  },
} as const);

export function getSpecialWeaponStats(
  weapon: SpecialWeaponState,
  growth: MarineGrowthState,
) {
  const base = specialWeaponBalance[weapon.id];
  const mastery = Math.max(0, weapon.quality);
  const crit = marineStrength(growth, "crit-chance") * base.critCoefficient;
  return {
    damage:
      base.damage *
      (1 + 0.11 * mastery) *
      (1 + marineStrength(growth, "primary-damage") * base.damageCoefficient) *
      (growth.meta?.specialDamageMultiplier ?? 1),
    cycleMs: Math.max(
      specialWeaponBalance.minimumCycleMs,
      (base.cycleMs /
        (1 +
          marineStrength(growth, "attack-speed") * base.speedCoefficient +
          Math.min(0.45, 0.012 * mastery))) *
        (growth.meta?.specialCycleMultiplier ?? 1),
    ),
    radius: base.radius * (1 + Math.min(0.3, mastery * 0.008)),
    criticalChance: Math.min(
      1,
      Math.min(1 - Number.EPSILON, 0.05 + (0.95 * crit) / (1 + crit)) +
        (growth.meta?.criticalChanceBonus ?? 0),
    ),
  };
}
