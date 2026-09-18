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
import { specialWeaponBalance } from "../../src/game/data/specialWeaponBalance";

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

it("binds Korean missile tuning to live runtime values and rejects invalid counts atomically", () => {
  const grenade = JSON.stringify(specialWeaponBalance.grenade);
  const drone = JSON.stringify(specialWeaponBalance.drone);
  const values = {
    "special.missileBehavior.baseSalvoCount": 4,
    "special.missileBehavior.salvoIntervalMs": 300,
    "special.missile.cycleMs": 4800,
    "special.missile.damage": 95,
    "special.missileSpeed": 700,
    "special.missileBehavior.baseRetargets": 2,
    "special.missileLifetimeMs": 7500,
    "special.missileBehavior.damageReservation": false,
    "special.missileBehavior.saturation.additionalCount.0": 2,
    "special.missileBehavior.hunter.threatDamage": 2,
    "special.missileBehavior.tracking.retargets": 3,
    "special.missileBehavior.emergencyRetargets": 5,
  };
  for (const id of Object.keys(values)) {
    const field = balanceFields.find((entry) => entry.id === id)!;
    expect(field.group).toBe("특수무기 · 미사일");
    expect(field.label).toMatch(/[가-힣]/);
    expect(field.description.length).toBeGreaterThan(15);
  }
  setOverrides(values);
  expect(specialWeaponBalance.missile).toMatchObject({
    damage: 95,
    cycleMs: 4800,
  });
  expect(specialWeaponBalance.missileSpeed).toBe(700);
  expect(specialWeaponBalance.missileLifetimeMs).toBe(7500);
  expect(specialWeaponBalance.missileBehavior).toMatchObject({
    baseSalvoCount: 4,
    salvoIntervalMs: 300,
    baseRetargets: 2,
    damageReservation: false,
    hunter: { threatDamage: 2 },
    tracking: { retargets: 3 },
    emergencyRetargets: 5,
  });
  expect(
    specialWeaponBalance.missileBehavior.saturation.additionalCount[0],
  ).toBe(2);
  for (const invalid of [
    { "special.missileBehavior.baseSalvoCount": 0 },
    { "special.missileBehavior.baseSalvoCount": 3.5 },
    { "special.missileBehavior.baseRetargets": -1 },
    { "special.missileBehavior.salvoIntervalMs": 0 },
    { "special.missileLifetimeMs": Infinity },
    { "special.missileBehavior.damageReservation": 1 },
  ]) {
    expect(() => setOverrides(invalid)).toThrow();
    expect(getOverrides()).toEqual(values);
  }
  expect(() =>
    loadPayload({
      version: 1,
      overrides: { "special.missileBehavior.saturation.count.0": 3 },
    }),
  ).toThrow(/알 수 없는 설정/);
  expect(getOverrides()).toEqual(values);
  expect(JSON.stringify(specialWeaponBalance.grenade)).toBe(grenade);
  expect(JSON.stringify(specialWeaponBalance.drone)).toBe(drone);
});
