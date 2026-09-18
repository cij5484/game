export const battlefieldReference = { width: 720, height: 1280 } as const;
export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Presentation only. All three regions consume space inside the safe viewport. */
export function battlefieldLayout(
  width: number,
  height: number,
  insets = { top: 0, bottom: 0, left: 0, right: 0 },
) {
  const w = Math.max(1, width - insets.left - insets.right),
    h = Math.max(1, height - insets.top - insets.bottom);
  const scale = Math.min(w / 720, h / 1280);
  const headerHeight = Math.min(h * 0.16, Math.max(72, 150 * scale));
  const bottomHeight = Math.min(h * 0.24, Math.max(118, 220 * scale));
  const header = {
    x: insets.left,
    y: insets.top,
    width: w,
    height: headerHeight,
  };
  const battlefield = {
    x: insets.left,
    y: header.y + header.height,
    width: w,
    height: h - headerHeight - bottomHeight,
  };
  const bottom = {
    x: insets.left,
    y: battlefield.y + battlefield.height,
    width: w,
    height: bottomHeight,
  };
  return {
    header,
    battlefield,
    bottom,
    scale,
    x: insets.left + (w - 720 * scale) / 2,
    y: battlefield.y,
  };
}
export function battlefieldPoint(
  layout: ReturnType<typeof battlefieldLayout>,
  lateral01: number,
  progress01: number,
) {
  return {
    x: layout.x + (36 + 648 * lateral01) * layout.scale,
    y:
      layout.battlefield.y +
      Math.max(0, Math.min(1, progress01)) *
        (layout.battlefield.height - 44 * layout.scale),
  };
}
export function containsPoint(rect: ScreenRect, x: number, y: number) {
  return (
    x >= rect.x &&
    x < rect.x + rect.width &&
    y >= rect.y &&
    y < rect.y + rect.height
  );
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
