// Prototype visual tuning values; never use for movement, range or damage.
export const perspectiveVisual = { farScale: 0.5, nearScale: 1 } as const;

/** Render-only scale: progress 0 = far spawn, 1 = near wall. */
export function perspectiveScale(progress01: number): number {
  const progress = Math.max(0, Math.min(1, progress01));
  return (
    perspectiveVisual.farScale +
    (perspectiveVisual.nearScale - perspectiveVisual.farScale) * progress
  );
}
