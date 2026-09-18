import { afterEach, expect, it, vi } from "vitest";
import { ResultView, type RunResult } from "../../src/game/ui/ResultView";
import { metaStore } from "../../src/game/meta/metaSave";
import { operationRecords } from "../../src/game/data/operations";

class ElementStub extends EventTarget {
  textContent = "";
  disabled = false;
  open = false;
  children: ElementStub[] = [];
  setAttribute = vi.fn();
  remove = vi.fn();
  readonly tag: string;
  constructor(tag: string) {
    super();
    this.tag = tag;
  }
  append(...children: ElementStub[]) {
    this.children.push(...children);
  }
  replaceChildren() {
    this.children = [];
  }
  querySelectorAll(tag: string) {
    return this.children.filter((child) => child.tag === tag);
  }
  showModal() {
    this.open = true;
  }
  click() {
    if (!this.disabled) this.dispatchEvent(new Event("click"));
  }
}

afterEach(() => vi.unstubAllGlobals());

it("shows earned and saved currencies separately and allows only one result action", () => {
  const nodes: ElementStub[] = [];
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: vi.fn() });
  vi.stubGlobal("document", {
    body: new ElementStub("body"),
    createElement: (tag: string) => {
      const node = new ElementStub(tag);
      nodes.push(node);
      return node;
    },
  });
  const result: RunResult = {
    status: "failed",
    elapsedMs: 600000,
    kills: 123,
    eliteKills: 2,
    level: 10,
    wallHp: 0,
    ranks: {},
    branches: {},
    relics: {},
    traitLimit: 3,
    activeSynergyIds: new Set(),
    cores: new Set(),
    evolutions: new Set(),
    settlement: {
      reward: { gold: 400, credits: 7 },
      operations: {
        completed: [operationRecords[0]!.id],
        points: 1,
        unlocked: ["수류탄", "특수 슬롯 1"],
      },
      save: {
        ...metaStore.read(),
        account: { gold: 900, credits: 12, rerollLevel: 0 },
        progress: {
          completedRuns: 1,
          stage1Cleared: false,
          stage1ClearCount: 0,
        },
        activeRunId: null,
        lastSettlement: null,
      },
    },
  };
  const retry = vi.fn(),
    main = vi.fn();
  const view = new ResultView();
  view.show(result, retry, main);
  const rows = nodes.find((node) => node.tag === "dl")!.children;
  const value = (label: string) =>
    rows[rows.findIndex((node) => node.textContent === label) + 1]!.textContent;
  expect(value("획득 Gold / Credits")).toBe("400 / 7");
  expect(value("보유 Gold / Credits")).toBe("900 / 12");
  expect(value("정예 처치")).toBe("2");
  expect(
    nodes.some(
      (node) => node.textContent === "이번 Run 작전 기록 완료 1 · 숙련 +1",
    ),
  ).toBe(true);
  expect(
    nodes.some((node) => node.textContent === operationRecords[0]!.title),
  ).toBe(true);
  expect(
    nodes.some(
      (node) => node.textContent === "신규 해금: 수류탄 · 특수 슬롯 1",
    ),
  ).toBe(true);
  expect(nodes[0]!.open).toBe(true);
  const buttons = nodes.filter((node) => node.tag === "button");
  buttons.find((node) => node.textContent === "메인으로")!.click();
  expect(buttons.every((button) => button.disabled)).toBe(true);
  buttons.forEach((button) => button.click());
  expect(main).toHaveBeenCalledTimes(1);
  expect(retry).not.toHaveBeenCalled();
  view.destroy();
  expect(nodes[0]!.remove).toHaveBeenCalledOnce();
});
