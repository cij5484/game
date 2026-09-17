import { expect, it } from "vitest";
import { RelicCombat } from "../../src/game/combat/relicCombat";
import type { EnemyState } from "../../src/game/enemies/enemySimulation";
const enemy = (id: number, hp = 100): EnemyState => ({
  id,
  hp,
  kind: "shield",
  lane: "center",
  offset01: 0,
  progress01: 0.8,
  phase: "moving",
});
it("connects shield hits to capped lightning refund and magic to limited empowered rounds", () => {
  const combat = new RelicCombat();
  combat.setLevels({ "siege-core": 5 });
  expect(combat.onMagic("frost-nova").wallHealing).toBe(120);
  expect(combat.primaryModifiers).toEqual({
    shieldBypass: 1,
    shieldDamageMultiplier: 2,
  });
  const enemies = Array.from({ length: 8 }, (_, i) => enemy(i, 0));
  expect(
    combat.afterPrimary(
      enemies,
      enemies.map((x) => x.id),
      false,
    ).cooldownRefunds,
  ).toEqual({ "chain-lightning": 480 });
  for (let i = 0; i < 6; i++) combat.afterPrimary(enemies, [], false);
  expect(combat.primaryModifiers).toEqual({
    shieldBypass: 0,
    shieldDamageMultiplier: 1,
  });
});
it("counts landed rounds only, arcs once without duplicates and refunds both magics at MAX", () => {
  const combat = new RelicCombat();
  combat.setLevels({ "tesla-coil": 5 });
  const enemies = Array.from({ length: 8 }, (_, i) => enemy(i));
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
  combat.onMagic("chain-lightning");
  expect(combat.afterPrimary(enemies, [0], false).hitIds).toHaveLength(5);
});
