import { expect, it } from "vitest";
import {
  deriveWeaponConfig,
  primaryAttack,
} from "../../src/game/combat/primaryAttack";
import { getTraitEffects, weaponTraitIds } from "../../src/game/data/traits";
import type { GrowthBranches } from "../../src/game/data/growth";
import { gaussRifleBalance } from "../../src/game/data/weapons";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
const enemy = (id: number, progress01 = 0.8, offset01 = 0.5) => ({
  ...createPrototypeEnemy("grunt", "center", id, offset01),
  progress01,
  hp: 100,
  maxHp: 100,
});
const pack = () =>
  Array.from({ length: 20 }, (_, i) => enemy(i + 1, 0.9 - i * 0.012));
const noCrit = { shotIndex: 1, random: () => 1 };
const branch = (branches: GrowthBranches) => ({ ...noCrit, branches });
const selected = (...ids: string[]) => ({
  ...noCrit,
  activeSynergyIds: new Set(ids),
});

it.each(["penetration", "explosive"] as const)(
  "applies target damage bonuses only to each marked %s hit, including secondary damage",
  (trait) => {
    const enemies = [enemy(1, 0.8), enemy(2, 0.78), enemy(3, 0.76)];
    const context = {
      ...noCrit,
      growth: {
        ranks: { [trait]: 1 },
        quality: {},
        legendary: new Set<never>(),
      },
    };
    const ordinary = primaryAttack(
      enemies[0]!,
      enemies,
      {},
      10,
      {},
      [],
      context,
    );
    expect(ordinary.enemies[1]!.hp).toBeLessThan(100);
    for (const markedId of [1, 2]) {
      const marked = primaryAttack(enemies[0]!, enemies, {}, 10, {}, [], {
        ...context,
        targetDamageMultiplier: (id) => (id === markedId ? 1.2 : 1),
      });
      marked.enemies.forEach((target, index) => {
        const ordinaryDamage = 100 - ordinary.enemies[index]!.hp;
        expect(100 - target.hp).toBeCloseTo(
          ordinaryDamage * (target.id === markedId ? 1.2 : 1),
        );
      });
    }
  },
);

it("unselected branch cannot silently grant high-level effects", () => {
  expect(weaponTraitIds).toHaveLength(5);
  for (const id of weaponTraitIds)
    expect(getTraitEffects({ [id]: 5 })).toEqual(getTraitEffects({ [id]: 2 }));
});

it("basic attack upgrades keep the latest damage speed and critical values", () => {
  const target = enemy(1);
  expect(
    primaryAttack(target, [target], { "primary-damage": 1 }, 10, {}, [], noCrit)
      .enemies[0]!.hp,
  ).toBeCloseTo(88.5);
  expect(deriveWeaponConfig({ "attack-speed": 5 }).shotIntervalMs).toBeCloseTo(
    gaussRifleBalance.shotIntervalMs / 1.3,
  );
  const crit = primaryAttack(
    target,
    [target],
    { "crit-chance": 1 },
    10,
    {},
    [],
    { shotIndex: 1, random: () => 0.08 },
  );
  expect(crit.enemies[0]!.hp).toBe(82.5);
});

it("linear penetration clears more enemies while shatter penetration hits an off-line group", () => {
  const line = pack();
  const a = primaryAttack(
    line[0]!,
    line,
    { penetration: 5 },
    10,
    {},
    [],
    branch({ penetration: "a" }),
  );
  const b = primaryAttack(
    line[0]!,
    line,
    { penetration: 5 },
    10,
    {},
    [],
    branch({ penetration: "b" }),
  );
  expect(a.hitIds.length).toBeGreaterThan(b.hitIds.length);
  expect(a.enemies[1]!.hp).toBe(90);
  expect(a.explosionIds).toEqual([]);
  expect(b.explosionIds.length).toBeGreaterThan(0);
  const shield = { ...enemy(1), kind: "shield" as const };
  expect(
    primaryAttack(
      shield,
      [shield],
      { penetration: 5 },
      10,
      {},
      [],
      branch({ penetration: "b" }),
    ).enemies[0]!.hp,
  ).toBe(90);
});

