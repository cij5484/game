import { describe, expect, it } from "vitest";
import { MarineProgression } from "../../src/game/progression/marineProgression";
import {
  deriveMarineWeaponConfig,
  getMarineStats,
  getMarineTraitEffects,
  marineTraitIds,
  marineUpgrades,
  marineUpgradeWeight,
  marineQualityIncrements,
  rollMarineRarity,
  type MarineGrowthState,
  type MarineRanks,
} from "../../src/game/data/marineGrowth";

const state = (ranks: MarineRanks = {}): MarineGrowthState => ({
  ranks,
  quality: {},
  legendary: new Set(),
});

describe("Marine M4 growth", () => {
  it("rolls independent rarity at exact level-band boundaries", () => {
    for (const [level, common, rare, epic] of [
      [1, 0.78, 0.98, 0.999],
      [10, 0.68, 0.95, 0.997],
      [20, 0.58, 0.91, 0.994],
      [30, 0.5, 0.86, 0.99],
    ]) {
      expect(rollMarineRarity(level!, () => common! - 1e-8)).toBe("COMMON");
      expect(rollMarineRarity(level!, () => common!)).toBe("RARE");
      expect(rollMarineRarity(level!, () => rare! + 1e-8)).toBe("EPIC");
      expect(rollMarineRarity(level!, () => epic! + 1e-8)).toBe("LEGENDARY");
      expect(rollMarineRarity(level!, () => 0, true)).toBe("RARE");
    }
    expect(rollMarineRarity(1, () => 0.9999)).toBe("LEGENDARY");
  });
  it("offers cached unique cards, keeps three trait slots and excludes legacy growth", () => {
    const p = new MarineProgression(() => 0.5);
    Object.assign(p.ranks, { penetration: 11, burst: 12, heavy: 13, range: 5 });
    p.gainXp(8);
    const cards = p.offer();
    expect(cards).toHaveLength(3);
    expect(p.offer()).toBe(cards);
    expect(new Set(cards.map((c) => c.id)).size).toBe(3);
    expect(
      cards.every((c) =>
        [
          "primary-damage",
          "attack-speed",
          "crit-chance",
          "penetration",
          "burst",
          "heavy",
        ].includes(c.id),
      ),
    ).toBe(true);
    expect(Object.keys(p.traitLevels)).toHaveLength(3);
    expect(p.traitLimit).toBe(3);
    expect(p.choose("frost-growth")).toBe(false);
    expect(p.choose("ricochet")).toBe(false);
    expect(p.choose(cards[0]!.id)).toBe(true);
    expect(p.pendingChoices).toBe(0);
    expect(p.offer()).toEqual([]);
  });
  it("keeps mod investment bounded at 1.4 base and separate from rarity", () => {
    expect(marineUpgradeWeight(marineUpgrades.penetration, {})).toBe(
      marineUpgrades.penetration.weight,
    );
    expect(
      marineUpgradeWeight(marineUpgrades.penetration, { penetration: 100 }),
    ).toBe(marineUpgrades.penetration.weight * 1.4);
    expect(
      marineUpgradeWeight(marineUpgrades.penetration, { heavy: 100 }),
    ).toBe(marineUpgrades.penetration.weight);
    const p = new MarineProgression(() => 0.1);
    p.ranks.penetration = 100;
    p.gainXp(8);
    expect(p.offer()[0]!.id).not.toBe("penetration");
    expect(p.offer().every((c) => c.rarity === "COMMON")).toBe(true);
  });
  it("great success is an independent six percent roll and range caps actual quality gain", () => {
    let roll = 0;
    const p = new MarineProgression(() => roll);
    p.gainXp(8);
    const basic = p.offer()[0]!;
    if (
      basic.category === "special-growth" ||
      basic.category === "special-acquisition"
    )
      throw new Error("No special weapon is owned");
    roll = 0.05999;
    expect(p.choose(basic.id)).toBe(true);
    expect(p.lastSelection).toMatchObject({
      levels: 2,
      greatSuccess: true,
      rarity: "COMMON",
    });
    expect(p.ranks[basic.id]).toBe(2);
    const q = p.quality[basic.id]!;
    roll = 0.99999;
    p.ranks.range = 4;
    p.quality.range = 0.12;
    p.pendingChoices = 1;
    expect(p.offer()[0]!.id).toBe("range");
    expect(p.offer()[0]!.rarity).toBe("LEGENDARY");
    roll = 0;
    p.choose("range");
    expect(p.ranks.range).toBe(5);
    expect(p.quality.range).toBeCloseTo(0.18);
    expect(p.lastSelection!.levels).toBe(1);
    expect(p.quality[basic.id]).toBe(q);
  });
  it("normal rolls add one rank and rarity changes strength without faking levels", () => {
    let roll = 0;
    const p = new MarineProgression(() => roll);
    p.gainXp(8);
    p.offer();
    roll = 0.06;
    p.choose("primary-damage");
    expect(p.ranks["primary-damage"]).toBe(1);
    expect(p.lastSelection!.greatSuccess).toBe(false);
    expect(getMarineStats(p.growth).primaryDamageMultiplier).toBeCloseTo(1.18);
  });
  it("gives each numeric growth distinct rarity strength at the same rank", () => {
    for (const id of [
      "primary-damage",
      "attack-speed",
      "crit-chance",
      "range",
    ] as const) {
      const variants = (["COMMON", "RARE", "EPIC", "LEGENDARY"] as const)
        .filter((rarity) => id !== "range" || rarity !== "COMMON")
        .map((rarity) =>
          getMarineStats({
            ...state({ [id]: 1 }),
            quality: { [id]: marineQualityIncrements[id][rarity] },
          }),
        );
      const values = variants.map((stats) =>
        id === "primary-damage"
          ? stats.primaryDamageMultiplier
          : id === "attack-speed"
            ? stats.attackSpeedMultiplier
            : id === "crit-chance"
              ? stats.criticalChance
              : -stats.minTargetProgress01,
      );
      expect(
        values.every(
          (value, index) => index === 0 || value > values[index - 1]!,
        ),
      ).toBe(true);
    }
  });
  it("keeps rarity independent of rank and records a selected legendary trait", () => {
    const rolls = [3.1 / 3.7, 0, 0.9999, 0, 0, 0, 0, 0.5];
    const p = new MarineProgression(() => rolls.shift() ?? 0.5);
    p.gainXp(8);
    const card = p.offer()[0]!;
    expect(card.id).toBe("penetration");
    expect(card.rarity).toBe("LEGENDARY");
    expect(p.choose(card.id)).toBe(true);
    expect(p.ranks.penetration).toBe(1);
    expect(p.quality.penetration).toBe(3.2);
    expect(p.legendary.has("penetration")).toBe(true);
    expect(
      getMarineTraitEffects(p.growth).pierceShockwaveRadius,
    ).toBeGreaterThan(0);
    expect(p.branches).toEqual({});
    expect(p.activeSynergyIds.size).toBe(0);
  });
  it("does not offer speed at the cycle floor or critical chance at numeric saturation", () => {
    const p = new MarineProgression(() => 0);
    p.ranks["attack-speed"] = 10000;
    p.ranks["crit-chance"] = 1e20;
    p.pendingChoices = 1;
    expect(p.offer().map((c) => c.id)).not.toContain("attack-speed");
    expect(p.offer().map((c) => c.id)).not.toContain("crit-chance");
    expect(p.offer()).toHaveLength(3);
  });
  it.each([
    [7, true],
    [100, false],
  ] as const)(
    "offers speed at the Gauss floor only while an owned special still benefits (quality %s)",
    (quality, eligible) => {
      const p = new MarineProgression(() => 0);
      p.ranks["attack-speed"] = 90;
      p.quality["attack-speed"] = quality;
      p.special.acquireWeapon("grenade");
      p.pendingChoices = 1;
      expect(deriveMarineWeaponConfig(p.growth).shotIntervalMs).toBe(100);
      expect(p.offer().some((card) => card.id === "attack-speed")).toBe(
        eligible,
      );
    },
  );
  it("preserves XP overflow and never exhausts uncapped growth", () => {
    const p = new MarineProgression(() => 0);
    p.gainXp(23);
    expect(p.level).toBe(3);
    expect(p.xp).toBe(1);
    expect(p.pendingChoices).toBe(2);
    p.ranks["primary-damage"] = 100;
    expect(p.choose("primary-damage")).toBe(true);
    expect(p.ranks["primary-damage"]).toBe(102);
    expect(p.offer()).toHaveLength(3);
    p.gainXp(NaN);
    expect(Number.isFinite(p.xp)).toBe(true);
  });
  it("bounds workload and cycles while every trait continues growing past ten", () => {
    const base = deriveMarineWeaponConfig(state());
    expect(base.shotIntervalMs).toBe(800);
    expect(base.burstRounds).toBe(1);
    for (const id of marineTraitIds) {
      const a = state({ [id]: 10 });
      const b = state({ [id]: 11 });
      expect(
        JSON.stringify([
          getMarineStats(a),
          getMarineTraitEffects(a),
          deriveMarineWeaponConfig(a),
        ]),
      ).not.toBe(
        JSON.stringify([
          getMarineStats(b),
          getMarineTraitEffects(b),
          deriveMarineWeaponConfig(b),
        ]),
      );
    }
    const high = state({
      penetration: 1000,
      ricochet: 1000,
      burst: 1000,
      multishot: 1000,
      explosive: 1000,
      heavy: 1000,
      "attack-speed": 1000,
      "crit-chance": 1000,
    });
    const weapon = deriveMarineWeaponConfig(high);
    expect(weapon.burstRounds).toBeLessThanOrEqual(8);
    expect(weapon.shotIntervalMs).toBeGreaterThanOrEqual(
      (weapon.burstRounds! - 1) * weapon.roundIntervalMs! + 100,
    );
    expect(getMarineStats(high).criticalChance).toBeLessThan(1);
    const effects = getMarineTraitEffects(high);
    expect(effects.pierceCount).toBeLessThanOrEqual(8);
    expect(effects.bounceCount).toBeLessThanOrEqual(6);
    expect(effects.explosionRadius).toBeLessThanOrEqual(130);
    expect(effects.executionThreshold).toBe(0);
  });
  it("implements three legendary behaviors and range without consuming slots", () => {
    const normal = state({ penetration: 1, burst: 1, explosive: 1, range: 5 });
    const legendary = {
      ...normal,
      legendary: new Set<(typeof marineTraitIds)[number]>([
        "penetration",
        "burst",
        "explosive",
      ]),
    };
    const effects = getMarineTraitEffects(legendary);
    expect(effects.pierceShockwaveRadius).toBeGreaterThan(0);
    expect(effects.explosionChainTargets).toBeGreaterThan(0);
    expect(deriveMarineWeaponConfig(legendary).burstRounds).toBe(
      deriveMarineWeaponConfig(normal).burstRounds! + 1,
    );
    expect(getMarineStats(normal).minTargetProgress01).toBeLessThan(0.55);
    expect(marineUpgrades.range.maxRank).toBe(5);
    expect(marineUpgrades.range.weight).toBeLessThan(
      marineUpgrades.penetration.weight,
    );
  });
});

