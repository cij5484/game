import {
  specialWeaponDefinitions,
  type SpecialWeaponState,
} from "../data/specialWeapons";
import { battlefieldLayout, readSafeArea } from "../battlefield/layout";
import { burstBalance } from "../data/burst";
import type { Burst } from "../combat/burst";
import type { StimpackPhase } from "../combat/stimpack";
import { ultimateGestureHint } from "../input/ultimateGesture";
import { hudLabels } from "./hudLabels";
import { masteryThresholds } from "../data/operations";
import "./combatHud.css";
import type { BuildIcon } from "./buildSummary";
import { buildBadge } from "./BuildBar";

export type WeaponSlotState = {
  state: "locked" | "empty" | "equipped";
  title: string;
  symbol: string;
  detail: string;
  upgrades?: readonly BuildIcon[];
  owner?: BuildIcon["owner"];
  status?: string;
  level?: number;
};
export function weaponSlot(
  slot: WeaponSlotState,
  inspect: (entries: readonly BuildIcon[]) => void,
) {
  const root = document.createElement("div");
  root.className = "weapon-slot";
  root.dataset.state = slot.state;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "slot-summary";
  button.title = `${slot.title} — ${slot.detail}`;
  button.setAttribute("aria-label", button.title);
  const symbol = document.createElement("strong");
  symbol.textContent = slot.state === "locked" ? "🔒" : slot.symbol;
  const name = document.createElement("span");
  name.textContent = slot.title;
  const status = document.createElement("small");
  status.textContent =
    slot.state === "locked"
      ? "잠김"
      : slot.state === "empty"
        ? "미장착"
        : (slot.status ?? "장착");
  button.append(symbol, name, status);
  button.addEventListener("click", () =>
    inspect([
      {
        id: slot.title,
        owner: slot.owner ?? "basicWeapon",
        group: "trait",
        title: slot.title,
        symbol: slot.symbol,
        detail: slot.detail,
        ...(slot.level === undefined ? {} : { level: slot.level }),
      },
      ...(slot.upgrades ?? []),
    ]),
  );
  root.append(button);
  const badges = document.createElement("div");
  badges.className = "slot-badges";
  badges.append(...(slot.upgrades ?? []).map((e) => buildBadge(e, inspect)));
  root.append(badges);
  return root;
}
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
  private stim: ReturnType<typeof circle>;
  private frost: ReturnType<typeof circle>;
  private chain: ReturnType<typeof circle>;
  private ultimate: ReturnType<typeof circle>;
  private blocked = false;
  private row = document.createElement("div");
  private basic = document.createElement("div");
  private specialSlots = [
    document.createElement("div"),
    document.createElement("div"),
  ];
  private stimBadges = document.createElement("div");
  private inspect: (entries: readonly BuildIcon[]) => void;
  constructor(actions: {
    stim: () => void;
    inspect?: (entries: readonly BuildIcon[]) => void;
    frost?: () => void;
    chain?: () => void;
    hint: () => void;
  }) {
    this.inspect = actions.inspect ?? (() => {});
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
    this.row.className = "loadout-row";
    this.row.append(this.basic);
    this.row.append(...this.specialSlots);
    this.renderSpecialWeapons([], [], 0);
    for (const c of equipped) {
      const slot = document.createElement("div");
      slot.className = "ability-slot";
      slot.append(c.element);
      if (c === this.stim) {
        this.stimBadges.className = "slot-badges";
        slot.append(this.stimBadges);
      }
      this.row.append(slot);
    }
    this.root.append(this.row);
    this.renderBuild([]);
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
    Object.assign(this.root.style, {
      left: `${layout.bottom.x}px`,
      top: `${layout.bottom.y}px`,
      width: `${layout.bottom.width}px`,
      height: `${layout.bottom.height}px`,
    });
    this.row.style.top = `${Math.max(28, 55 * layout.scale)}px`;
  }
  renderBuild(entries: readonly BuildIcon[]) {
    this.basic.replaceChildren(
      weaponSlot(
        {
          state: "equipped",
          title: "가우스",
          symbol: "⌁",
          detail: "중거리 자동사격 · 개조/사거리 성장은 아래 표시",
          upgrades: entries.filter((e) => e.owner === "basicWeapon"),
        },
        this.inspect,
      ),
    );
    this.stimBadges.replaceChildren(
      ...entries
        .filter((e) => e.owner === "stimpack")
        .map((e) => buildBadge(e, this.inspect)),
    );
  }
  renderSpecialWeapons(
    weapons: readonly SpecialWeaponState[],
    entries: readonly BuildIcon[],
    capacity = 2,
  ) {
    const count = capacity >= 3 ? 3 : 2;
    while (this.specialSlots.length < count) {
      const slot = document.createElement("div");
      this.specialSlots.at(-1)!.after(slot);
      this.specialSlots.push(slot);
    }
    while (this.specialSlots.length > count) this.specialSlots.pop()!.remove();
    this.specialSlots.forEach((slot, index) => {
      const weapon = weapons[index];
      const data = weapon ? specialWeaponDefinitions[weapon.id] : undefined;
      slot.replaceChildren(
        weaponSlot(
          weapon && data
            ? {
                state: "equipped",
                title: data.title,
                symbol: data.symbol,
                owner: weapon.id,
                status: `Lv${weapon.level}`,
                level: weapon.level,
                detail: data.description,
                upgrades: entries.filter(
                  (e) => e.owner === weapon.id && e.id !== weapon.id,
                ),
              }
            : {
                state: index < capacity ? "empty" : "locked",
                title: `특수 ${index + 1}`,
                symbol: "+",
                detail:
                  index >= capacity
                    ? index === 0
                      ? "첫 자연 Run 종료 후 해금 · 실패 또는 Stage 클리어"
                      : `Marine 숙련 ${masteryThresholds.specialSlot2} Point에서 해금`
                    : index === 2
                      ? "무장 확장 코어로 해금 · Lv14부터 남은 무장 획득 카드 등장 가능"
                      : index === 0
                        ? "해금됨 · Lv8부터 무장 획득 카드 등장 가능"
                        : "해금됨 · 첫 무장 보유 + Lv14부터 획득 카드 등장 가능",
              },
          this.inspect,
        ),
      );
    });
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
