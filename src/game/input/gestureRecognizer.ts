import { gestureBalance as tuning } from "../data/gesture";

export interface Point {
  x: number;
  y: number;
}
export interface GestureResult {
  kind: "circle" | "z" | "unknown";
  confidence: number;
}

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

// Equal path-distance samples make recognition independent of pointer event rate.
function resample(points: readonly Point[]): Point[] {
  const lengths = [0];
  for (let i = 1; i < points.length; i++)
    lengths.push(lengths[i - 1]! + distance(points[i - 1]!, points[i]!));
  const total = lengths.at(-1)!;
  let segment = 1;
  return Array.from({ length: tuning.sampleCount }, (_, i) => {
    const along = (total * i) / (tuning.sampleCount - 1);
    while (segment < points.length - 1 && lengths[segment]! < along) segment++;
    const a = points[segment - 1]!;
    const b = points[segment]!;
    const span = lengths[segment]! - lengths[segment - 1]!;
    const fraction = span > 0 ? (along - lengths[segment - 1]!) / span : 0;
    return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
  });
}

const zTemplate = resample([
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
]);

export function recognizeGesture(points: readonly Point[]): GestureResult {
  const unknown: GestureResult = { kind: "unknown", confidence: 0 };
  if (
    points.length < 3 ||
    points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))
  )
    return unknown;
  const minX = Math.min(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const width = Math.max(...points.map((p) => p.x)) - minX;
  const height = Math.max(...points.map((p) => p.y)) - minY;
  if (
    Math.min(width, height) < tuning.minDimensionPx ||
    Math.min(width, height) / Math.max(width, height) < tuning.minAspectRatio
  )
    return unknown;
  const normalized = points.map((p) => ({
    x: (p.x - minX) / width,
    y: (p.y - minY) / height,
  }));
  const samples = resample(normalized);
  let winding = 0;
  let totalTurn = 0;
  let length = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    const angle =
      Math.atan2(b.y - 0.5, b.x - 0.5) - Math.atan2(a.y - 0.5, a.x - 0.5);
    const turn = Math.atan2(Math.sin(angle), Math.cos(angle));
    winding += turn;
    totalTurn += Math.abs(turn);
    length += distance(a, b);
  }
  const revolutions = Math.abs(winding) / (Math.PI * 2);
  const radialError =
    samples.reduce(
      (sum, p) => sum + Math.abs(Math.hypot(p.x - 0.5, p.y - 0.5) - 0.5),
      0,
    ) / samples.length;
  if (
    distance(samples[0]!, samples.at(-1)!) <= tuning.circleMaxClosure &&
    radialError <= tuning.circleMaxRadialError &&
    revolutions >= tuning.circleMinWinding &&
    revolutions <= tuning.circleMaxWinding &&
    Math.abs(winding) / totalTurn >= tuning.circleMinDirectionConsistency
  ) {
    return {
      kind: "circle",
      confidence: 1 - radialError / tuning.circleMaxRadialError,
    };
  }
  const error =
    samples.reduce((sum, p, i) => sum + distance(p, zTemplate[i]!), 0) /
    samples.length;
  if (
    error <= tuning.zMaxTemplateError &&
    length >= tuning.zMinLength &&
    length <= tuning.zMaxLength
  ) {
    return { kind: "z", confidence: 1 - error / tuning.zMaxTemplateError };
  }
  return unknown;
}
