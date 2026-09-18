import { expect, it } from "vitest";
import { Magic } from "../../src/game/combat/magic";
import { enemyConfigs } from "../../src/game/data/enemies";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { advanceEnemy } from "../../src/game/enemies/enemySimulation";
const pack = (count: number, hp = 100) =>
  Array.from({ length: count }, (_, id) => ({
    ...createPrototypeEnemy("grunt", "center", id),
    hp,
    progress01: 0.95 - id * 0.001,
  }));

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
    0.8 + enemyConfigs.grunt.progressPerSecond * 0.975 * 0.5,
    8,
  );
  magic.advance(1000);
  const spawned = createPrototypeEnemy("runner", "center", 3);
  expect(
    advanceEnemy(spawned, 1000, enemyConfigs.runner, magic.movementMultiplier)
      .enemy.progress01,
  ).toBeCloseTo(enemyConfigs.runner.progressPerSecond * 0.975 * 0.5, 8);
  magic.advance(6000);
  expect(magic.frostRemainingMs).toBe(0);
  expect(magic.movementMultiplier).toBe(1);
  expect(
    advanceEnemy(spawned, 1000, enemyConfigs.runner, magic.movementMultiplier)
      .enemy.progress01,
  ).toBeCloseTo(enemyConfigs.runner.progressPerSecond * 0.975, 8);
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

it("whiteout improves whole-world control including new spawns without refreshing a running cast", () => {
  const magic = new Magic();
  magic.cast("frost-nova", []);
  magic.advance(1000);
  magic.setUpgrades({ "frost-growth": 5 }, { "frost-growth": "a" });
  expect(magic.frostRemainingMs).toBe(6000);
  expect(magic.movementMultiplier).toBe(0.5);
  magic.advance(29000);
  magic.cast("frost-nova", []);
  expect(magic.frostRemainingMs).toBe(14000);
  expect(magic.movementMultiplier).toBeCloseTo(0.12);
  const spawned = createPrototypeEnemy("runner", "center", 99);
  expect(
    advanceEnemy(spawned, 1000, enemyConfigs.runner, magic.movementMultiplier)
      .enemy.progress01,
  ).toBeCloseTo(0.00624);
  expect(magic.primaryDamageMultiplier).toBe(1);
});
it("absolute shatter chains through killed neighbors with a bounded center and victim budget", () => {
  const magic = new Magic();
  magic.setUpgrades({ "frost-growth": 5 }, { "frost-growth": "b" });
  const enemies = pack(300, 60);
  enemies[0]!.hp = 0;
  magic.cast("frost-nova", enemies);
  expect(magic.primaryDamageMultiplier).toBe(1.6);
  const result = magic.afterDeaths(enemies, [0]);
  expect(result.hitIds.length).toBeGreaterThan(0);
  expect(result.hitIds.length).toBeLessThanOrEqual(40);
  expect(result.centerIds.length).toBeGreaterThan(1);
  expect(result.centerIds.length).toBeLessThanOrEqual(8);
  expect(new Set(result.hitIds).size).toBe(result.hitIds.length);
  magic.advance(30000);
  expect(magic.afterDeaths(enemies, [0]).hitIds).toEqual([]);
});
it("chain branch gains extra jumps from kills but never exceeds the 64-target ceiling", () => {
  const magic = new Magic();
  magic.setUpgrades({ "lightning-growth": 5 }, { "lightning-growth": "a" });
  const result = magic.cast("chain-lightning", pack(300, 20))!;
  expect(result.hitIds).toHaveLength(64);
  expect(new Set(result.hitIds).size).toBe(64);
  const tough = new Magic();
  tough.setUpgrades({ "lightning-growth": 5 }, { "lightning-growth": "a" });
  expect(
    tough.cast("chain-lightning", pack(300, 1000))!.hitIds.length,
  ).toBeLessThan(64);
});
it("thunderstorm prioritizes elite threats and schedules exactly three capped strikes", () => {
  const magic = new Magic();
  magic.setUpgrades({ "lightning-growth": 5 }, { "lightning-growth": "b" });
  let enemies = pack(300, 1000);
  enemies[250] = { ...enemies[250]!, elite: true };
  const result = magic.cast("chain-lightning", enemies)!;
  enemies = result.enemies;
  expect(result.hitIds[0]).toBe(250);
  expect(result.hitIds).toHaveLength(10);
  expect(enemies[250]!.hp).toBe(745);
  magic.advance(499);
  expect(magic.drainStrikes(enemies).hitIds).toEqual([]);
  magic.advance(1);
  const first = magic.drainStrikes(enemies);
  expect(first.strikeIds).toEqual([250]);
  expect(first.hitIds).toHaveLength(8);
  expect(magic.drainStrikes(first.enemies).hitIds).toEqual([]);
  magic.advance(1000);
  const rest = magic.drainStrikes(first.enemies);
  expect(rest.strikeIds).toHaveLength(2);
  expect(rest.hitIds.length).toBeLessThanOrEqual(16);
  magic.advance(10000);
  expect(magic.drainStrikes(rest.enemies).hitIds).toEqual([]);
});
it("queued strikes use cast-time effects even after growth refresh and retarget dead enemies", () => {
  const magic = new Magic();
  magic.setUpgrades({ "lightning-growth": 5 }, { "lightning-growth": "b" });
  const enemies = pack(20, 1000);
  magic.cast("chain-lightning", enemies);
  magic.setUpgrades({});
  magic.advance(500);
  const result = magic.drainStrikes(
    enemies.map((e) => (e.id === 0 ? { ...e, hp: 0 } : e)),
  );
  expect(result.strikeIds).toEqual([1]);
  expect(result.enemies[1]!.hp).toBe(850);
});

it("only the shatter capstone reaches a second death generation and never a third", () => {
  const enemies = Array.from({ length: 4 }, (_, id) => ({
    ...createPrototypeEnemy("grunt", "center", id),
    hp: id === 0 ? 0 : 40,
    progress01: 0.9 - id * 0.09,
  }));
  const normal = new Magic();
  normal.setUpgrades({ "frost-growth": 4 }, { "frost-growth": "b" });
  normal.cast("frost-nova", enemies);
  expect(normal.afterDeaths(enemies, [0]).hitIds).toEqual([1]);
  const capstone = new Magic();
  capstone.setUpgrades({ "frost-growth": 5 }, { "frost-growth": "b" });
  capstone.cast("frost-nova", enemies);
  const result = capstone.afterDeaths(enemies, [0]);
  expect(result.hitIds).toEqual([1, 2]);
  expect(result.enemies[3]!.hp).toBe(40);
});

it("a track with no selected branch cannot silently activate a capstone", () => {
  const magic = new Magic();
  magic.setUpgrades({ "frost-growth": 5, "lightning-growth": 5 });
  magic.cast("frost-nova", []);
  expect(magic.primaryDamageMultiplier).toBe(1);
  expect(magic.frostRemainingMs).toBe(9000);
  expect(magic.cast("chain-lightning", pack(300, 1000))!.hitIds).toHaveLength(
    36,
  );
  magic.advance(2000);
  expect(magic.drainStrikes(pack(300)).hitIds).toEqual([]);
});
