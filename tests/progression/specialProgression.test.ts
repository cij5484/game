import { describe, expect, it } from "vitest";
import { MarineProgression } from "../../src/game/progression/marineProgression";
import { SpecialProgression } from "../../src/game/progression/specialProgression";
import {
  getSpecialCompletion,
  specialWeaponDefinitions,
} from "../../src/game/data/specialWeapons";

describe("M5 special progression", () => {
  it("queues two distinct acquisitions at character 5/10 without consuming normal choices", () => {
    const p = new MarineProgression(() => 0.5);
    while (p.level < 10) p.gainXp(p.threshold);
    expect(p.pendingChoices).toBe(9);
    expect(p.special.offer()?.choices).toHaveLength(3);
    expect(p.special.choose("grenade")).toBe(true);
    expect(p.special.offer()?.choices.map((c) => c.id)).toEqual([
      "missile",
      "drone",
    ]);
    expect(p.special.choose("grenade")).toBe(false);
    expect(p.special.choose("drone")).toBe(true);
    p.special.acquireAtCharacterLevel(30);
    expect(p.special.pending).toBe(false);
    expect(p.special.weapons.map((w) => [w.id, w.level, w.quality])).toEqual([
      ["grenade", 1, 0],
      ["drone", 1, 0],
    ]);
    expect(p.pendingChoices).toBe(9);
  });

  it("stops leftover levels at each choice and automatically completes the selected path at ten", () => {
    const p = new SpecialProgression();
    p.acquireAtCharacterLevel(5);
    p.choose("grenade");
    const weapon = p.weapons[0]!;
    p.addLevels("grenade", 3, 1.6);
    expect(weapon.level).toBe(3);
    expect(weapon.quality).toBeCloseTo(3.2);
    expect(p.offer()?.kind).toBe("tree");
    expect(p.choose("tactical")).toBe(true);
    expect(weapon.level).toBe(4);
    p.addLevels("grenade", 2, 1);
    expect(p.offer()?.choices.map((c) => c.id)).toEqual(["a", "b"]);
    expect(p.choose("cluster")).toBe(false);
    expect(p.choose("b")).toBe(true);
    expect(p.choose("a")).toBe(false);
    p.addLevels("grenade", 4, 1);
    expect(getSpecialCompletion(weapon)).toBe("중력 붕괴");
    expect(p.pending).toBe(false);
    p.addLevels("grenade", 4, 1);
    p.addLevels("grenade", 2, 2.4);
    expect(weapon.level).toBe(15);
    expect(p.offer()?.kind).toBe("transcendence");
    expect(p.choose("aftershock")).toBe(true);
    expect(weapon.level).toBe(16);
    p.addLevels("grenade", 3, 1);
    p.addLevels("grenade", 2, 3.2);
    expect(weapon.level).toBe(20);
    expect(p.offer()?.kind).toBe("overclock");
    expect(p.choose("triple")).toBe(true);
    expect(weapon.level).toBe(21);
    expect(weapon.quality).toBeCloseTo(29);
    expect(p.pending).toBe(false);
  });

  it("serializes acquisition and two weapon milestones while rejecting invalid growth", () => {
    const p = new SpecialProgression();
    p.acquireAtCharacterLevel(4);
    expect(p.offer()).toBeNull();
    p.acquireAtCharacterLevel(5);
    p.choose("grenade");
    p.acquireAtCharacterLevel(10);
    p.addLevels("grenade", 2, 1);
    expect(p.offer()?.kind).toBe("acquire");
    expect(p.weapons[0]!.level).toBe(1);
    p.choose("missile");
    p.addLevels("missile", 2, 1.6);
    expect(p.offer()?.weaponId).toBe("grenade");
    p.choose("cluster");
    expect(p.offer()?.weaponId).toBe("missile");
    p.choose("tracking");
    for (const levels of [0, -1, 1.5, Infinity, NaN])
      p.addLevels("missile", levels, 1);
    p.addLevels("drone", 2, 1);
    p.addLevels("missile", 1, NaN);
    expect(p.weapons.map((w) => w.level)).toEqual([3, 3]);
    expect(p.pending).toBe(false);
  });

  it("keeps every path available with three rarity-free transcendences and overclocks", () => {
    for (const definition of Object.values(specialWeaponDefinitions)) {
      expect(definition.trees).toHaveLength(3);
      expect(definition.transcendences).toHaveLength(3);
      expect(definition.overclocks).toHaveLength(3);
      for (const tree of definition.trees) {
        const p = new SpecialProgression();
        p.acquireAtCharacterLevel(5);
        p.choose(definition.id);
        p.addLevels(definition.id, 20, 1);
        expect(p.choose(tree.id)).toBe(true);
        expect(p.offer()?.choices).toHaveLength(2);
        p.choose("a");
        expect(getSpecialCompletion(p.weapons[0]!)).toBe(
          tree.branches.a.completion,
        );
        expect(p.offer()?.choices.every((c) => !("rarity" in c))).toBe(true);
        p.choose(definition.transcendences[0]!.id);
        p.choose(definition.overclocks[0]!.id);
        expect(p.weapons[0]!.level).toBe(21);
      }
    }
  });

  it("mixes only owned weapons into normal weighted offers and applies exact six percent great success", () => {
    let roll = 0;
    const p = new MarineProgression(() => roll);
    p.pendingChoices = 1;
    expect(p.offer().some((c) => c.category === "special-growth")).toBe(false);
    p.choose(p.offer()[0]!.id);
    p.special.acquireAtCharacterLevel(5);
    p.special.choose("missile");
    p.pendingChoices = 1;
    roll = 0.9999;
    const cards = p.offer();
    expect(new Set(cards.map((c) => c.id)).size).toBe(3);
    expect(cards[0]!.id).toBe("special-missile");
    expect(cards[0]!.rarity).toBe("LEGENDARY");
    roll = 0.05999;
    expect(p.choose("special-missile")).toBe(true);
    expect(p.special.weapons[0]).toMatchObject({ level: 3, quality: 6.4 });
    expect(p.special.offer()?.kind).toBe("tree");
    p.special.choose("hunter");
    p.pendingChoices = 1;
    roll = 0.9999;
    p.offer();
    roll = 0.06;
    p.choose("special-missile");
    expect(p.special.weapons[0]!.level).toBe(4);
    expect(p.lastSelection?.greatSuccess).toBe(false);
    p.pendingChoices = 1;
    roll = 0;
    expect(p.offer().every((c) => c.category !== "special-growth")).toBe(true);
  });
});
