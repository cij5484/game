import { tapBalance } from "../data/input";

export class TapInput {
  private fingers = new Map<number, { x: number; y: number }>();
  private started = 0;
  private count = 0;
  private valid = true;

  down(id: number, x: number, y: number, time: number): void {
    if (this.fingers.size === 0) {
      this.started = time;
      this.count = 0;
      this.valid = true;
    } else if (time - this.started > tapBalance.joinWindowMs)
      this.valid = false;
    this.fingers.set(id, { x, y });
    if (++this.count > 2) this.valid = false;
  }

  move(id: number, x: number, y: number): void {
    const start = this.fingers.get(id);
    if (
      start &&
      Math.hypot(x - start.x, y - start.y) > tapBalance.maxMovementPx
    )
      this.valid = false;
  }

  up(
    id: number,
    x: number,
    y: number,
    time: number,
  ): { kind: "primary" | "secondary"; x: number; y: number } | null {
    if (!this.fingers.has(id)) return null;
    this.move(id, x, y);
    this.fingers.delete(id);
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
