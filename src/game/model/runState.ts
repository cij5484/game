export interface RunState {
  wallHp: number;
  status: "running" | "failed" | "cleared";
  elapsedMs: number;
}

export function createRunState(maxHp: number): RunState {
  const wallHp = Math.max(0, maxHp);
  return { wallHp, status: wallHp > 0 ? "running" : "failed", elapsedMs: 0 };
}

export function applyWallDamage(state: RunState, damage: number): RunState {
  if (state.status !== "running") return state;
  const wallHp = Math.max(0, state.wallHp - Math.max(0, damage));
  return { ...state, wallHp, status: wallHp > 0 ? "running" : "failed" };
}

/** Choice pauses pass no time; Rhythm passes only its slowed simulation time. */
export function advanceRun(
  state: RunState,
  deltaMs: number,
  durationMs: number,
): RunState {
  if (state.status !== "running") return state;
  const elapsedMs = Math.min(
    durationMs,
    state.elapsedMs + Math.max(0, deltaMs),
  );
  return {
    ...state,
    elapsedMs,
    status: elapsedMs >= durationMs ? "cleared" : "running",
  };
}
