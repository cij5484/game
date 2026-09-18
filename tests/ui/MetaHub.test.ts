import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mountMetaHub } from "../../src/game/ui/MetaHub";
import { metaStore, META_STORAGE_KEY } from "../../src/game/meta/metaSave";
class ElementStub extends EventTarget {
  id = "";
  textContent = "";
  value = "";
  disabled = false;
  dataset: Record<string, string> = {};
  children: ElementStub[] = [];
  setAttribute = vi.fn();
  remove = vi.fn();
  append(...children: ElementStub[]) {
    this.children.push(...children);
  }
}
let nodes: ElementStub[], saved: Map<string, string>;
let win: EventTarget & { confirm: ReturnType<typeof vi.fn> };
const byId = (id: string) => nodes.find((node) => node.id === id)!;
const click = async (id: string) => {
  byId(id).dispatchEvent(new Event("click"));
  await Promise.resolve();
  await Promise.resolve();
};
beforeEach(() => {
  nodes = [];
  saved = new Map();
  win = Object.assign(new EventTarget(), { confirm: vi.fn(() => true) });
  vi.stubGlobal("window", win);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, text: string) => saved.set(key, text),
  });
  vi.stubGlobal("document", {
    createElement: () => {
      const node = new ElementStub();
      nodes.push(node);
      return node;
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("shows research breakthrough effects, saves purchases and disables unaffordable/MAX upgrades", async () => {
  const save = metaStore.read();
  save.account.gold = 1000;
  save.account.credits = 200;
  save.characters.marine.research["primary-damage"] = 4;
  save.characters.marine.research.range = 5;
  metaStore.importSave(JSON.stringify(save));
  const cleanup = mountMetaHub(
    new ElementStub() as unknown as HTMLElement,
    vi.fn(),
  );
  expect(byId("meta-current-primary-damage").textContent).toContain("40%");
  expect(byId("meta-next-primary-damage").textContent).toContain(
    "Lv5 돌파 → +65% · 650 Gold",
  );
  expect(byId("meta-current-critical-damage").textContent).toContain("+0배");
  expect(byId("meta-next-wall-defense").textContent).toContain("−4%");
  expect(byId("meta-buy-range").disabled).toBe(true);
  await click("meta-buy-primary-damage");
  expect(metaStore.read().characters.marine.research["primary-damage"]).toBe(5);
  expect(metaStore.read().account.gold).toBe(350);
  expect(byId("meta-buy-primary-damage").disabled).toBe(true);
  await click("meta-buy-reroll");
  await click("meta-buy-reroll");
  expect(metaStore.read().account).toMatchObject({
    credits: 0,
    rerollLevel: 2,
  });
  expect(byId("meta-buy-reroll").disabled).toBe(true);
  expect(byId("meta-reroll").textContent).toContain("Run당 2회");
  cleanup();
});

it("exports separate Meta JSON and requires confirmation for import/reset while showing errors", async () => {
  metaStore.grantDevCurrencies(1000, 100);
  saved.set("game.prototype.balance.v1", "balance-preserved");
  mountMetaHub(new ElementStub() as unknown as HTMLElement, vi.fn());
  await click("meta-export");
  const exported = byId("meta-save-json").value;
  expect(JSON.parse(exported).kind).toBe("horde-meta");
  win.confirm.mockReturnValue(false);
  await click("meta-reset");
  expect(metaStore.read().account.gold).toBe(1000);
  win.confirm.mockReturnValue(true);
  await click("meta-reset");
  expect(metaStore.read().account.gold).toBe(0);
  expect(saved.get("game.prototype.balance.v1")).toBe("balance-preserved");
  byId("meta-save-json").value = '{"version":1,"overrides":{}}';
  await click("meta-import");
  expect(byId("meta-notice").dataset.error).toBe("true");
  expect(metaStore.read().account.gold).toBe(0);
  byId("meta-save-json").value = exported;
  await click("meta-import");
  expect(metaStore.read().account.gold).toBe(1000);
});

it("keeps recovery controls available for corrupt saves and displays write failures", async () => {
  saved.set(META_STORAGE_KEY, "broken-json");
  mountMetaHub(new ElementStub() as unknown as HTMLElement, vi.fn());
  expect(byId("meta-launch").disabled).toBe(true);
  expect(byId("meta-notice").textContent).toContain("저장 관리");
  expect(byId("meta-reset").disabled).toBe(false);
  await click("meta-reset");
  expect(byId("meta-launch").disabled).toBe(false);
  metaStore.grantDevCurrencies(1000, 0);
  win.dispatchEvent(new Event("storage"));
  vi.spyOn(localStorage, "setItem").mockImplementation(() => {
    throw Error("저장 실패");
  });
  await click("meta-buy-primary-damage");
  expect(byId("meta-notice").textContent).toBe("저장 실패");
  expect(metaStore.read().account.gold).toBe(1000);
  expect(
    metaStore.read().characters.marine.research["primary-damage"],
  ).toBeUndefined();
});

it("refreshes cross-page balances, prevents overlapping launches, and removes listeners", async () => {
  const remove = vi.spyOn(win, "removeEventListener");
  let complete = () => {};
  const launch = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  const cleanup = mountMetaHub(
    new ElementStub() as unknown as HTMLElement,
    launch,
    "이전 출격 저장 오류",
  );
  expect(byId("meta-notice").textContent).toBe("이전 출격 저장 오류");
  metaStore.grantDevCurrencies(1000, 100);
  win.dispatchEvent(new Event("storage"));
  expect(byId("meta-wallet").textContent).toBe("Gold 1,000 · Credits 100");
  byId("meta-launch").dispatchEvent(new Event("click"));
  byId("meta-launch").dispatchEvent(new Event("click"));
  expect(launch).toHaveBeenCalledOnce();
  expect(byId("meta-launch").disabled).toBe(true);
  cleanup();
  complete();
  await Promise.resolve();
  expect(remove.mock.calls.map((call) => call[0])).toEqual([
    "storage",
    "focus",
  ]);
});
