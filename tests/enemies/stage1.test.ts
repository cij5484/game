import { expect, it } from "vitest";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { advanceEnemy } from "../../src/game/enemies/enemySimulation";
import {
  shieldProtection,
  applyPrimaryDamage,
} from "../../src/game/combat/damage";
import { enemyConfigs } from "../../src/game/data/enemies";
import { SpawnDirector } from "../../src/game/waves/spawnDirector";
import { runBalance } from "../../src/game/data/run";

it("shield absorbs a hit before body and remains broken", () => {
  const shield = createPrototypeEnemy("shield", "center", 1);
  expect(shield.shieldHp).toBeGreaterThan(0);
  const hit = applyPrimaryDamage(shield, 10);
  expect(hit.hp).toBe(shield.hp);
  expect(hit.shieldHp).toBe(shield.shieldHp! - 10);
  const broken = applyPrimaryDamage(shield, shield.shieldHp!);
  expect(broken.shieldHp).toBe(0);
  expect(applyPrimaryDamage(broken, 10).hp).toBe(shield.hp - 10);
});
it("runner elite stops to telegraph before charging", () => {
  const elite = {
    ...createPrototypeEnemy("runner", "center", 1, 0.5, true),
    progress01: 0.6,
  };
  const ready = advanceEnemy(elite, 100, enemyConfigs.runner).enemy;
  expect(ready.chargePhase).toBe("telegraph");
  expect(ready.progress01).toBe(0.6);
  const charge = advanceEnemy(ready, 1500, enemyConfigs.runner).enemy;
  expect(charge.chargePhase).toBe("charging");
  expect(charge.progress01).toBeGreaterThan(ready.progress01);
});
it("20-minute director delays shield and has relief windows", () => {
  expect(runBalance.durationMs).toBe(1200000);
  const d = new SpawnDirector(() => 0.5);
  d.spawn(0);
  d.advance(300000);
  expect(d.settings.phase).toBe("relief");
  expect(d.spawn(0).every((e) => e.kind !== "shield")).toBe(true);
  d.advance(360000);
  expect(d.settings.phase).toBe("relief");
});

it("elite shield protects only four nearby ordinary enemies behind it and stops on shield break", () => {
  const guard = {
    ...createPrototypeEnemy("shield", "center", 10, 0.5, true),
    progress01: 0.7,
  };
  const troops = Array.from({ length: 6 }, (_, i) => ({
    ...createPrototypeEnemy("grunt", "center", i),
    progress01: 0.69 - i * 0.02,
  }));
  const elsewhere = { ...troops[0]!, id: 20, lane: "left" as const };
  const front = { ...troops[0]!, id: 21, progress01: 0.8 };
  const states = shieldProtection([guard, ...troops, elsewhere, front]);
  expect(states.filter((e) => e.protectedBy !== undefined)).toHaveLength(4);
  expect(applyPrimaryDamage(states[1]!, 10).hp).toBe(2);
  expect(states.at(-1)!.incomingDamageMultiplier).toBe(1);
  expect(
    shieldProtection(
      states.map((e) => (e.id === 10 ? { ...e, shieldHp: 0 } : e)),
    ).every((e) => e.protectedBy === undefined),
  ).toBe(true);
  expect(
    shieldProtection(
      states.map((e) => (e.id === 10 ? { ...e, hp: 0 } : e)),
    ).every((e) => e.protectedBy === undefined),
  ).toBe(true);
  expect(
    shieldProtection([{ ...guard, elite: false }, ...troops]).every(
      (e) => e.protectedBy === undefined,
    ),
  ).toBe(true);
});
it("elite telegraph and charge preserve arrival time across tick subdivision", () => {
  const spawn = {
    ...createPrototypeEnemy("runner", "center", 1, 0.5, true),
    progress01: 0.59,
  };
  const whole = advanceEnemy(spawn, 20000, enemyConfigs.runner);
  let state = spawn;
  let wallTime = 0;
  for (let i = 0; i < 200; i++) {
    const part = advanceEnemy(state, 100, enemyConfigs.runner);
    state = part.enemy;
    wallTime += part.wallTimeMs;
  }
  expect(state.progress01).toBe(1);
  expect(wallTime).toBeCloseTo(whole.wallTimeMs);
  expect(state.chargePhase).toBe("spent");
});
