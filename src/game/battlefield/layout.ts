export const battlefieldReference = { width: 1280, height: 720 } as const;

/** Presentation only: fit a bounded battlefield, never lengthen enemy travel. */
export function battlefieldLayout(width: number, height: number) {
  const scale = Math.min(
    width / battlefieldReference.width,
    height / battlefieldReference.height,
  );
  return {
    scale,
    x: (width - battlefieldReference.width * scale) / 2,
    y: (height - battlefieldReference.height * scale) / 2,
  };
}
