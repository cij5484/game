import { battlefieldLayout, readSafeArea } from "../battlefield/layout";
import { burstBalance } from "../data/burst";
import type { Burst } from "../combat/burst";
import { display, gradeLabels } from "../data/display";
import type { StimpackPhase } from "../combat/stimpack";
import { hudLabels } from "./hudLabels";
import "./combatHud.css";

function statusCircle(element: HTMLElement, title: string, symbol: string) {
  element.classList.add("ability-circle");
  const icon = document.createElement("span");
  icon.className = "ability-symbol";
  icon.textContent = symbol;
  icon.setAttribute("aria-hidden", "true");
  const name = document.createElement("span");
  name.className = "ability-name";
  name.textContent = title;
  const state = document.createElement("span");
  state.className = "ability-state";
  element.append(icon, name, state);
  return { element, title, state };
}

function renderCircle(
  circle: ReturnType<typeof statusCircle>,
  progress: number,
  state: string,
  color: string,
) {
  const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  circle.element.style.setProperty("--progress", `${percent}%`);
  circle.element.style.setProperty("--accent", color);
  circle.element.setAttribute(
    "aria-label",
    `${circle.title} · ${state} · ${percent}%`,
  );
  circle.state.textContent = state;
}

/** Native accessible button, anchored to the same logical wall as the canvas HUD. */
export class BurstView {
  private readonly root = document.createElement("div");
  private readonly button = document.createElement("button");
  private readonly stim = statusCircle(
    document.createElement("div"),
    hudLabels.stim,
    "✚",
  );
  private readonly frost = statusCircle(
    document.createElement("div"),
    hudLabels.frost,
    "❄",
  );
  private readonly chain = statusCircle(
    document.createElement("div"),
    hudLabels.chain,
    "ϟ",
  );
  private readonly burstCircle = statusCircle(
    this.button,
    hudLabels.burst,
    "✦",
  );
  private readonly rhythm = document.createElement("div");
  private readonly label = document.createElement("div");
  private readonly cursor = document.createElement("i");

  constructor(activate: () => void, tap: () => void) {
    this.root.className = "burst-ui combat-hud";
    this.root.setAttribute("role", "group");
    this.root.setAttribute("aria-label", hudLabels.abilities);
    this.button.classList.add("burst-button");
    for (const [index, circle] of [
      this.stim,
      this.frost,
      this.chain,
      this.burstCircle,
    ].entries()) {
      circle.element.style.left = `${70 + index * 165}px`;
      if (circle !== this.burstCircle)
        circle.element.setAttribute("role", "img");
    }
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
    this.root.append(
      this.stim.element,
      this.frost.element,
      this.chain.element,
      this.button,
      this.rhythm,
    );
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
    renderCircle(
      this.burstCircle,
      ultimate
        ? 1
        : rhythm
          ? burst.progress
          : burst.gauge / burstBalance.gaugeMax,
      ultimate
        ? hudLabels.active
        : rhythm
          ? display.tap
          : burst.ready
            ? hudLabels.ready
            : hudLabels.charging,
      burst.ready || ultimate || rhythm ? "#ffe18b" : "#a8baca",
    );
    this.button.classList.toggle("ready", burst.ready);
    this.cursor.style.left = `${burst.progress * 100}%`;
    const last = burst.grades[burst.grades.length - 1];
    const grade = last ? gradeLabels[last] : display.rhythmHint;
    this.label.textContent = `${grade} · ${burst.beatIndex}/${burstBalance.beatTargetsMs.length}`;
  }

  renderAbilities(
    stim: { phase: StimpackPhase; progress: number },
    magic: {
      frostProgress: number;
      chainProgress: number;
      frostActive: boolean;
    },
  ): void {
    const colors = {
      normal: "#83edb0",
      boost: "#70ffae",
      crash: "#ff7d72",
      recovery: "#ffcd78",
    };
    renderCircle(
      this.stim,
      stim.progress,
      hudLabels.stimPhases[stim.phase],
      colors[stim.phase],
    );
    renderCircle(
      this.frost,
      magic.frostProgress,
      magic.frostProgress >= 1
        ? hudLabels.ready
        : magic.frostActive
          ? hudLabels.active
          : hudLabels.waiting,
      magic.frostActive || magic.frostProgress >= 1 ? "#92ecff" : "#78949f",
    );
    renderCircle(
      this.chain,
      magic.chainProgress,
      magic.chainProgress >= 1 ? hudLabels.ready : hudLabels.waiting,
      magic.chainProgress >= 1 ? "#e3b6ff" : "#9586a2",
    );
    this.stim.element.classList.toggle("ready", stim.phase === "normal");
    this.frost.element.classList.toggle("ready", magic.frostProgress >= 1);
    this.chain.element.classList.toggle("ready", magic.chainProgress >= 1);
  }

  destroy(): void {
    this.root.remove();
  }
}
