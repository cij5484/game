import { afterEach, expect, it } from "vitest";
import {
  marineGrowthBalance,
  marineQualityIncrements,
  marineRarityBalance,
  rollMarineRarity,
} from "../../src/game/data/marineGrowth";
import { MarineProgression } from "../../src/game/progression/marineProgression";

const defaults = structuredClone(marineRarityBalance.bands);
const growthDefaults = { ...marineGrowthBalance };
const speedIncrement = marineQualityIncrements["attack-speed"].COMMON;
afterEach(() => {
  marineRarityBalance.bands.forEach((band, index) => {
    band.weights = [...defaults[index]!.weights];
  });
  Object.assign(marineGrowthBalance, growthDefaults);
  marineQualityIncrements["attack-speed"].COMMON = speedIncrement;
});

it("keeps an open speed card selectable with its old amount after the live increase becomes zero", () => {
  const p = new MarineProgression(() => 0.5);
  p.pendingChoices = 1;
  const cards = p.offer();
  expect(cards.find((card) => card.id === "attack-speed")).toMatchObject({
    rarity: "COMMON",
    amount: speedIncrement,
  });
  marineQualityIncrements["attack-speed"].COMMON = 0;
  expect(p.offer()).toBe(cards);
  expect(p.choose("attack-speed")).toBe(true);
  expect(p.ranks["attack-speed"]).toBe(1);
  expect(p.quality["attack-speed"]).toBe(speedIncrement);
});
const allRarity = (index: number) => {
  marineRarityBalance.bands.forEach((band) => {
    band.weights.forEach((_, i) => {
      band.weights[i] = i === index ? 1000 : 0;
    });
  });
};

it("excludes range and returns no rarity when an all-Common band has no Rare+ weight", () => {
  allRarity(0);
  const p = new MarineProgression(() => 0.99999);
  p.pendingChoices = 1;
  expect(p.offer().some((card) => card.id === "range")).toBe(false);
  expect(p.offer().every((card) => card.rarity === "COMMON")).toBe(true);
  expect(rollMarineRarity(1, () => 0.5, true)).toBeNull();
});

it("excludes owned legendary mods from an all-Legendary band without removing unowned mods", () => {
  allRarity(3);
  marineGrowthBalance.choiceCount = 4;
  marineGrowthBalance.newModWeight = 0;
  const p = new MarineProgression(() => 0.85);
  p.ranks.penetration = 1;
  p.legendary.add("penetration");
  p.pendingChoices = 1;
  expect(p.offer().some((card) => card.id === "penetration")).toBe(false);
  expect(p.offer().every((card) => card.rarity === "LEGENDARY")).toBe(true);
  expect(rollMarineRarity(1, () => 1, false, true)).toBeNull();
  marineGrowthBalance.newModWeight = 0.45;
  const next = new MarineProgression(() => 0.84);
  next.pendingChoices = 1;
  expect(next.offer().some((card) => card.category === "weapon-trait")).toBe(
    true,
  );
});

it("never falls back to a zero-weight category after the positive pool is exhausted", () => {
  marineGrowthBalance.choiceCount = 4;
  marineGrowthBalance.newModWeight = 0;
  marineGrowthBalance.ownedModWeight = 0;
  marineGrowthBalance.firstAcquisitionWeight = 0;
  const p = new MarineProgression(() => 1);
  p.level = 8;
  p.ranks.range = 5;
  p.pendingChoices = 1;
  expect(p.offer()).toHaveLength(3);
  expect(p.offer().every((card) => card.category === "basic")).toBe(true);
});

it("retains cached range and mod offers after rarity edits until their selection completes", () => {
  const range = new MarineProgression(() => 0.99999);
  range.pendingChoices = 1;
  const cards = range.offer();
  expect(cards[0]!.id).toBe("range");
  allRarity(0);
  expect(range.offer()).toBe(cards);
  expect(range.choose("range")).toBe(true);
  expect(range.ranks.range).toBe(1);

  marineRarityBalance.bands.forEach((band, index) => {
    band.weights = [...defaults[index]!.weights];
  });
  const rolls = [3.5 / 4.05, 0, 0, 0, 0, 0, 0, 0.5];
  const mod = new MarineProgression(() => rolls.shift() ?? 0.5);
  mod.ranks.penetration = 1;
  mod.legendary.add("penetration");
  mod.pendingChoices = 1;
  expect(mod.offer()[0]!.id).toBe("penetration");
  allRarity(3);
  expect(mod.choose("penetration")).toBe(true);
});
