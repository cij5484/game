import { expect, it } from "vitest";
import {
  deriveWeaponConfig,
  primaryAttack,
} from "../../src/game/combat/primaryAttack";
import { GaussRifle } from "../../src/game/combat/gaussRifle";
import { gaussRifleBalance } from "../../src/game/data/weapons";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";

const enemy = (id: number, progress01: number, offset01 = 0.5) => ({
  ...createPrototypeEnemy("grunt", "center", id, offset01),
  progress01,
});

it("adds rapid rounds and shorter recovery without resetting an active burst or queue", () => {
  const rifle = new GaussRifle(gaussRifleBalance);
  const shots: number[] = [];
  rifle.request({ manualTargetId: null });
  rifle.advance(0, (_, offset) => {
    shots.push(offset);
  });
  const upgraded = deriveWeaponConfig({
    "extended-burst": 1,
    "faster-cycle": 1,
  });
  expect(upgraded.roundsPerBurst).toBe(4);
  expect(upgraded.burstRecoveryMs).toBe(320);
  rifle.setConfig(upgraded);
  for (let i = 0; i < 20; i++) rifle.request({ manualTargetId: null });
  rifle.advance(2000, (_, offset) => {
    shots.push(offset);
  });
  expect(shots).toEqual([0, 110, 220, 540, 650, 760, 870]);
  expect(rifle.phase).toBe("idle");
});

it("pierces only distinct enemies behind the aim ray, including wall targets", () => {
  const target = enemy(1, 1);
  const enemies = [target, enemy(2, 0.9), enemy(3, 0.8), enemy(4, 0.85, 0.9)];
  const result = primaryAttack(target, enemies, { penetration: 2 }, 10);
  expect(result.hitIds).toEqual([1, 2, 3]);
  expect(result.enemies.map((entry) => entry.hp)).toEqual([20, 20, 20, 30]);
});

it("ricochets once to the nearest unhit living enemy and applies shield armor", () => {
  const target = enemy(1, 0.9);
  const shield = { ...enemy(3, 0.91, 0.7), kind: "shield" as const, hp: 60 };
  const enemies = [target, enemy(2, 0.8), shield, { ...enemy(4, 0.91), hp: 0 }];
  const result = primaryAttack(target, enemies, { ricochet: 1 }, 10);
  expect(result.hitIds).toEqual([1, 3]);
  expect(result.ricochetIds).toEqual([3]);
  expect(result.enemies.map((entry) => entry.hp)).toEqual([20, 30, 55, 0]);
  expect(
    primaryAttack(target, [target], { penetration: 3, ricochet: 1 }, 10).hitIds,
  ).toEqual([1]);
});

it("module penetration splashes once at the last pierced enemy with armor applied", () => {
  const target = enemy(1, 0.9);
  const shield = { ...enemy(3, 0.8, 0.8), kind: "shield" as const, hp: 60 };
  const result = primaryAttack(
    target,
    [target, enemy(2, 0.8), shield],
    {},
    10,
    { penetration: 3 },
  );
  expect(result.hitIds).toEqual([1, 2]);
  expect(result.splashIds).toEqual([3]);
  expect(result.enemies.map((entry) => entry.hp)).toEqual([20, 20, 57.5]);
});

it("Storm MAX adds a distinct bounce without repeatedly damaging any enemy", () => {
  const target = enemy(1, 0.9);
  const enemies = [target, enemy(2, 0.8), enemy(3, 0.7)];
  const result = primaryAttack(target, enemies, { ricochet: 1 }, 10, {
    storm: 3,
  });
  expect(result.ricochetIds).toEqual([2, 3]);
  expect(result.enemies.map((entry) => entry.hp)).toEqual([20, 20, 20]);
  expect(
    primaryAttack(target, enemies, {}, 10, { storm: 1 }).ricochetIds,
  ).toEqual([2]);
  expect(
    primaryAttack(target, enemies, {}, 10, { storm: 3 }).ricochetIds,
  ).toEqual([2, 3]);
});

it("Hyper Gauss widens the beam and pierces more real targets", () => {
  const target = enemy(1, 0.95);
  const enemies = [
    target,
    ...Array.from({ length: 7 }, (_, i) => enemy(i + 2, 0.9 - i * 0.06, 0.85)),
  ];
  const before = primaryAttack(target, enemies, { penetration: 2 }, 10, {
    penetration: 3,
  });
  const after = primaryAttack(
    target,
    enemies,
    { penetration: 2 },
    10,
    { penetration: 3 },
    ["hyper-gauss"],
  );
  expect(before.hitIds).toEqual([1]);
  expect(after.hitIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  expect(after.enemies.every((entry) => entry.hp === 20)).toBe(true);
});
