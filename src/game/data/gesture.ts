// Prototype gesture tuning. Drawing dimensions use CSS pixels, never world scale.
export const gestureBalance = {
  minDimensionPx: 45,
  minAspectRatio: 0.3,
  sampleCount: 32,
  circleMaxClosureRatio: 0.14,
  circleMaxRadialError: 0.14,
  circleMinWinding: 0.8,
  circleMaxWinding: 1.2,
  circleMinDirectionConsistency: 0.85,
  zMaxTemplateError: 0.18,
  zMinLength: 2.6,
  zMaxLength: 4.3,
} as const;
