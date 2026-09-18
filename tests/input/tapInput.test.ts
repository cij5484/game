import { expect, it, vi } from "vitest";
import {
  TapInput,
  MouseTapInput,
  bindTapInput,
} from "../../src/game/input/tapInput";
import { recognizeGesture } from "../../src/game/input/gestureRecognizer";

it.each([
  ["touch", "z"],
  ["mouse", "z"],
  ["touch", "circle"],
  ["mouse", "circle"],
])(
  "retains coalesced %s %s paths and maps only display points to canvas pixels",
  (pointerType, kind) => {
    vi.stubGlobal("window", new EventTarget());
    const canvas = Object.assign(new EventTarget(), {
      width: 800,
      height: 1600,
      setPointerCapture: vi.fn(),
      getBoundingClientRect: () => ({
        left: 20,
        top: 40,
        width: 400,
        height: 800,
      }),
    }) as unknown as HTMLCanvasElement;
    const onTap = vi.fn();
    const onGesture = vi.fn();
    const binding = bindTapInput(canvas, onTap, onGesture);
    const dispatch = (
      type: string,
      x: number,
      y: number,
      time: number,
      samples: { clientX: number; clientY: number }[] = [],
    ) => {
      const event = new Event(type, { cancelable: true });
      Object.defineProperties(event, {
        pointerType: { value: pointerType },
        pointerId: { value: 1 },
        button: { value: 0 },
        buttons: { value: type === "pointerup" ? 0 : 1 },
        clientX: { value: x },
        clientY: { value: y },
        timeStamp: { value: time },
        getCoalescedEvents: { value: () => samples },
      });
      canvas.dispatchEvent(event);
    };
    try {
      const path =
        kind === "z"
          ? [
              { x: 20, y: 40 },
              { x: 140, y: 40 },
              { x: 20, y: 160 },
              { x: 140, y: 160 },
            ]
          : Array.from({ length: 13 }, (_, i) => ({
              x: 100 + 60 * Math.cos((i * Math.PI) / 6),
              y: 100 + 60 * Math.sin((i * Math.PI) / 6),
            }));
      const first = path[0]!,
        last = path.at(-1)!;
      for (const duration of [80, 2300, 3000]) {
        dispatch("pointerdown", first.x, first.y, 0);
        dispatch(
          "pointermove",
          last.x,
          last.y,
          duration / 2,
          path.slice(1, -1).map((p) => ({ clientX: p.x, clientY: p.y })),
        );
        dispatch("pointerup", last.x + 2, last.y, duration);
        expect(onTap).not.toHaveBeenCalled();
        expect(onGesture).toHaveBeenCalledTimes(1);
        const [points, displayPoints] = onGesture.mock.calls[0]!;
        expect(recognizeGesture(points).kind).toBe(kind);
        expect(points.at(-1)).toEqual({ x: last.x + 2, y: last.y });
        expect(displayPoints.at(-1).x).toBeCloseTo((last.x + 2 - 20) * 2);
        expect(displayPoints.at(-1).y).toBeCloseTo((last.y - 40) * 2);
        onGesture.mockClear();
      }
      dispatch("pointerdown", 20, 40, 3000);
      dispatch("pointermove", 140, 40, 3030);
      dispatch("pointercancel", 140, 40, 3040);
      dispatch("pointerup", 140, 160, 3060);
      expect(onGesture).not.toHaveBeenCalled();
      expect(onTap).not.toHaveBeenCalled();
    } finally {
      binding.destroy();
      vi.unstubAllGlobals();
    }
  },
);

it("keeps tap timeout separate and rejects drawings beyond the bounded drawing timeout", () => {
  const input = new TapInput();
  input.down(1, 0, 0, 0);
  expect(input.up(1, 0, 0, 301)).toBeNull();
  input.down(1, 0, 0, 1000);
  input.move(1, 120, 0);
  input.move(1, 0, 120);
  expect(input.up(1, 120, 120, 6001)).toBeNull();
});

it("does not turn a slow, repeated scribble into magic", () => {
  const input = new TapInput();
  input.down(1, 180, 100, 0);
  for (let i = 1; i <= 600; i++) {
    const angle = (i / 300) * Math.PI * 2;
    input.move(1, 100 + 80 * Math.cos(angle), 100 + 80 * Math.sin(angle));
  }
  const result = input.up(1, 180, 100, 4000);
  expect(result?.kind).toBe("gesture");
  if (result?.kind !== "gesture") throw new Error("Missing slow drawing");
  expect(result.points.length).toBeLessThanOrEqual(256);
  expect(recognizeGesture(result.points).kind).toBe("unknown");
});

it("includes the final pointerup segment when no move event contains it", () => {
  const input = new TapInput();
  input.down(1, 0, 0, 0);
  input.move(1, 100, 0);
  input.move(1, 0, 100);
  const result = input.up(1, 100, 100, 70);
  expect(result?.kind).toBe("gesture");
  if (result?.kind !== "gesture") throw new Error("Missing fast drawing");
  expect(recognizeGesture(result.points).kind).toBe("z");
});

