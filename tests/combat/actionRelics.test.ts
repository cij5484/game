import { expect, it, vi } from "vitest";
import {
  applyImpact,
  precisionBonus,
  startAction,
} from "../../src/game/combat/actionRelics";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";

it("rolls overcharge and replication once per eligible action, never recursive repeats", () => {
  const random = vi.fn(() => 0);
  const relics = new Set(["capacitor", "replicator"] as const);
  expect(startAction(relics, random, { basic: true })).toEqual({
    damageMultiplier: 2,
    repeat: true,
  });
  expect(random).toHaveBeenCalledTimes(2);
  expect(
    startAction(relics, random, { basic: true, replicated: true }).repeat,
  ).toBe(false);
  expect(startAction(relics, random).repeat).toBe(false);
  expect(precisionBonus(new Set(["precision"]))).toBe(0.12);
});

it("impact rolls only for actual body or shield hits and elites resist push", () => {
  const base = {
    ...createPrototypeEnemy("grunt", "center", 1),
    progress01: 1,
    hp: 100,
    shieldHp: 50,
  };
  const before = [base, { ...base, id: 2, elite: true }, { ...base, id: 3 }];
  const after = [
    { ...base, shieldHp: 40 },
    { ...before[1]!, hp: 90 },
    before[2]!,
  ];
  const random = vi.fn(() => 0);
  const result = applyImpact(before, after, new Set(["impact"]), random);
  expect(result[0]!.progress01).toBeCloseTo(0.975);
  expect(result[1]!.progress01).toBeCloseTo(1 - 0.025 * 0.25);
  expect(result[0]!.phase).toBe("moving");
  expect(result[2]).toBe(before[2]);
  expect(random).toHaveBeenCalledTimes(2);
});
