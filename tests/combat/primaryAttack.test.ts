import { beforeEach, afterEach, vi, expect, it } from "vitest";
import {
  deriveWeaponConfig,
  primaryAttack,
} from "../../src/game/combat/primaryAttack";
import { gaussRifleBalance } from "../../src/game/data/weapons";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(1);
});
afterEach(() => {
  vi.restoreAllMocks();
});

const enemy = (id: number, progress01: number, offset01 = 0.5) => ({
  ...createPrototypeEnemy("grunt", "center", id, offset01),
  progress01,
  hp: 100,
});
const pack = () =>
  Array.from({ length: 12 }, (_, i) => enemy(i + 1, 0.9 - i * 0.018));
const noCrit = { shotIndex: 1, random: () => 1 };
const crit = { shotIndex: 1, random: () => 0 };

it("common attack speed preserves three-round bursts and cannot add a kill relay", () => {
  expect(deriveWeaponConfig({ "attack-speed": 5 }).roundsPerBurst).toBe(3);
  expect(
    deriveWeaponConfig({ "attack-speed": 5 }).burstRecoveryMs,
  ).toBeLessThan(gaussRifleBalance.burstRecoveryMs);
  const enemies = pack().map((e) => ({ ...e, hp: 10 }));
  expect(
    primaryAttack(enemies[0]!, enemies, { "attack-speed": 5 }, 10).hitIds,
  ).toHaveLength(1);
});

it("penetration grows distinct hits, retention, and shield bypass without visual scale", () => {
  const enemies = pack();
  const low = primaryAttack(enemies[0]!, enemies, { penetration: 1 }, 10);
  const high = primaryAttack(enemies[0]!, enemies, { penetration: 5 }, 10);
  expect(low.hitIds).toHaveLength(2);
  expect(high.hitIds.length).toBeGreaterThan(low.hitIds.length);
  expect(high.enemies[1]!.hp).toBeLessThan(low.enemies[1]!.hp);
  const shield = { ...enemy(1, 0.9), kind: "shield" as const };
  expect(
    primaryAttack(shield, [shield], { penetration: 3 }, 10).enemies[0]!.hp,
  ).toBeLessThan(95);
  expect(
    primaryAttack(shield, [shield], {}, 10, {
      shieldBypass: 1,
      shieldDamageMultiplier: 1,
    }).enemies[0]!.hp,
  ).toBe(90);
});

it("ricochet level 3 forks while every round damages an enemy at most once", () => {
  const enemies = pack();
  const low = primaryAttack(enemies[0]!, enemies, { ricochet: 1 }, 10);
  const high = primaryAttack(enemies[0]!, enemies, { ricochet: 3 }, 10);
  expect(low.ricochetIds).toHaveLength(1);
  expect(high.ricochetIds.length).toBeGreaterThan(2);
  expect(new Set(high.hitIds).size).toBe(high.hitIds.length);
  expect(high.enemies.every((e) => e.hp >= 90)).toBe(true);
});

it("multishot selects simultaneous distinct roots inside its aim cone", () => {
  const enemies = [
    enemy(1, 0.6),
    enemy(2, 0.6, 0.1),
    enemy(3, 0.6, 0.9),
    enemy(4, 0.4),
  ];
  const result = primaryAttack(enemies[0]!, enemies, { multishot: 2 }, 10);
  expect(result.shotTargetIds.length).toBeGreaterThan(1);
  expect(new Set(result.shotTargetIds).size).toBe(result.shotTargetIds.length);
  expect(
    result.shotTargetIds.every(
      (id) => result.enemies.find((e) => e.id === id)!.hp < 100,
    ),
  ).toBe(true);
});

it("explosive impact and its capped secondary explosions affect nearby enemies", () => {
  const enemies = [
    enemy(1, 0.9),
    { ...enemy(2, 0.8, 0.7), hp: 5 },
    enemy(3, 0.72, 0.7),
    enemy(4, 0.88, 0.7),
  ];
  const low = primaryAttack(enemies[0]!, enemies, { explosive: 1 }, 10);
  const high = primaryAttack(enemies[0]!, enemies, { explosive: 5 }, 10);
  expect(low.splashIds).toContain(4);
  expect(high.splashIds).toContain(3);
  expect(high.enemies[2]!.hp).toBeLessThan(low.enemies[2]!.hp);
});

