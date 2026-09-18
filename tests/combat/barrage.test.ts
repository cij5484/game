import { expect, it } from "vitest";
import { suppressiveBarrage } from "../../src/game/combat/barrage";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";

it("always deals 140 damage to the closest 60 living enemies, ignoring Shield armor", () => {
  const enemies = Array.from({ length: 80 }, (_, id) => ({
    ...createPrototypeEnemy("shield", "center", id),
    hp: 200,
    progress01: id / 80,
  }));
  const result = suppressiveBarrage(enemies);
  expect(result.hitIds).toHaveLength(60);
  expect(result.hitIds[0]).toBe(79);
  expect(result.enemies.filter((e) => e.hp === 60)).toHaveLength(60);
  expect(result.enemies.filter((e) => e.hp === 200)).toHaveLength(20);
  expect(enemies.every((e) => e.hp === 200)).toBe(true);
});

it("skips corpses and clamps damage at zero with deterministic tie order", () => {
  const enemies = [3, 1, 2].map((id) => ({
    ...createPrototypeEnemy("grunt", "center", id),
    progress01: 0.8,
  }));
  enemies[0]!.hp = 0;
  const result = suppressiveBarrage(enemies);
  expect(result.hitIds).toEqual([1, 2]);
  expect(result.enemies.every((e) => e.hp === 0)).toBe(true);
  expect(suppressiveBarrage([]).hitIds).toEqual([]);
});
