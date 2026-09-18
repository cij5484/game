import { expect, it } from "vitest";
import { MarineProgression } from "../../src/game/progression/marineProgression";
import { marineGrowthBalance } from "../../src/game/data/marineGrowth";
import type { SpecialWeaponId } from "../../src/game/data/specialWeapons";

const offer = (
  ids: SpecialWeaponId[],
  categoryRoll: number,
  internalRoll = 0,
) => {
  const rolls = [categoryRoll, internalRoll, 0];
  const p = new MarineProgression(() => rolls.shift() ?? 0);
  p.pendingChoices = 1;
  ids.forEach((id, i) =>
    p.special.weapons.push({ id, level: i === 0 ? 1 : 100, quality: 0 }),
  );
  return p.offer();
};
it("uses one fixed .65 special-growth category irrespective of weapon count or level", () => {
  expect(marineGrowthBalance.specialGrowthWeight).toBe(0.65);
  expect(marineGrowthBalance.ownedModWeight).toBe(0.6);
  expect(marineGrowthBalance.newModWeight).toBe(0.45);
  expect(marineGrowthBalance.maxModInvestment).toBe(1.4);
  expect(marineGrowthBalance.maxSpecialInvestment).toBe(1.5);
  for (const weapons of [
    ["grenade"],
    ["grenade", "missile"],
    ["grenade", "missile", "drone"],
  ] as SpecialWeaponId[][]) {
    expect(offer(weapons, 3.69999 / 4.35)[0]!.id).toBe("range");
    const cards = offer(weapons, 3.70001 / 4.35);
    expect(cards[0]!.category).toBe("special-growth");
    expect(
      cards.filter((card) => card.category === "special-growth"),
    ).toHaveLength(1);
  }
});
it("caps each owned weapon internal investment at1.5 and offers only owned weapons", () => {
  const weapons: SpecialWeaponId[] = ["grenade", "missile", "drone"];
  expect(offer(weapons, 0.9999, 0.24999)[0]!.id).toBe("special-grenade");
  expect(offer(weapons, 0.9999, 0.25001)[0]!.id).toBe("special-missile");
  expect(offer(["grenade"], 0.9999, 0.9999)[0]!.id).toBe("special-grenade");
});