it("three trait synergies change explosion sites, critical bounces and periodic root shots", () => {
  const enemies = pack();
  const plain = primaryAttack(
    enemies[0]!,
    enemies,
    { ricochet: 1 },
    10,
    {},
    [],
    crit,
  );
  const lethal = primaryAttack(
    enemies[0]!,
    enemies,
    { ricochet: 1, "crit-chance": 3 },
    10,
    {},
    [],
    crit,
  );
  expect(lethal.ricochetIds.length).toBe(plain.ricochetIds.length + 2);
  expect(lethal.criticalIds).toEqual(lethal.hitIds);
  const volley = [
    enemy(1, 0.6),
    enemy(2, 0.6, 0.1),
    enemy(3, 0.6, 0.9),
    enemy(4, 0.5, 0.1),
    enemy(5, 0.5, 0.9),
  ];
  const first = primaryAttack(
    volley[0]!,
    volley,
    { "attack-speed": 3, multishot: 1 },
    10,
    {},
    [],
    noCrit,
  );
  const fourth = primaryAttack(
    volley[0]!,
    volley,
    { "attack-speed": 3, multishot: 1 },
    10,
    {},
    [],
    { ...noCrit, shotIndex: 4 },
  );
  expect(fourth.shotTargetIds.length).toBe(first.shotTargetIds.length + 2);
  const line = [enemy(1, 0.95), enemy(2, 0.75), enemy(3, 0.75, 0.7)];
  const deep = primaryAttack(
    line[0]!,
    line,
    { penetration: 1, explosive: 1 },
    10,
  );
  expect(deep.splashIds).toContain(3);
  expect(deep.explosionIds).toEqual([1, 2]);
});

it("legendary bonuses and migrated Hyper Gauss retain their behavior", () => {
  const enemies = pack();
  const standard = primaryAttack(enemies[0]!, enemies, { penetration: 4 }, 10);
  const hyper = primaryAttack(
    enemies[0]!,
    enemies,
    { penetration: 4 },
    10,
    {},
    ["hyper-gauss"],
  );
  expect(hyper.hitIds.length).toBeGreaterThan(standard.hitIds.length);
  const lowHp = enemies.map((e) => ({ ...e, hp: 10 }));
  expect(
    primaryAttack(
      lowHp[0]!,
      lowHp,
      { "attack-speed": 4, "rapid-overdrive": 1 },
      10,
    ).hitIds,
  ).toHaveLength(4);
  expect(
    primaryAttack(
      enemies[0]!,
      enemies,
      { penetration: 4, "siege-lance": 1 },
      10,
    ).enemies[1]!.hp,
  ).toBe(90);
  expect(
    primaryAttack(
      enemies[0]!,
      enemies,
      { ricochet: 4, "ricochet-cascade": 1 },
      10,
    ).ricochetIds.length,
  ).toBeGreaterThan(
    primaryAttack(enemies[0]!, enemies, { ricochet: 4 }, 10).ricochetIds.length,
  );
});

it("common damage and speed work without owning a trait and base crits need no trait", () => {
  const target = enemy(1, 0.9);
  expect(
    primaryAttack(target, [target], { "primary-damage": 1 }, 10, {}, [], noCrit)
      .enemies[0]!.hp,
  ).toBeCloseTo(88.5);
  expect(deriveWeaponConfig({ "attack-speed": 5 }).roundIntervalMs).toBeCloseTo(
    gaussRifleBalance.roundIntervalMs / 1.3,
  );
  expect(deriveWeaponConfig({ "attack-speed": 5 }).burstRecoveryMs).toBeCloseTo(
    gaussRifleBalance.burstRecoveryMs / 1.3,
  );
  const plain = primaryAttack(target, [target], {}, 10, {}, [], crit);
  expect(plain.criticalIds).toEqual([1]);
  expect(plain.enemies[0]!.hp).toBe(82.5);
  expect(
    primaryAttack(target, [target], { "crit-chance": 1 }, 10, {}, [], {
      shotIndex: 1,
      random: () => 0.08,
    }).enemies[0]!.hp,
  ).toBe(82.5);
});