it("ricochet branches separate spreading forks from escalating fewer hits", () => {
  const enemies = pack();
  const a = primaryAttack(
    enemies[0]!,
    enemies,
    { ricochet: 5 },
    10,
    {},
    [],
    branch({ ricochet: "a" }),
  );
  const b = primaryAttack(
    enemies[0]!,
    enemies,
    { ricochet: 5 },
    10,
    {},
    [],
    branch({ ricochet: "b" }),
  );
  expect(a.ricochetIds.length).toBeGreaterThan(b.ricochetIds.length);
  expect(b.enemies.find((e) => e.id === b.ricochetIds.at(-1))!.hp).toBeLessThan(
    b.enemies.find((e) => e.id === b.ricochetIds[0])!.hp,
  );
  expect(new Set(a.hitIds).size).toBe(a.hitIds.length);
});

it("fan and focused volley differ in distinct targets, cone and primary damage", () => {
  const enemies = [
    enemy(1, 0.85),
    enemy(2, 0.85, 0.15),
    enemy(3, 0.85, 0.85),
    enemy(4, 0.7, 0.48),
    enemy(5, 0.7, 0.52),
    enemy(6, 0.6),
  ];
  const a = primaryAttack(
    enemies[0]!,
    enemies,
    { multishot: 5 },
    10,
    {},
    [],
    branch({ multishot: "a" }),
  );
  const b = primaryAttack(
    enemies[0]!,
    enemies,
    { multishot: 5 },
    10,
    {},
    [],
    branch({ multishot: "b" }),
  );
  expect(a.shotTargetIds.length).toBeGreaterThan(b.shotTargetIds.length);
  expect(b.shotTargetIds).not.toContain(2);
  expect(b.shotTargetIds).not.toContain(3);
  expect(b.enemies[0]!.hp).toBeLessThan(a.enemies[0]!.hp);
  expect(new Set(b.shotTargetIds).size).toBe(b.shotTargetIds.length);
});

it("domino explosion creates bounded secondary sites while compressed warhead is one large blast", () => {
  const enemies = pack().map((e, i) => ({ ...e, hp: i === 0 ? 100 : 1 }));
  const a = primaryAttack(
    enemies[0]!,
    enemies,
    { explosive: 5 },
    10,
    {},
    [],
    branch({ explosive: "a" }),
  );
  const b = primaryAttack(
    enemies[0]!,
    enemies,
    { explosive: 5 },
    10,
    {},
    [],
    branch({ explosive: "b" }),
  );
  expect(a.explosionIds.length).toBeGreaterThan(1);
  expect(a.explosionIds.length).toBeLessThanOrEqual(7);
  expect(b.explosionIds).toEqual([1]);
  const far = [enemy(1, 0.9), enemy(2, 0.74)];
  expect(
    primaryAttack(
      far[0]!,
      far,
      { explosive: 5 },
      10,
      {},
      [],
      branch({ explosive: "b" }),
    ).enemies[1]!.hp,
  ).toBeLessThan(100);
});

it("execution specialist finishes strong enemies above the wave branch threshold", () => {
  const target = { ...enemy(1), elite: true, hp: 65, maxHp: 200 };
  expect(
    primaryAttack(
      target,
      [target],
      { execution: 5 },
      1,
      {},
      [],
      branch({ execution: "a" }),
    ).enemies[0]!.hp,
  ).toBe(0);
  expect(
    primaryAttack(
      target,
      [target],
      { execution: 5 },
      1,
      {},
      [],
      branch({ execution: "b" }),
    ).enemies[0]!.hp,
  ).toBeGreaterThan(0);
});

it("death-wave capstone executes a bounded second generation without recursive waves", () => {
  const enemies = Array.from({ length: 300 }, (_, i) => ({
    ...enemy(i + 1, 0.8 - i * 0.0001),
    hp: 10,
  }));
  const result = primaryAttack(
    enemies[0]!,
    enemies,
    { execution: 5 },
    1,
    {},
    [],
    branch({ execution: "b" }),
  );
  expect(result.executionIds.length).toBeGreaterThan(1);
  expect(result.executionIds.length).toBeLessThanOrEqual(5);
  expect(result.explosionIds).toEqual([1]);
  expect(result.enemies.filter((e) => e.hp <= 0)).toHaveLength(
    result.executionIds.length,
  );
});

