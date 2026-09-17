import type { EnemyKind, LaneId } from "../model/types";
import type { EnemyState } from "./enemySimulation";

export function createPrototypeEnemy(
  kind: EnemyKind,
  lane: LaneId,
  id: number,
  offset01 = 0.5,
): EnemyState {
  return { id, kind, lane, offset01, progress01: 0, phase: "moving" };
}
