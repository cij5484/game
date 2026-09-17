import { expect, it } from "vitest";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { advanceEnemy } from "../../src/game/enemies/enemySimulation";
import { enemyConfigs } from "../../src/game/data/enemies";
import { applyPrimaryDamage } from "../../src/game/combat/damage";

it("uses shield resistance and prevents killed enemies from attacking the wall", () => {
  const shield = createPrototypeEnemy("shield", "left", 1);
  expect(applyPrimaryDamage(shield, 10).hp).toBe(55);
  const grunt = {
    ...createPrototypeEnemy("grunt", "center", 2),
    progress01: 1,
  };
  const dead = applyPrimaryDamage(grunt, 100);
  expect(dead.hp).toBe(0);
  expect(advanceEnemy(dead, 2000, enemyConfigs.grunt).wallTimeMs).toBe(0);
});
