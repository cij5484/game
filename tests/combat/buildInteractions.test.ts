import { expect, it } from "vitest";
import { RelicCombat } from "../../src/game/combat/relicCombat";
import { primaryAttack } from "../../src/game/combat/primaryAttack";
import { Magic } from "../../src/game/combat/magic";
import { Stimpack } from "../../src/game/combat/stimpack";
import { Burst } from "../../src/game/combat/burst";
import { stimpackBalance } from "../../src/game/data/balance";
import { burstBalance } from "../../src/game/data/burst";
import type { UpgradeRanks } from "../../src/game/data/upgrades";
import type { EnemyState } from "../../src/game/enemies/enemySimulation";
const enemy = (id: number, hp = 50): EnemyState => ({
  id,
  hp,
  kind: "grunt",
  lane: "center",
  offset01: 0.5,
  progress01: 0.9,
  phase: "moving",
});
const noCrit = { shotIndex: 1, random: () => 1 };

it("a low-level delayed echo cannot inherit legendary kill relays before trait inheritance", () => {
  const relic = new RelicCombat();
  relic.setLevels({ "ammo-replicator": 1 });
  const ranks: UpgradeRanks = {
    "rapid-overdrive": 1,
    "siege-lance": 1,
    "ricochet-cascade": 1,
  };
  for (let i = 0; i < 8; i++)
    relic.onVolley({ targetId: 99, ranks, baseDamage: 10 });
  const echo = relic.advance(180)[0]!;
  const enemies = [enemy(1, 1), enemy(2), enemy(3), enemy(4)];
  const attack = primaryAttack(
    enemies[0]!,
    enemies,
    echo.ranks,
    echo.baseDamage,
    { damageMultiplier: echo.damageMultiplier },
    [],
    noCrit,
  );
  expect(attack.hitIds).toEqual([1]);
  expect(attack.enemies.slice(1).map((e) => e.hp)).toEqual([50, 50, 50]);
});

it("MAX echo inherits weapon behavior but cannot schedule another generation", () => {
  const relic = new RelicCombat();
  relic.setLevels({ "ammo-replicator": 5 });
  for (let i = 0; i < 3; i++)
    relic.onVolley({ targetId: 99, ranks: { ricochet: 5 }, baseDamage: 10 });
  const echo = relic.advance(180)[0]!;
  const enemies = Array.from({ length: 10 }, (_, i) => enemy(i));
  const attack = primaryAttack(
    enemies[0]!,
    enemies,
    echo.ranks,
    echo.baseDamage,
    { damageMultiplier: echo.damageMultiplier },
    [],
    noCrit,
  );
  expect(attack.hitIds.length).toBeGreaterThan(1);
  for (const _id of attack.hitIds) relic.onVolley(echo, true);
  expect(relic.advance(1000)).toEqual([]);
});

it("Frost shatter kills feed capped adrenaline and near-wall rewards without bypassing combat energy limits", () => {
  const relic = new RelicCombat();
  relic.setLevels({
    "frost-resonator": 5,
    "adrenaline-pump": 5,
    "emergency-reclaimer": 5,
  });
  const magic = new Magic();
  const stim = new Stimpack(stimpackBalance);
  const burst = new Burst();
  expect(magic.cast("frost-nova", [])).not.toBeNull();
  relic.onMagic("frost-nova");
  stim.activate();
  let acceptedExtension = 0,
    healing = 0,
    totalKills = 0;
  for (let batch = 0; batch < 6; batch++) {
    let enemies = Array.from({ length: 12 }, (_, i) => enemy(batch * 100 + i));
    for (let shot = 0; shot < 2; shot++) {
      const primary = primaryAttack(
        enemies[0]!,
        enemies,
        {},
        1,
        {},
        [],
        noCrit,
      );
      const shatter = relic.onPrimaryFrost(
        primary.enemies,
        primary.hitIds,
        magic.frostRemainingMs > 0,
      );
      enemies = shatter.enemies;
    }
    const dead = enemies.filter((e) => e.hp <= 0);
    expect(dead.length).toBe(8);
    totalKills += dead.length;
    const reward = relic.onKills(dead.length, {
      frost: magic.frostRemainingMs > 0,
      boost: stim.phase === "boost",
      magic: false,
      nearWallKills: dead.filter((e) => e.progress01 >= 0.85).length,
    });
    healing += reward.wallHealing;
    acceptedExtension += stim.extendBoost(
      reward.boostExtensionMs,
      reward.boostExtensionCapMs,
      reward.recoveryCostRatio,
    );
    burst.credit({ hits: reward.energy / burstBalance.charge.hits });
  }
  expect(totalKills).toBe(48);
  expect(acceptedExtension).toBe(3000);
  expect(healing).toBe(40);
  expect(burst.gauge).toBe(3);
  stim.advance(8000);
  expect(stim.phase).toBe("crash");
  stim.advance(1000);
  expect(stim.timeToBoundaryMs).toBe(3500);
});
