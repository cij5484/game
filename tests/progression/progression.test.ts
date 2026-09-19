import { describe, expect, it } from "vitest";
import {
  effectiveUpgradeWeight,
  Progression,
} from "../../src/game/progression/progression";
import { upgrades, getGeneralStats } from "../../src/game/data/upgrades";
import { weaponTraitIds, getTraitEffects } from "../../src/game/data/traits";
import { synergyRecipes } from "../../src/game/data/synergies";

describe("run progression", () => {
  it("starts with three slots, expands once and basic upgrades never consume slots", () => {
    const p = new Progression(() => 0, ["gauss-rifle"]);
    Object.assign(p.ranks, {
      execution: 1,
      penetration: 1,
      ricochet: 1,
      "primary-damage": 3,
    });
    expect(p.traitLimit).toBe(3);
    expect(Object.keys(p.traitLevels)).toHaveLength(3);
    p.gainXp(8);
    expect(
      p
        .offer()
        .filter((c) => weaponTraitIds.includes(c.id as never))
        .every((c) => !!p.ranks[c.id as keyof typeof p.ranks]),
    ).toBe(true);
    expect(p.choose("explosive")).toBe(false);
    const old = p.offer();
    expect(p.expandTraitLimit()).toBe(true);
    expect(p.offer()).not.toBe(old);
    expect(p.traitLimit).toBe(4);
    expect(p.expandTraitLimit()).toBe(false);
    expect(new Progression().traitLimit).toBe(3);
  });
  it("investment affects sampling but does not guarantee an owned trait", () => {
    expect(effectiveUpgradeWeight(upgrades.execution, {})).toBe(8);
    expect(
      effectiveUpgradeWeight(upgrades.execution, { execution: 1 }),
    ).toBeCloseTo(8.64);
    expect(effectiveUpgradeWeight(upgrades["primary-damage"], {})).toBe(10);
    const p = new Progression(() => 0.99);
    p.ranks.penetration = 1;
    p.gainXp(8);
    expect(p.offer()[0]!.tag).not.toBe("penetration");
    expect(new Set(p.offer().map((c) => c.id)).size).toBe(3);
  });
  it("choice expansion invalidates the offer without changing ranks or trait capacity", () => {
    const p = new Progression(() => 0);
    p.gainXp(8);
    const old = p.offer();
    expect(old).toHaveLength(3);
    expect(p.expandChoices()).toBe(true);
    expect(p.offer()).not.toBe(old);
    expect(p.offer()).toHaveLength(4);
    expect(p.ranks).toEqual({});
    expect(p.traitLimit).toBe(3);
    expect(p.expandChoices()).toBe(false);
  });
  it("preserves overflow and queued choices, then drains an actually exhausted pool", () => {
    const p = new Progression(() => 0);
    p.gainXp(27);
    expect([p.level, p.xp, p.threshold, p.pendingChoices]).toEqual([
      3, 3, 28, 2,
    ]);
    expect(p.choose("lightning-growth")).toBe(false);
    expect(p.choose(p.offer()[0]!.id)).toBe(true);
    expect(p.choose(p.offer()[0]!.id)).toBe(true);
    const exhausted = new Progression();
    for (const card of Object.values(upgrades))
      exhausted.ranks[card.id] = card.maxRank;
    for (const id of [
      ...weaponTraitIds,
      "frost-growth",
      "lightning-growth",
      "stim-growth",
    ])
      exhausted.branches[id] = "a";
    for (const synergy of synergyRecipes)
      exhausted.activeSynergyIds.add(synergy.id);
    exhausted.gainXp(1000);
    expect(exhausted.offer()).toEqual([]);
    expect(exhausted.pendingChoices).toBe(0);
  });
  it("keeps five behavioral traits separate from the three capped basic stats", () => {
    expect(weaponTraitIds).toHaveLength(5);
    for (const id of weaponTraitIds) {
      expect(upgrades[id].maxRank).toBe(5);
      expect(upgrades[id].title).toMatch(/[가-힣]/);
    }
    const basic = getGeneralStats({});
    expect(basic.criticalChance).toBe(0.05);
    expect(basic.criticalMultiplier).toBe(1.75);
    expect(getGeneralStats({ execution: 5 })).toEqual(basic);
    const stats = getGeneralStats({
      "primary-damage": 99,
      "attack-speed": 5,
      "crit-chance": 5,
    });
    expect(stats.primaryDamageMultiplier).toBe(1.75);
    expect(stats.attackSpeedMultiplier).toBe(1.3);
    expect(stats.criticalChance).toBeCloseTo(0.3);
    expect(stats.criticalMultiplier).toBe(1.75);
    expect(
      Object.values(upgrades)
        .filter((c) => c.tag === "general")
        .map((c) => c.id),
    ).toEqual(["primary-damage", "attack-speed", "crit-chance"]);
    expect(getTraitEffects({ execution: 1 })).not.toEqual(getTraitEffects({}));
  });
  it("maxed trait slots retain basic upgrades and cannot offer a fourth trait", () => {
    const p = new Progression(() => 0, ["gauss-rifle"]);
    Object.assign(p.ranks, { penetration: 5, ricochet: 5, execution: 5 });
    Object.assign(p.branches, {
      penetration: "a",
      ricochet: "a",
      execution: "a",
    });
    p.gainXp(8);
    expect(p.offer().every((c) => c.rarity === "COMMON")).toBe(true);
    expect(p.choose("primary-damage")).toBe(true);
    expect(Object.keys(p.traitLevels)).toHaveLength(3);
  });
  it("ignores retired ids when reading old rank objects or offering choices", () => {
    const p = new Progression(() => 0, ["gauss-rifle"]);
    const removed = [
      "critical",
      "split",
      "incendiary",
      "incendiary",
      "marking",
      "suppression",
      "overheat",
    ];
    Object.assign(p.ranks, Object.fromEntries(removed.map((id) => [id, 5])));
    expect(p.traitLevels).toEqual({});
    p.gainXp(8);
    expect(p.offer().every((c) => !removed.includes(c.id))).toBe(true);
    expect(p.choose("penetration")).toBe(true);
    expect(Object.keys(p.traitLevels)).toEqual(["penetration"]);
  });
});