it("execution finishes low-health primary targets but does not execute secondary splash", () => {
  const enemies = [
    { ...enemy(1, 0.9), hp: 8 },
    { ...enemy(2, 0.88), hp: 8 },
  ];
  expect(
    primaryAttack(enemies[0]!, enemies, { execution: 1 }, 1, {}, [], noCrit)
      .enemies[0]!.hp,
  ).toBe(7);
  const high = primaryAttack(
    enemies[0]!,
    enemies,
    { execution: 5 },
    1,
    {},
    [],
    noCrit,
  );
  expect(high.enemies[0]!.hp).toBe(0);
  expect(high.enemies[1]!.hp).toBeGreaterThan(0);
  expect(high.splashIds).toContain(2);
});

it("relic damage and resonance amplify the existing bounded primary effects", () => {
  const enemies = pack();
  const ranks = { ricochet: 1, "crit-chance": 3 };
  const standard = primaryAttack(enemies[0]!, enemies, ranks, 10, {}, [], crit);
  const resonant = primaryAttack(
    enemies[0]!,
    enemies,
    ranks,
    10,
    { damageMultiplier: 1.5 },
    [],
    { ...crit, synergyMultiplier: 1.5 },
  );
  expect(resonant.enemies[0]!.hp).toBeCloseTo(100 - 10 * 1.75 * 1.5);
  expect(resonant.ricochetIds).toHaveLength(standard.ricochetIds.length + 1);
  expect(new Set(resonant.hitIds).size).toBe(resonant.hitIds.length);
});

it("execution uses the enemy spawn maximum HP after time and elite scaling", () => {
  const scaled = { ...enemy(1, 0.9), elite: true, hp: 21, maxHp: 162 };
  expect(
    primaryAttack(scaled, [scaled], { execution: 2 }, 1, {}, [], noCrit)
      .enemies[0]!.hp,
  ).toBe(0);
});

it("incendiary adds persistent burn without immediate explosion", () => {
  const enemies = pack();
  const result = primaryAttack(enemies[0]!, enemies, { incendiary: 1 }, 10);
  expect(result.enemies[0]!.burn?.dps).toBeGreaterThan(0);
  expect(result.enemies[0]!.hp).toBe(90);
  expect(result.splashIds).toEqual([]);
});

it("marking rewards consecutive selected targets and exposes shield weakness", () => {
  let enemies = [enemy(1, 0.8), enemy(2, 0.7)];
  for (let shotIndex = 1; shotIndex <= 4; shotIndex++)
    enemies = primaryAttack(enemies[0]!, enemies, { marking: 3 }, 1, {}, [], {
      ...noCrit,
      shotIndex,
    }).enemies;
  expect(enemies[0]!.markStacks).toBeGreaterThan(1);
  expect(enemies[1]!.markStacks ?? 0).toBe(0);
  enemies = primaryAttack(enemies[1]!, enemies, { marking: 3 }, 1, {}, [], {
    ...noCrit,
    shotIndex: 5,
  }).enemies;
  enemies = primaryAttack(enemies[0]!, enemies, { marking: 3 }, 1, {}, [], {
    ...noCrit,
    shotIndex: 6,
  }).enemies;
  expect(enemies[0]!.markStacks).toBe(1);
});

