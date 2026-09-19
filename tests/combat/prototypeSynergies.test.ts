import { expect, it } from "vitest";
import { PrototypeSynergies } from "../../src/game/combat/prototypeSynergies";
import type { MarineGrowthState } from "../../src/game/data/marineGrowth";
import type { SpecialWeaponState } from "../../src/game/data/specialWeapons";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { combatPosition } from "../../src/game/battlefield/combatGeometry";

const growth: MarineGrowthState = {
  ranks: {
    burst: 1,
    multishot: 1,
    penetration: 1,
    explosive: 1,
    incendiary: 1,
  },
  quality: {},
  legendary: new Set(),
};
const weapon = (
  id: SpecialWeaponState["id"],
  tree: string,
  branch: "a" | "b",
  level = 10,
): SpecialWeaponState => ({ id, tree, branch, level, quality: 0 });
const recipes = [
  [
    "saturation",
    [weapon("grenade", "cluster", "a"), weapon("missile", "saturation", "a")],
  ],
  [
    "kill-zone",
    [weapon("grenade", "tactical", "a"), weapon("drone", "gunship", "a")],
  ],
  [
    "hunt",
    [weapon("missile", "hunter", "b"), weapon("drone", "squadron", "b")],
  ],
] as const;
const enemy = (id: number, progress01 = 0.5) => ({
  ...createPrototypeEnemy("grunt", "center", id, 0.5),
  progress01,
});

it.each(recipes)(
  "%s requires both mods and exact Lv10 completions, then latches",
  (id, weapons) => {
    const synergy = new PrototypeSynergies();
    expect(synergy.updateBuild({ ...growth, ranks: {} }, weapons)).toEqual([]);
    expect(
      synergy.updateBuild(growth, [{ ...weapons[0], level: 9 }, weapons[1]]),
    ).toEqual([]);
    expect(
      synergy.updateBuild(growth, [
        weapons[0],
        { ...weapons[1], branch: weapons[1].branch === "a" ? "b" : "a" },
      ]),
    ).toEqual([]);
    expect(synergy.updateBuild(growth, weapons)).toEqual([id]);
    expect(synergy.updateBuild({ ...growth, ranks: {} }, [])).toEqual([]);
    expect(synergy.active.has(id)).toBe(true);
  },
);

it("saturation counts distinct recent victims and expires without self-refresh", () => {
  const synergy = new PrototypeSynergies();
  synergy.updateBuild(growth, recipes[0][1]);
  synergy.registerHits([1, 1, 1, 1, 1, 1, 1, 1]);
  expect(synergy.saturation).toBe(false);
  synergy.advance(1801, []);
  synergy.registerHits([2, 3, 4, 5, 6, 7, 8]);
  expect(synergy.saturation).toBe(false);
  synergy.registerHits([9]);
  expect(synergy.saturation).toBe(true);
  expect([
    synergy.extraBurstRounds,
    synergy.grenadeExtraSubmunitions,
    synergy.missileExtraCount,
  ]).toEqual([2, 4, 3]);
  expect(synergy.visuals.some((v) => v.kind === "saturation")).toBe(true);
  synergy.advance(3499, []);
  synergy.registerHits([10, 11, 12, 13, 14, 15, 16, 17]);
  synergy.advance(1, []);
  expect(synergy.saturation).toBe(false);
  expect(synergy.extraBurstRounds).toBe(0);
});

it("kill zones boost only occupants and expire on the combat clock", () => {
  const synergy = new PrototypeSynergies();
  const inside = enemy(1),
    outside = enemy(2, 0.9);
  const point = combatPosition(inside);
  synergy.addZone(point.x, point.y, 100, 2000);
  expect(synergy.targetMultiplier(inside)).toBe(1);
  synergy.updateBuild(growth, recipes[1][1]);
  synergy.addZone(point.x, point.y, 100, 2000);
  expect(synergy.targetMultiplier(inside)).toBe(1.45);
  expect(synergy.targetMultiplier(outside)).toBe(1);
  expect(synergy.preferredZoneTarget([outside, inside])).toBe(1);
  expect(synergy.visuals[0]?.kind).toBe("zone");
  synergy.advance(2000, [inside, outside]);
  expect(synergy.targetMultiplier(inside)).toBe(1);
  expect(synergy.preferredZoneTarget([inside])).toBeNull();
});

it("hunt selects danger once, keeps the mark stable, and transfers only when invalid", () => {
  const synergy = new PrototypeSynergies();
  synergy.updateBuild(growth, recipes[2][1]);
  const weak = enemy(1, 0.8),
    elite = { ...enemy(2, 0.3), elite: true };
  synergy.advance(0, [weak, elite]);
  expect(synergy.focusId).toBe(2);
  expect(synergy.huntDamageMultiplier(elite)).toBe(1.4);
  expect(synergy.visuals.find((v) => v.kind === "hunt")?.targetId).toBe(2);
  const dangerous = { ...enemy(3, 1), elite: true };
  synergy.advance(100, [weak, elite, dangerous]);
  expect(synergy.focusId).toBe(2);
  synergy.advance(0, [weak, { ...elite, hp: 0 }, dangerous]);
  expect(synergy.focusId).toBe(3);
  synergy.advance(0, []);
  expect(synergy.focusId).toBeNull();
});

it("hunt specifically requires burst plus incendiary", () => {
  const synergy = new PrototypeSynergies();
  const weapons = recipes[2][1];
  expect(
    synergy.updateBuild({ ...growth, ranks: { burst: 1 } }, weapons),
  ).toEqual([]);
  expect(
    synergy.updateBuild({ ...growth, ranks: { incendiary: 1 } }, weapons),
  ).toEqual([]);
  expect(
    synergy.updateBuild(
      { ...growth, ranks: { burst: 1, incendiary: 1 } },
      weapons,
    ),
  ).toEqual(["hunt"]);
});
