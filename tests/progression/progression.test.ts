import { describe, expect, it } from "vitest";
import {
  effectiveUpgradeWeight,
  Progression,
} from "../../src/game/progression/progression";
import { upgrades } from "../../src/game/data/upgrades";

describe("run progression", () => {
  it("weights rarity and bounded build investment while keeping legendary cards reachable", () => {
    const common = upgrades["extended-burst"];
    expect(effectiveUpgradeWeight(common, {})).toBe(10);
    expect(effectiveUpgradeWeight({ ...common, rarity: "RARE" }, {})).toBe(4);
    expect(effectiveUpgradeWeight({ ...common, rarity: "EPIC" }, {})).toBe(1);
    expect(effectiveUpgradeWeight({ ...common, rarity: "LEGENDARY" }, {})).toBe(
      0.25,
    );
    expect(effectiveUpgradeWeight(common, { "extended-burst": 1 })).toBeCloseTo(
      10.8,
    );
    expect(
      effectiveUpgradeWeight(common, {
        "extended-burst": 5,
        "faster-cycle": 5,
      }),
    ).toBe(16);
    expect(effectiveUpgradeWeight({ ...common, weight: 2 }, {})).toBe(20);
    const p = new Progression(() => 0.999999, ["gauss-rifle"]);
    p.ranks["extended-burst"] = 5;
    p.gainXp(8);
    expect(p.offer().some((card) => card.rarity === "LEGENDARY")).toBe(false);
    p.choose(p.offer()[0]!.id);
    p.ranks["faster-cycle"] = 1;
    p.gainXp(p.threshold);
    expect(p.offer().some((card) => card.id === "rapid-overdrive")).toBe(true);
    expect(new Set(p.offer().map((card) => card.id)).size).toBe(3);
  });
  it("preserves overflow and resolves queued choices one at a time", () => {
    const p = new Progression(() => 0);
    p.gainXp(27);
    expect([p.level, p.xp, p.threshold, p.pendingChoices]).toEqual([
      3, 3, 28, 2,
    ]);
    const choices = p.offer();
    expect(choices).toHaveLength(3);
    expect(
      choices.some((c) =>
        ["pierce-retention", "bounce-radius", "bounce-retention"].includes(
          c.id,
        ),
      ),
    ).toBe(false);
    expect(p.choose("chain-damage")).toBe(false);
    expect(p.choose(choices[0]!.id)).toBe(true);
    expect(p.pendingChoices).toBe(1);
    expect(p.choose(p.offer()[0]!.id)).toBe(true);
    expect(p.pendingChoices).toBe(0);
  });

  it("leaves most ranks unspent after a representative five-minute XP budget", () => {
    for (const xp of [1000, 1800, 2500]) {
      const p = new Progression(() => 0);
      p.gainXp(xp);
      expect(p.pendingChoices).toBeGreaterThanOrEqual(10);
      expect(p.pendingChoices).toBeLessThanOrEqual(14);
    }
    expect(Object.values(upgrades).length).toBeGreaterThanOrEqual(20);
    expect(
      Object.values(upgrades).reduce((n, u) => n + u.maxRank, 0),
    ).toBeGreaterThanOrEqual(65);
  });

  it("unlocks advanced cards at tag investment threshold, while filtering abilities and MAX", () => {
    const p = new Progression(() => 0.999, ["gauss-rifle"]);
    p.ranks["extended-burst"] = 5;
    p.gainXp(8);
    expect(p.offer().some((c) => c.id === "rapid-relay")).toBe(false);
    const first = p.offer()[0]!.id;
    p.choose(first);
    p.ranks[first] = 0;
    p.ranks["faster-cycle"] = 1;
    // Remove other candidates to make prerequisite eligibility observable without luck.
    for (const card of Object.values(upgrades)) {
      if (card.tag !== "rapid") p.ranks[card.id] = card.maxRank;
    }
    p.gainXp(p.threshold);
    const cards = p.offer();
    expect(cards.some((c) => c.id === "rapid-relay")).toBe(true);
    expect(
      cards.every(
        (c) => c.ability === "gauss-rifle" && c.id !== "extended-burst",
      ),
    ).toBe(true);
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
    expect(p.offer()).toBe(cards);
  });

  it("keeps one invested-tag option and never pauses on an exhausted pool", () => {
    const p = new Progression(() => 0.99);
    p.ranks.penetration = 1;
    p.gainXp(8);
    expect(p.offer()[0]!.tag).toBe("penetration");
    p.choose(p.offer()[0]!.id);
    for (const card of Object.values(upgrades)) p.ranks[card.id] = card.maxRank;
    p.gainXp(1000);
    expect(p.offer()).toEqual([]);
    expect(p.pendingChoices).toBe(0);
  });
});