it("suppression gates pushback with immunity and reduces elite control", () => {
  let enemies = [enemy(1, 0.9), { ...enemy(2, 0.9), elite: true }];
  for (let n = 0; n < 3; n++) {
    for (let i = 0; i < 2; i++)
      enemies = primaryAttack(
        enemies[i]!,
        enemies,
        { suppression: 3 },
        0,
      ).enemies;
  }
  expect(enemies[0]!.suppressionMs).toBeGreaterThan(0);
  expect(enemies[0]!.progress01).toBeLessThan(enemies[1]!.progress01);
  const stopped = enemies[0]!.progress01;
  for (let n = 0; n < 30; n++)
    enemies = primaryAttack(
      enemies[0]!,
      enemies,
      { suppression: 3 },
      0,
    ).enemies;
  expect(enemies[0]!.progress01).toBe(stopped);
});

it("suppression waves cannot trigger further waves in a 300-enemy horde", () => {
  let enemies = Array.from({ length: 300 }, (_, i) =>
    enemy(i + 1, 0.9 - i * 0.001),
  );
  for (let i = 0; i < 3; i++)
    enemies = primaryAttack(
      enemies[0]!,
      enemies,
      { suppression: 5 },
      0,
    ).enemies;
  expect(
    enemies.filter((target) => (target.suppressionMs ?? 0) > 0).length,
  ).toBeLessThanOrEqual(5);
});

it("flame penetration and flame bounce ignite a bounded end wave", () => {
  const enemies = pack();
  const pierced = primaryAttack(
    enemies[0]!,
    enemies,
    { penetration: 1, incendiary: 1 },
    10,
  );
  expect(pierced.burnIds.length).toBeGreaterThan(pierced.hitIds.length);
  expect(pierced.enemies[1]!.burn!.dps).toBeGreaterThan(
    pierced.enemies[0]!.burn!.dps,
  );
  const bounced = primaryAttack(
    enemies[0]!,
    enemies,
    { ricochet: 1, incendiary: 1 },
    10,
  );
  expect(bounced.burnIds.length).toBeGreaterThan(bounced.hitIds.length);
});

it("focused bombardment extends the center explosion beyond ordinary splash", () => {
  const enemies = [enemy(1, 0.9), enemy(2, 0.82)];
  const plain = primaryAttack(enemies[0]!, enemies, { explosive: 1 }, 10);
  const focused = primaryAttack(
    enemies[0]!,
    enemies,
    { explosive: 1, multishot: 1 },
    10,
  );
  expect(plain.explosionIds).toEqual([1]);
  expect(focused.explosionIds).toContain(1);
  expect(focused.enemies[1]!.hp).toBeLessThan(plain.enemies[1]!.hp);
});

it("marked execution widens only the fully marked target threshold", () => {
  const target = {
    ...enemy(1, 0.9),
    hp: 20,
    maxHp: 100,
    markStacks: 2,
    markShotIndex: 1,
  };
  const result = primaryAttack(
    target,
    [target],
    { marking: 1, execution: 1 },
    1,
    {},
    [],
    { ...noCrit, shotIndex: 2 },
  );
  expect(result.executionIds).toEqual([1]);
  expect(result.enemies[0]!.hp).toBe(0);
});

it("execution explosion reaches neighbors without executing or recursively exploding them", () => {
  const enemies = [{ ...enemy(1, 0.9), hp: 5, maxHp: 100 }, enemy(2, 0.825)];
  const result = primaryAttack(
    enemies[0]!,
    enemies,
    { execution: 1, explosive: 1 },
    1,
  );
  expect(result.executionIds).toEqual([1]);
  expect(result.enemies[1]!.hp).toBeLessThan(100);
  expect(result.explosionIds).toEqual([1]);
});

it("suppression pierce forces an end wave before ordinary stacks reach threshold", () => {
  const enemies = pack();
  const result = primaryAttack(
    enemies[0]!,
    enemies,
    { penetration: 1, suppression: 1 },
    1,
  );
  expect(result.suppressionIds).toContain(2);
  expect(result.suppressionIds.length).toBeGreaterThan(1);
});

