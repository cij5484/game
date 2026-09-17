import { expect, it } from "vitest";
import { RelicCombat } from "../../src/game/combat/relicCombat";
import type { EnemyState } from "../../src/game/enemies/enemySimulation";
it("combines low-wall and boosted damage, successful cast healing, and stim costs", () => {
  const combat = new RelicCombat();
  combat.setLevels({
    "last-bulwark": 5,
    "berserker-seal": 5,
    "stim-circuit": 5,
  });
  expect(combat.primaryModifiersFor(1, false).damageMultiplier).toBe(1);
  expect(combat.primaryModifiersFor(0.3, true).damageMultiplier).toBe(2.5);
  expect(combat.onMagic("frost-nova", 0.3).wallHealing).toBe(200);
  expect(combat.onMagic("frost-nova", 0.31).wallHealing).toBe(0);
  expect(combat.onStim()).toEqual({
    wallCost: 100,
    cooldownRefunds: { "frost-nova": 1500, "chain-lightning": 1500 },
  });
});
it("refunds the previous spell only for alternating successful casts", () => {
  const combat = new RelicCombat();
  combat.setLevels({ "time-gear": 5 });
  expect(combat.onMagic("frost-nova")).toEqual({
    wallHealing: 0,
    cooldownRefunds: {},
  });
  expect(combat.onMagic("frost-nova").cooldownRefunds).toEqual({});
  expect(combat.onMagic("chain-lightning")).toEqual({
    wallHealing: 80,
    cooldownRefunds: { "frost-nova": 1800 },
  });
  expect(combat.onMagic("frost-nova").cooldownRefunds).toEqual({
    "chain-lightning": 1800,
  });
});
it("bounds frost refunds per transaction and rewards only matching kill contexts", () => {
  const combat = new RelicCombat();
  combat.setLevels({ "ice-heart": 5, "stim-circuit": 5, "lucky-coin": 5 });
  expect(combat.onKills(20, { frost: true, boost: true, magic: true })).toEqual(
    {
      wallHealing: 100,
      cooldownRefunds: { "frost-nova": 600 },
      xpMultiplier: 1.5,
    },
  );
  expect(
    combat.onKills(2, { frost: false, boost: false, magic: false }),
  ).toEqual({ wallHealing: 0, cooldownRefunds: {}, xpMultiplier: 1 });
  expect(
    combat.onKills(0, { frost: true, boost: true, magic: true })
      .cooldownRefunds,
  ).toEqual({});
  combat.setLevels({ "ice-heart": 2, "stim-circuit": 2 });
  expect(combat.onKills(2, { frost: true, boost: true, magic: true })).toEqual({
    wallHealing: 0,
    cooldownRefunds: {},
    xpMultiplier: 1,
  });
});
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
  combat.setLevels({ "siege-amplifier": 5 });
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
