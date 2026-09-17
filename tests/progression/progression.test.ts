import { describe, expect, it } from "vitest";
import {
  effectiveUpgradeWeight,
  Progression,
} from "../../src/game/progression/progression";
import { upgrades } from "../../src/game/data/upgrades";
import { weaponTraitIds, getTraitEffects } from "../../src/game/data/traits";

describe("run progression", () => {
  it("caps new traits at two, then permits exactly one rare run-only expansion", () => {
    const p = new Progression(() => 0, ["gauss-rifle"]);
    expect(p.traitLimit).toBe(2);
    p.ranks.rapid = 1;
    p.ranks.penetration = 1;
    p.gainXp(8);
    expect(p.offer().map((c) => c.id)).toEqual(["rapid", "penetration"]);
    expect(p.choose("ricochet")).toBe(false);
    expect(p.tryExpandTraitLimit(() => 0.5)).toBe(false);
    expect(p.tryExpandTraitLimit(() => 0)).toBe(true);
    expect(p.traitLimit).toBe(3);
    expect(p.offer().some((c) => c.id === "ricochet")).toBe(true);
    expect(p.choose("ricochet")).toBe(true);
    p.gainXp(p.threshold);
    expect(
      p
        .offer()
        .every((c) => ["rapid", "penetration", "ricochet"].includes(c.id)),
    ).toBe(true);
    expect(p.tryExpandTraitLimit(() => 0)).toBe(false);
    expect(new Progression().traitLimit).toBe(2);
  });
  it("offers level-specific rarity, caps traits at five and gates legendary on level four", () => {
    const p = new Progression(() => 0, ["gauss-rifle"]);
    p.ranks.rapid = 2;
    p.ranks.penetration = 5;
    p.gainXp(8);
    const next = p.offer().find((c) => c.id === "rapid")!;
    expect(next.rarity).toBe("RARE");
    expect(next.description).not.toBe(upgrades.rapid.description);
    expect(p.offer().some((c) => c.id === "rapid-overdrive")).toBe(false);
    p.choose("rapid");
    p.gainXp(p.threshold);
    p.choose("rapid");
    p.gainXp(p.threshold);
    expect(p.offer().find((c) => c.id === "rapid")?.rarity).toBe("EPIC");
    expect(p.offer().some((c) => c.id === "rapid-overdrive")).toBe(true);
    p.choose("rapid");
    expect(p.traitLevels.rapid).toBe(5);
    p.gainXp(p.threshold);
    expect(p.offer().some((c) => c.id === "rapid")).toBe(false);
  });
  it("weights rarity and investment without duplicate candidates", () => {
    expect(effectiveUpgradeWeight(upgrades.rapid, {})).toBe(10);
    expect(
      effectiveUpgradeWeight({ ...upgrades.rapid, rarity: "RARE" }, {}),
    ).toBe(4);
    expect(
      effectiveUpgradeWeight({ ...upgrades.rapid, rarity: "EPIC" }, {}),
    ).toBe(1);
    expect(
      effectiveUpgradeWeight({ ...upgrades.rapid, rarity: "LEGENDARY" }, {}),
    ).toBe(0.25);
    expect(effectiveUpgradeWeight(upgrades.rapid, { rapid: 1 })).toBeCloseTo(
      10.8,
    );
    const p = new Progression(() => 0.99);
    p.ranks.penetration = 1;
    p.gainXp(8);
    expect(p.offer()[0]!.tag).toBe("penetration");
    expect(new Set(p.offer().map((c) => c.id)).size).toBe(3);
    expect(p.offer()).toBe(p.offer());
  });
  it("preserves overflow, queued choices, and exhausted pools", () => {
    const p = new Progression(() => 0);
    p.gainXp(27);
    expect([p.level, p.xp, p.threshold, p.pendingChoices]).toEqual([
      3, 3, 28, 2,
    ]);
    expect(p.choose("chain-damage")).toBe(false);
    expect(p.choose(p.offer()[0]!.id)).toBe(true);
    expect(p.pendingChoices).toBe(1);
    expect(p.choose(p.offer()[0]!.id)).toBe(true);
    expect(p.pendingChoices).toBe(0);
    for (const card of Object.values(upgrades)) p.ranks[card.id] = card.maxRank;
    p.gainXp(1000);
    expect(p.offer()).toEqual([]);
    expect(p.pendingChoices).toBe(0);
  });
  it("defines six five-level traits with Korean names and behavioral capstones", () => {
    expect(weaponTraitIds).toHaveLength(6);
    for (const id of weaponTraitIds) {
      expect(upgrades[id].maxRank).toBe(5);
      expect(upgrades[id].title).toMatch(/[가-힣]/);
    }
    expect(
      getTraitEffects({ explosive: 5 }).explosionChainTargets,
    ).toBeGreaterThan(0);
    expect(
      getTraitEffects({ critical: 5 }).criticalEchoDamageFactor,
    ).toBeGreaterThan(0);
    expect(getTraitEffects({ rapid: 5 }).burstRoundsBonus).toBeGreaterThan(
      getTraitEffects({ rapid: 1 }).burstRoundsBonus,
    );
  });
});
