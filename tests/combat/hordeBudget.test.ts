import { expect, it } from "vitest";
import { primaryAttack } from "../../src/game/combat/primaryAttack";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { weaponTraitIds } from "../../src/game/data/traits";
import {
  traitCombatBalance,
  tickTraitStatuses,
  propagateTraitDeaths,
} from "../../src/game/combat/traitCombat";
import { RelicCombat } from "../../src/game/combat/relicCombat";
import { Magic } from "../../src/game/combat/magic";

it("bounds repeated 300-enemy all-trait attacks and secondary effects", () => {
  // Deliberately exceeds the player's four slots to stress the shared transaction caps.
  const ranks = {
    ...Object.fromEntries(weaponTraitIds.map((id) => [id, 5])),
    "attack-speed": 5,
    "crit-chance": 5,
  };
  const pack = Array.from({ length: 300 }, (_, id) => ({
    ...createPrototypeEnemy("grunt", "center", id, (id % 20) / 20),
    progress01: 0.9 - Math.floor(id / 20) * 0.012,
    hp: 300,
    maxHp: 300,
  }));
  const relic = new RelicCombat();
  relic.setLevels({ "tesla-coil": 5, "frost-resonator": 5 });
  const times: number[] = [];
  for (let shot = 1; shot <= 120; shot++) {
    const start = performance.now();
    const hit = primaryAttack(pack[0]!, pack, ranks, 10, {}, ["hyper-gauss"], {
      shotIndex: shot,
      random: () => 0,
      heatRatio: 0.9,
      synergyMultiplier: 1.5,
    });
    expect(new Set([...hit.hitIds, ...hit.splashIds]).size).toBeLessThanOrEqual(
      traitCombatBalance.roundTargetBudget,
    );
    expect(hit.explosionIds.length).toBeLessThanOrEqual(
      traitCombatBalance.roundSplashBudget,
    );
    const shatter = relic.onPrimaryFrost(hit.enemies, hit.hitIds, true);
    expect(shatter.hitIds.length).toBeLessThanOrEqual(24);
    const arc = relic.afterPrimary(shatter.enemies, hit.hitIds, true);
    expect(arc.hitIds.length).toBeLessThanOrEqual(5);
    const tick = tickTraitStatuses(arc.enemies, 5000);
    const spread = propagateTraitDeaths(
      tick.enemies,
      tick.enemies.filter((e) => e.hp <= 0),
      ranks,
    );
    expect(spread.burnIds.length + spread.markIds.length).toBeLessThanOrEqual(
      64,
    );
    expect(
      spread.enemies.every((e) => Number.isFinite(e.hp) && e.hp >= 0),
    ).toBe(true);
    times.push(performance.now() - start);
  }
  const magic = new Magic();
  magic.setUpgrades(ranks);
  magic.setSynergyMultiplier(1.5);
  expect(magic.cast("frost-nova", pack)!.enemies).toHaveLength(300);
  times.sort((a, b) => a - b);
  console.info(
    `300-enemy transaction benchmark (120 iterations, includes assertions): median=${times[60]!.toFixed(2)}ms p95=${times[114]!.toFixed(2)}ms; renderer excluded`,
  );
});
