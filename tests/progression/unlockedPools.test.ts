import { expect, it, vi } from "vitest";
import type { UnlockState } from "../../src/game/data/operations";
import { MarineProgression } from "../../src/game/progression/marineProgression";
import { SpecialProgression } from "../../src/game/progression/specialProgression";
import {
  PrototypeCores,
  PrototypeRelics,
} from "../../src/game/progression/highroll";
import { PrototypeSynergies } from "../../src/game/combat/prototypeSynergies";

const fresh = (): UnlockState => ({
  basicMods: ["penetration", "burst"],
  specialWeapons: [],
  specialCapacity: 0,
  relicSystem: false,
  relics: [],
  coreSystem: false,
  synergySystem: false,
  research: [],
  trees: {
    grenade: ["cluster", "high-explosive"],
    missile: ["saturation", "hunter"],
    drone: ["squadron", "gunship"],
  },
  overclocks: {
    grenade: ["nuclear", "barrage"],
    missile: ["hunting", "network"],
    drone: ["army", "cruiser"],
  },
});

it("filters fresh normal pools and direct acquisition without redrawing an open offer", () => {
  const unlocks = fresh();
  for (let seed = 0; seed < 50; seed++) {
    let value = seed + 1;
    const run = new MarineProgression(
      () => (value = (value * 16807) % 2147483647) / 2147483647,
      undefined,
      0,
      unlocks,
    );
    run.level = 14;
    run.pendingChoices = 2;
    const offer = run.offer();
    expect(
      offer.every(
        (card) =>
          card.category !== "special-acquisition" &&
          (card.category !== "weapon-trait" ||
            unlocks.basicMods.includes(card.id as "burst")),
      ),
    ).toBe(true);
    expect(run.special.acquireWeapon("grenade")).toBe(false);
    expect(run.validCoreIds).toEqual([]);
    run.setUnlocks({
      ...unlocks,
      basicMods: [...unlocks.basicMods, "heavy"],
      specialWeapons: ["grenade"],
      specialCapacity: 1,
    });
    expect(run.offer()).toBe(offer);
    expect(run.special.acquireWeapon("missile")).toBe(false);
    expect(run.special.acquireWeapon("grenade")).toBe(true);
  }
});

it("freezes special trees and overclocks, allows all transcendences, and uses new unlocks next time", () => {
  const unlocked = {
    ...fresh(),
    specialWeapons: ["grenade", "missile"] as UnlockState["specialWeapons"],
    specialCapacity: 2,
  };
  const run = new SpecialProgression(unlocked);
  run.acquireWeapon("grenade");
  run.addLevels("grenade", 19, 1);
  const offer = run.offer();
  expect(offer?.choices.map((c) => c.id)).toEqual([
    "cluster",
    "high-explosive",
  ]);
  run.setUnlocks({
    ...unlocked,
    trees: {
      ...unlocked.trees,
      grenade: [...unlocked.trees.grenade, "tactical"],
    },
  });
  expect(run.offer()).toBe(offer);
  expect(run.choose("tactical")).toBe(false);
  run.choose("cluster");
  run.choose("a");
  expect(run.offer()?.choices).toHaveLength(3);
  run.choose(run.offer()!.choices[0]!.id);
  expect(run.offer()?.choices.map((c) => c.id)).toEqual(["nuclear", "barrage"]);
  expect(run.choose("triple")).toBe(false);
  run.choose("nuclear");
  run.acquireWeapon("missile");
  run.setUnlocks({
    ...unlocked,
    trees: {
      ...unlocked.trees,
      missile: [...unlocked.trees.missile, "tracking"],
    },
  });
  run.addLevels("missile", 2, 1);
  expect(run.offer()?.choices).toHaveLength(3);
});

it("offers only an unlocked unowned weapon starting with the next normal offer", () => {
  const run = new MarineProgression(() => 0.999, undefined, 0, fresh());
  run.level = 14;
  run.pendingChoices = 2;
  const before = run.offer();
  run.setUnlocks({
    ...fresh(),
    specialCapacity: 1,
    specialWeapons: ["grenade"],
  });
  expect(run.offer()).toBe(before);
  run.choose(before[0]!.id);
  expect(
    run
      .offer()
      .filter((card) => card.category === "special-acquisition")
      .map((card) => card.id),
  ).toEqual(["acquire-grenade"]);
  run.choose("acquire-grenade");
  run.pendingChoices = 1;
  expect(
    run.offer().some((card) => card.category === "special-acquisition"),
  ).toBe(false);
});

it("adds only one core slot, retains it on account updates, and never queues an empty acquisition", () => {
  const unlocked = {
    ...fresh(),
    specialWeapons: ["grenade"] as UnlockState["specialWeapons"],
    specialCapacity: 1,
  };
  const run = new SpecialProgression(unlocked);
  run.acquireWeapon("grenade");
  expect(run.expandCapacity()).toBe(true);
  expect(run.capacity).toBe(2);
  expect(run.pending).toBe(false);
  run.setUnlocks({ ...unlocked, specialCapacity: 2 });
  expect(run.capacity).toBe(3);
  expect(run.expandCapacity()).toBe(false);
  const another = new SpecialProgression({
    ...unlocked,
    specialWeapons: ["grenade", "missile", "drone"],
  });
  another.acquireWeapon("grenade");
  another.expandCapacity();
  expect(another.offer()?.choices.map((c) => c.id)).toEqual([
    "missile",
    "drone",
  ]);
});

it("rejects locked relic/core events before RNG and freezes unlocked relic offers", () => {
  const random = vi.fn(() => 0);
  const relics = new PrototypeRelics(random, fresh());
  expect(relics.onElite()).toBe(false);
  expect(relics.pending).toBe(false);
  expect(new PrototypeCores().tryDrop(["armament"], random, false)).toBeNull();
  expect(random).not.toHaveBeenCalled();
  const unlocked = {
    ...fresh(),
    relicSystem: true,
    relics: ["loader", "impact", "precision"] as UnlockState["relics"],
  };
  relics.setUnlocks(unlocked);
  expect(relics.onElite()).toBe(true);
  expect(random).not.toHaveBeenCalled();
  expect(relics.offer().map((r) => r.id)).toEqual(unlocked.relics);
  relics.setUnlocks({ ...unlocked, relics: [...unlocked.relics, "capacitor"] });
  expect(relics.choose("capacitor")).toBe(false);
  relics.choose("loader");
  relics.onElite();
  expect(relics.offer().map((r) => r.id)).toContain("capacitor");
});

it("gates synergy activation until unlocked", () => {
  const synergies = new PrototypeSynergies();
  const growth = {
    ranks: { burst: 1, heavy: 1 },
    quality: {},
    legendary: new Set<never>(),
  };
  const weapons = [
    {
      id: "missile" as const,
      tree: "hunter",
      branch: "b" as const,
      level: 10,
      quality: 0,
    },
    {
      id: "drone" as const,
      tree: "squadron",
      branch: "b" as const,
      level: 10,
      quality: 0,
    },
  ];
  expect(synergies.updateBuild(growth, weapons, false)).toEqual([]);
  expect(synergies.active.size).toBe(0);
  expect(synergies.updateBuild(growth, weapons, true)).toEqual(["hunt"]);
});
