import { expect, it } from "vitest";
import { MarineProgression } from "../../src/game/progression/marineProgression";
import {
  captureGrowth,
  recordGrowthChanges,
  type GrowthInput,
} from "../../src/game/dev/growthTelemetry";

it("records actual regular choices, offered cards and Great Success levels", () => {
  const progression = new MarineProgression(() => 0);
  progression.gainXp(progression.threshold);
  const offered = progression.offer();
  const before = captureGrowth(progression);
  const selected = offered[0]!;
  expect(progression.choose(selected.id)).toBe(true);
  const events: GrowthInput[] = [];
  recordGrowthChanges(progression, before, (event) => events.push(event), {
    choice: selected.id,
    offered: offered.map((card) => ({
      id: card.id,
      name: card.title,
      rarity: card.rarity ?? null,
    })),
  });
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    kind: "regular-growth",
    previousLevel: 0,
    nextLevel: 2,
    choice: selected.id,
  });
  expect(events[0]!.offered).toHaveLength(3);
});

it("tracks real mod selection through branch remainder and emits completion once", () => {
  let seed = 42;
  let select = false;
  const progression = new MarineProgression(() => {
    if (select) return 0;
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 2 ** 32;
  });
  const events: GrowthInput[] = [];
  const emit = (event: GrowthInput) => events.push(event);
  for (
    let count = 0;
    count < 150 && (progression.ranks.penetration ?? 0) < 12;
    count++
  ) {
    progression.gainXp(progression.threshold);
    const offered = progression.offer();
    const selected =
      offered.find((card) => card.id === "penetration") ??
      offered.find((card) => card.category === "basic") ??
      offered[0]!;
    const before = captureGrowth(progression);
    select = true;
    expect(progression.choose(selected.id)).toBe(true);
    select = false;
    recordGrowthChanges(progression, before, emit);
    if (progression.modBranchPending) {
      const branchBefore = captureGrowth(progression);
      expect(progression.chooseModBranch("a")).toBe(true);
      recordGrowthChanges(progression, branchBefore, emit);
    }
    while (progression.special.pending) {
      const special = progression.special.offer()!;
      progression.special.choose(special.choices[0]!.id);
    }
  }
  const mod = events.filter((event) => event.id === "penetration");
  expect(mod.some((event) => event.kind === "basic-mod-acquisition")).toBe(
    true,
  );
  expect(
    mod.some((event) => event.previousLevel === 4 && event.nextLevel === 5),
  ).toBe(true);
  expect(
    mod.some((event) => event.previousLevel === 5 && event.nextLevel === 6),
  ).toBe(true);
  expect(
    mod.filter((event) => event.kind === "basic-mod-completion"),
  ).toHaveLength(1);
});

it("tracks special acquisition and queued growth across every choice boundary without duplicate completion", () => {
  const progression = new MarineProgression(() => 0);
  const events: GrowthInput[] = [];
  const emit = (event: GrowthInput) => events.push(event);
  let before = captureGrowth(progression);
  expect(progression.special.acquireWeapon("grenade")).toBe(true);
  recordGrowthChanges(progression, before, emit);
  before = captureGrowth(progression);
  progression.special.addLevels("grenade", 21, 1, "RARE");
  recordGrowthChanges(progression, before, emit);
  const boundaries: string[] = [];
  while (progression.special.pending) {
    const offer = progression.special.offer()!;
    boundaries.push(offer.kind);
    before = captureGrowth(progression);
    expect(progression.special.choose(offer.choices[0]!.id)).toBe(true);
    recordGrowthChanges(progression, before, emit);
  }
  expect(boundaries).toEqual(["tree", "branch", "transcendence", "overclock"]);
  expect(events[0]).toMatchObject({
    kind: "special-acquisition",
    previousLevel: 0,
    nextLevel: 1,
  });
  expect(
    events
      .filter((event) => event.kind === "special-growth")
      .map((event) => [event.previousLevel, event.nextLevel]),
  ).toEqual([
    [1, 3],
    [3, 6],
    [6, 15],
    [15, 20],
    [20, 22],
  ]);
  expect(
    events.filter((event) => event.kind === "special-completion"),
  ).toHaveLength(1);
  expect(
    events
      .filter((event) => event.kind === "special-growth")
      .every((event) => event.rarity === "RARE"),
  ).toBe(true);
  before = captureGrowth(progression);
  recordGrowthChanges(progression, before, emit);
  expect(
    events.filter((event) => event.kind === "special-completion"),
  ).toHaveLength(1);
});
