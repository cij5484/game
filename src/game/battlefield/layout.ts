export const battlefieldReference = { width: 720, height: 1280 } as const;

/** Presentation only: bounded portrait playfield; extra space is environment. */
export function battlefieldLayout(width: number, height: number) {
  const scale = Math.min(
    width / battlefieldReference.width,
    height / battlefieldReference.height,
  );
  return {
    scale,
    x: (width - battlefieldReference.width * scale) / 2,
    y: height - battlefieldReference.height * scale,
  };
}
