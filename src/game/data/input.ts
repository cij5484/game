// Prototype touch tuning in CSS pixels / milliseconds, independent of world scale.
export const tapBalance = {
  maxDurationMs: 300,
  maxMovementPx: 20,
  joinWindowMs: 120,
} as const;

export const drawingInputBalance = {
  maxDurationMs: 5000,
  maxPoints: 256,
  sampleDistancePx: 3,
} as const;
