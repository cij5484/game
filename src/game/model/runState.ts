export interface RunState {
  wallHp: number;
  status: "running" | "failed";
}

export function createRunState(maxHp: number): RunState {
  const wallHp = Math.max(0, maxHp);
  return { wallHp, status: wallHp > 0 ? "running" : "failed" };
}

export function applyWallDamage(state: RunState, damage: number): RunState {
  if (state.status === "failed") return state;
  return createRunState(state.wallHp - Math.max(0, damage));
}
