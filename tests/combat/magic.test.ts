import { expect, it } from "vitest";
import { Magic } from "../../src/game/combat/magic";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { magicConfigs } from "../../src/game/data/magic";

it("freezes live enemies in logical radius of the closest wall target", () => {
  const enemies = [0.9, 0.8, 0.6].map((progress01, id) => ({
    ...createPrototypeEnemy("grunt", "center", id),
    progress01,
  }));
  const dead = { ...enemies[0]!, id: 9, hp: 0 };
  const result = new Magic().cast("frost-nova", [...enemies, dead])!;
  expect(result.hitIds).toEqual([0, 1]);
  expect(result.enemies.map((enemy) => enemy.frozenMs)).toEqual([
    1500, 1500, 0, 0,
  ]);
  expect(enemies[0]!.frozenMs).toBe(0);
});

it("chains to distinct nearby live targets, ignores primary resistance, and caps hits", () => {
  const enemies = [0.9, 0.8, 0.7, 0.6, 0.5, 0.1].map((progress01, id) => ({
    ...createPrototypeEnemy("shield", "center", id),
    progress01,
  }));
  const magic = new Magic();
  const result = magic.cast("chain-lightning", enemies)!;
  expect(result.hitIds).toEqual([0, 1, 2, 3]);
  expect(result.enemies.map((enemy) => enemy.hp)).toEqual([
    35, 35, 35, 35, 60, 60,
  ]);
  const isolated = new Magic().cast("chain-lightning", [
    enemies[0]!,
    enemies[5]!,
  ])!;
  expect(isolated.hitIds).toEqual([0]);
  const killed = new Magic().cast("chain-lightning", [
    { ...enemies[0]!, hp: 10 },
  ])!;
  expect(killed.enemies[0]!.hp).toBe(0);
});

it("uses independent cooldowns including empty casts and permits reuse at expiry", () => {
  const magic = new Magic();
  expect(magic.cast("frost-nova", [])).not.toBeNull();
  expect(magic.remaining("frost-nova")).toBe(
    magicConfigs["frost-nova"].cooldownMs,
  );
  expect(magic.cast("frost-nova", [])).toBeNull();
  expect(magic.cast("chain-lightning", [])).not.toBeNull();
  magic.advance(6000);
  expect(magic.remaining("chain-lightning")).toBe(0);
  expect(magic.remaining("frost-nova")).toBe(2000);
  magic.advance(2000);
  expect(magic.cast("frost-nova", [])).not.toBeNull();
});

it("applies frost range and duration ranks without resetting a running cooldown", () => {
  const enemies = [0.9, 0.66, 0.5].map((progress01, id) => ({
    ...createPrototypeEnemy("grunt", "center", id),
    progress01,
  }));
  const magic = new Magic();
  expect(magic.cast("frost-nova", enemies)!.hitIds).toEqual([0]);
  magic.advance(1000);
  magic.setUpgrades({ "frost-radius": 1, "frost-duration": 2 });
  expect(magic.remaining("frost-nova")).toBe(7000);
  expect(magic.cast("frost-nova", enemies)).toBeNull();
  magic.advance(7000);
  const result = magic.cast("frost-nova", enemies)!;
  expect(result.hitIds).toEqual([0, 1]);
  expect(result.enemies.map((enemy) => enemy.frozenMs)).toEqual([
    2500, 2500, 0,
  ]);
});

it("adds lightning targets and damage from ranks without duplicate hits", () => {
  const enemies = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4].map((progress01, id) => ({
    ...createPrototypeEnemy("shield", "center", id),
    progress01,
  }));
  const magic = new Magic();
  magic.setUpgrades({ "chain-targets": 1, "chain-damage": 2 });
  const result = magic.cast("chain-lightning", enemies)!;
  expect(result.hitIds).toEqual([0, 1, 2, 3, 4]);
  expect(result.enemies.map((enemy) => enemy.hp)).toEqual([
    15, 15, 15, 15, 15, 60,
  ]);
  magic.setUpgrades({ "chain-targets": 2, "chain-damage": 3 });
  expect(magic.remaining("chain-lightning")).toBe(6000);
  expect(magic.cast("chain-lightning", enemies)).toBeNull();
});
