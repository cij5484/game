import { afterEach, expect, it, vi } from "vitest";
import {
  operationRecords,
  getMasteryPoints,
  getUnlocks,
  freshUnlocks,
} from "../../src/game/data/operations";
import { MetaStore, META_STORAGE_KEY } from "../../src/game/meta/metaSave";
const storage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
  };
};
const failed = {
  status: "failed" as const,
  elapsedMs: 0,
  kills: 0,
  eliteKills: 0,
  bossKills: 0,
};
afterEach(() => vi.unstubAllEnvs());
it("defines 28 unique records worth 40 points and restricted fresh pools", () => {
  expect(operationRecords).toHaveLength(28);
  expect(new Set(operationRecords.map((r) => r.id)).size).toBe(28);
  expect(getMasteryPoints(operationRecords.map((r) => r.id))).toBe(40);
  const fresh = freshUnlocks();
  expect(fresh.basicMods).toEqual(["penetration", "burst"]);
  expect(fresh.specialCapacity).toBe(0);
  expect(fresh.specialWeapons).toEqual([]);
  expect(fresh.relicSystem || fresh.coreSystem || fresh.synergySystem).toBe(
    false,
  );
  expect(fresh.research).toEqual([
    "primary-damage",
    "primary-speed",
    "wall-hp",
  ]);
});
it("awards direct action records once, persists them through restart, and naturally unlocks first weapon", () => {
  const memory = storage(),
    store = new MetaStore(memory),
    run = store.beginRun();
  const progress = store.recordProgress(run.id, {
    gaussActionHits: 3,
    burstLevel: 3,
    criticalHits: 1,
  });
  expect(progress.points).toBe(3);
  expect(progress.unlocks.basicMods).toEqual(
    expect.arrayContaining(["ricochet", "multishot"]),
  );
  expect(progress.unlocks.relicSystem).toBe(true);
  expect(
    store.recordProgress(run.id, {
      gaussActionHits: 3,
      burstLevel: 3,
      criticalHits: 1,
    }).completed,
  ).toEqual([]);
  expect(
    new MetaStore(memory).read().characters.marine.completedOperationRecords,
  ).toHaveLength(3);
  const next = store.beginRun();
  expect(store.read().progress.completedRuns).toBe(0);
  const result = store.settleRun(next.id, failed);
  expect(result.operations.completed).toEqual(["first-operation"]);
  expect(getUnlocks(result.save).specialWeapons).toEqual(["grenade"]);
  expect(getUnlocks(result.save).specialCapacity).toBe(1);
});
it("keeps this-Run records in settlement receipts after reload and awards clear only once", () => {
  const memory = storage(),
    store = new MetaStore(memory),
    run = store.beginRun();
  store.recordProgress(run.id, {
    primaryKills: 100,
    basicModCount: 3,
    highRarityChoice: true,
  });
  const result = new MetaStore(memory).settleRun(run.id, {
    ...failed,
    status: "cleared",
    bossKills: 1,
  });
  expect(result.operations.completed).toEqual(
    expect.arrayContaining([
      "mass-kills",
      "complete-rifle",
      "powerful-choice",
      "first-operation",
      "first-victory",
    ]),
  );
  expect(result.operations.points).toBe(8);
  expect(result.operations.unlocked.length).toBeGreaterThan(0);
  expect(getUnlocks(result.save).coreSystem).toBe(true);
  expect(new MetaStore(memory).settleRun(run.id, failed)).toEqual(result);
});
it("counts cumulative retargets across Runs but deduplicates absolute retries and caps completed metrics", () => {
  const memory = storage(),
    store = new MetaStore(memory),
    first = store.beginRun();
  store.recordProgress(first.id, { missileRetargets: 6, primaryKills: 60 });
  store.recordProgress(first.id, { missileRetargets: 6, primaryKills: 60 });
  const second = store.beginRun();
  const result = store.recordProgress(second.id, {
    missileRetargets: 4,
    primaryKills: 60,
  });
  expect(result.completed).toContain("retarget");
  expect(result.completed).not.toContain("mass-kills");
  const writes = memory.setItem.mock.calls.length;
  store.recordProgress(second.id, { missileRetargets: 10000 });
  expect(memory.setItem).toHaveBeenCalledTimes(writes);
  store.recordProgress(second.id, { primaryKills: 100 });
  const completedWrites = memory.setItem.mock.calls.length;
  store.recordProgress(second.id, { primaryKills: 100000 });
  expect(memory.setItem).toHaveBeenCalledTimes(completedWrites);
});
it("migrates only historical facts and preserves prior research, currencies and receipt", () => {
  const memory = storage();
  memory.setItem(
    META_STORAGE_KEY,
    JSON.stringify({
      kind: "horde-meta",
      version: 1,
      account: { gold: 123, credits: 45 },
      characters: { marine: { research: { range: 1 } } },
      progress: { completedRuns: 2, stage1Cleared: true, stage1ClearCount: 1 },
      lastSettlement: { id: "old", reward: { gold: 100, credits: 0 } },
    }),
  );
  const store = new MetaStore(memory),
    save = store.read();
  expect(save.version).toBe(2);
  expect(save.account.gold).toBe(123);
  expect(save.characters.marine.research.range).toBe(1);
  expect(save.characters.marine.completedOperationRecords).toEqual([
    "first-operation",
    "first-victory",
  ]);
  expect(getUnlocks(save).research).toContain("range");
  expect(store.settleRun("old", failed).reward.gold).toBe(100);
});
it("validates operation evidence, preserves failed writes for retry, gates research and dev tools", () => {
  const memory = storage(),
    store = new MetaStore(memory),
    run = store.beginRun();
  expect(() => store.recordProgress(run.id, { primaryKills: -1 })).toThrow();
  const failing = new MetaStore({
    getItem: memory.getItem,
    setItem: () => {
      throw new Error("quota");
    },
  });
  expect(() => failing.recordProgress(run.id, { criticalHits: 1 })).toThrow(
    "quota",
  );
  expect(store.recordProgress(run.id, { criticalHits: 1 }).points).toBe(1);
  store.grantDevCurrencies(10000, 0);
  expect(() => store.purchaseResearch("range")).toThrow();
  vi.stubEnv("DEV", false);
  expect(() => store.unlockAll()).toThrow();
  vi.stubEnv("DEV", true);
  store.unlockAll();
  store.purchaseResearch("range");
  const reset = store.resetProgression();
  expect(reset.characters.marine.research.range).toBe(1);
  expect(reset.account.gold).toBe(8000);
  expect(getUnlocks(reset).research).toContain("range");
  expect(getUnlocks(store.setSpecialCapacity(2)).specialCapacity).toBe(2);
});