it("Lv4 strengthens and Lv5 changes each chosen branch without crossing into the other branch", () => {
  for (const id of weaponTraitIds)
    for (const choice of ["a", "b"] as const) {
      const e3 = getTraitEffects({ [id]: 3 }, { [id]: choice });
      const e4 = getTraitEffects({ [id]: 4 }, { [id]: choice });
      const e5 = getTraitEffects({ [id]: 5 }, { [id]: choice });
      expect(e4).not.toEqual(e3);
      expect(e5).not.toEqual(e4);
    }
});

it("synergy prerequisites alone do not enable effects; selecting the card does", () => {
  const enemies = [enemy(1, 0.95), enemy(2, 0.75), enemy(3, 0.75, 0.7)];
  const ranks = { penetration: 1, explosive: 1 };
  const locked = primaryAttack(enemies[0]!, enemies, ranks, 10, {}, [], noCrit);
  const active = primaryAttack(
    enemies[0]!,
    enemies,
    ranks,
    10,
    {},
    [],
    selected("deep-blast"),
  );
  expect(locked.explosionIds).toEqual([1]);
  expect(active.explosionIds).toEqual([1, 2]);
  expect(active.enemies[2]!.hp).toBeLessThan(locked.enemies[2]!.hp);
});

it("selected lethal ricochet propagates criticals and resonance adds bounded hops", () => {
  const enemies = pack(),
    ranks = { ricochet: 1, "crit-chance": 3 };
  const context = { ...selected("lethal-ricochet"), random: () => 0 };
  const base = primaryAttack(enemies[0]!, enemies, ranks, 10, {}, [], context);
  const resonance = primaryAttack(enemies[0]!, enemies, ranks, 10, {}, [], {
    ...context,
    synergyMultiplier: 1.5,
  });
  expect(base.ricochetIds).toHaveLength(3);
  expect(base.criticalIds).toEqual(base.hitIds);
  expect(resonance.ricochetIds).toHaveLength(4);
});

it("selected bullet storm adds roots periodically rather than altering normal rounds", () => {
  const enemies = pack(),
    ranks = { multishot: 1, "attack-speed": 3 };
  const context = selected("bullet-storm");
  const normal = primaryAttack(
    enemies[0]!,
    enemies,
    ranks,
    10,
    {},
    [],
    context,
  );
  const storm = primaryAttack(enemies[0]!, enemies, ranks, 10, {}, [], {
    ...context,
    shotIndex: 4,
  });
  expect(storm.shotTargetIds.length).toBe(normal.shotTargetIds.length + 2);
});

it("focused bombardment selection widens the central blast; execution blast emits only on execution", () => {
  const enemies = [enemy(1, 0.9), enemy(2, 0.815)];
  const ranks = { explosive: 1, multishot: 1 };
  const normal = primaryAttack(enemies[0]!, enemies, ranks, 10, {}, [], noCrit);
  const active = primaryAttack(
    enemies[0]!,
    enemies,
    ranks,
    10,
    {},
    [],
    selected("focused-bombardment"),
  );
  expect(active.enemies[1]!.hp).toBeLessThan(normal.enemies[1]!.hp);
  const weak = [{ ...enemy(1, 0.9), hp: 5 }, enemy(2, 0.805)];
  const blast = primaryAttack(
    weak[0]!,
    weak,
    { execution: 1, explosive: 1 },
    1,
    {},
    [],
    selected("execution-blast"),
  );
  expect(blast.executionIds).toEqual([1]);
  expect(blast.enemies[1]!.hp).toBeLessThan(100);
});

