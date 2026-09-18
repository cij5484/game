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

/** Paused frames pass no time. Only an explicit Boss kill clears the run. */
export function advanceRun(state: RunState, deltaMs: number): RunState {
  if (state.status !== "running") return state;
  return {
    ...state,
    elapsedMs: state.elapsedMs + Math.max(0, deltaMs),
  };
}

/** Called only after the Stage boss dies; wall destruction keeps failure sticky. */
export function clearRun(state: RunState): RunState {
  return state.status === "running" ? { ...state, status: "cleared" } : state;
}
