import type { LaneId } from "../model/types";

const laneIndex: Record<LaneId, number> = { left: 0, center: 1, right: 2 };

/** Logical battlefield coordinates; width is finite and non-negative. */
export function laneCenterX(lane: LaneId, width: number): number {
  return laneX(lane, width, 0.5);
}

/** offset01: 0 = lane's left edge, 0.5 = center, 1 = right edge.
 * Clamping keeps the point inside its lane, not the full rendered sprite.
 * Visual perspective never changes these logical coordinates.
 */
export function laneX(lane: LaneId, width: number, offset01: number): number {
  return ((laneIndex[lane] + Math.max(0, Math.min(1, offset01))) * width) / 3;
}