it("starts mouse sequences only on canvas down and does not revive cancelled held buttons", () => {
  vi.stubGlobal("window", new EventTarget());
  const canvas = Object.assign(new EventTarget(), {
    width: 100,
    height: 100,
    setPointerCapture: vi.fn(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  }) as unknown as HTMLCanvasElement;
  const onTap = vi.fn();
  const binding = bindTapInput(canvas, onTap);
  const pointer = (
    type: string,
    buttons: number,
    time: number,
    button = -1,
  ) => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperties(event, {
      pointerType: { value: "mouse" },
      pointerId: { value: 1 },
      buttons: { value: buttons },
      button: { value: button },
      clientX: { value: 10 },
      clientY: { value: 10 },
      timeStamp: { value: time },
    });
    canvas.dispatchEvent(event);
  };
  try {
    pointer("pointermove", 1, 0);
    pointer("pointerup", 0, 30);
    expect.soft(onTap).not.toHaveBeenCalled();
    onTap.mockClear();

    pointer("pointerdown", 1, 100, 0);
    binding.cancel();
    pointer("pointermove", 1, 120);
    pointer("pointerup", 0, 150);
    expect.soft(onTap).not.toHaveBeenCalled();
    onTap.mockClear();

    pointer("pointerdown", 1, 200, 0);
    pointer("pointermove", 3, 230, 2);
    pointer("pointermove", 2, 250, 0);
    pointer("pointerup", 0, 280, 2);
    expect(onTap).toHaveBeenCalledExactlyOnceWith("secondary", 10, 10);
  } finally {
    binding.destroy();
    vi.unstubAllGlobals();
  }
});

it("maps either order of overlapping mouse buttons to exactly one secondary", () => {
  for (const first of [1, 2]) {
    const mouse = new MouseTapInput();
    expect(mouse.update(first, 10, 10, 0)).toBeNull();
    expect(mouse.update(3, 10, 10, 40)).toBeNull();
    expect(mouse.update(first, 10, 10, 80)).toBeNull();
    expect(mouse.update(0, 10, 10, 100)?.kind).toBe("secondary");
    expect(mouse.update(0, 10, 10, 110)).toBeNull();
  }
});

it("keeps mouse left tap/drawing, ignores right-only and cancelled chords", () => {
  const mouse = new MouseTapInput();
  mouse.update(1, 0, 0, 0);
  expect(mouse.update(0, 0, 0, 70)?.kind).toBe("primary");
  mouse.update(2, 0, 0, 100);
  expect(mouse.update(0, 0, 0, 150)).toBeNull();
  mouse.update(1, 0, 0, 200);
  mouse.update(1, 80, 0, 220);
  expect(mouse.update(0, 80, 0, 250)?.kind).toBe("gesture");
  mouse.update(3, 0, 0, 300);
  mouse.cancel();
  expect(mouse.update(0, 0, 0, 350)).toBeNull();
  mouse.update(1, 0, 0, 400);
  mouse.update(3, 0, 0, 600);
  mouse.update(2, 0, 0, 620);
  expect(mouse.update(0, 0, 0, 650)).toBeNull();
});

it("emits one secondary and no primary for overlapping fingers", () => {
  const input = new TapInput();
  input.down(1, 10, 10, 0);
  input.down(2, 50, 10, 50);
  expect(input.up(1, 10, 10, 80)).toBeNull();
  expect(input.up(2, 50, 10, 100)?.kind).toBe("secondary");
  input.down(1, 10, 10, 200);
  expect(input.up(1, 10, 10, 250)?.kind).toBe("primary");
});

it("routes drawings without firing a tap and rejects cancelled or three-finger input", () => {
  const input = new TapInput();
  input.down(1, 0, 0, 0);
  input.move(1, 60, 0);
  expect(input.up(1, 0, 0, 100)?.kind).toBe("gesture");
  input.down(1, 0, 0, 200);
  input.cancel();
  expect(input.up(1, 0, 0, 250)).toBeNull();
  for (const id of [1, 2, 3]) input.down(id, 0, 0, 300);
  for (const id of [1, 2, 3]) expect(input.up(id, 0, 0, 350)).toBeNull();
});

it("keeps jitter as a tap and does not turn a multi-touch drag into magic", () => {
  const input = new TapInput();
  input.down(1, 0, 0, 0);
  input.move(1, 5, 3);
  expect(input.up(1, 5, 3, 100)?.kind).toBe("primary");
  input.down(1, 0, 0, 200);
  input.down(2, 20, 0, 220);
  input.move(1, 80, 0);
  expect(input.up(1, 80, 0, 300)).toBeNull();
  expect(input.up(2, 20, 0, 320)).toBeNull();
});

it("rejects UI-region taps and drawings crossing HUD boundaries after canvas coordinate conversion", () => {
  vi.stubGlobal("window", new EventTarget());
  const canvas = Object.assign(new EventTarget(), {
    width: 200,
    height: 200,
    setPointerCapture: vi.fn(),
    getBoundingClientRect: () => ({
      left: 10,
      top: 20,
      width: 100,
      height: 100,
    }),
  }) as unknown as HTMLCanvasElement;
  const tap = vi.fn(),
    gesture = vi.fn();
  const binding = bindTapInput(
    canvas,
    tap,
    gesture,
    (_x, y) => y >= 40 && y < 160,
  );
  const pointer = (type: string, y: number, time: number) => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperties(event, {
      pointerType: { value: "touch" },
      pointerId: { value: 1 },
      button: { value: 0 },
      clientX: { value: 50 },
      clientY: { value: y },
      timeStamp: { value: time },
    });
    canvas.dispatchEvent(event);
  };
  try {
    pointer("pointerdown", 30, 0);
    pointer("pointerup", 30, 80);
    pointer("pointerdown", 110, 100);
    pointer("pointerup", 110, 180);
    pointer("pointerdown", 60, 200);
    pointer("pointermove", 30, 230);
    pointer("pointerup", 60, 280);
    expect(tap).not.toHaveBeenCalled();
    expect(gesture).not.toHaveBeenCalled();
    pointer("pointerdown", 60, 300);
    pointer("pointerup", 60, 380);
    expect(tap).toHaveBeenCalledExactlyOnceWith("primary", 80, 80);
  } finally {
    binding.destroy();
    vi.unstubAllGlobals();
  }
});
