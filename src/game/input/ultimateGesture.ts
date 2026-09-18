import type { Point } from "./gestureRecognizer";

export const ultimateGestureHint = {
  symbol: "V",
  instruction: "왼쪽 위 → 아래 꼭짓점 → 오른쪽 위로 V를 그리세요",
  path: [
    { x: 0, y: 0 },
    { x: 0.5, y: 1 },
    { x: 1, y: 0 },
  ],
} as const;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** One open V, in either drawing direction. Coordinates are pointer CSS pixels. */
export function recognizeUltimateGesture(
  points: readonly Point[],
  ready: boolean,
): boolean {
  if (
    !ready ||
    points.length < 3 ||
    !points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  )
    return false;
  const xs = points.map((p) => p.x),
    ys = points.map((p) => p.y);
  const minX = Math.min(...xs),
    minY = Math.min(...ys);
  const width = Math.max(...xs) - minX,
    height = Math.max(...ys) - minY;
  if (width < 55 || height < 55 || width / height < 0.45 || width / height > 2)
    return false;
  const normalized = points.map((p) => ({
    x: (p.x - minX) / width,
    y: (p.y - minY) / height,
  }));
  if (normalized[0]!.x > normalized.at(-1)!.x) normalized.reverse();
  const first = normalized[0]!,
    last = normalized.at(-1)!;
  // Open, horizontally separated upper endpoints distinguish V from a loop or Z.
  if (first.x > 0.2 || last.x < 0.8 || first.y > 0.27 || last.y > 0.27)
    return false;
  const lengths = [0];
  for (let i = 1; i < normalized.length; i++)
    lengths.push(
      lengths[i - 1]! + distance(normalized[i - 1]!, normalized[i]!),
    );
  const total = lengths.at(-1)!;
  if (total <= 0) return false;
  let segment = 1;
  const samples = Array.from({ length: 33 }, (_, i) => {
    const along = (total * i) / 32;
    while (segment < normalized.length - 1 && lengths[segment]! < along)
      segment++;
    const a = normalized[segment - 1]!,
      b = normalized[segment]!;
    const span = lengths[segment]! - lengths[segment - 1]!;
    const t = span > 0 ? (along - lengths[segment - 1]!) / span : 0;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  });
  const apexIndex = samples.reduce(
    (best, p, i) => (p.y > samples[best]!.y ? i : best),
    0,
  );
  const apex = samples[apexIndex]!;
  if (
    apexIndex < 7 ||
    apexIndex > 25 ||
    apex.x < 0.22 ||
    apex.x > 0.78 ||
    apex.y < 0.85
  )
    return false;
  const straightSide = (side: readonly Point[]): boolean => {
    const a = side[0]!,
      b = side.at(-1)!;
    const dx = b.x - a.x,
      dy = b.y - a.y,
      length = distance(a, b);
    let previous = 0,
      error = 0;
    for (const p of side) {
      const projection =
        ((p.x - a.x) * dx + (p.y - a.y) * dy) / (length * length);
      if (projection < previous - 0.07) return false;
      previous = Math.max(previous, projection);
      const deviation = Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / length;
      if (deviation > 0.13) return false;
      error += deviation;
    }
    return error / side.length <= 0.045;
  };
  return (
    straightSide(samples.slice(0, apexIndex + 1)) &&
    straightSide(samples.slice(apexIndex))
  );
}
