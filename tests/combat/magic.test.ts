import { expect, it } from "vitest";
import { Magic } from "../../src/game/combat/magic";
import { enemyConfigs } from "../../src/game/data/enemies";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { advanceEnemy } from "../../src/game/enemies/enemySimulation";

it("connects frost vulnerability and bounded death bursts without recursive kills", () => {
  const magic = new Magic();
  magic.setUpgrades({
    "frost-vulnerability": 2,
    "frost-deathburst": 1,
  });
  const pack = Array.from({ length: 3 }, (_, id) => ({
    ...createPrototypeEnemy("grunt", "center", id),
    progress01: 0.8 - id * 0.08,
  }));
  magic.cast("frost-nova", pack);
  expect(magic.primaryDamageMultiplier).toBeCloseTo(1.3);
  expect(magic.remaining("frost-nova")).toBe(30000);
  const burst = magic.afterDeaths(
    pack.map((e) => (e.id === 0 ? { ...e, hp: 0 } : e)),
    [0],
  );
  expect(burst.enemies[1]!.hp).toBe(0);
  expect(burst.enemies[2]!.hp).toBeGreaterThan(0);
  magic.advance(30000);
  expect(magic.primaryDamageMultiplier).toBe(1);
});

it("extends lightning on kills and makes periodic strikes hit nearby enemies once", () => {
  const pack = Array.from({ length: 55 }, (_, id) => ({
    ...createPrototypeEnemy("grunt", "center", id),
    progress01: 0.95 - id * 0.01,
  }));
  const chain = new Magic();
  chain.setUpgrades({ "chain-killchain": 1, "chain-strike": 1 });
  const result = chain.cast("chain-lightning", pack)!;
  expect(result.hitIds.length).toBeGreaterThan(30);
  expect(new Set(result.hitIds).size).toBe(result.hitIds.length);
  expect(result.strikeIds.length).toBeGreaterThan(0);
});

it("relic refunds shorten cooldowns without advancing or extending global slow", () => {
  const magic = new Magic();
  magic.cast("frost-nova", []);
  magic.cast("chain-lightning", []);
  magic.refundCooldowns({ "chain-lightning": 480, "frost-nova": 400 });
  expect(magic.remaining("chain-lightning")).toBe(23520);
  expect(magic.remaining("frost-nova")).toBe(29600);
  expect(magic.frostRemainingMs).toBe(7000);
  magic.refundCooldowns({ "chain-lightning": 100000 });
  expect(magic.remaining("chain-lightning")).toBe(0);
});

it("slows the whole world including later spawns and restores movement at expiry", () => {
  const magic = new Magic();
  const existing = {
    ...createPrototypeEnemy("grunt", "left", 0),
    progress01: 0.8,
  };
  const dead = { ...existing, id: 1, hp: 0 };
  const far = createPrototypeEnemy("grunt", "right", 2);
  const cast = magic.cast("frost-nova", [existing, dead, far])!;
  expect(cast.hitIds).toEqual([0, 2]);
  expect(cast.enemies).toEqual([existing, dead, far]);
  expect(magic.frostRemainingMs).toBe(7000);
  expect(magic.movementMultiplier).toBe(0.5);
  const moved = advanceEnemy(
    existing,
    1000,
    enemyConfigs.grunt,
    magic.movementMultiplier,
  );
  expect(moved.enemy.progress01).toBeCloseTo(
    0.8 + enemyConfigs.grunt.progressPerSecond * 0.65 * 0.5,
    8,
  );
  magic.advance(1000);
  const spawned = createPrototypeEnemy("runner", "center", 3);
  expect(
    advanceEnemy(spawned, 1000, enemyConfigs.runner, magic.movementMultiplier)
      .enemy.progress01,
  ).toBeCloseTo(0.026);
  magic.advance(6000);
  expect(magic.frostRemainingMs).toBe(0);
  expect(magic.movementMultiplier).toBe(1);
  expect(
    advanceEnemy(spawned, 1000, enemyConfigs.runner, magic.movementMultiplier)
      .enemy.progress01,
  ).toBeCloseTo(0.052);
});

it("chains to 30 distinct targets for 75 damage while excluding isolated and dead enemies", () => {
  const enemies = Array.from({ length: 32 }, (_, id) => ({
    ...createPrototypeEnemy("shield", "center", id),
    hp: 100,
    progress01: 0.95 - id * 0.02,
  }));
  const result = new Magic().cast("chain-lightning", enemies)!;
  expect(result.hitIds).toHaveLength(30);
  expect(new Set(result.hitIds).size).toBe(30);
  expect(result.enemies.slice(0, 30).every((enemy) => enemy.hp === 25)).toBe(
    true,
  );
  expect(result.enemies.slice(30).every((enemy) => enemy.hp === 100)).toBe(
    true,
  );
  expect(
    new Magic().cast("chain-lightning", [
      enemies[0]!,
      { ...enemies[1]!, progress01: 0 },
      { ...enemies[2]!, hp: 0 },
    ])!.hitIds,
  ).toEqual([0]);
});

