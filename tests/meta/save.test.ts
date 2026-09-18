import { afterEach, expect, it, vi } from "vitest";
import { MetaStore, META_STORAGE_KEY } from "../../src/game/meta/metaSave";

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
};
const failed = {
  status: "failed" as const,
  elapsedMs: 600_000,
  kills: 500,
  eliteKills: 2,
  bossKills: 0,
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("starts uniquely identified Runs on HTTP LAN browsers without randomUUID", () => {
  const originalCrypto = globalThis.crypto;
  vi.stubGlobal("crypto", {
    getRandomValues: (values: Uint32Array<ArrayBuffer>) =>
      originalCrypto.getRandomValues(values),
  });
  const store = new MetaStore(storage());
  const first = store.beginRun(),
    second = store.beginRun();
  expect(first.id).not.toBe(second.id);
  expect(store.read().activeRunId).toBe(second.id);
});

it("defaults missing fields, reloads purchases and makes detached run snapshots", () => {
  const memory = storage(),
    store = new MetaStore(memory);
  expect(store.read().account).toEqual({ gold: 0, credits: 0, rerollLevel: 0 });
  store.importSave(
    JSON.stringify({
      version: 1,
      kind: "horde-meta",
      account: { gold: 10000, credits: 1000 },
    }),
  );
  const original = store.beginRun();
  store.purchaseResearch("primary-damage");
  store.purchaseReroll();
  store.purchaseReroll();
  store.purchaseReroll();
  expect(() => store.purchaseReroll()).toThrow();
  expect(original.modifiers.primaryDamageMultiplier).toBe(1);
  expect(original.rerolls).toBe(0);
  const next = new MetaStore(memory).beginRun();
  expect(next.modifiers.primaryDamageMultiplier).toBe(1.1);
  expect(next.rerolls).toBe(3);
  expect(store.read().account).toEqual({
    gold: 9880,
    credits: 400,
    rerollLevel: 3,
  });
  expect(() => store.settleRun(original.id, failed)).toThrow();
  expect(store.read().progress.completedRuns).toBe(0);
});

it("settles each natural run once across reload, and records clear progress", () => {
  const memory = storage(),
    store = new MetaStore(memory);
  const run = store.beginRun();
  const result = store.settleRun(run.id, failed);
  expect(result.reward).toEqual({ gold: 380, credits: 7 });
  expect(new MetaStore(memory).settleRun(run.id, failed)).toEqual(result);
  const clear = store.beginRun();
  store.settleRun(clear.id, { ...failed, status: "cleared", bossKills: 1 });
  expect(store.read().progress).toEqual({
    completedRuns: 2,
    stage1Cleared: true,
    stage1ClearCount: 1,
  });
  expect(store.read().account.gold).toBe(1160);
});

it("roundtrips exports, invalidates runs on import/reset, and never overwrites invalid data", () => {
  const memory = storage(),
    store = new MetaStore(memory);
  const run = store.beginRun();
  const exported = store.exportSave();
  store.importSave(exported);
  expect(() => store.settleRun(run.id, failed)).toThrow();
  expect(store.read().activeRunId).toBeNull();
  const badValues = [
    '{"kind":"horde-meta","version":99}',
    '{"kind":"balance","version":1}',
    '{"kind":"horde-meta","version":1,"account":{"gold":-1}}',
    '{"kind":"horde-meta","version":1,"characters":{"marine":{"research":{"range":6}}}}',
    '{"kind":"horde-meta","version":1,"account":{"gold":1e999}}',
  ];
  for (const text of badValues) {
    expect(() => store.importSave(text)).toThrow();
    expect(store.read().account.gold).toBe(0);
  }
  memory.setItem(META_STORAGE_KEY, "broken JSON");
  expect(() => store.read()).toThrow();
  expect(memory.getItem(META_STORAGE_KEY)).toBe("broken JSON");
  store.reset();
  expect(store.read().progress.completedRuns).toBe(0);
});

it("does not spend below zero, exceed MAX, or claim persistence after storage failure", () => {
  const memory = storage(),
    store = new MetaStore(memory);
  expect(() => store.purchaseResearch("range")).toThrow();
  store.importSave(
    JSON.stringify({
      version: 1,
      kind: "horde-meta",
      account: { gold: 10000 },
      characters: { marine: { research: { range: 5 } } },
    }),
  );
  expect(() => store.purchaseResearch("range")).toThrow();
  const before = store.exportSave();
  const failing = new MetaStore({
    getItem: memory.getItem,
    setItem: () => {
      throw new Error("quota");
    },
  });
  expect(() => failing.purchaseResearch("primary-damage")).toThrow("quota");
  expect(store.exportSave()).toBe(before);
  const run = store.beginRun();
  expect(() => failing.settleRun(run.id, failed)).toThrow("quota");
  expect(store.read().progress.completedRuns).toBe(0);
  expect(store.settleRun(run.id, failed).save.progress.completedRuns).toBe(1);
});

it("developer currency grants require the development build", () => {
  const store = new MetaStore(storage());
  vi.stubEnv("DEV", false);
  expect(() => store.grantDevCurrencies(1000, 100)).toThrow();
  vi.stubEnv("DEV", true);
  expect(store.grantDevCurrencies(1000, 100).account.gold).toBe(1000);
  expect(() => store.grantDevCurrencies(-1, 0)).toThrow();
});
