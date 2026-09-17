/** Presentation-only slots: gameplay arrival and wall damage remain unchanged. */
export function attackSlotPosition(slot: number, laneWidth: number) {
  const column = slot % 4;
  const row = Math.floor(slot / 4);
  return {
    x: laneWidth * ((column + 0.5) / 4 - 0.5),
    y: -row * 52 - (column % 2) * 12,
  };
}