it("uses independent long cooldowns and permits reuse only at expiry", () => {
  const magic = new Magic();
  expect(magic.cast("frost-nova", [])).not.toBeNull();
  expect(magic.remaining("frost-nova")).toBe(30000);
  expect(magic.cast("chain-lightning", [])).not.toBeNull();
  expect(magic.remaining("chain-lightning")).toBe(24000);
  magic.advance(23999);
  expect(magic.cast("chain-lightning", [])).toBeNull();
  expect(magic.cast("frost-nova", [])).toBeNull();
  magic.advance(1);
  expect(magic.cast("chain-lightning", [])).not.toBeNull();
  expect(magic.remaining("frost-nova")).toBe(6000);
  magic.advance(6000);
  expect(magic.cast("frost-nova", [])).not.toBeNull();
});

it("grows global slow strength and duration without resetting an active effect or cooldown", () => {
  const magic = new Magic();
  magic.cast("frost-nova", []);
  magic.advance(1000);
  magic.setUpgrades({ "frost-strength": 5, "frost-duration": 2 });
  expect(magic.remaining("frost-nova")).toBe(29000);
  expect(magic.frostRemainingMs).toBe(6000);
  expect(magic.movementMultiplier).toBe(0.5);
  magic.advance(29000);
  magic.cast("frost-nova", []);
  expect(magic.movementMultiplier).toBeCloseTo(0.25);
  expect(magic.frostRemainingMs).toBe(8600);
});

it("grows lightning target count and damage without resetting cooldown", () => {
  const enemies = Array.from({ length: 36 }, (_, id) => ({
    ...createPrototypeEnemy("shield", "center", id),
    hp: 150,
    progress01: 0.95 - id * 0.02,
  }));
  const magic = new Magic();
  magic.setUpgrades({ "chain-targets": 2, "chain-damage": 2 });
  const result = magic.cast("chain-lightning", enemies)!;
  expect(new Set(result.hitIds).size).toBe(34);
  expect(result.enemies.slice(0, 34).every((enemy) => enemy.hp === 39)).toBe(
    true,
  );
  expect(result.enemies.slice(34).every((enemy) => enemy.hp === 150)).toBe(
    true,
  );
  magic.setUpgrades({ "chain-targets": 3, "chain-damage": 3 });
  expect(magic.remaining("chain-lightning")).toBe(24000);
  expect(magic.cast("chain-lightning", enemies)).toBeNull();
});

it("advanced frost pulses all living enemies and storm forks hit distinct targets", () => {
  const pack = Array.from({ length: 36 }, (_, id) => ({
    ...createPrototypeEnemy("grunt", "center", id),
    hp: 100,
    progress01: 0.95 - id * 0.02,
  }));
  const frost = new Magic();
  frost.setUpgrades({ "frost-shatter": 1 });
  expect(
    frost.cast("frost-nova", pack)!.enemies.every((enemy) => enemy.hp === 70),
  ).toBe(true);
  const chain = new Magic();
  chain.setUpgrades({ "storm-fork": 1 });
  const result = chain.cast("chain-lightning", pack)!;
  expect(result.hitIds).toHaveLength(33);
  expect(new Set(result.hitIds).size).toBe(33);
  expect(result.enemies.filter((enemy) => enemy.hp === 55)).toHaveLength(3);
});

it("thermal shock requires fire plus equipped frost and caps 300-enemy transactions", () => {
  const pack = Array.from({ length: 300 }, (_, id) => ({
    ...createPrototypeEnemy("grunt", "center", id),
    hp: 1000,
    burn: {
      remainingMs: 2000,
      dps: 10,
      depth: 0,
      spreadTargets: 0,
      spreadRadius: 0,
      maxDepth: 0,
    },
  }));
  const plain = new Magic();
  expect(plain.cast("frost-nova", pack)!.enemies[0]!.hp).toBe(1000);
  const fire = new Magic();
  fire.setUpgrades({ incendiary: 1 });
  const result = fire.cast("frost-nova", pack)!;
  expect(result.enemies.filter((e) => e.hp < 1000)).toHaveLength(24);
  expect(result.enemies[0]!.hp).toBeCloseTo(988);
  expect(result.enemies[0]!.burn?.remainingMs).toBe(2000);
  expect(fire.cast("frost-nova", pack)).toBeNull();
  const resonance = new Magic();
  resonance.setUpgrades({ incendiary: 1 });
  resonance.setSynergyMultiplier(1.35);
  expect(resonance.cast("frost-nova", pack)!.enemies[0]!.hp).toBeCloseTo(983.8);
});
it("successful frost grants bounded heat cooling and a timed damage window", () => {
  const magic = new Magic();
  magic.setUpgrades({ overheat: 1 });
  expect(magic.cast("frost-nova", [])!.heatCooling).toBe(45);
  expect(magic.primaryDamageMultiplier).toBe(1.25);
  magic.advance(2000);
  expect(magic.primaryDamageMultiplier).toBe(1);
  expect(magic.cast("frost-nova", [])).toBeNull();
});
