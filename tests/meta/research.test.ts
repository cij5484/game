import { expect, it } from "vitest";
import {
  createMetaModifiers,
  getResearchCost,
  getResearchEffect,
  neutralMetaModifiers,
  researchDefinitions,
} from "../../src/game/data/meta";

it("uses replacement milestone increments and exact requested research maxima", () => {
  const expected = {
    "primary-damage": 3.25,
    "primary-speed": 1.7,
    "special-damage": 3.25,
    "wall-hp": 3.5,
    "critical-chance": 0.4,
    "critical-damage": 2.1,
    "special-cycle": 0.6,
    "elite-boss-damage": 2.1,
    "wall-defense": 0.45,
    xp: 1.3,
    range: 0.6,
  };
  for (const definition of Object.values(researchDefinitions)) {
    expect(getResearchEffect(definition.id, definition.maxLevel)).toBeCloseTo(
      expected[definition.id],
    );
    expect(definition.costs).toHaveLength(definition.maxLevel);
    expect(getResearchCost(definition.id, definition.maxLevel)).toBeNull();
  }
  expect(getResearchEffect("primary-damage", 4)).toBe(0.4);
  expect(getResearchEffect("primary-damage", 5)).toBe(0.65);
  expect(getResearchCost("primary-damage", 4)).toBe(650);
  expect(() => getResearchEffect("range", 6)).toThrow();
});

it("builds neutral and bounded full-research snapshots without changing base values", () => {
  expect(createMetaModifiers({})).toEqual(neutralMetaModifiers);
  const levels = Object.fromEntries(
    Object.values(researchDefinitions).map((item) => [item.id, item.maxLevel]),
  );
  expect(createMetaModifiers(levels)).toEqual({
    primaryDamageMultiplier: 4.25,
    primarySpeedMultiplier: 2.7,
    specialDamageMultiplier: 4.25,
    specialCycleMultiplier: 0.4,
    wallHpMultiplier: 4.5,
    criticalChanceBonus: 0.4,
    criticalMultiplierBonus: 2.1,
    eliteBossDamageMultiplier: 3.1,
    wallDamageMultiplier: 0.55,
    xpMultiplier: 2.3,
    rangeMultiplier: 1.6,
  });
});
