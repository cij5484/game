import type { EnemyState } from "../enemies/enemySimulation";
import { laneX } from "./lanes";

// Prototype logical units for magic ranges; never derived from viewport or crowd slots.
export const combatGeometry = { width: 648, depth: 1075 } as const;

export function combatPosition(enemy: EnemyState): { x: number; y: number } {
  return {
    x: laneX(enemy.lane, combatGeometry.width, enemy.offset01),
    y: enemy.progress01 * combatGeometry.depth,
  };
}