it("high heat adds simultaneous barrage targets and level3 heat ignites direct hits", () => {
  const enemies = pack();
  const ranks = { overheat: 3, multishot: 1 };
  const cool = primaryAttack(enemies[0]!, enemies, ranks, 10, {}, [], {
    ...noCrit,
    heatRatio: 0.2,
  });
  const hot = primaryAttack(enemies[0]!, enemies, ranks, 10, {}, [], {
    ...noCrit,
    heatRatio: 0.8,
  });
  expect(hot.shotTargetIds.length).toBe(cool.shotTargetIds.length + 2);
  expect(hot.burnIds).toEqual(hot.hitIds);
  expect(cool.burnIds).toEqual([]);
});

it("combined max-level effects have a per-round budget in a 300-enemy horde", () => {
  const enemies = Array.from({ length: 300 }, (_, i) =>
    enemy(i + 1, 0.95 - i * 0.0025, (i % 7) / 7),
  );
  const ranks = {
    penetration: 5,
    ricochet: 5,
    multishot: 5,
    explosive: 5,
    incendiary: 5,
    suppression: 5,
    marking: 5,
    execution: 5,
    overheat: 5,
    "attack-speed": 3,
    "crit-chance": 5,
  };
  const result = primaryAttack(enemies[0]!, enemies, ranks, 10, {}, [], {
    shotIndex: 4,
    random: () => 0,
    heatRatio: 0.9,
    synergyMultiplier: 2,
  });
  expect(result.enemies.filter((e) => e.hp < 100).length).toBeLessThanOrEqual(
    128,
  );
  expect(new Set(result.hitIds).size).toBe(result.hitIds.length);
});

it("resonance expands suppression-pierce's bounded end-wave target count", () => {
  const enemies = pack();
  const ranks = { penetration: 1, suppression: 1 };
  const standard = primaryAttack(
    enemies[0]!,
    enemies,
    ranks,
    1,
    {},
    [],
    noCrit,
  );
  const resonant = primaryAttack(enemies[0]!, enemies, ranks, 1, {}, [], {
    ...noCrit,
    synergyMultiplier: 2,
  });
  expect(resonant.suppressionIds.length).toBeGreaterThan(
    standard.suppressionIds.length,
  );
  expect(resonant.suppressionIds.length).toBeLessThanOrEqual(9);
});

it("echo inherits existing mark damage without building or resetting manual focus", () => {
  const target = { ...enemy(1, 0.8), markStacks: 2, markShotIndex: 4 };
  const echo = primaryAttack(target, [target], { marking: 1 }, 10, {}, [], {
    ...noCrit,
    shotIndex: 4,
    isEcho: true,
  });
  expect(echo.enemies[0]!.hp).toBeCloseTo(88.4);
  expect(echo.enemies[0]!.markStacks).toBe(2);
  expect(echo.enemies[0]!.markShotIndex).toBe(4);
  expect(echo.markIds).toEqual([]);
  const continued = primaryAttack(
    echo.enemies[0]!,
    echo.enemies,
    { marking: 1 },
    1,
    {},
    [],
    { ...noCrit, shotIndex: 5 },
  );
  expect(continued.enemies[0]!.markStacks).toBe(3);
  expect(continued.enemies[0]!.markShotIndex).toBe(5);
  const fresh = enemy(2, 0.8);
  expect(
    primaryAttack(fresh, [fresh], { marking: 1 }, 1, {}, [], {
      ...noCrit,
      isEcho: true,
    }).enemies[0]!.markStacks,
  ).toBeUndefined();
});

it("echo uses MAX marks for shield bypass and marked execution", () => {
  const shield = {
    ...enemy(1, 0.8),
    kind: "shield" as const,
    markStacks: 4,
    markShotIndex: 4,
  };
  const ranks = { marking: 3, execution: 1 };
  const pierced = primaryAttack(shield, [shield], ranks, 10, {}, [], {
    ...noCrit,
    shotIndex: 4,
    isEcho: true,
  });
  expect(pierced.enemies[0]!.hp).toBeCloseTo(89.64);
  const wounded = { ...shield, maxHp: 100, hp: 20 };
  const executed = primaryAttack(wounded, [wounded], ranks, 1, {}, [], {
    ...noCrit,
    shotIndex: 4,
    isEcho: true,
  });
  expect(executed.executionIds).toEqual([1]);
});
