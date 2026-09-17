import { describe, expect, it } from "vitest";
import { Progression } from "../../src/game/progression/progression";
import { upgrades } from "../../src/game/data/upgrades";

describe("run progression", () => {
  it("preserves overflow and resolves multiple earned choices one at a time", () => {
    const progression = new Progression(() => 0);
    progression.gainXp(16);
    expect([
      progression.level,
      progression.xp,
      progression.threshold,
      progression.pendingChoices,
    ]).toEqual([3, 3, 11, 2]);
    const choices = progression.offer();
    expect(choices).toHaveLength(3);
    expect(progression.choose("chain-damage")).toBe(false);
    expect(progression.choose(choices[0]!.id)).toBe(true);
    expect(progression.pendingChoices).toBe(1);
    expect(progression.ranks[choices[0]!.id]).toBe(1);
    expect(progression.choose(progression.offer()[0]!.id)).toBe(true);
    expect(progression.pendingChoices).toBe(0);
    expect(progression.offer()).toEqual([]);
  });

  it("draws weighted unique usable non-max cards once per choice", () => {
    const progression = new Progression(() => 0.99, ["gauss-rifle"]);
    progression.ranks.ricochet = upgrades.ricochet.maxRank;
    progression.gainXp(5);
    const choices = progression.offer();
    expect(choices.map((choice) => choice.id)).toEqual([
      "penetration",
      "faster-cycle",
      "extended-burst",
    ]);
    expect(new Set(choices.map((choice) => choice.id)).size).toBe(3);
    expect(progression.offer()).toBe(choices);
  });

  it("offers remaining cards without duplicates and never pauses on an exhausted pool", () => {
    const progression = new Progression(() => 0, ["gauss-rifle"]);
    progression.ranks["extended-burst"] = 3;
    progression.ranks["faster-cycle"] = 3;
    progression.ranks.penetration = 3;
    progression.gainXp(16);
    expect(progression.offer().map((choice) => choice.id)).toEqual([
      "ricochet",
    ]);
    progression.choose("ricochet");
    expect(progression.offer()).toEqual([]);
    expect(progression.pendingChoices).toBe(0);
    progression.gainXp(100);
    expect(progression.pendingChoices).toBe(0);
  });
});
