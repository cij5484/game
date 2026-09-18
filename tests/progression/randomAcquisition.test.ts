import { describe, expect, it, vi } from "vitest";
import { MarineProgression } from "../../src/game/progression/marineProgression";
import {
  marineUpgradeWeight,
  marineUpgrades,
} from "../../src/game/data/marineGrowth";

const offerAt = (level: number, roll = 0.99999) => {
  const p = new MarineProgression(() => roll);
  p.level = level;
  p.pendingChoices = 1;
  return p;
};

describe("M7 random acquisition categories", () => {
  it("never auto-acquires at Lv5/10, with no forced acquisition even at high levels", () => {
    const p = new MarineProgression(() => 0);
    while (p.level < 20) {
      p.gainXp(p.threshold);
      expect(p.special.pending).toBe(false);
      expect(p.special.weapons).toEqual([]);
      expect(
        p.offer().every((card) => card.category !== "special-acquisition"),
      ).toBe(true);
      p.choose("primary-damage");
    }
  });

  it("opens first at eight, second at fourteen and never a third without Core", () => {
    expect(
      offerAt(7)
        .offer()
        .some((c) => c.category === "special-acquisition"),
    ).toBe(false);
    expect(offerAt(8).offer()[0]!.category).toBe("special-acquisition");
    for (const level of [8, 13, 14]) {
      const p = offerAt(level);
      p.special.acquireWeapon("grenade");
      expect(p.offer().some((c) => c.category === "special-acquisition")).toBe(
        level >= 14,
      );
    }
    const full = offerAt(100);
    full.special.acquireWeapon("grenade");
    full.special.acquireWeapon("missile");
    expect(full.offer().some((c) => c.category === "special-acquisition")).toBe(
      false,
    );
  });

  it("consumes a normal choice at Lv1 without rarity, Great Success or quality history", () => {
    const random = vi.fn(() => 0.99999);
    const p = new MarineProgression(random);
    p.level = 8;
    p.pendingChoices = 1;
    const card = p.offer()[0]!;
    expect(card.category).toBe("special-acquisition");
    expect(card).not.toHaveProperty("rarity");
    p.applyCore("quality");
    expect(p.offer()[0]).toEqual(card);
    random.mockClear();
    random.mockReturnValue(0);
    expect(p.choose(card.id)).toBe(true);
    expect(random).not.toHaveBeenCalled();
    expect(p.special.weapons).toEqual([{ id: "drone", level: 1, quality: 0 }]);
    expect(p.pendingChoices).toBe(0);
    expect(p.special.pending).toBe(false);
    expect(p.history).toEqual([]);
    expect(p.special.history).toEqual([]);
    expect(p.lastSelection).toBeNull();
  });

  it("uses one .30 acquisition category, then .20, independent of unowned weapon count", () => {
    // First offer total: common 3 + new mod .45 + range .25 + acquisition .30.
    expect(offerAt(8, 3.70001 / 4).offer()[0]!.category).toBe(
      "special-acquisition",
    );
    expect(offerAt(8, 3.69999 / 4).offer()[0]!.id).toBe("range");
    const second = offerAt(14, 5.00001 / 5.2);
    second.special.acquireWeapon("grenade");
    expect(second.offer()[0]!.category).toBe("special-acquisition");
    const before = offerAt(14, 4.99999 / 5.2);
    before.special.acquireWeapon("grenade");
    expect(before.offer()[0]!.id).toBe("special-grenade");
  });

  it("uses .45 new and .35 owned mod categories, with only one mod and acquisition per offer", () => {
    // Two owned mods do not double the category weight: 3 + .45 + .35 + .25 = 4.05.
    for (const [pick, expected] of [
      [3.01 / 4.05, "new"],
      [3.46 / 4.05, "owned"],
    ] as const) {
      const rolls = [pick, 0, 0];
      const p = new MarineProgression(() => rolls.shift() ?? 0.99999);
      Object.assign(p.ranks, { penetration: 100, burst: 1 });
      p.pendingChoices = 1;
      const card = p.offer()[0]!;
      expect(card.category).toBe("weapon-trait");
      expect(card.id).toBe(expected === "new" ? "ricochet" : "penetration");
    }
    for (const roll of [0, 0.2, 0.5, 0.8, 0.95, 0.99999]) {
      const p = offerAt(14, roll);
      Object.assign(p.ranks, { penetration: 100, burst: 1 });
      expect(
        p.offer().filter((c) => c.category === "weapon-trait").length,
      ).toBeLessThanOrEqual(1);
      expect(
        p.offer().filter((c) => c.category === "special-acquisition").length,
      ).toBeLessThanOrEqual(1);
    }
    expect(
      marineUpgradeWeight(marineUpgrades.penetration, { penetration: 100 }),
    ).toBeCloseTo(marineUpgrades.penetration.weight * 1.4);
    expect(
      marineUpgradeWeight(marineUpgrades["primary-damage"], {
        "primary-damage": 100,
      }),
    ).toBe(1);
    expect(marineUpgradeWeight(marineUpgrades.range, { range: 4 })).toBe(0.25);
  });

  it("blocks new mods at three, reopens a fourth with Core, and leaves range independent", () => {
    const p = offerAt(1, 0.85);
    Object.assign(p.ranks, { penetration: 1, burst: 1, heavy: 1 });
    expect(
      p
        .offer()
        .filter((c) => c.category === "weapon-trait")
        .every((c) => ["penetration", "burst", "heavy"].includes(c.id)),
    ).toBe(true);
    p.applyCore("modification");
    expect(p.offer()[0]!.category).toBe("weapon-trait");
    expect(["penetration", "burst", "heavy"]).not.toContain(p.offer()[0]!.id);
    const range = offerAt(1);
    range.ranks.penetration = range.ranks.burst = range.ranks.heavy = 1;
    expect(range.offer()[0]).toMatchObject({
      id: "range",
      rarity: "LEGENDARY",
    });
    range.choose("range");
    range.ranks.range = 5;
    range.pendingChoices = 1;
    expect(range.offer().some((c) => c.id === "range")).toBe(false);
  });

  it("Core retains one immediate FIFO acquisition and allows filling slot three at Lv14", () => {
    const p = offerAt(14);
    p.applyCore("armament");
    expect(p.special.offer()?.kind).toBe("acquire");
    p.special.choose("grenade");
    expect(p.special.pending).toBe(false);
    p.choose(p.offer()[0]!.id);
    p.pendingChoices = 1;
    expect(p.offer()[0]!.category).toBe("special-acquisition");
    p.choose(p.offer()[0]!.id);
    expect(p.special.weapons).toHaveLength(3);
    p.pendingChoices = 1;
    expect(p.offer().some((c) => c.category === "special-acquisition")).toBe(
      false,
    );
    expect(p.special.acquireWeapon("grenade")).toBe(false);
  });
});