it("keeps owned legendary traits growing without offering the same legendary again", () => {
  const rolls = [3.5 / 4.05, 0, 0.9999, 0, 0, 0, 0, 0.5];
  const p = new MarineProgression(() => rolls.shift() ?? 0.5);
  p.ranks.penetration = 1;
  p.legendary.add("penetration");
  p.pendingChoices = 1;
  const card = p.offer()[0]!;
  expect(card.id).toBe("penetration");
  expect(card.rarity).toBe("EPIC");
  expect(p.choose(card.id)).toBe(true);
  expect(p.ranks.penetration).toBe(2);
  expect(p.legendary.size).toBe(1);
});

it("M11 reroll only replaces a normal offer, consumes one use, and never grants growth", () => {
  const p = new MarineProgression(() => 0.5, undefined, 2);
  expect(p.reroll()).toBe(false);
  p.gainXp(p.threshold);
  const before = p.offer();
  const snapshot = { level: p.level, xp: p.xp, pending: p.pendingChoices };
  expect(p.reroll()).toBe(true);
  expect(p.offer()).not.toBe(before);
  expect({ level: p.level, xp: p.xp, pending: p.pendingChoices }).toEqual(
    snapshot,
  );
  expect(p.history).toEqual([]);
  expect(p.ranks).toEqual({});
  expect(p.rerollsRemaining).toBe(1);
  p.special.acquireWeapon("grenade");
  p.special.addLevels("grenade", 2, 1);
  expect(p.special.pending).toBe(true);
  expect(p.reroll()).toBe(false);
  expect(p.rerollsRemaining).toBe(1);
  p.special.choose(p.special.offer()!.choices[0]!.id);
  expect(p.reroll()).toBe(true);
  expect(p.reroll()).toBe(false);
  expect(new MarineProgression(() => 0.5, undefined, 2).rerollsRemaining).toBe(
    2,
  );
});
