import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { balanceFields } from "../../src/game/dev/balanceFields";
import {
  configureFields,
  getDefault,
  getOverrides,
  resetOverrides,
  setOverrides,
  updateOverride,
} from "../../src/game/dev/runtimeBalance";
import {
  loadPayload,
  validateBalanceGroups,
} from "../../src/game/dev/runtimeBridge";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { MarineProgression } from "../../src/game/progression/marineProgression";
import { SpawnDirector } from "../../src/game/waves/spawnDirector";
import { hordeTimelineTempo, hordeBalance } from "../../src/game/data/horde";
import { runBalance } from "../../src/game/data/run";

beforeEach(() => configureFields(balanceFields, validateBalanceGroups));
afterEach(() => {
  vi.unstubAllEnvs();
  resetOverrides();
});
it("has valid unique defaults and rejects invalid imported groups atomically", () => {
  expect(new Set(balanceFields.map((f) => f.id)).size).toBe(
    balanceFields.length,
  );
  const defaults = Object.fromEntries(
    balanceFields.map((f) => [f.id, getDefault(f.id)]),
  );
  setOverrides(defaults);
  expect(getOverrides()).toEqual({});
  expect(() => loadPayload({ version: 2, overrides: {} })).toThrow();
  expect(() => setOverrides({ "marineRarity.bands.0.weights.0": 0 })).toThrow(
    /1000/,
  );
  expect(getOverrides()).toEqual({});
});
it("changes newly spawned enemy HP without rescaling existing enemies", () => {
  const old = createPrototypeEnemy("grunt", "center", 1);
  updateOverride("enemies.grunt.hp", old.hp * 2);
  const next = createPrototypeEnemy("grunt", "center", 2);
  expect(next.hp).toBe(old.hp * 2);
  expect(old.hp).toBe(getDefault("enemies.grunt.hp"));
});
it("freezes an open offer and current XP threshold until their next boundary", () => {
  const p = new MarineProgression(() => 0);
  const threshold = p.threshold;
  p.pendingChoices = 1;
  const cards = p.offer();
  const card = cards.find((c) => c.id === "primary-damage")!;
  expect(card.category).toBe("basic");
  if (card.category === "special-acquisition")
    throw Error("expected growth card");
  updateOverride("marineGrowth.initialXp", threshold + 10);
  updateOverride("marineGrowth.greatSuccessChance", 0);
  updateOverride("marineQuality.primary-damage.COMMON", 0.5);
  expect(p.threshold).toBe(threshold);
  expect(p.offer()).toBe(cards);
  p.choose(card.id);
  expect(p.lastSelection?.greatSuccess).toBe(true);
  expect(p.lastSelection?.amount).toBe(card.amount);
  p.gainXp(threshold);
  expect(p.level).toBe(2);
  expect(p.threshold).toBeGreaterThan(threshold + 10);
});
it("keeps phase progression on Stage time and permits a zero batch", () => {
  const director = new SpawnDirector(() => 0.5);
  director.spawn(0);
  updateOverride("horde.stages.0.batchSize", 0);
  director.advance(3000);
  expect(director.spawn(0)).toEqual([]);
  updateOverride("run.combatTempo", 3);
  const next = new SpawnDirector(() => 0.5);
  const stageMs = hordeBalance.stages[1]!.atMs / hordeTimelineTempo;
  next.advance(stageMs * runBalance.combatTempo, stageMs);
  expect(next.settings.stage).toBe(1);
});
it("does not permit runtime overrides in production", () => {
  vi.stubEnv("DEV", false);
  expect(() => setOverrides({ "enemies.grunt.hp": 20 })).toThrow(/개발 환경/);
  expect(getOverrides()).toEqual({});
});
