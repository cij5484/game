import { gestureBalance as tuning } from "../data/gesture";

export interface Point {
  x: number;
  y: number;
}
export interface GestureResult {
  kind: "circle" | "z" | "unknown";
  confidence: number;
  circleScore: number;
  zScore: number;
  reason: string;
  metrics?: {
    closure: number;
    revolutions: number;
    radialError: number;
    consistency: number;
    samples: number;
    pathLength: number;
  };
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
    const a = points[segment - 1]!,
      b = points[segment]!;
    const span = lengths[segment]! - lengths[segment - 1]!;
    const fraction = span > 0 ? (along - lengths[segment - 1]!) / span : 0;
    return { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction };
  });
}
function bounds(points: readonly Point[]) {
  const minX = Math.min(...points.map((p) => p.x)),
    minY = Math.min(...points.map((p) => p.y));
  return {
    minX,
    minY,
    width: Math.max(...points.map((p) => p.x)) - minX,
    height: Math.max(...points.map((p) => p.y)) - minY,
  };
}
function normalize(points: readonly Point[]): Point[] {
  const { minX, minY, width, height } = bounds(points);
  return points.map((p) => ({
    x: (p.x - minX) / Math.max(width, Number.EPSILON),
    y: (p.y - minY) / Math.max(height, Number.EPSILON),
  }));
}
const zTemplate = resample([
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
]);

// Align ordered samples locally: unequal bars reach their corners at different
// fractions of the path. The fixed 32-sample, 4-slot band bounds work and drift.
function zTemplateError(samples: readonly Point[]): number {
  let previous = Array<number>(zTemplate.length + 1).fill(Infinity);
  previous[0] = 0;
  for (let i = 1; i <= samples.length; i++) {
    const row = Array<number>(zTemplate.length + 1).fill(Infinity);
    for (
      let j = Math.max(1, i - tuning.zSampleSlack);
      j <= Math.min(zTemplate.length, i + tuning.zSampleSlack);
      j++
    )
      row[j] =
        distance(samples[i - 1]!, zTemplate[j - 1]!) +
        Math.min(previous[j]!, previous[j - 1]!, row[j - 1]!);
    previous = row;
  }
  return previous[zTemplate.length]! / samples.length;
}

export function recognizeGesture(points: readonly Point[]): GestureResult {
  const validCoordinates = points.every(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
  );
  const pathLength = validCoordinates
    ? points
        .slice(1)
        .reduce((sum, point, i) => sum + distance(points[i]!, point), 0)
    : 0;
  const unknown: GestureResult = {
    kind: "unknown",
    confidence: 0,
    circleScore: 0,
    zScore: 0,
    reason: "insufficient path",
    metrics: {
      samples: points.length,
      pathLength,
      closure: 0,
      revolutions: 0,
      radialError: 0,
      consistency: 0,
    },
  };
  if (!validCoordinates) return { ...unknown, reason: "invalid coordinates" };
  if (points.length < 3) return unknown;
  const { width, height } = bounds(points);
  if (
    Math.min(width, height) < tuning.minDimensionPx ||
    Math.min(width, height) / Math.max(width, height) < tuning.minAspectRatio
  )
    return { ...unknown, reason: "too small or too narrow" };

  // Undo ellipse tilt before axis normalization. Otherwise tilted ovals become
  // diagonal slashes in a square bounding box, inflating the radial error.
  const even = resample(points);
  const mean = {
    x: even.reduce((s, p) => s + p.x, 0) / even.length,
    y: even.reduce((s, p) => s + p.y, 0) / even.length,
  };
  let xx = 0,
    yy = 0,
    xy = 0;
  for (const p of even) {
    const x = p.x - mean.x,
      y = p.y - mean.y;
    xx += x * x;
    yy += y * y;
    xy += x * y;
  }
  const tilt = Math.atan2(2 * xy, xx - yy) / 2;
  const rotated = even.map((p) => ({
    x: (p.x - mean.x) * Math.cos(tilt) + (p.y - mean.y) * Math.sin(tilt),
    y: -(p.x - mean.x) * Math.sin(tilt) + (p.y - mean.y) * Math.cos(tilt),
  }));
  const samples = resample(normalize(rotated));
  let winding = 0,
    totalTurn = 0,
    length = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!,
      b = samples[i]!;
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
      (s, p) => s + Math.abs(Math.hypot(p.x - 0.5, p.y - 0.5) - 0.5),
      0,
    ) / samples.length;
  const closure =
    distance(samples[0]!, samples.at(-1)!) / Math.max(length, Number.EPSILON);
  const consistency = totalTurn > 0 ? Math.abs(winding) / totalTurn : 0;
  const reasons = [
    closure > tuning.circleMaxClosureRatio && "open ends",
    radialError > tuning.circleMaxRadialError && "irregular radius",
    (revolutions < tuning.circleMinWinding ||
      revolutions > tuning.circleMaxWinding) &&
      "rotation",
    consistency < tuning.circleMinDirectionConsistency && "backtracking",
  ].filter(Boolean);
  const circleScore = Math.max(
    0,
    Math.min(
      1,
      1 - radialError,
      1 - closure,
      consistency,
      revolutions,
      2 - revolutions,
    ),
  );
  // A small bounded tilt tolerance keeps Z upright; PCA would also admit N shapes.
  let zError = Infinity,
    zLength = 0;
  for (const degrees of tuning.zTiltDegrees) {
    const angle = (degrees * Math.PI) / 180;
    const zSamples = resample(
      normalize(
        points.map((p) => ({
          x: p.x * Math.cos(angle) - p.y * Math.sin(angle),
          y: p.x * Math.sin(angle) + p.y * Math.cos(angle),
        })),
      ),
    );
    const error = zTemplateError(zSamples);
    if (error < zError) {
      zError = error;
      zLength = zSamples
        .slice(1)
        .reduce((s, p, i) => s + distance(zSamples[i]!, p), 0);
    }
  }
  const zScore = Math.max(0, 1 - zError / tuning.zMaxTemplateError);
  const result = {
    ...unknown,
    circleScore,
    zScore,
    metrics: {
      closure,
      revolutions,
      radialError,
      consistency,
      samples: points.length,
      pathLength,
    },
  };
  if (!reasons.length)
    return {
      ...result,
      kind: "circle",
      confidence: circleScore,
      reason: "circle accepted",
    };
  if (
    zError <= tuning.zMaxTemplateError &&
    zLength >= tuning.zMinLength &&
    zLength <= tuning.zMaxLength
  )
    return { ...result, kind: "z", confidence: zScore, reason: "z accepted" };
  return {
    ...result,
    reason: `circle: ${reasons.join(", ")}; z: ${zError > tuning.zMaxTemplateError ? "template mismatch" : "path length"}`,
  };
}
