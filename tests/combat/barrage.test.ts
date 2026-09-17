import { expect, it } from "vitest";
import { suppressiveBarrage } from "../../src/game/combat/barrage";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";

it("still clears 24 enemies on all misses and perfect rhythm increases damage and coverage", () => {
  const enemies = Array.from({ length: 80 }, (_, id) => ({
    ...createPrototypeEnemy("shield", "center", id),
    progress01: id / 80,
  }));
  const weak = suppressiveBarrage(enemies, 0);
  expect(weak.hitIds).toHaveLength(24);
  expect(weak.hitIds[0]).toBe(79);
  expect(weak.enemies.filter((e) => e.hp === 0)).toHaveLength(24);
  const strong = suppressiveBarrage(
    enemies.map((e) => ({ ...e, hp: 120 })),
    1,
  );
  expect(strong.hitIds).toHaveLength(60);
  expect(strong.enemies.filter((e) => e.hp === 0)).toHaveLength(60);
  expect(enemies.every((e) => e.hp === 60)).toBe(true);
});
