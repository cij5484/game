import { battlefieldLayout, readSafeArea } from "../battlefield/layout";
import { burstBalance } from "../data/burst";
import type { Burst } from "../combat/burst";

/** Native accessible button, anchored to the same logical wall as the canvas HUD. */
export class BurstView {
  private readonly root = document.createElement("div");
  private readonly button = document.createElement("button");
  private readonly rhythm = document.createElement("div");
  private readonly label = document.createElement("div");
  private readonly cursor = document.createElement("i");

  constructor(activate: () => void, tap: () => void) {
    this.root.className = "burst-ui";
    this.button.className = "burst-button";
    this.button.type = "button";
    this.button.addEventListener("click", () => {
      if (this.rhythm.hidden) activate();
      else tap();
    });
    this.rhythm.className = "rhythm";
    this.rhythm.hidden = true;
    this.label.className = "rhythm-label";
    const track = document.createElement("div");
    track.className = "rhythm-track";
    for (const time of burstBalance.beatTargetsMs) {
      const beat = document.createElement("b");
      beat.style.left = `${(time / burstBalance.rhythmMs) * 100}%`;
      track.append(beat);
    }
    this.cursor.className = "rhythm-cursor";
    track.append(this.cursor);
    this.rhythm.append(this.label, track);
    this.root.append(this.button, this.rhythm);
    document.body.append(this.root);
  }

  resize(width: number, height: number): void {
    const layout = battlefieldLayout(width, height, readSafeArea());
    this.root.style.left = `${layout.x}px`;
    this.root.style.top = `${layout.y}px`;
    this.root.style.transform = `scale(${layout.scale})`;
  }

  render(burst: Burst, blocked: boolean, ultimate: boolean): void {
    const rhythm = burst.phase === "rhythm";
    this.rhythm.hidden = !rhythm || blocked;
    this.button.disabled = blocked || ultimate || (!rhythm && !burst.ready);
    this.button.textContent = ultimate
      ? "BARRAGE"
      : rhythm
        ? "TAP"
        : burst.ready
          ? "BURST\nREADY"
          : `BURST\n${Math.floor((burst.gauge / burstBalance.gaugeMax) * 100)}%`;
    this.button.classList.toggle("ready", burst.ready);
    this.button.style.setProperty(
      "--charge",
      `${(burst.gauge / burstBalance.gaugeMax) * 100}%`,
    );
    this.cursor.style.left = `${burst.progress * 100}%`;
    const grade = burst.grades[burst.grades.length - 1] ?? "선에 맞춰 탭";
    this.label.textContent = `${grade} · ${burst.beatIndex}/${burstBalance.beatTargetsMs.length}`;
  }

  destroy(): void {
    this.root.remove();
  }
}
