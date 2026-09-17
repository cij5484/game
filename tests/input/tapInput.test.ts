import { expect, it, vi } from "vitest";
import {
  TapInput,
  MouseTapInput,
  bindTapInput,
} from "../../src/game/input/tapInput";

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
