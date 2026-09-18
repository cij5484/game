import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { GameStatus } from "../../src/game/dev/runtimeBridge";

const state = vi.hoisted(() => ({
  values: {
    "run.combatTempo": 1.5,
    "relic.guaranteed": true,
    "rarity.a": 0.78,
    "rarity.b": 0.22,
    "special.grenade.cycleMs": 7800,
  } as Record<string, number | boolean>,
  overrides: {} as Record<string, number | boolean>,
  listeners: new Set<() => void>(),
  status: (_status: GameStatus) => {},
  stop: vi.fn(),
}));
vi.mock("../../src/game/dev/runtimeBalance", () => ({
  getValue: (id: string) => state.overrides[id] ?? state.values[id],
  getDefault: (id: string) => state.values[id],
  getOverrides: () => ({ ...state.overrides }),
  setOverrides: (values: Record<string, number | boolean>) => {
    if (Object.keys(values).some((id) => !(id in state.values)))
      throw Error("알 수 없는 항목");
    if (
      Object.values(values).some(
        (value) => typeof value === "number" && !Number.isFinite(value),
      )
    )
      throw Error("유효한 숫자가 필요합니다");
    if (
      Math.abs(
        Number(values["rarity.a"] ?? 0.78) +
          Number(values["rarity.b"] ?? 0.22) -
          1,
      ) > 1e-8
    )
      throw Error("희귀도 합계가 100%여야 합니다");
    state.overrides = { ...values };
    state.listeners.forEach((listener) => listener());
  },
  resetOverrides: () => {
    state.overrides = {};
    state.listeners.forEach((listener) => listener());
  },
  subscribe: (listener: () => void) => {
    state.listeners.add(listener);
    return () => state.listeners.delete(listener);
  },
}));
vi.mock("../../src/game/dev/balanceFields", () => ({
  balanceFields: [
    {
      id: "run.combatTempo",
      label: "전투 속도",
      group: "전체 게임",
      description: "높이면 전투가 빨라집니다.",
      apply: "즉시 적용",
      min: 0.1,
      max: 5,
      step: 0.1,
    },
    {
      id: "relic.guaranteed",
      label: "첫 유물 보장",
      group: "유물",
      description: "첫 정예가 유물을 줍니다.",
      apply: "다음 처치부터",
    },
    {
      id: "special.grenade.cycleMs",
      label: "수류탄 주기",
      group: "특수무기 / 수류탄",
      description: "투척 간격입니다.",
      apply: "다음 공격부터",
      unit: "ms",
    },
    ...["a", "b"].map((id) => ({
      id: `rarity.${id}`,
      label: `희귀도 ${id}`,
      group: "희귀도 / 랜덤",
      description: "두 값의 합계는 100%입니다.",
      apply: "다음 레벨업부터",
      min: 0,
      max: 1,
      step: 0.01,
    })),
  ],
}));
vi.mock("../../src/game/dev/runtimeBridge", () => ({
  startBalanceBridge: (_role: string, listener: typeof state.status) => {
    state.status = listener;
    listener({ connected: false, speed: 1, level: 1 });
    return state.stop;
  },
}));
import { mountBalancePanel } from "../../src/game/dev/BalancePanel";

class ElementStub extends EventTarget {
  id = "";
  className = "";
  textContent = "";
  title = "";
  value = "";
  checked = false;
  disabled = false;
  hidden = false;
  open = false;
  type = "";
  dataset: Record<string, string> = {};
  children: ElementStub[] = [];
  setAttribute = vi.fn();
  append(...children: ElementStub[]) {
    this.children.push(...children);
  }
  replaceChildren(...children: ElementStub[]) {
    this.children = children;
  }
  remove = vi.fn();
  click() {
    this.dispatchEvent(new Event("click"));
  }
}
let elements: ElementStub[];
const byId = (id: string) => elements.find((element) => element.id === id)!;
const button = (label: string) =>
  elements.find((element) => element.textContent === label)!;
