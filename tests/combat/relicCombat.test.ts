import { expect, it } from "vitest";
import { RelicCombat } from "../../src/game/combat/relicCombat";
import type { EnemyState } from "../../src/game/enemies/enemySimulation";
const enemy = (id: number, hp = 100): EnemyState => ({
  id,
  hp,
  kind: "shield",
  lane: "center",
  offset01: 0,
  progress01: 0.9,
  phase: "moving",
});
it("preserves berserker cost and alternating successful magic refund", () => {
  const combat = new RelicCombat();
  combat.setLevels({ "berserker-seal": 5, "time-gear": 5 });
  expect(combat.primaryModifiersFor(0.2, true).damageMultiplier).toBe(2);
  expect(combat.primaryModifiersFor(0.2, false).damageMultiplier).toBe(1);
  expect(combat.onStim().wallCost).toBe(100);
  expect(combat.onMagic("frost-nova").cooldownRefunds).toEqual({});
  expect(combat.onMagic("frost-nova").cooldownRefunds).toEqual({});
  expect(combat.onMagic("chain-lightning")).toEqual({
    wallHealing: 80,
    cooldownRefunds: { "frost-nova": 1800 },
  });
});
it("counts landed rounds only and caps Tesla arc targets without recursion", () => {
  const combat = new RelicCombat();
  combat.setLevels({ "tesla-coil": 5 });
  const enemies = Array.from({ length: 300 }, (_, i) => enemy(i));
  for (let i = 0; i < 20; i++)
    expect(combat.afterPrimary(enemies, [], true).hitIds).toEqual([]);
  expect(combat.afterPrimary(enemies, [0, 1, 2], true).hitIds).toEqual([]);
  const result = combat.afterPrimary(enemies, [0], true);
  expect(result.hitIds).toHaveLength(5);
  expect(new Set(result.hitIds).size).toBe(5);
  expect(result.hitIds).not.toContain(0);
  expect(result.enemies.filter((x) => x.hp === 70)).toHaveLength(5);
  expect(result.cooldownRefunds).toEqual({
    "frost-nova": 400,
    "chain-lightning": 400,
  });
});
it("duplicates a delayed volley with copied ranks and excludes echo recursion", () => {
  const combat = new RelicCombat();
  combat.setLevels({ "ammo-replicator": 5 });
  const ranks = { penetration: 4, "primary-damage": 2 };
  const volley = { targetId: 1, ranks, baseDamage: 20, rounds: 3 };
  for (let i = 0; i < 3; i++) combat.onVolley(volley);
  ranks.penetration = 1;
  expect(combat.advance(179)).toEqual([]);
  const echoes = combat.advance(1);
  expect(echoes).toHaveLength(1);
  expect(echoes[0]).toMatchObject({
    ranks: { penetration: 4 },
    rounds: 3,
    damageMultiplier: 0.85,
  });
  for (let i = 0; i < 30; i++) combat.onVolley(volley, true);
  expect(combat.advance(500)).toEqual([]);
});
it("caps queued echoes and limits trait inheritance before MAX", () => {
  const combat = new RelicCombat();
  combat.setLevels({ "ammo-replicator": 1 });
  for (let i = 0; i < 300; i++)
    combat.onVolley({
      targetId: 1,
      ranks: { penetration: 5, "primary-damage": 3 },
      baseDamage: 10,
    });
  const echoes = combat.advance(200);
  expect(echoes.length).toBeLessThanOrEqual(4);
  expect(echoes[0]!.ranks.penetration).toBeUndefined();
  expect(echoes[0]!.ranks["primary-damage"]).toBe(3);
});
it("shatters only during frost and caps wave count and total target effects in a horde", () => {
  const combat = new RelicCombat();
  combat.setLevels({ "frost-resonator": 5 });
  const enemies = Array.from({ length: 300 }, (_, i) => enemy(i, 1000));
  const ids = enemies.map((x) => x.id);
  expect(combat.onPrimaryFrost(enemies, ids, false).hitIds).toEqual([]);
  expect(combat.onPrimaryFrost(enemies, ids, true).shatterIds).toEqual([]);
  const result = combat.onPrimaryFrost(enemies, ids, true);
  expect(result.shatterIds.length).toBeGreaterThan(0);
  expect(result.shatterIds.length).toBeLessThanOrEqual(3);
  expect(result.hitIds.length).toBeLessThanOrEqual(24);
  expect(result.enemies.filter((x) => x.hp < 1000).length).toBeLessThanOrEqual(
    24,
  );
  combat.onPrimaryFrost(enemies, ids, false);
  expect(combat.onPrimaryFrost(enemies, ids, true).shatterIds).toEqual([]);
});
it("limits near-wall healing and energy in a sliding second regardless of kill batch size", () => {
  const combat = new RelicCombat();
  combat.setLevels({ "emergency-reclaimer": 5 });
  const context = {
    frost: false,
    boost: false,
    magic: false,
    nearWallKills: 100,
  };
  expect(
    combat.onKills(100, { ...context, nearWallKills: 0 }).wallHealing,
  ).toBe(0);
  const first = combat.onKills(100, context);
  expect(first.wallHealing).toBe(40);
  expect(first.energy).toBe(16);
  expect(combat.onKills(100, context).wallHealing).toBe(0);
  combat.advance(999);
  expect(combat.onKills(100, context).energy).toBe(0);
  combat.advance(1);
  expect(combat.onKills(100, context).wallHealing).toBe(40);
});
it("fires the bulwark crisis once, expires defense, and never grants passive low-wall damage", () => {
  const combat = new RelicCombat();
  combat.setLevels({ "last-bulwark": 5 });
  expect(combat.onWallDamage(500, 1000, 100).event).toBeUndefined();
  const crisis = combat.onWallDamage(400, 1000, 120);
  expect(crisis.event).toBe("bulwark");
  expect(crisis.pushback).toBeGreaterThan(0);
  expect(combat.primaryModifiersFor(0.2, false).damageMultiplier).toBe(1);
  expect(
    combat.primaryModifiersFor(0.2, false).attackSpeedMultiplier,
  ).toBeGreaterThan(1);
  expect(combat.onWallDamage(280, 1000, 100).wallHp).toBeGreaterThan(180);
  combat.advance(10000);
  expect(combat.primaryModifiersFor(0.2, false).attackSpeedMultiplier).toBe(1);
  combat.setLevels({ "last-bulwark": 5 });
  expect(combat.onWallDamage(400, 1000, 120).event).toBeUndefined();
});
it("allows exactly one MAX lethal save per run and consumes it even across level refresh", () => {
  const combat = new RelicCombat();
  combat.setLevels({ "emergency-reclaimer": 4 });
  expect(combat.onWallDamage(10, 1000, 100).wallHp).toBe(0);
  combat.setLevels({ "emergency-reclaimer": 5 });
  const save = combat.onWallDamage(10, 1000, 100);
  expect(save.event).toBe("emergency");
  expect(save.wallHp).toBeGreaterThan(0);
  combat.advance(3000);
  combat.setLevels({ "emergency-reclaimer": 5 });
  expect(combat.onWallDamage(10, 1000, 100).wallHp).toBe(0);
});
it("only boost kills return bounded-extension parameters", () => {
  const combat = new RelicCombat();
  combat.setLevels({ "adrenaline-pump": 5 });
  expect(
    combat.onKills(100, { frost: false, boost: false, magic: false })
      .boostExtensionMs,
  ).toBe(0);
  const reward = combat.onKills(100, {
    frost: false,
    boost: true,
    magic: false,
  });
  expect(reward.boostExtensionMs).toBe(3000);
  expect(reward.boostExtensionCapMs).toBe(3000);
  expect(reward.recoveryCostRatio).toBe(0.5);
});