it("uses exact mastery thresholds without requiring every record", () => {
  for (const points of [3, 9, 13, 17, 22]) {
    const store = new MetaStore(storage());
    let total = 0;
    for (const record of operationRecords) {
      if (total + record.points > points) continue;
      store.completeRecord(record.id);
      total += record.points;
      if (total === points) break;
    }
    const unlocks = getUnlocks(store.read());
    expect(total).toBe(points);
    expect(unlocks.relicSystem).toBe(true);
    expect(unlocks.specialWeapons.includes("missile")).toBe(points >= 9);
    expect(unlocks.specialCapacity).toBe(points >= 13 ? 2 : 1);
    expect(unlocks.specialWeapons.includes("drone")).toBe(points >= 17);
    expect(unlocks.synergySystem).toBe(points >= 22);
  }
});

it("keeps Special System locked until the first natural end even with early action mastery", () => {
  const store = new MetaStore(storage()),
    run = store.beginRun();
  const progress = store.recordProgress(run.id, {
    elapsedMs: 600000,
    characterLevel: 10,
    eliteKills: 1,
    bossEncountered: true,
    primaryKills: 100,
    primaryEliteKills: 1,
    gaussActionHits: 3,
    criticalHits: 1,
    burstLevel: 3,
    basicModCount: 3,
    highRarityChoice: true,
  });
  expect(
    getMasteryPoints(progress.save.characters.marine.completedOperationRecords),
  ).toBe(13);
  expect(progress.unlocks.specialCapacity).toBe(0);
  expect(progress.completed).not.toContain("first-operation");
  expect(getUnlocks(store.settleRun(run.id, failed).save).specialCapacity).toBe(
    2,
  );
});