const change = (id: string, value: string) => {
  const input = byId(id);
  input.value = value;
  input.dispatchEvent(new Event("change"));
};
beforeEach(() => {
  elements = [];
  state.overrides = {};
  state.listeners.clear();
  state.stop.mockClear();
  const saved = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
  });
  vi.stubGlobal("document", {
    createElement: () => {
      const element = new ElementStub();
      elements.push(element);
      return element;
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("renders Korean tooltips, searches fields, applies values and releases subscriptions", () => {
  const cleanup = mountBalancePanel(
    new ElementStub() as unknown as HTMLElement,
  );
  expect(byId("balance-run.combatTempo").title).toContain("높이면");
  state.status({ connected: true, speed: 4, level: 20 });
  expect(byId("balance-connection").textContent).toBe("게임 연결됨");
  expect(byId("balance-game-state").textContent).toContain("X4");
  change("balance-run.combatTempo", "2");
  expect(state.overrides["run.combatTempo"]).toBe(2);
  const search = byId("balance-search");
  search.value = "유물";
  search.dispatchEvent(new Event("input"));
  expect(
    elements
      .filter((element) => element.dataset.field && !element.hidden)
      .map((element) => element.dataset.field),
  ).toEqual(["relic.guaranteed"]);
  cleanup();
  expect(state.listeners.size).toBe(0);
  expect(state.stop).toHaveBeenCalledOnce();
});

it("shows read-only performance values and clears missing or disconnected measurements", () => {
  mountBalancePanel(new ElementStub() as unknown as HTMLElement);
  expect(byId("balance-performance-fps").textContent).toBe("연결 대기 중");
  const performance = {
    fps: 59.94,
    enemies: 120,
    specialUnits: 3,
    combatVfx: 0,
    substeps: 4,
  };
  state.status({ connected: true, speed: 4, level: 20, performance });
  for (const [key, value] of Object.entries(performance)) {
    const node = byId(`balance-performance-${key}`);
    expect(node.textContent).toBe(key === "fps" ? "59.9" : String(value));
    expect(node.type).toBe("");
  }
  state.status({ connected: true, speed: 1, level: 1 });
  expect(byId("balance-performance-fps").textContent).toBe("측정값 없음");
  state.status({ connected: false, speed: 1, level: 1, performance });
  expect(byId("balance-performance-enemies").textContent).toBe("연결 대기 중");
  expect(state.overrides).toEqual({});
});

it("validates performance messages and keeps the one-second bridge cadence", async () => {
  vi.useFakeTimers();
  const { startBalanceBridge } = await vi.importActual<
    typeof import("../../src/game/dev/runtimeBridge")
  >("../../src/game/dev/runtimeBridge");
  const channel = {
    onmessage: (_event: { data: unknown }) => {},
    postMessage: vi.fn(),
    close: vi.fn(),
  };
  vi.stubGlobal(
    "BroadcastChannel",
    class {
      constructor() {
        return channel;
      }
    },
  );
  vi.stubGlobal("window", { setInterval, clearInterval });
  const onStatus = vi.fn();
  const stop = startBalanceBridge("panel", onStatus);
  const performance = {
    fps: 59.94,
    enemies: 120,
    specialUnits: 3,
    combatVfx: 0,
    substeps: 4,
  };
  const receive = (value: unknown) =>
    channel.onmessage({
      data: { type: "status", speed: 1, level: 1, performance: value },
    });
  receive(performance);
  expect(onStatus).toHaveBeenLastCalledWith(
    expect.objectContaining({ performance }),
  );
  for (const invalid of [
    undefined,
    null,
    {},
    { ...performance, fps: NaN },
    { ...performance, enemies: -1 },
    { ...performance, substeps: 1.5 },
    { ...performance, combatVfx: "0" },
  ]) {
    receive(invalid);
    expect(onStatus.mock.lastCall?.[0].performance).toBeUndefined();
  }
  expect(channel.postMessage).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(999);
  expect(channel.postMessage).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(1);
  expect(channel.postMessage).toHaveBeenCalledTimes(2);
  vi.advanceTimersByTime(5000);
  expect(onStatus.mock.lastCall?.[0].connected).toBe(false);
  stop();
  expect(channel.close).toHaveBeenCalledOnce();
  channel.postMessage.mockClear();
  const stopGame = startBalanceBridge("game", undefined, () => ({
    speed: 1,
    level: 1,
    performance,
  }));
  expect(channel.postMessage).toHaveBeenLastCalledWith(
    expect.objectContaining({ type: "status", performance }),
  );
  vi.advanceTimersByTime(1000);
  expect(channel.postMessage).toHaveBeenCalledTimes(2);
  stopGame();
});

it("preserves invalid rarity drafts until the complete group can apply, and handles toggles", () => {
  mountBalancePanel(new ElementStub() as unknown as HTMLElement);
  change("balance-rarity.a", ".6");
  expect(state.overrides).toEqual({});
  expect(byId("balance-rarity.a").value).toBe(".6");
  expect(byId("balance-notice").textContent).toContain("100%");
  change("balance-rarity.b", ".4");
  expect(state.overrides).toMatchObject({ "rarity.a": 0.6, "rarity.b": 0.4 });
  const toggle = byId("balance-relic.guaranteed");
  toggle.checked = false;
  toggle.dispatchEvent(new Event("change"));
  expect(state.overrides["relic.guaranteed"]).toBe(false);
});

it("round trips presets and JSON, rejects bad imports and resets all overrides", () => {
  mountBalancePanel(new ElementStub() as unknown as HTMLElement);
  change("balance-run.combatTempo", "2");
  byId("balance-preset-name").value = "빠른 전투";
  button("프리셋 저장").click();
  change("balance-run.combatTempo", "3");
  button("불러오기").click();
  expect(state.overrides["run.combatTempo"]).toBe(2);
  button("JSON 내보내기").click();
  expect(JSON.parse(byId("balance-json").value)).toEqual({
    version: 1,
    overrides: { "run.combatTempo": 2 },
  });
  byId("balance-json").value = '{"version":2,"overrides":{}}';
  button("JSON 불러오기").click();
  expect(state.overrides["run.combatTempo"]).toBe(2);
  byId("balance-json").value =
    '{"version":1,"overrides":{"run.combatTempo":4}}';
  button("JSON 불러오기").click();
  expect(state.overrides["run.combatTempo"]).toBe(4);
  button("모든 값 기본값으로").click();
  expect(state.overrides).toEqual({});
  button("프리셋 삭제").click();
  expect(byId("balance-presets").children).toHaveLength(1);
});

it("edits real X1 cycle seconds while storing internal milliseconds and rejects blank numbers", () => {
  mountBalancePanel(new ElementStub() as unknown as HTMLElement);
  expect(byId("balance-special.grenade.cycleMs").value).toBe("5.2");
  change("balance-special.grenade.cycleMs", "4");
  expect(state.overrides["special.grenade.cycleMs"]).toBe(6000);
  change("balance-run.combatTempo", "2");
  expect(byId("balance-special.grenade.cycleMs").value).toBe("3");
  change("balance-run.combatTempo", "");
  expect(state.overrides["run.combatTempo"]).toBe(2);
  expect(byId("balance-notice").textContent).toContain("유효한 숫자");
});
