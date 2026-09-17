import { expect, it } from "vitest";
import { recognizeGesture } from "../../src/game/input/gestureRecognizer";
import { TapInput } from "../../src/game/input/tapInput";
import { Magic } from "../../src/game/combat/magic";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";

it("preserves a full large drawing when pointer samples exceed the storage cap", () => {
  const input = new TapInput();
  input.down(1, 480, 240, 0);
  for (let i = 1; i <= 400; i++) {
    const angle = (i / 400) * Math.PI * 2;
    input.move(1, 240 + 240 * Math.cos(angle), 240 + 240 * Math.sin(angle));
  }
  const result = input.up(1, 480, 240, 1400);
  expect(result?.kind).toBe("gesture");
  if (result?.kind !== "gesture") throw new Error("Large circle discarded");
  expect(result.points.length).toBeLessThanOrEqual(256);
  expect(recognizeGesture(result.points).kind).toBe("circle");
});

it("accepts small, large, tilted and sparsely sampled nearly closed ellipses", () => {
  for (const direction of [-1, 1])
    for (const start of [0, 1.5, 3.7]) {
      for (const size of [30, 150])
        for (const count of [10, 49]) {
          const points = Array.from({ length: count }, (_, i) => {
            const angle =
              start + ((direction * i) / (count - 1)) * Math.PI * 1.78;
            const x = Math.cos(angle) * size * 2.4;
            const y = Math.sin(angle) * size;
            return {
              x: 200 + (x - y) / Math.SQRT2,
              y: 200 + (x + y) / Math.SQRT2,
            };
          });
          expect(
            recognizeGesture(points).kind,
            JSON.stringify({ start, direction, size, count }),
          ).toBe("circle");
        }
    }
});

it("rejects zigzag scribble and reports diagnostic scores for rejected paths", () => {
  const result = recognizeGesture([
    { x: 0, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
    { x: 100, y: 0 },
    { x: 0, y: 0 },
    { x: 100, y: 100 },
  ]);
  expect(result.kind).toBe("unknown");
  expect(result.reason).not.toBe("");
  expect(result.circleScore).toBeGreaterThanOrEqual(0);
  expect(result.zScore).toBeGreaterThanOrEqual(0);
});

it("recognizes rough ovals from either direction and any start", () => {
  for (const direction of [-1, 1]) {
    const points = Array.from({ length: 41 }, (_, i) => {
      const angle = 1.2 + ((direction * i) / 40) * Math.PI * 2;
      return {
        x: 140 + Math.cos(angle) * (85 + Math.sin(i) * 5),
        y: 180 + Math.sin(angle) * 60,
      };
    });
    expect(recognizeGesture(points).kind).toBe("circle");
  }
});

it("recognizes a loosely drawn Z with sparse or uneven samples", () => {
  expect(
    recognizeGesture([
      { x: 20, y: 20 },
      { x: 80, y: 24 },
      { x: 140, y: 30 },
      { x: 85, y: 90 },
      { x: 25, y: 150 },
      { x: 145, y: 140 },
    ]).kind,
  ).toBe("z");
});

it("rejects jitter, lines, open arcs and repeated scribbles", () => {
  const circle = Array.from({ length: 41 }, (_, i) => ({
    x: 100 + 70 * Math.cos((i / 40) * Math.PI * 2),
    y: 100 + 70 * Math.sin((i / 40) * Math.PI * 2),
  }));
  for (const points of [
    [
      { x: 0, y: 0 },
      { x: 4, y: 6 },
      { x: 1, y: 0 },
    ],
    [
      { x: 0, y: 0 },
      { x: 200, y: 200 },
    ],
    circle.slice(0, 27),
    [...circle, ...circle],
    [],
  ])
    expect(recognizeGesture(points).kind).toBe("unknown");
});

it("routes completed single-finger drawings to magic effects and denies cooldown reuse", () => {
  const circle = Array.from({ length: 41 }, (_, i) => ({
    x: 100 + 70 * Math.cos((i / 40) * Math.PI * 2),
    y: 100 + 70 * Math.sin((i / 40) * Math.PI * 2),
  }));
  const z = [
    { x: 20, y: 20 },
    { x: 160, y: 20 },
    { x: 20, y: 160 },
    { x: 160, y: 160 },
  ];
  const magic = new Magic();
  for (const [points, expectedId] of [
    [circle, "frost-nova"],
    [z, "chain-lightning"],
  ] as const) {
    const input = new TapInput();
    input.down(1, points[0]!.x, points[0]!.y, 0);
    for (const point of points.slice(1)) input.move(1, point.x, point.y);
    const result = input.up(1, points.at(-1)!.x, points.at(-1)!.y, 1000);
    expect(result?.kind).toBe("gesture");
    if (result?.kind !== "gesture")
      throw new Error("Drawing was not routed as a gesture");
    const recognized = recognizeGesture(result.points);
    const id =
      recognized.kind === "circle"
        ? "frost-nova"
        : recognized.kind === "z"
          ? "chain-lightning"
          : null;
    expect(id).toBe(expectedId);
    if (!id) throw new Error("Drawing was not recognized");
    const enemy = createPrototypeEnemy("shield", "center", 0);
    const cast = magic.cast(id, [enemy])!;
    expect(cast.hitIds).toEqual([enemy.id]);
    if (id === "frost-nova") expect(magic.frostRemainingMs).toBeGreaterThan(0);
    else expect(cast.enemies[0]!.hp).toBeLessThan(enemy.hp);
    expect(magic.cast(id, cast.enemies)).toBeNull();
  }
});
