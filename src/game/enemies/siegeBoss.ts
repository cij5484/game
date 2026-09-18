import { siegeBossBalance as tune } from "../data/boss";
import type { EnemyState } from "./enemySimulation";

export interface SiegeBossState {
  phase: "approach" | "siege-charge" | "stagger" | "final-charge";
  phaseRemainingMs: number;
  interruptDamage: number;
  reinforcementCalled: boolean;
  wallAttackRemainingMs: number;
}

export function createSiegeBoss(id: number): EnemyState {
  return {
    id,
    kind: "grunt",
    lane: "center",
    offset01: 0.5,
    hp: tune.hp,
    maxHp: tune.hp,
    progress01: 0,
    phase: "moving",
    boss: {
      phase: "approach",
      phaseRemainingMs: 0,
      interruptDamage: 0,
      reinforcementCalled: false,
      wallAttackRemainingMs: tune.finalWallIntervalMs,
    },
  };
}

export function advanceSiegeBoss(
  enemy: EnemyState,
  deltaMs: number,
): {
  enemy: EnemyState;
  wallDamage: number;
  reinforcement: boolean;
} {
  if (!enemy.boss || enemy.hp <= 0 || deltaMs <= 0)
    return { enemy, wallDamage: 0, reinforcement: false };
  const boss = { ...enemy.boss };
  const current = { ...enemy, boss };
  const hpRatio = enemy.hp / (enemy.maxHp ?? tune.hp);
  const reinforcement =
    !boss.reinforcementCalled && hpRatio <= tune.reinforcementHpRatio;
  if (reinforcement) boss.reinforcementCalled = true;
  if (hpRatio <= tune.finalHpRatio && boss.phase !== "final-charge") {
    boss.phase = "final-charge";
    boss.phaseRemainingMs = 0;
    boss.interruptDamage = 0;
  }
  let remaining = deltaMs;
  let wallDamage = 0;
  while (remaining > 0) {
    if (boss.phase === "final-charge" || boss.phase === "approach") {
      const final = boss.phase === "final-charge";
      const target = final ? 1 : tune.siegeProgress01;
      const speed = final ? tune.finalSpeed : tune.approachSpeed;
      const travelMs = Math.max(
        0,
        ((target - current.progress01) / speed) * 1000,
      );
      if (remaining < travelMs) {
        current.progress01 += (speed * remaining) / 1000;
        break;
      }
      current.progress01 = Math.max(current.progress01, target);
      remaining -= travelMs;
      if (!final) {
        boss.phase = "siege-charge";
        boss.phaseRemainingMs = tune.chargeMs;
        boss.interruptDamage = 0;
      } else {
        current.phase = "attacking";
        const attackTime =
          remaining + tune.finalWallIntervalMs - boss.wallAttackRemainingMs;
        wallDamage +=
          Math.floor(attackTime / tune.finalWallIntervalMs) *
          tune.finalWallDamage;
        boss.wallAttackRemainingMs =
          tune.finalWallIntervalMs - (attackTime % tune.finalWallIntervalMs);
        break;
      }
    } else {
      const consumed = Math.min(remaining, boss.phaseRemainingMs);
      boss.phaseRemainingMs -= consumed;
      remaining -= consumed;
      if (boss.phaseRemainingMs <= 0) {
        if (boss.phase === "siege-charge") {
          wallDamage += tune.siegeWallDamage;
          boss.phaseRemainingMs = tune.chargeMs;
          boss.interruptDamage = 0;
        } else {
          boss.phase = "approach";
        }
      }
    }
  }
  current.offset01 =
    0.5 + tune.lateralAmplitude01 * Math.sin(current.progress01 * Math.PI * 2);
  return { enemy: current, wallDamage, reinforcement };
}

/** Body is always damageable; charge damage also counts toward interrupt. */
export function applyBossDamage(enemy: EnemyState, damage: number): EnemyState {
  if (!enemy.boss || enemy.hp <= 0) return enemy;
  const boss = { ...enemy.boss };
  const amount =
    Math.max(0, damage) *
    (boss.phase === "stagger" ? tune.vulnerableMultiplier : 1);
  const hp = Math.max(0, enemy.hp - amount);
  if (boss.phase === "siege-charge") {
    boss.interruptDamage += amount;
    if (boss.interruptDamage >= tune.interruptDamage) {
      boss.phase = "stagger";
      boss.phaseRemainingMs = tune.staggerMs;
    }
  }
  return { ...enemy, hp, boss };
}
