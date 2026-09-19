import { expect, it } from "vitest";
import { balanceFields } from "../../src/game/dev/balanceFields";
import {
  detailCategories,
  detailCategory,
  quickSections,
} from "../../src/game/dev/panelLayout";

it("keeps Quick controls registered once per section and all fields reachable in Detail", () => {
  const registered = new Set(balanceFields.map((field) => field.id));
  for (const section of quickSections) {
    const fields = section.cards.flatMap((card) => [...card.fields]);
    expect(
      fields.filter((id) => !registered.has(id)),
      section.id,
    ).toEqual([]);
    expect(new Set(fields).size, section.id).toBe(fields.length);
  }
  expect(
    quickSections[0]!.cards.flatMap((card) => [...card.fields]),
  ).toHaveLength(23);
  expect(
    quickSections.find((section) => section.id === "weights")!.cards[0]!.fields,
  ).toHaveLength(12);
  expect(
    quickSections
      .find((section) => section.id === "mods")!
      .cards.map((card) => card.fields.length),
  ).toEqual([4, 4, 4, 4, 4, 5]);
  expect(
    quickSections
      .find((section) => section.id === "special")!
      .cards.map((card) => card.fields.length),
  ).toEqual([3, 3, 3]);
  expect(
    balanceFields.filter(
      (field) => !detailCategories.includes(detailCategory(field)),
    ),
  ).toEqual([]);
  const missilePriority = balanceFields.filter((field) =>
    field.id.startsWith("special.targeting."),
  );
  expect(missilePriority.length).toBeGreaterThan(0);
  expect(
    missilePriority.every((field) => detailCategory(field) === "미사일"),
  ).toBe(true);
});

it("exposes incendiary in Quick and every burn key in its Detail category", () => {
  const cards = quickSections.find((section) => section.id === "mods")!.cards;
  expect(cards.some((card) => card.id === "heavy")).toBe(false);
  expect(cards.find((card) => card.id === "incendiary")!.fields).toEqual([
    "marineModWeights.incendiary.acquisitionWeight",
    "marineModWeights.incendiary.growthWeight",
    "incendiary.baseTickFactor",
    "incendiary.durationMs",
    "incendiary.baseMaxStacks",
  ]);
  const burn = balanceFields.filter((field) =>
    field.id.startsWith("incendiary."),
  );
  expect(burn).toHaveLength(17);
  expect(
    burn.every((field) => detailCategory(field) === "기본무기 개조 · 소이탄"),
  ).toBe(true);
});
