import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LevelUpView } from "../../src/game/ui/LevelUpView";
import { marineBuildSummary } from "../../src/game/ui/buildSummary";
import {
  marineTraitIds,
  type MarineGrowthState,
} from "../../src/game/data/marineGrowth";

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
}
let nodes: ElementStub[];
beforeEach(() => {
  nodes = [];
  vi.stubGlobal("document", {
    body: new ElementStub(),
    createElement: () => {
      const node = new ElementStub();
      nodes.push(node);
      return node;
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

it.each(marineTraitIds)(
  "renders mandatory two-card %s branches with completion preview and no rarity or reroll",
  (traitId) => {
    const select = vi.fn();
    const view = new LevelUpView();
    view.showModBranch(
      {
        traitId,
        choices: [
          {
            id: "a",
            title: "분기 A",
            description: "첫 방향 효과",
            completion: "첫 완성형",
          },
          {
            id: "b",
            title: "분기 B",
            description: "둘째 방향 효과",
            completion: "둘째 완성형",
          },
        ],
      },
      select,
    );
    const cards = nodes.filter((node) => node.className === "upgrade-card");
    expect(cards).toHaveLength(2);
    expect(
      nodes.find((node) => node.className === "upgrade-cards")!.dataset.count,
    ).toBe("2");
    expect(cards.every((card) => card.dataset.rarity === undefined)).toBe(true);
    expect(nodes.some((node) => /새로고침|대성공/.test(node.textContent))).toBe(
      false,
    );
    expect(cards[0]!.title).toContain("첫 완성형");
    const cancel = new Event("cancel", { cancelable: true });
    nodes[0]!.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    cards[1]!.dispatchEvent(new Event("click"));
    cards[1]!.dispatchEvent(new Event("click"));
    expect(select).toHaveBeenCalledExactlyOnceWith("b");
  },
);

it.each([7, 10, 11])(
  "keeps branch, Lv10 completion and Legendary as independent Gauss badges at Lv%i",
  (level) => {
    const growth = {
      ranks: { burst: level },
      quality: {},
      legendary: new Set(["burst"]),
      branches: { burst: "a" },
    } as MarineGrowthState;
    const items = marineBuildSummary(growth, {}, new Set());
    expect(items.every((item) => item.owner === "basicWeapon")).toBe(true);
    expect(items.find((item) => item.id === "burst")).toMatchObject({ level });
    expect(items.find((item) => item.id === "burst")!.title).toContain("전설");
    expect(items.find((item) => item.id === "burst-branch")).toMatchObject({
      title: "확장 점사",
      symbol: "A",
    });
    expect(items.find((item) => item.id === "burst-branch")!.detail).toContain(
      "5레벨 분기 A",
    );
    if (level >= 10)
      expect(items.find((item) => item.id === "burst-complete")!.title).toBe(
        "완전 점사",
      );
    else expect(items.some((item) => item.id === "burst-complete")).toBe(false);
  },
);
