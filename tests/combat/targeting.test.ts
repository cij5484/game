import { describe, expect, it } from "vitest";
import {
  resolveAttackTarget,
  selectAutoTarget,
  TargetFocus,
} from "../../src/game/combat/targeting";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";

const far = {
  ...createPrototypeEnemy("grunt", "left", 1),
  hp: 30,
  progress01: 0.2,
};
const near = {
  ...createPrototypeEnemy("runner", "right", 2),
  hp: 20,
  progress01: 0.8,
};
const dead = {
  ...createPrototypeEnemy("shield", "center", 3),
  hp: 0,
  progress01: 1,
};

describe("targeting", () => {
  it("chooses the living enemy nearest the wall and keeps stable ties", () => {
    expect(selectAutoTarget([far, dead, near])).toBe(near);
    expect(
      selectAutoTarget([near, { ...far, progress01: near.progress01 }]),
    ).toBe(near);
    expect(selectAutoTarget([dead])).toBeNull();
    expect(selectAutoTarget([])).toBeNull();
  });

  it("resolves focused targets and falls back when dead or absent", () => {
    const enemies = [far, near, dead];
    expect(resolveAttackTarget(far.id, enemies)).toBe(far);
    expect(resolveAttackTarget(null, enemies)).toBe(near);
    expect(resolveAttackTarget(dead.id, enemies)).toBe(near);
    expect(resolveAttackTarget(999, enemies)).toBe(near);
    expect(resolveAttackTarget(dead.id, [dead])).toBeNull();
  });
});

it("focus persists across automatic shots, clears on blank tap, and permanently releases a dead target", () => {
  const focus = new TargetFocus();
  expect(focus.resolve([far, near])).toBe(near);
  focus.set(far.id);
  expect(focus.resolve([far, near])).toBe(far);
  expect(focus.resolve([far, near])).toBe(far);
  focus.set(null);
  expect(focus.resolve([far, near])).toBe(near);
  focus.set(far.id);
  expect(focus.resolve([{ ...far, hp: 0 }, near])).toBe(near);
  expect(focus.targetId).toBeNull();
  expect(focus.resolve([far, near])).toBe(near);
  focus.set(999);
  expect(focus.resolve([far, near])).toBe(near);
  expect(focus.targetId).toBeNull();
});
