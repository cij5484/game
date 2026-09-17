import type { EnemyKind, LaneId } from "../model/types";
import type { EnemyState } from "./enemySimulation";
import { enemyConfigs } from "../data/enemies";
import { eliteBalance } from "../data/elite";

export function createPrototypeEnemy(
  kind: EnemyKind,
  lane: LaneId,
  id: number,
  offset01 = 0.5,
  elite = false,
): EnemyState {
  return {
    id,
    ...(elite ? { elite: true } : {}),
    kind,
    lane,
    offset01,
    hp: enemyConfigs[kind].hp * (elite ? eliteBalance.hpMultiplier : 1),
    progress01: 0,
    phase: "moving",
  };
}
