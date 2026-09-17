import { expect, it } from "vitest";
import { buildSummary } from "../../src/game/ui/buildSummary";

it("aggregates ordinary ranks and distinguishes trait levels, relics and unlevelled cores", () => {
  const items = buildSummary(
    { "primary-damage": 3, "crit-chance": 2, penetration: 2 },
    { "tesla-coil": 4 },
    new Set(["luck"]),
  );
  expect(items.filter((e) => e.group === "upgrade")).toHaveLength(2);
  expect(items.find((e) => e.id === "critical")?.level).toBe(2);
  expect(items.find((e) => e.id === "penetration")?.level).toBe(2);
  expect(items.find((e) => e.id === "tesla-coil")?.level).toBe(4);
  expect(items.find((e) => e.id === "luck")?.level).toBeUndefined();
  expect(items.every((e) => e.symbol && e.title && e.detail)).toBe(true);
  expect(buildSummary({}, {}, new Set())).toEqual([]);
});
