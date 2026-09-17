import { describe, expect, it } from "vitest";
import {
  effectiveUpgradeWeight,
  Progression,
} from "../../src/game/progression/progression";
import {
  upgrades,
  getGeneralStats,
  type UpgradeId,
} from "../../src/game/data/upgrades";
import {
  weaponTraitIds,
  weaponTraits,
  getTraitEffects,
} from "../../src/game/data/traits";

function only(p: Progression, ids: UpgradeId[]) {
  for (const card of Object.values(upgrades))
    if (!ids.includes(card.id) && !weaponTraitIds.includes(card.id as never))
      p.ranks[card.id] = card.maxRank;
}

describe("run progression", () => {
  it("starts with three slots, expands deterministically once, and commons never consume slots", () => {
    const p = new Progression(() => 0, ["gauss-rifle"]);
    expect(p.traitLimit).toBe(3);
    p.ranks.heavy = 1;
    p.ranks.penetration = 1;
    p.ranks.ricochet = 1;
    p.ranks["primary-damage"] = 3;
    expect(Object.keys(p.traitLevels)).toHaveLength(3);
    p.gainXp(8);
    expect(
      p
        .offer()
        .filter((c) => weaponTraitIds.includes(c.id as never))
        .every((c) => !!p.ranks[c.id]),
    ).toBe(true);
    expect(p.choose("split")).toBe(false);
    const old = p.offer();
    expect(p.expandTraitLimit()).toBe(true);
    expect(p.offer()).not.toBe(old);
    expect(p.traitLimit).toBe(4);
    expect(p.expandTraitLimit()).toBe(false);
    expect(new Progression().traitLimit).toBe(3);
  });
  it("uses explicit rarity per trait level, keeps new traits rare and Lv3/5 unique", () => {
    for (const id of weaponTraitIds) {
      expect(upgrades[id].rarity).toBe("RARE");
      expect(weaponTraits[id].levels.map((l) => l.rarity)).toEqual([
        "RARE",
        "RARE",
        "EPIC",
        "RARE",
        "EPIC",
      ]);
    }
    const p = new Progression(() => 0, ["gauss-rifle"]);
    only(p, ["heavy", "rapid-overdrive", "attack-speed"]);
    p.ranks["attack-speed"] = 3;
    p.ranks.heavy = 2;
    p.ranks.penetration = 5;
    p.ranks.ricochet = 5;
    p.gainXp(8);
    const next = p.offer().find((c) => c.id === "heavy")!;
    expect(next.rarity).toBe("EPIC");
    expect(next.description).toBe(weaponTraits.heavy.levels[2]!.description);
    expect(p.offer().some((c) => c.id === "rapid-overdrive")).toBe(false);
    expect(p.choose("heavy")).toBe(true);
    p.gainXp(p.threshold);
    expect(p.choose("heavy")).toBe(true);
    p.gainXp(p.threshold);
    p.ranks["attack-speed"] = 4;
    p.setRarityModifiers({});
    expect(p.offer().some((c) => c.id === "rapid-overdrive")).toBe(true);
    expect(p.choose("heavy")).toBe(true);
    p.gainXp(p.threshold);
    expect(p.offer().some((c) => c.id === "heavy")).toBe(false);
  });
  it("weights rarity and investment without guaranteeing an invested first slot", () => {
    expect(effectiveUpgradeWeight(upgrades.heavy, {})).toBe(8);
    expect(effectiveUpgradeWeight(upgrades.heavy, { heavy: 1 })).toBeCloseTo(
      8.64,
    );
    expect(effectiveUpgradeWeight(upgrades.heavy, {}, { RARE: 2 })).toBe(16);
    expect(effectiveUpgradeWeight(upgrades["primary-damage"], {})).toBe(10);
    expect(effectiveUpgradeWeight(upgrades["siege-lance"], {})).toBe(0.25);
    const p = new Progression(() => 0.99);
    p.ranks.penetration = 1;
    p.gainXp(8);
    expect(p.offer()[0]!.tag).not.toBe("penetration");
    expect(new Set(p.offer().map((c) => c.id)).size).toBe(3);
    const old = p.offer();
    p.setRarityModifiers({ EPIC: 2 });
    expect(p.offer()).not.toBe(old);
  });
  it("grows only owned traits once, caps at five, and invalidates cached cards", () => {
    const p = new Progression(() => 0, ["gauss-rifle"]);
    p.ranks.heavy = 2;
    p.ranks.penetration = 5;
    p.ranks["primary-damage"] = 1;
    p.gainXp(8);
    const old = p.offer();
    expect(p.growOwnedTraits()).toBe(1);
    expect(p.ranks).toMatchObject({
      heavy: 3,
      penetration: 5,
      "primary-damage": 1,
    });
    expect(p.traitLevels.split).toBeUndefined();
    expect(p.offer()).not.toBe(old);
  });
  it("preserves overflow, queued choices, and exhausted pools", () => {
    const p = new Progression(() => 0);
    p.gainXp(27);
    expect([p.level, p.xp, p.threshold, p.pendingChoices]).toEqual([
      3, 3, 28, 2,
    ]);
    expect(p.choose("chain-damage")).toBe(false);
    expect(p.choose(p.offer()[0]!.id)).toBe(true);
    expect(p.choose(p.offer()[0]!.id)).toBe(true);
    for (const card of Object.values(upgrades)) p.ranks[card.id] = card.maxRank;
    p.gainXp(1000);
    expect(p.offer()).toEqual([]);
    expect(p.pendingChoices).toBe(0);
  });
  it("defines eight behavioral traits and independent capped general stats", () => {
    expect(weaponTraitIds).toHaveLength(8);
    expect("rapid" in upgrades).toBe(false);
    for (const id of weaponTraitIds) {
      expect(upgrades[id].maxRank).toBe(5);
      expect(upgrades[id].title).toMatch(/[가-힣]/);
    }
    const basic = getGeneralStats({});
    expect(basic.criticalChance).toBe(0.05);
    expect(basic.criticalMultiplier).toBe(1.75);
    expect(getGeneralStats({ critical: 5 })).toEqual(basic);
    const stats = getGeneralStats({
      "primary-damage": 99,
      "attack-speed": 5,
      "crit-chance": 5,
    });
    expect(stats.primaryDamageMultiplier).toBe(1.75);
    expect(stats.attackSpeedMultiplier).toBe(1.3);
    expect(stats.criticalChance).toBeCloseTo(0.3);
    expect(stats.criticalMultiplier).toBe(1.75);
    expect("magicCooldownMultiplier" in stats).toBe(false);
    expect("crit-damage" in upgrades).toBe(false);
    expect("magic-cooldown" in upgrades).toBe(false);
    expect(
      Object.values(upgrades)
        .filter((card) => card.tag === "general" && card.rarity === "COMMON")
        .map((card) => card.id),
    ).toEqual(["primary-damage", "attack-speed", "crit-chance"]);
    expect(
      getTraitEffects({ critical: 1 }).criticalSplashFactor,
    ).toBeGreaterThan(0);
  });
});

it("zero rarity modifiers remove candidates and capped traits still leave common stats", () => {
  const p = new Progression(() => 0, ["gauss-rifle"]);
  p.ranks.penetration = 5;
  p.ranks.ricochet = 5;
  p.ranks.heavy = 5;
  p.setRarityModifiers({ RARE: 0, EPIC: 0, LEGENDARY: 0 });
  p.gainXp(8);
  expect(p.offer().every((c) => c.rarity === "COMMON")).toBe(true);
  expect(p.choose("primary-damage")).toBe(true);
  expect(Object.keys(p.traitLevels)).toHaveLength(3);
  const empty = new Progression(() => 0.99);
  empty.setRarityModifiers({ COMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 });
  empty.gainXp(8);
  expect(empty.offer()).toEqual([]);
});
