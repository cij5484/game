// Prototype logical units and hard per-round budgets; branch tuning lives in traits.ts.
export const primaryAttackBalance = {
  penetrationHalfWidth: 32,
  ricochetRadius: 180,
  marineDepthOffset: 48,
  roundTargetBudget: 128,
  roundSplashBudget: 64,
  splashTargetCap: 24,
} as const;