it("snapshots Full Echo branches and selected synergies independently of later build changes", () => {
  const combat = new RelicCombat();
  combat.setLevels({ "ammo-replicator": 5 });
  const branches: import("../../src/game/data/growth").GrowthBranches = {
    penetration: "b",
    explosive: "a",
  };
  const activeSynergyIds = new Set(["deep-blast"]);
  const snapshot = {
    targetId: 1,
    ranks: { penetration: 5, explosive: 5 },
    branches,
    activeSynergyIds,
    baseDamage: 10,
    rounds: 3,
  };
  for (let i = 0; i < 3; i++) combat.onVolley(snapshot);
  branches.penetration = "a";
  activeSynergyIds.clear();
  const echo = combat.advance(180)[0]!;
  expect(echo.branches).toEqual({ penetration: "b", explosive: "a" });
  expect(echo.activeSynergyIds).toEqual(new Set(["deep-blast"]));
  expect(echo.rounds).toBe(3);
});
it("partial Echo cannot inherit a branch below level three or unlock an unselected synergy", () => {
  const combat = new RelicCombat();
  combat.setLevels({ "ammo-replicator": 4 });
  for (let i = 0; i < 4; i++)
    combat.onVolley({
      targetId: 1,
      ranks: {
        penetration: 5,
        ricochet: 5,
        multishot: 5,
        explosive: 5,
        execution: 5,
      },
      branches: { penetration: "b", explosive: "a" },
      activeSynergyIds: new Set(),
      baseDamage: 10,
      rounds: 3,
    });
  const echo = combat.advance(180)[0]!;
  expect(echo.ranks).toEqual({ penetration: 2, ricochet: 2, multishot: 2 });
  expect(echo.branches).toEqual({});
  expect(echo.activeSynergyIds?.size).toBe(0);
});
