import { expect, it } from "vitest";
import {
  recognizeUltimateGesture,
  ultimateGestureHint,
} from "../../src/game/input/ultimateGesture";
import {
  recognizeGesture,
  type Point,
} from "../../src/game/input/gestureRecognizer";

const path = (vertices: readonly Point[], samples = 15): Point[] =>
  vertices.flatMap((p, i) => {
    if (!i) return [p];
    const a = vertices[i - 1]!;
    return Array.from({ length: samples }, (_, j) => ({
      x: a.x + ((p.x - a.x) * (j + 1)) / samples,
      y: a.y + ((p.y - a.y) * (j + 1)) / samples,
    }));
  });
const v = [
  { x: 0, y: 0 },
  { x: 70, y: 140 },
  { x: 140, y: 0 },
];
const circle = Array.from({ length: 49 }, (_, i) => ({
  x: 100 + 80 * Math.cos((i * Math.PI) / 24),
  y: 100 + 80 * Math.sin((i * Math.PI) / 24),
}));
const z = path([
  { x: 0, y: 0 },
  { x: 140, y: 0 },
  { x: 0, y: 140 },
  { x: 140, y: 140 },
]);

it("is disabled below READY even for a valid V", () => {
  expect(recognizeUltimateGesture(path(v), false)).toBe(false);
  expect(recognizeUltimateGesture(path(v), true)).toBe(true);
});

it.each([3, 9, 25, 80])(
  "accepts sample counts %i with translation, scale and small hand noise",
  (samples) => {
    const points = path(v, samples).map((p, i) => ({
      x: 350 + p.x * 0.8 + ((i % 3) - 1) * 1.5,
      y: 220 + p.y * 0.8 + Math.sin(i) * 2,
    }));
    expect(recognizeUltimateGesture(points, true)).toBe(true);
    expect(recognizeUltimateGesture([...points].reverse(), true)).toBe(true);
  },
);

it.each([-12, 0, 12])(
  "accepts a V tilted %i degrees without allowing a sideways chevron",
  (angle) => {
    const r = (angle * Math.PI) / 180;
    const points = path(v).map((p) => ({
      x: p.x * Math.cos(r) - p.y * Math.sin(r),
      y: p.x * Math.sin(r) + p.y * Math.cos(r),
    }));
    expect(recognizeUltimateGesture(points, true)).toBe(true);
  },
);

it("exports the actual hint geometry and keeps V separate from Circle and Z magic", () => {
  const points = ultimateGestureHint.path.map((p) => ({
    x: p.x * 160,
    y: p.y * 160,
  }));
  expect(recognizeUltimateGesture(points, true)).toBe(true);
  expect(recognizeGesture(points).kind).toBe("unknown");
  expect(recognizeGesture(circle).kind).toBe("circle");
  expect(recognizeGesture(z).kind).toBe("z");
  expect(recognizeUltimateGesture(circle, true)).toBe(false);
  expect(recognizeUltimateGesture(z, true)).toBe(false);
});

it.each([
  ["tap", [{ x: 1, y: 1 }]],
  ["tiny V", v.map((p) => ({ x: p.x * 0.1, y: p.y * 0.1 }))],
  [
    "line",
    path([
      { x: 0, y: 0 },
      { x: 140, y: 140 },
    ]),
  ],
  ["triangle", path([...v, v[0]!])],
  [
    "sideways chevron",
    path([
      { x: 0, y: 0 },
      { x: 140, y: 70 },
      { x: 0, y: 140 },
    ]),
  ],
  ["inverted V", path(v.map((p) => ({ x: p.x, y: 140 - p.y })))],
  [
    "U curve",
    Array.from({ length: 40 }, (_, i) => ({
      x: i * 4,
      y: 140 * Math.sin((i / 39) * Math.PI),
    })),
  ],
  [
    "scribble",
    path([
      { x: 0, y: 0 },
      { x: 100, y: 80 },
      { x: 30, y: 20 },
      { x: 70, y: 140 },
      { x: 140, y: 0 },
    ]),
  ],
  [
    "invalid",
    [
      { x: NaN, y: 0 },
      { x: 10, y: 10 },
      { x: 100, y: 0 },
    ],
  ],
] as const)("rejects %s", (_name, points) =>
  expect(recognizeUltimateGesture(points, true)).toBe(false),
);
