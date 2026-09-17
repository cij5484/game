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