it("Hyper Gauss still adds penetration to either selected branch", () => {
  const enemies = pack();
  for (const choice of ["a", "b"] as const) {
    const context = branch({ penetration: choice });
    const normal = primaryAttack(
      enemies[0]!,
      enemies,
      { penetration: 4 },
      10,
      {},
      [],
      context,
    );
    const evolved = primaryAttack(
      enemies[0]!,
      enemies,
      { penetration: 4 },
      10,
      {},
      ["hyper-gauss"],
      context,
    );
    expect(evolved.hitIds.length).toBeGreaterThan(normal.hitIds.length);
  }
});

it("combined capstones stay bounded in a 300-enemy horde", () => {
  const enemies = Array.from({ length: 300 }, (_, i) =>
    enemy(i + 1, 0.95 - i * 0.0025, (i % 7) / 7),
  );
  const ranks = {
    penetration: 5,
    ricochet: 5,
    multishot: 5,
    explosive: 5,
    execution: 5,
    "attack-speed": 3,
    "crit-chance": 3,
  };
  const result = primaryAttack(enemies[0]!, enemies, ranks, 10, {}, [], {
    ...selected(
      "deep-blast",
      "lethal-ricochet",
      "bullet-storm",
      "focused-bombardment",
      "execution-blast",
    ),
    shotIndex: 4,
    random: () => 0,
    synergyMultiplier: 2,
    branches: {
      penetration: "b",
      ricochet: "a",
      multishot: "a",
      explosive: "a",
      execution: "b",
    },
  });
  expect(result.enemies.filter((e) => e.hp < 100).length).toBeLessThanOrEqual(
    128,
  );
  expect(new Set(result.hitIds).size).toBe(result.hitIds.length);
});

it("focused bombardment preserves the chosen explosive chain branch", () => {
  const enemies = pack().map((e, i) => ({ ...e, hp: i === 0 ? 100 : 1 }));
  const result = primaryAttack(
    enemies[0]!,
    enemies,
    { explosive: 5, multishot: 1 },
    10,
    {},
    [],
    { ...selected("focused-bombardment"), branches: { explosive: "a" } },
  );
  expect(result.explosionIds.length).toBeGreaterThan(
    result.shotTargetIds.length,
  );
});

it("bullet storm preserves focused-volley damage and applies its factor only to added rays", () => {
  const enemies = pack();
  const ranks = { multishot: 5, "attack-speed": 3 };
  const context = {
    ...selected("bullet-storm"),
    branches: { multishot: "b" as const },
  };
  const ordinary = primaryAttack(
    enemies[0]!,
    enemies,
    ranks,
    10,
    {},
    [],
    context,
  );
  const storm = primaryAttack(enemies[0]!, enemies, ranks, 10, {}, [], {
    ...context,
    shotIndex: 4,
  });
  expect(ordinary.shotTargetIds).toHaveLength(3);
  expect(storm.shotTargetIds).toHaveLength(5);
  for (const id of storm.shotTargetIds.slice(1, 3)) {
    expect(storm.enemies.find((e) => e.id === id)!.hp).toBe(80);
  }
  for (const id of storm.shotTargetIds.slice(3)) {
    expect(storm.enemies.find((e) => e.id === id)!.hp).toBe(90);
  }
  expect(storm.enemies[0]!.hp).toBe(ordinary.enemies[0]!.hp);
});

it("secondary explosions require an actual lethal initial hit within the splash budget", () => {
  const enemies = Array.from({ length: 26 }, (_, index) => ({
    ...enemy(index + 1, 0.9 - index * 0.001),
    hp: index === 25 ? 1 : 100,
  }));
  const result = primaryAttack(
    enemies[0]!,
    enemies,
    { explosive: 5 },
    10,
    {},
    [],
    branch({ explosive: "a" }),
  );
  expect(result.enemies.at(-1)!.hp).toBe(1);
  expect(result.explosionIds).toEqual([1]);
});

it("multishot does not acquire additional aim targets outside primary range", () => {
  const near = enemy(1, 0.8),
    far = enemy(2, 0.2);
  const result = primaryAttack(
    near,
    [near, far],
    { multishot: 1 },
    10,
    {},
    [],
    { ...noCrit, minTargetProgress01: 0.55 },
  );
  expect(result.shotTargetIds).toEqual([1]);
  expect(result.enemies[1]!.hp).toBe(100);
});
