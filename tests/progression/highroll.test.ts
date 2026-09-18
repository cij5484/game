import { describe, expect, it, vi } from "vitest";
import {
  PrototypeCores,
  PrototypeRelics,
} from "../../src/game/progression/highroll";
import { MarineProgression } from "../../src/game/progression/marineProgression";

describe("M6 high-roll rewards", () => {
  it("guarantees the first relic, rolls later elites, and replaces or skips at capacity", () => {
    let roll = 0.99;
    const relics = new PrototypeRelics(() => roll);
    expect(relics.onElite()).toBe(true);
    expect(relics.offer()).toHaveLength(3);
    expect(relics.choose(relics.offer()[0]!.id)).toBe(true);
    expect(relics.onElite()).toBe(false);
    roll = 0;
    relics.onElite();
    relics.choose(relics.offer()[0]!.id);
    const before = [...relics.owned];
    relics.onElite();
    expect(relics.offer().every((r) => !relics.owned.has(r.id))).toBe(true);
    const next = relics.offer()[0]!.id;
    relics.choose(next);
    expect(relics.pendingReplacement).toBe(next);
    expect([...relics.owned]).toEqual(before);
    expect(relics.replace(before[0]!)).toBe(true);
    expect(relics.owned.size).toBe(2);
    expect(relics.owned.has(next)).toBe(true);
    relics.onElite();
    relics.choose(relics.offer()[0]!.id);
    expect(relics.skip()).toBe(true);
    expect(relics.pending).toBe(false);
    expect(relics.owned.size).toBe(2);
  });

  it("grants one valid core and never rolls again", () => {
    const cores = new PrototypeCores();
    const random = vi.fn(() => 0);
    expect(cores.tryDrop([], random)).toBeNull();
    expect(random).not.toHaveBeenCalled();
    expect(cores.tryDrop(["quality"], random)?.id).toBe("quality");
    random.mockClear();
    expect(cores.tryDrop(["armament"], random)).toBeNull();
    expect(random).not.toHaveBeenCalled();
    expect(cores.owned.size).toBe(1);
  });

  it.each([1, 5, 10])(
    "adds exactly one acquisition around queued Lv5/10 events (level %s)",
    (level) => {
      const p = new MarineProgression();
      p.special.acquireAtCharacterLevel(level);
      expect(p.applyCore("armament")).toBe(true);
      expect(p.special.capacity).toBe(3);
      while (p.special.pending)
        p.special.choose(p.special.offer()!.choices[0]!.id);
      p.special.acquireAtCharacterLevel(10);
      while (p.special.pending)
        p.special.choose(p.special.offer()!.choices[0]!.id);
      expect(p.special.weapons.map((w) => w.id).sort()).toEqual([
        "drone",
        "grenade",
        "missile",
      ]);
      expect(
        p.special.weapons.every((w) => w.level === 1 && w.quality === 0),
      ).toBe(true);
      expect(p.applyCore("armament")).toBe(false);
      expect(p.applyCore("quality")).toBe(false);
    },
  );

  it("opens the fourth mod and uses the slower XP formula", () => {
    const p = new MarineProgression();
    Object.assign(p.ranks, { burst: 1, heavy: 1, penetration: 1 });
    expect(p.applyCore("modification")).toBe(true);
    expect(p.traitLimit).toBe(4);
    for (const level of [1, 5, 10, 20]) {
      p.level = level;
      expect(p.threshold).toBe(
        Math.ceil(8 + 5 * (level - 1) + 0.5 * (level - 1) ** 2),
      );
    }
  });

  it("upgrades actual past and future quality once without replaying great success", () => {
    let roll = 0;
    const p = new MarineProgression(() => roll);
    p.pendingChoices = 1;
    p.choose("primary-damage");
    expect(p.ranks["primary-damage"]).toBe(2);
    expect(p.quality["primary-damage"]).toBeCloseTo(0.36);
    p.pendingChoices = 1;
    const cached = p.offer().map((c) => c.id);
    expect(p.applyCore("quality")).toBe(true);
    expect(p.quality["primary-damage"]).toBeCloseTo(0.6);
    expect(p.ranks["primary-damage"]).toBe(2);
    expect(p.history[0]).toMatchObject({
      originalRarity: "COMMON",
      rarity: "RARE",
      levels: 2,
      amount: 0.3,
    });
    expect(p.offer().map((c) => c.id)).toEqual(cached);
    expect(p.offer()[0]!.rarity).toBe("RARE");
    roll = 0.5;
    p.choose("primary-damage");
    expect(p.quality["primary-damage"]).toBeCloseTo(0.9);
    expect(p.ranks["primary-damage"]).toBe(3);
    expect(p.applyCore("quality")).toBe(false);
    expect(p.quality["primary-damage"]).toBeCloseTo(0.9);
  });

  it("upgrades special quality already applied and still queued at a branch boundary", () => {
    const p = new MarineProgression();
    p.special.acquireAtCharacterLevel(5);
    p.special.choose("grenade");
    p.special.addLevels("grenade", 3, 1);
    expect(p.special.weapons[0]).toMatchObject({ level: 3, quality: 2 });
    p.applyCore("quality");
    expect(p.special.weapons[0]).toMatchObject({ level: 3, quality: 3.2 });
    expect(p.special.offer()?.kind).toBe("tree");
    p.special.choose("cluster");
    expect(p.special.weapons[0]).toMatchObject({ level: 4, tree: "cluster" });
    expect(p.special.weapons[0]!.quality).toBeCloseTo(4.8);
    expect(p.special.pending).toBe(false);
  });

  it.each([
    ["penetration", 0.3, 0.99, 2.4, 3.2, "LEGENDARY"],
    ["penetration", 0.3, 0.9999, 3.2, 3.2, "LEGENDARY"],
    ["range", 0.9999, 0, 0.03, 0.045, "EPIC"],
    ["attack-speed", 0, 0, 0.08, 0.125, "RARE"],
    ["crit-chance", 0, 0, 0.055, 0.09, "RARE"],
  ] as const)(
    "promotes %s actual quality and preserves its rank",
    (id, pickRoll, rarityRoll, before, after, rarity) => {
      const rolls = [pickRoll, rarityRoll, 0, 0, 0, 0, 0.5];
      const p = new MarineProgression(() => rolls.shift() ?? 0.5);
      p.pendingChoices = 1;
      expect(p.choose(id)).toBe(true);
      expect(p.quality[id]).toBeCloseTo(before);
      p.applyCore("quality");
      expect(p.quality[id]).toBeCloseTo(after);
      expect(p.ranks[id]).toBe(1);
      expect(p.history[0]!.rarity).toBe(rarity);
      expect(p.legendary.has("penetration")).toBe(id === "penetration");
    },
  );

  it("promotes future special cards once and never changes special choices", () => {
    const rolls = [0.9999, 0, 0, 0, 0, 0, 0.5];
    const p = new MarineProgression(() => rolls.shift() ?? 0.5);
    p.special.acquireAtCharacterLevel(5);
    p.special.choose("grenade");
    p.applyCore("quality");
    p.pendingChoices = 1;
    expect(p.offer()[0]).toMatchObject({
      id: "special-grenade",
      originalRarity: "COMMON",
      rarity: "RARE",
      amount: 1.6,
    });
    p.choose("special-grenade");
    expect(p.special.weapons[0]).toMatchObject({ level: 2, quality: 1.6 });
    p.special.addLevels("grenade", 1, 1);
    expect(p.special.offer()?.kind).toBe("tree");
    expect(p.special.offer()?.choices).toHaveLength(3);
    expect(p.special.offer()?.choices.every((c) => !("rarity" in c))).toBe(
      true,
    );
  });
});
