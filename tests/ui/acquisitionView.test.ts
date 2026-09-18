import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MarineProgression } from "../../src/game/progression/marineProgression";
import { LevelUpView } from "../../src/game/ui/LevelUpView";
import { BurstView } from "../../src/game/ui/BurstView";

class ElementStub extends EventTarget {
  className = "";
  textContent = "";
  title = "";
  dataset: Record<string, string> = {};
  style = { setProperty: vi.fn(), whiteSpace: "" };
  children: ElementStub[] = [];
  open = false;
  setAttribute = vi.fn();
  append(...children: ElementStub[]) {
    this.children.push(...children);
  }
  replaceChildren(...children: ElementStub[]) {
    this.children = children;
  }
  showModal() {
    this.open = true;
  }
  close() {
    this.open = false;
  }
}
let elements: ElementStub[];
beforeEach(() => {
  elements = [];
  vi.stubGlobal("document", {
    body: new ElementStub(),
    createElement: () => {
      const element = new ElementStub();
      elements.push(element);
      return element;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

it("renders acquisition as Lv1 normal choice with no rarity badge and selects its weapon", () => {
  const p = new MarineProgression(() => 0.99999);
  p.level = 8;
  p.pendingChoices = 1;
  new LevelUpView().showMarine(8, p.offer(), p.ranks, (id) => p.choose(id), 3);
  const card = elements.find(
    (element) => element.className === "upgrade-card",
  )!;
  expect(card.dataset.category).toBe("신규 무장 · 일반 선택 1회");
  expect(card.dataset.rarity).toBeUndefined();
  expect(
    card.children.some((child) => child.textContent === "신규 무장 · Lv1 획득"),
  ).toBe(true);
  const tags = card.children.find(
    (child) => child.className === "choice-tags",
  )!;
  expect(
    tags.children.some((child) => child.className === "choice-rarity"),
  ).toBe(false);
  card.dispatchEvent(new Event("click"));
  expect(p.pendingChoices).toBe(0);
  expect(p.special.weapons[0]).toMatchObject({ id: "drone", level: 1 });
});

it("shows unlocked empty slots with random Lv8/14 acquisition guidance", () => {
  const specialSlots = [
    new ElementStub(),
    new ElementStub(),
    new ElementStub(),
  ];
  const view = { specialSlots, inspect: vi.fn() } as unknown as BurstView;
  BurstView.prototype.renderSpecialWeapons.call(view, [], [], 3);
  expect(
    elements
      .filter((element) => element.className === "weapon-slot")
      .map((element) => element.dataset.state),
  ).toEqual(["empty", "empty", "empty"]);
  const titles = elements
    .filter((element) => element.className === "slot-summary")
    .map((element) => element.title);
  expect(titles[0]).toContain("Lv8부터 무장 획득 카드 등장 가능");
  expect(titles[1]).toContain("첫 무장 보유 + Lv14부터");
  expect(titles[2]).toContain("무장 확장 코어로 해금");
  expect(titles.join(" ")).not.toMatch(/Lv5|Lv10/);
});
