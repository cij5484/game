import { expect, it } from "vitest";
import { Magic } from "../../src/game/combat/magic";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";

it("freezes a 30-enemy horde while excluding dead and distant enemies", () => {
  const enemies = Array.from({ length: 30 }, (_, id) => ({
    ...createPrototypeEnemy(
      "grunt",
      (["left", "center", "right"] as const)[id % 3]!,
      id,
    ),
    progress01: 0.95 - Math.floor(id / 3) * 0.03,
  }));
  const dead = { ...enemies[0]!, id: 30, hp: 0 };
  const distant = { ...enemies[0]!, id: 31, progress01: 0 };
  const result = new Magic().cast("frost-nova", [...enemies, dead, distant])!;
  expect(result.hitIds).toHaveLength(30);
  expect(
    result.enemies.slice(0, 30).every((enemy) => enemy.frozenMs === 3500),
  ).toBe(true);
  expect(result.enemies.slice(30).every((enemy) => enemy.frozenMs === 0)).toBe(
    true,
  );
  expect(enemies[0]!.frozenMs).toBe(0);
});

it("chains to 12 distinct enemies, kills grunts, ignores shield primary resistance and excludes isolated targets", () => {
  const enemies = Array.from({ length: 14 }, (_, id) => ({
    ...createPrototypeEnemy(id === 0 ? "shield" : "grunt", "center", id),
    progress01: 0.95 - id * 0.035,
  }));
  const result = new Magic().cast("chain-lightning", enemies)!;
  expect(result.hitIds).toHaveLength(12);
  expect(new Set(result.hitIds).size).toBe(12);
  expect(result.enemies[0]!.hp).toBe(10);
  expect(result.enemies.slice(1, 12).every((enemy) => enemy.hp === 0)).toBe(
    true,
  );
  expect(result.enemies.slice(12).every((enemy) => enemy.hp === 30)).toBe(true);
  const isolated = new Magic().cast("chain-lightning", [
    enemies[0]!,
    { ...enemies[1]!, progress01: 0 },
    { ...enemies[2]!, hp: 0 },
  ])!;
  expect(isolated.hitIds).toEqual([0]);
});

it("uses independent long cooldowns and permits reuse only at expiry", () => {
  const magic = new Magic();
  expect(magic.cast("frost-nova", [])).not.toBeNull();
  expect(magic.remaining("frost-nova")).toBe(20000);
  expect(magic.cast("chain-lightning", [])).not.toBeNull();
  expect(magic.remaining("chain-lightning")).toBe(14000);
  magic.advance(13999);
  expect(magic.cast("chain-lightning", [])).toBeNull();
  expect(magic.cast("frost-nova", [])).toBeNull();
  magic.advance(1);
  expect(magic.cast("chain-lightning", [])).not.toBeNull();
  expect(magic.remaining("frost-nova")).toBe(6000);
  magic.advance(6000);
  expect(magic.cast("frost-nova", [])).not.toBeNull();
});

it("grows frost radius and duration without resetting a running cooldown", () => {
  const enemies = [0.9, 0.36, 0.2].map((progress01, id) => ({
    ...createPrototypeEnemy("grunt", "center", id),
    progress01,
  }));
  const magic = new Magic();
  expect(magic.cast("frost-nova", enemies)!.hitIds).toEqual([0]);
  magic.advance(1000);
  magic.setUpgrades({ "frost-radius": 1, "frost-duration": 2 });
  expect(magic.remaining("frost-nova")).toBe(19000);
  expect(magic.cast("frost-nova", enemies)).toBeNull();
  magic.advance(19000);
  const result = magic.cast("frost-nova", enemies)!;
  expect(result.hitIds).toEqual([0, 1]);
  expect(result.enemies.map((enemy) => enemy.frozenMs)).toEqual([
    4300, 4300, 0,
  ]);
});

it("grows lightning to 16 targets and 74 damage without cooldown reset", () => {
  const enemies = Array.from({ length: 20 }, (_, id) => ({
    ...createPrototypeEnemy("shield", "center", id),
    hp: 100,
    progress01: 0.95 - id * 0.035,
  }));
  const magic = new Magic();
  magic.setUpgrades({ "chain-targets": 2, "chain-damage": 2 });
  const result = magic.cast("chain-lightning", enemies)!;
  expect(new Set(result.hitIds).size).toBe(16);
  expect(result.enemies.slice(0, 16).every((enemy) => enemy.hp === 26)).toBe(
    true,
  );
  expect(result.enemies.slice(16).every((enemy) => enemy.hp === 100)).toBe(
    true,
  );
  magic.setUpgrades({ "chain-targets": 3, "chain-damage": 3 });
  expect(magic.remaining("chain-lightning")).toBe(14000);
  expect(magic.cast("chain-lightning", enemies)).toBeNull();
});

it("advanced frost deals damage and storm forks to distinct targets", () => {
  const pack = Array.from({ length: 24 }, (_, id) => ({
    ...createPrototypeEnemy("grunt", "center", id),
    hp: 100,
    progress01: 0.9 - id * 0.02,
  }));
  const frost = new Magic();
  frost.setUpgrades({ "frost-shatter": 1 });
  expect(frost.cast("frost-nova", pack)!.enemies[0]!.hp).toBe(70);
  const chain = new Magic();
  chain.setUpgrades({ "storm-fork": 1 });
  const result = chain.cast("chain-lightning", pack)!;
  expect(result.hitIds).toHaveLength(15);
  expect(new Set(result.hitIds).size).toBe(15);
  expect(result.enemies.filter((enemy) => enemy.hp === 70)).toHaveLength(3);
});
