export const battlefieldReference = { width: 720, height: 1280 } as const;

/** Presentation only: bounded portrait playfield; extra space is environment. */
export function battlefieldLayout(
  width: number,
  height: number,
  insets = { top: 0, bottom: 0, left: 0, right: 0 },
) {
  const availableWidth = Math.max(1, width - insets.left - insets.right);
  const availableHeight = Math.max(1, height - insets.top - insets.bottom);
  const scale = Math.min(
    availableWidth / battlefieldReference.width,
    availableHeight / battlefieldReference.height,
  );
  return {
    scale,
    x: insets.left + (availableWidth - battlefieldReference.width * scale) / 2,
    y: height - insets.bottom - battlefieldReference.height * scale,
  };
}

/** Read CSS environment insets only on resize, never in simulation. */
export function readSafeArea() {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)";
  document.body.append(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}
