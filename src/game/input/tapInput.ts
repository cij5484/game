import { tapBalance, drawingInputBalance } from "../data/input";

type Point = { x: number; y: number };
export type CombatInput =
  | { kind: "primary" | "secondary"; x: number; y: number }
  | { kind: "gesture"; points: Point[]; x: number; y: number };

export class TapInput {
  private fingers = new Map<number, { x: number; y: number }>();
  private started = 0;
  private count = 0;
  private valid = true;
  private path: Point[] = [];

  down(id: number, x: number, y: number, time: number): void {
    if (this.fingers.size === 0) {
      this.started = time;
      this.count = 0;
      this.valid = true;
      this.path = [{ x, y }];
    } else if (time - this.started > tapBalance.joinWindowMs)
      this.valid = false;
    this.fingers.set(id, { x, y });
    if (++this.count > 2) this.valid = false;
  }

  move(id: number, x: number, y: number): void {
    const start = this.fingers.get(id);
    if (start && this.count === 1) {
      const last = this.path[this.path.length - 1]!;
      if (
        Math.hypot(x - last.x, y - last.y) >=
        drawingInputBalance.sampleDistancePx
      ) {
        // Keep the entire drawing at bounded storage instead of clipping its end.
        if (this.path.length >= drawingInputBalance.maxPoints)
          this.path = this.path.filter((_, index) => index % 2 === 0);
        this.path.push({ x, y });
      }
    }
    if (
      start &&
      Math.hypot(x - start.x, y - start.y) > tapBalance.maxMovementPx
    )
      this.valid = false;
  }

  up(id: number, x: number, y: number, time: number): CombatInput | null {
    if (!this.fingers.has(id)) return null;
    this.move(id, x, y);
    this.fingers.delete(id);
    if (
      !this.fingers.size &&
      this.count === 1 &&
      !this.valid &&
      time - this.started <= drawingInputBalance.maxDurationMs
    )
      return { kind: "gesture", points: this.path, x, y };
    if (
      this.fingers.size ||
      !this.valid ||
      time - this.started > tapBalance.maxDurationMs
    )
      return null;
    return { kind: this.count === 2 ? "secondary" : "primary", x, y };
  }

  cancel(): void {
    this.fingers.clear();
    this.valid = false;
  }
}

/** Native pointer IDs preserve multi-touch independently of Phaser's mouse pointer. */
export function bindTapInput(
  canvas: HTMLCanvasElement,
  onTap: (kind: "primary" | "secondary", x: number, y: number) => void,
  onGesture?: (
    points: readonly Point[],
    displayPoints: readonly Point[],
  ) => void,
): () => void {
  const input = new TapInput();
  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    input.down(event.pointerId, event.clientX, event.clientY, event.timeStamp);
  };
  const move = (event: PointerEvent) =>
    input.move(event.pointerId, event.clientX, event.clientY);
  const up = (event: PointerEvent) => {
    event.preventDefault();
    const tap = input.up(
      event.pointerId,
      event.clientX,
      event.clientY,
      event.timeStamp,
    );
    if (tap) {
      const rect = canvas.getBoundingClientRect();
      if (tap.kind === "gesture") {
        onGesture?.(
          tap.points,
          tap.points.map((point) => ({
            x: ((point.x - rect.left) * canvas.width) / rect.width,
            y: ((point.y - rect.top) * canvas.height) / rect.height,
          })),
        );
        return;
      }
      onTap(
        tap.kind,
        ((tap.x - rect.left) * canvas.width) / rect.width,
        ((tap.y - rect.top) * canvas.height) / rect.height,
      );
    }
  };
  const cancel = () => input.cancel();
  const menu = (event: Event) => event.preventDefault();
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("contextmenu", menu);
  window.addEventListener("blur", cancel);
  return () => {
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerup", up);
    canvas.removeEventListener("pointercancel", cancel);
    canvas.removeEventListener("contextmenu", menu);
    window.removeEventListener("blur", cancel);
  };
}