it("atomically settles latest evidence after a failed observer save and does not persist lesser bests", () => {
  const memory = storage(),
    store = new MetaStore(memory),
    run = store.beginRun();
  store.recordProgress(run.id, { primaryKills: 60, elapsedMs: 400000 });
  const next = store.beginRun(),
    writes = memory.setItem.mock.calls.length;
  store.recordProgress(next.id, { primaryKills: 10, elapsedMs: 100000 });
  expect(memory.setItem).toHaveBeenCalledTimes(writes);
  const failing = new MetaStore({
    getItem: memory.getItem,
    setItem: () => {
      throw new Error("quota");
    },
  });
  expect(() =>
    failing.recordProgress(next.id, { primaryKills: 100 }),
  ).toThrow();
  const settlement = store.settleRun(next.id, failed, {
    primaryKills: 100,
    criticalHits: 1,
  });
  expect(settlement.operations.completed).toEqual(
    expect.arrayContaining(["mass-kills", "first-critical", "first-operation"]),
  );
  expect(settlement.operations.completed).not.toContain("hold-line");
});

it("unlocks third trees and overclocks from their actual records, and rejects malformed v2 progress", () => {
  const store = new MetaStore(storage()),
    run = store.beginRun();
  const progress = store.recordProgress(run.id, {
    specialLevels: { grenade: 10, drone: 10 },
    overclocks: ["grenade", "missile", "drone"],
    missileRetargets: 10,
  });
  expect(progress.unlocks.trees.grenade).toContain("tactical");
  expect(progress.unlocks.trees.missile).toContain("tracking");
  expect(progress.unlocks.trees.drone).toContain("escort");
  expect(progress.unlocks.overclocks.grenade).toContain("triple");
  expect(progress.unlocks.overclocks.missile).toContain("immortal");
  expect(progress.unlocks.overclocks.drone).toContain("synchronization");
  const saved = store.exportSave();
  for (const patch of [
    { completedOperationRecords: ["fake"] },
    { operationProgress: { primaryKills: -1 } },
    { operationProgress: { specialLevels: { unknown: 2 } } },
    { specialCapacityOverride: 3 },
  ]) {
    const corrupt = JSON.parse(saved);
    Object.assign(corrupt.characters.marine, patch);
    expect(() => store.importSave(JSON.stringify(corrupt))).toThrow();
  }
  expect(store.exportSave()).toBe(saved);
});

it("unlocks incendiary at 50 primary kills and inherits completed legacy elite-sniper saves", () => {
  const memory = storage(),
    store = new MetaStore(memory),
    run = store.beginRun();
  expect(
    store.recordProgress(run.id, { primaryKills: 49, primaryEliteKills: 1 })
      .unlocks.basicMods,
  ).not.toContain("incendiary");
  const unlocked = store.recordProgress(run.id, { primaryKills: 50 });
  expect(unlocked.completed).toContain("elite-sniper");
  expect(unlocked.unlocks.basicMods).toContain("incendiary");
  expect(unlocked.unlocks.basicMods).not.toContain("explosive");
  const save = store.read();
  save.characters.marine.operationProgress = {};
  memory.setItem(META_STORAGE_KEY, JSON.stringify(save));
  expect(getUnlocks(new MetaStore(memory).read()).basicMods).toContain(
    "incendiary",
  );
  expect(
    store.recordProgress(run.id, { primaryKills: 100 }).unlocks.basicMods,
  ).toContain("explosive");
});
