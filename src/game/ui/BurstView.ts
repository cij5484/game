import { battlefieldLayout, readSafeArea } from "../battlefield/layout";
import { burstBalance } from "../data/burst";
import type { Burst } from "../combat/burst";
import type { StimpackPhase } from "../combat/stimpack";
import { ultimateGestureHint } from "../input/ultimateGesture";
import { hudLabels } from "./hudLabels";
import "./combatHud.css";
function circle(title: string, symbol: string, action: () => void) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "ability-circle";
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
  element.addEventListener("click", action);
  return { element, title, state };
}
function renderCircle(
  c: ReturnType<typeof circle>,
  progress: number,
  state: string,
  color: string,
) {
  const percent = Math.round(Math.max(0, Math.min(1, progress)) * 100);
  c.element.style.setProperty("--progress", `${percent}%`);
  c.element.style.setProperty("--accent", color);
  c.element.setAttribute("aria-label", `${c.title} · ${state} · ${percent}%`);
  c.state.textContent = state;
}
export class BurstView {
  private root = document.createElement("div");
  private hint = document.createElement("div");
  private hintTimer: number | undefined;
  private stim;
  private frost;
  private chain;
  private ultimate;
  private blocked = false;
  constructor(actions: {
    stim: () => void;
    frost?: () => void;
    chain?: () => void;
    hint: () => void;
  }) {
    this.stim = circle(hudLabels.stim, "✚", actions.stim);
    this.frost = circle(hudLabels.frost, "❄", actions.frost ?? (() => {}));
    this.chain = circle(hudLabels.chain, "ϟ", actions.chain ?? (() => {}));
    this.ultimate = circle(hudLabels.burst, "V", actions.hint);
    this.root.className = "burst-ui combat-hud";
    this.root.setAttribute("role", "group");
    this.root.setAttribute("aria-label", hudLabels.abilities);
    const equipped =
      actions.frost && actions.chain
        ? [this.stim, this.frost, this.chain, this.ultimate]
        : [this.stim, this.ultimate];
    equipped.forEach((c, i) => {
      c.element.style.left = `${equipped.length === 2 ? 230 + i * 165 : 65 + i * 165}px`;
      this.root.append(c.element);
    });
    this.hint.className = "ultimate-hint";
    this.hint.hidden = true;
    this.hint.setAttribute("role", "status");
    const drawing = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    drawing.setAttribute("viewBox", "0 0 240 240");
    drawing.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(drawing.namespaceURI, "polyline");
    path.setAttribute(
      "points",
      ultimateGestureHint.path
        .map((p) => `${20 + p.x * 200},${20 + p.y * 200}`)
        .join(" "),
    );
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#ffe18b");
    path.setAttribute("stroke-width", "8");
    drawing.append(path);
    const text = document.createElement("span");
    text.textContent = ultimateGestureHint.instruction;
    this.hint.append(drawing, text);
    this.root.append(this.hint);
    document.body.append(this.root);
  }
  showHint() {
    this.hint.hidden = false;
    window.clearTimeout(this.hintTimer);
    this.hintTimer = window.setTimeout(() => {
      this.hint.hidden = true;
    }, 2400);
  }
  resize(width: number, height: number) {
    const layout = battlefieldLayout(width, height, readSafeArea());
    this.root.style.left = `${layout.x}px`;
    this.root.style.top = `${layout.y}px`;
    this.root.style.transform = `scale(${layout.scale})`;
  }
  render(burst: Burst, blocked: boolean, ultimate: boolean) {
    this.blocked = blocked;
    this.ultimate.element.disabled = blocked;
    renderCircle(
      this.ultimate,
      burst.gauge / burstBalance.gaugeMax,
      ultimate
        ? hudLabels.active
        : burst.ready
          ? "준비 · V 그리기"
          : "충전 · 탭 안내",
      burst.ready ? "#ffe18b" : "#a8baca",
    );
    this.ultimate.element.classList.toggle("ready", burst.ready);
    this.ultimate.element.classList.toggle("ultimate-ready", burst.ready);
    if (blocked) this.hint.hidden = true;
  }
  renderAbilities(
    stim: { phase: StimpackPhase; progress: number },
    magic?: {
      frostProgress: number;
      chainProgress: number;
      frostActive: boolean;
    },
  ) {
    const blocked = this.blocked;
    this.stim.element.disabled = blocked || stim.phase !== "normal";

    renderCircle(
      this.stim,
      stim.progress,
      hudLabels.stimPhases[stim.phase],
      stim.phase === "crash" ? "#ff7d72" : "#83edb0",
    );
    this.stim.element.classList.toggle("ready", !this.stim.element.disabled);
    if (!magic) return;
    this.frost.element.disabled = blocked || magic.frostProgress < 1;
    this.chain.element.disabled = blocked || magic.chainProgress < 1;
    renderCircle(
      this.frost,
      magic.frostProgress,
      magic.frostProgress >= 1
        ? hudLabels.ready
        : magic.frostActive
          ? hudLabels.active
          : hudLabels.waiting,
      "#92ecff",
    );
    renderCircle(
      this.chain,
      magic.chainProgress,
      magic.chainProgress >= 1 ? hudLabels.ready : hudLabels.waiting,
      "#e3b6ff",
    );
    [this.stim, this.frost, this.chain].forEach((c) =>
      c.element.classList.toggle("ready", !c.element.disabled),
    );
  }
  destroy() {
    window.clearTimeout(this.hintTimer);
    this.root.remove();
  }
}
