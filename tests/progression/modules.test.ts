import { describe, expect, it } from "vitest";
import {
  Modules,
  eligibleModules,
  moduleEffects,
} from "../../src/game/progression/modules";

describe("module rewards", () => {
  it("requires a reward, levels to MAX, and removes exhausted choices without losing queued rewards", () => {
    const state = new Modules();
    expect(state.choose("penetration")).toBe(false);
    for (let i = 0; i < 7; i++) state.reward();
    for (let i = 0; i < 3; i++) expect(state.choose("penetration")).toBe(true);
    expect(state.levels.penetration).toBe(3);
    expect(state.offer().map((card) => card.id)).toEqual(["storm"]);
    expect(state.choose("penetration")).toBe(false);
    for (let i = 0; i < 3; i++) state.choose("storm");
    expect(state.pendingRewards).toBe(0);
    state.reward();
    expect(state.offer()).toEqual([]);
    expect(state.pendingRewards).toBe(0);
  });

  it("limits new types at capacity while allowing owned module levels", () => {
    expect(
      eligibleModules({ penetration: 1 }, 1).map((card) => card.id),
    ).toEqual(["penetration"]);
    expect(eligibleModules({ penetration: 1 }).map((card) => card.id)).toEqual([
      "penetration",
      "storm",
    ]);
  });

  it("keeps lower levels useful and improves the behaviors at Lv3", () => {
    expect(moduleEffects({ storm: 1 }).extraRicochet).toBe(1);
    expect(moduleEffects({ penetration: 2, storm: 2 })).toMatchObject({
      penetrationBonus: 2,
      widthBonus: 16,
      aftershockRadius: 0,
      ricochetRadiusBonus: 80,
      extraRicochet: 1,
    });
    expect(moduleEffects({ penetration: 3, storm: 3 })).toMatchObject({
      aftershockRadius: 90,
      aftershockDamageFactor: 0.5,
      extraRicochet: 2,
    });
  });
});
