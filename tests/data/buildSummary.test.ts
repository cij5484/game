import { expect, it } from "vitest";
import { buildSummary } from "../../src/game/ui/buildSummary";
it("aggregates basic ranks and distinguishes chosen traits, relics and unlevelled cores", () => {
  const items = buildSummary(
    { "primary-damage": 3, "crit-chance": 2, penetration: 2 },
    { "tesla-coil": 4 },
    new Set(["choice-expansion"]),
  );
  expect(items.filter((e) => e.group === "upgrade")).toHaveLength(2);
  expect(items.find((e) => e.id === "crit-chance")?.level).toBe(2);
  expect(items.find((e) => e.id === "penetration")?.level).toBe(2);
  expect(items.find((e) => e.id === "tesla-coil")?.level).toBe(4);
  expect(items.find((e) => e.id === "choice-expansion")?.level).toBeUndefined();
  expect(items.every((e) => e.symbol && e.title && e.detail)).toBe(true);
  expect(buildSummary({}, {}, new Set())).toEqual([]);
});
it("shows only selected synergies with conditions and keeps evolution distinct", () => {
  const ranks = { penetration: 4, explosive: 1 };
  expect(
    buildSummary(ranks, {}, new Set()).some((e) => e.group === "synergy"),
  ).toBe(false);
  const items = buildSummary(
    ranks,
    { "tesla-coil": 3 },
    new Set(),
    new Set(["hyper-gauss"]),
    { penetration: "b" },
    new Set(["deep-blast"]),
  );
  const synergy = items.find((e) => e.id === "deep-blast")!;
  expect(synergy.group).toBe("synergy");
  expect(synergy.detail).toContain("관통 Lv.1");
  expect(synergy.detail).toContain("폭발탄 Lv.1");
  expect(items.find((e) => e.id === "hyper-gauss")?.group).toBe("evolution");
  expect(items.find((e) => e.id === "penetration")?.title).toContain(
    "파쇄 관통",
  );
});

it("groups global bonuses separately from weapon and Stim growth", () => {
  const items = buildSummary(
    { "primary-damage": 1, penetration: 2, "stim-growth": 1 },
    { "tesla-coil": 1 },
    new Set(["choice-expansion"]),
    new Set(["hyper-gauss"]),
  );
  expect(items.find((i) => i.id === "primary-damage")?.owner).toBe("global");
  expect(items.find((i) => i.id === "penetration")?.owner).toBe("basicWeapon");
  expect(items.find((i) => i.id === "hyper-gauss")?.owner).toBe("basicWeapon");
  expect(items.find((i) => i.id === "stim-growth")?.owner).toBe("stimpack");
  expect(items.find((i) => i.id === "tesla-coil")?.owner).toBe("global");
  expect(items.find((i) => i.id === "choice-expansion")?.owner).toBe("global");
});

it("M4 keeps common stats in Header and all six traits plus range on Gauss", async () => {
  const { marineBuildSummary } = await import("../../src/game/ui/buildSummary");
  const { marineTraitIds } = await import("../../src/game/data/marineGrowth");
  const ranks = Object.fromEntries(
    [
      ...marineTraitIds,
      "range",
      "primary-damage",
      "attack-speed",
      "crit-chance",
    ].map((id) => [id, 2]),
  );
  const items = marineBuildSummary(
    { ranks, quality: {}, legendary: new Set(["burst"]) },
    {},
    new Set(),
  );
  expect(
    items.filter((i) => i.owner === "basicWeapon").map((i) => i.id),
  ).toEqual([...marineTraitIds, "range"]);
  expect(items.filter((i) => i.owner === "global").map((i) => i.id)).toEqual([
    "primary-damage",
    "attack-speed",
    "crit-chance",
  ]);
  expect(items.find((i) => i.id === "burst")!.title).toContain("전설");
});

it("special weapon milestones belong only to their own slot", async () => {
  const { marineBuildSummary } = await import("../../src/game/ui/buildSummary");
  const items = marineBuildSummary(
    { ranks: { "primary-damage": 1 }, quality: {}, legendary: new Set() },
    {},
    new Set(),
    [
      {
        id: "grenade",
        level: 20,
        quality: 20,
        tree: "cluster",
        branch: "a",
        transcendence: "aftershock",
        overclock: "triple",
      },
      { id: "drone", level: 1, quality: 0 },
    ],
  );
  expect(items.filter((e) => e.owner === "global").map((e) => e.id)).toEqual([
    "primary-damage",
  ]);
  expect(items.filter((e) => e.owner === "grenade")).toHaveLength(6);
  expect(items.find((e) => e.id === "grenade")?.level).toBe(20);
  expect(items.filter((e) => e.owner === "drone")).toHaveLength(1);
});
