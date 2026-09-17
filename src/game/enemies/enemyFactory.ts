import type { EnemyKind, LaneId } from "../model/types";
import type { EnemyState } from "./enemySimulation";
import { enemyConfigs } from "../data/enemies";

export function createPrototypeEnemy(
  kind: EnemyKind,
  lane: LaneId,
  id: number,
  offset01 = 0.5,
): EnemyState {
  return {
    id,
    kind,
    lane,
    offset01,
    hp: enemyConfigs[kind].hp,
    frozenMs: 0,
    progress01: 0,
    phase: "moving",
  };
}
