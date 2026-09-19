import type { Incendiary } from "../../src/game/combat/incendiary";
import {
  getIncendiaryStats,
  getMarineStats,
} from "../../src/game/data/marineGrowth";
import type { BalanceTelemetry } from "../../src/game/dev/BalanceTelemetry";
import {
  metaStore,
  MetaStore,
  META_STORAGE_KEY,
} from "../../src/game/meta/metaSave";
import { getUnlocks } from "../../src/game/data/operations";
import { runBalance } from "../../src/game/data/run";
import { enemyConfigs } from "../../src/game/data/enemies";
import type { PrototypeSynergies } from "../../src/game/combat/prototypeSynergies";
import { deriveMarineWeaponConfig } from "../../src/game/data/marineGrowth";
import { balanceFields } from "../../src/game/dev/balanceFields";
import {
  configureFields,
  getOverrides,
  setOverrides,
  updateOverride,
} from "../../src/game/dev/runtimeBalance";
import { validateBalanceGroups } from "../../src/game/dev/runtimeBridge";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("phaser", () => ({ default: { Scene: class {} } }));
import { CombatScene } from "../../src/game/scenes/CombatScene";
import type { EnemyState } from "../../src/game/enemies/enemySimulation";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import type { GaussRifle } from "../../src/game/combat/gaussRifle";
import type { MarineProgression as Progression } from "../../src/game/progression/marineProgression";
import { SpawnDirector } from "../../src/game/waves/spawnDirector";
import type { Burst } from "../../src/game/combat/burst";
import type { TargetFocus } from "../../src/game/combat/targeting";
import type { Point } from "../../src/game/input/gestureRecognizer";
import { Stimpack } from "../../src/game/combat/stimpack";
import {
  stimpackBalance,
  gaussRifleBalance,
  marineConfig,
} from "../../src/game/data/balance";
import { PrototypeRelics } from "../../src/game/progression/highroll";
import type { SpecialWeapons } from "../../src/game/combat/specialWeapons";
import type { RunState } from "../../src/game/model/runState";
import { createSiegeBoss } from "../../src/game/enemies/siegeBoss";
import { siegeBossBalance } from "../../src/game/data/boss";

interface SceneHarness {
  incendiary: Incendiary;
  telemetry: BalanceTelemetry;
  gameSpeed: 1 | 2 | 4 | 8;
  spawnBatch(): void;
  rifle: GaussRifle;
  synergies: PrototypeSynergies;
  relics: PrototypeRelics;
  specialWeapons: SpecialWeapons;
  copiedAttacks: unknown[];
  refreshBuild(): void;
  burst: Burst;
  progression: Progression;
  director: SpawnDirector;
  stimpack: Stimpack;
  focus: TargetFocus;
  shotIndex: number;
  kills: number;
  run: RunState;
  manualPaused: boolean;
  ultimateRemainingMs: number;
  enemies: {
    state: EnemyState;
    attackElapsedMs: number;
    visual: { destroy(): void };
  }[];
  advanceWorld(deltaMs: number): number;
  applyEnemyStates(states: readonly EnemyState[], chargeBurst?: boolean): void;
  takeWallDamage(damage: number): void;
  update(time: number, deltaMs: number): void;
  focusAt(x: number, y: number): void;
  activateStim(): boolean;
  activateUltimate(): boolean;
  handleGesture(
    points: readonly Point[],
    displayPoints: readonly Point[],
  ): void;
}
const noop = () => {};
const enemy = (id: number): EnemyState => ({
  ...createPrototypeEnemy("grunt", "center", id, 0.5),
  progress01: 0.6,
  hp: 10000,
  maxHp: 10000,
});
function scene(): SceneHarness {
  const instance = new CombatScene(),
    harness = instance as unknown as SceneHarness;
  // Only presentation is replaced; real scene, clocks, combat, focus, magic and rewards run.
  Object.assign(instance, {
    time: { timeScale: 1, paused: false },
    result: { show: vi.fn() },
    choices: { hide: noop },
    view: {
      createEnemy: () => ({ destroy: noop }),
      enemyVisualPoint: (state: EnemyState) => ({
        x: state.id,
        y: state.progress01 * 900,
        scaleX: 1,
      }),
      showImpacts: noop,
      showSpecialEffects: noop,
      renderSpecialWeapons: noop,
      showNotice: noop,
      showPrimary: noop,
      showMagic: noop,
      showBarrage: noop,
      showGesture: noop,
      renderEnemy: noop,
      renderEnemyStatus: noop,
      beginFrame: noop,
      renderWall: noop,
      renderProgression: noop,
      setFocus: noop,
      pickEnemy: (x: number) => (x > 0 ? x : null),
    },
    pauseUi: { setBlocked: noop, setBuildDetails: noop },
    buildBar: { render: noop },
    burstUi: { renderBuild: noop, renderSpecialWeapons: noop },
    renderCombat: noop,
    renderBurst: noop,
    renderAbilities: noop,
    showChoices: noop,
    flushNotices: noop,
  });
  harness.director.spawn(0);
  Object.assign(harness.director, { nextSpawnAtMs: 20000 });
  harness.enemies = [1, 2].map((id) => ({
    state: enemy(id),
    attackElapsedMs: 0,
    visual: { destroy: noop },
  }));
  return harness;
}
beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(1);
});
afterEach(() => vi.restoreAllMocks());
const circle = Array.from({ length: 40 }, (_, i) => ({
  x: 200 + 90 * Math.cos((i / 39) * 2 * Math.PI),
  y: 200 + 90 * Math.sin((i / 39) * 2 * Math.PI),
}));
const z = [
  { x: 50, y: 50 },
  { x: 170, y: 50 },
  { x: 50, y: 170 },
  { x: 170, y: 170 },
];
const v = [
  { x: 50, y: 50 },
  { x: 110, y: 170 },
  { x: 170, y: 50 },
];

it("scene fires without input and repeated focus taps cannot increase automatic DPS", () => {
  const automatic = scene(),
    spam = scene();
  automatic.update(0, 999);
  for (let i = 0; i < 100; i++) {
    spam.focusAt(1, 0);
    spam.update(0, i === 99 ? 9 : 10);
  }
  expect(automatic.shotIndex).toBe(2);
  expect(spam.shotIndex).toBe(2);
  expect(spam.enemies.map((e) => e.state.hp)).toEqual(
    automatic.enemies.map((e) => e.state.hp),
  );
  expect(spam.run.elapsedMs).toBeCloseTo(999);
});

it("uses the action-local first/additional burst coefficient with snapshotted growth", () => {
  const test = scene();
  test.progression.ranks.burst = 1;
  test.progression.quality.burst = 1;
  test.refreshBuild();
  const config = deriveMarineWeaponConfig(test.progression.growth);
  test.update(0, 0);
  const afterFirst = test.enemies[0]!.state.hp;
  const firstDamage = 10000 - afterFirst;
  expect(firstDamage).toBeCloseTo(10.35);
  test.progression.quality.burst = 10;
  test.update(0, config.roundIntervalMs! / runBalance.combatTempo);
  expect(test.shotIndex).toBe(2);
  expect(afterFirst - test.enemies[0]!.state.hp).toBeCloseTo(
    firstDamage * 0.65,
  );
});

it("copied bursts start at full first-round damage and copy additional rounds without recursion", () => {
  const test = scene();
  test.progression.ranks.burst = 1;
  test.progression.quality.burst = 1;
  test.relics.owned.add("replicator");
  test.refreshBuild();
  vi.mocked(Math.random).mockReturnValue(1).mockReturnValueOnce(0);
  test.update(0, 0);
  const afterOriginal = test.enemies[0]!.state.hp;
  test.update(0, 0);
  const afterCopy = test.enemies[0]!.state.hp;
  expect(afterOriginal - afterCopy).toBeCloseTo(10000 - afterOriginal);
  expect(test.shotIndex).toBe(2);
  const config = deriveMarineWeaponConfig(test.progression.growth);
  test.update(0, config.roundIntervalMs! / runBalance.combatTempo);
  expect(afterCopy - test.enemies[0]!.state.hp).toBeCloseTo(
    2 * (10000 - afterOriginal) * 0.65,
  );
  expect(test.shotIndex).toBe(4);
  expect(test.copiedAttacks).toHaveLength(0);
});

it("live burst coefficient tuning changes actual additional-round damage, leaving first shots full", () => {
  configureFields(balanceFields, validateBalanceGroups);
  const original = getOverrides();
  try {
    const test = scene();
    test.progression.ranks.burst = 1;
    test.progression.quality.burst = 1;
    test.refreshBuild();
    test.update(0, 0);
    const afterFirst = test.enemies[0]!.state.hp;
    updateOverride("marineMods.burstAdditionalRoundDamageFactor", 0.2);
    test.update(
      0,
      deriveMarineWeaponConfig(test.progression.growth).roundIntervalMs! /
        runBalance.combatTempo,
    );
    expect(afterFirst - test.enemies[0]!.state.hp).toBeCloseTo(
      (10000 - afterFirst) * 0.2,
    );
    const nextAction = scene();
    nextAction.progression.ranks.burst = 1;
    nextAction.progression.quality.burst = 1;
    nextAction.refreshBuild();
    nextAction.update(0, 0);
    expect(nextAction.enemies[0]!.state.hp).toBeCloseTo(afterFirst);
  } finally {
    setOverrides(original);
  }
});

it("reinforcement rifles each start a full first round and track their own additional rounds", () => {
  const test = scene();
  test.progression.ranks.burst = 1;
  test.progression.quality.burst = 1;
  test.relics.owned.add("reinforcement");
  test.refreshBuild();
  test.update(0, 0);
  const afterFirst = test.enemies[0]!.state.hp;
  expect(10000 - afterFirst).toBeCloseTo(2 * 10.35);
  test.update(
    0,
    deriveMarineWeaponConfig(test.progression.growth).roundIntervalMs! /
      runBalance.combatTempo,
  );
  expect(afterFirst - test.enemies[0]!.state.hp).toBeCloseTo(2 * 10.35 * 0.65);
  expect(test.shotIndex).toBe(4);
});
it("focused target survives across shots, blank tap releases it and death resumes smart targeting", () => {
  const test = scene();
  test.enemies[1]!.state.progress01 = 0.8;
  test.focusAt(1, 0);
  test.update(0, 400);
  expect(test.enemies[0]!.state.hp).toBeLessThan(10000);
  expect(test.enemies[1]!.state.hp).toBe(10000);
  const farHp = test.enemies[0]!.state.hp;
  test.focusAt(-1, 0);
  test.update(0, 400);
  expect(test.enemies[0]!.state.hp).toBe(farHp);
  expect(test.enemies[1]!.state.hp).toBeLessThan(10000);
  test.focusAt(1, 0);
  test.enemies[0]!.state.hp = 1;
  test.update(0, 800);
  expect(test.enemies.some((e) => e.state.id === 1)).toBe(false);
  const nearHp = test.enemies[0]!.state.hp;
  test.update(0, 800);
  expect(test.focus.targetId).toBeNull();
  expect(test.enemies[0]!.state.hp).toBeLessThan(nearHp);
});
it.each([
  ["frost-nova", circle],
  ["chain-lightning", z],
] as const)(
  "%s is recognized but cannot affect the Marine runtime",
  (_id, points) => {
    const test = scene(),
      control = scene();
    const before = test.enemies.map((e) => ({ ...e.state }));
    test.handleGesture(points, points);
    expect(test.enemies.map((e) => e.state)).toEqual(before);
    expect(test.kills).toBe(0);
    expect(test.progression.xp).toBe(0);
    expect(test).not.toHaveProperty("magic");
    expect(test).not.toHaveProperty("relicCombat");
    test.update(0, 800);
    control.update(0, 800);
    expect(test.enemies.map((e) => e.state)).toEqual(
      control.enemies.map((e) => e.state),
    );
  },
);

it("stim activation uses the same guarded path and cannot restart an active boost", () => {
  const test = scene();
  expect(test.activateStim()).toBe(true);
  test.update(0, 100);
  const remaining = test.stimpack.timeToBoundaryMs;
  expect(test.activateStim()).toBe(false);
  expect(test.stimpack.timeToBoundaryMs).toBe(remaining);
  const fresh = scene();
  fresh.manualPaused = true;
  expect(fresh.activateStim()).toBe(false);
  expect(fresh.stimpack.phase).toBe("normal");
});
it("ultimate gesture is inactive until ready then deals immediate fixed damage and consumes gauge", () => {
  const test = scene();
  test.handleGesture(v, v);
  expect(test.enemies[0]!.state.hp).toBe(10000);
  expect(test.activateUltimate()).toBe(false);
  test.burst.credit({ eliteKills: 20 });
  expect(test.burst.ready).toBe(true);
  test.handleGesture(v, v);
  expect(test.enemies.map((e) => e.state.hp)).toEqual([9860, 9860]);
  expect(test.burst.gauge).toBe(0);
  expect(test.activateUltimate()).toBe(false);
});
it("choice and manual pause halt world, automatic rifle and ability clocks", () => {
  const test = scene();
  test.activateStim();
  test.update(0, 50);
  const before = {
    world: test.run.elapsedMs,
    shots: test.shotIndex,
    rifle: test.rifle.timeToEventMs,
    stim: test.stimpack.timeToBoundaryMs,
  };
  test.progression.gainXp(test.progression.threshold);
  test.update(0, 1000);
  expect({
    world: test.run.elapsedMs,
    shots: test.shotIndex,
    rifle: test.rifle.timeToEventMs,
    stim: test.stimpack.timeToBoundaryMs,
  }).toEqual(before);
  test.progression.pendingChoices = 0;
  test.manualPaused = true;
  test.update(0, 1000);
  expect(test.run.elapsedMs).toBe(before.world);
});
it("recovery uses the exact continuous fire-rate integral across fractional boundaries", () => {
  const test = scene();
  test.stimpack = new Stimpack({
    ...stimpackBalance,
    boostMs: 20,
    crashMs: 10,
    recoveryMs: 1000,
  });
  test.stimpack.activate();
  test.stimpack.advance(30);
  test.update(0, 2500 / 1.5);
  // Recovery contributes500 weapon-ms; subsequent1500ms total2000ms => shots at0/800/1600.
  expect(test.shotIndex).toBe(3);
  expect(test.rifle.timeToEventMs).toBeCloseTo(400);
  expect(test.run.elapsedMs).toBeCloseTo(2500 / 1.5);
});
it("scene commits a kill reward once when external states are applied again", () => {
  const test = scene(),
    states = test.enemies.map((e) => ({
      ...e.state,
      hp: e.state.id === 1 ? 0 : e.state.hp,
    }));
  test.applyEnemyStates(states, false);
  expect(test.kills).toBe(1);
  expect(test.progression.xp).toBe(1);
  test.applyEnemyStates(states, false);
  expect(test.kills).toBe(1);
  expect(test.progression.xp).toBe(1);
});
it("ultimate visuals never suspend automatic fire, focus input, or ready abilities", () => {
  const ordinary = scene(),
    presenting = scene();
  presenting.ultimateRemainingMs = 650;
  ordinary.update(0, 400);
  presenting.update(0, 400);
  expect(presenting.shotIndex).toBe(ordinary.shotIndex);
  expect(presenting.enemies.map((e) => e.state.hp)).toEqual(
    ordinary.enemies.map((e) => e.state.hp),
  );
  expect(presenting.ultimateRemainingMs).toBe(50);
  presenting.focusAt(2, 0);
  expect(presenting.focus.targetId).toBe(2);
  expect(presenting.activateStim()).toBe(true);
});

it("waits outside range without consuming readiness, then fires once on entry", () => {
  const test = scene();
  test.enemies.forEach((e) => {
    e.state.progress01 = 0.1;
  });
  test.update(0, 100);
  expect(test.shotIndex).toBe(0);
  expect(test.rifle.timeToEventMs).toBe(0);
  test.enemies[0]!.state.progress01 = 0.55;
  test.update(0, 0);
  expect(test.shotIndex).toBe(1);
  test.update(0, 799 / 1.5);
  expect(test.shotIndex).toBe(1);
  test.update(0, 1 / 1.5);
  expect(test.shotIndex).toBe(2);
});
it("out-of-range focus blocks in-range auto fire until entry or blank tap", () => {
  const test = scene();
  test.enemies[0]!.state.progress01 = 0.1;
  test.enemies[1]!.state.progress01 = 0.8;
  test.focusAt(1, 0);
  test.update(0, 100);
  expect(test.shotIndex).toBe(0);
  expect(test.focus.targetId).toBe(1);
  test.focusAt(-1, 0);
  test.update(0, 0);
  expect(test.shotIndex).toBe(1);
  expect(test.enemies[0]!.state.hp).toBe(10000);
  expect(test.enemies[1]!.state.hp).toBe(9990);
});

it("Marine offers no magic growth, keeps repeatable growth available while gaining levels", () => {
  const test = scene();
  let selected = 0;
  for (let i = 0; i < 150; i++) {
    test.progression.gainXp(test.progression.threshold);
    while (test.progression.pendingChoices > 0) {
      const choices = test.progression.offer();
      expect(
        choices.every((c) =>
          ["gauss-rifle", "grenade", "missile", "drone"].includes(c.ability),
        ),
      ).toBe(true);
      if (!choices.length) break;
      expect(test.progression.choose(choices[0]!.id)).toBe(true);
      selected++;
    }
  }
  expect(selected).toBeGreaterThan(0);
  expect(test.progression.pendingChoices).toBe(0);
  expect(test.progression.level).toBeGreaterThan(100);
});

it.each([0, 0.5, 0.999])(
  "first normal Gauss shot starts in 2-3.4s at RNG %s without input",
  (random) => {
    const test = scene();
    test.director = new SpawnDirector(() => random);
    test.enemies = [];
    test.spawnBatch();
    while (test.shotIndex === 0 && test.run.elapsedMs < 6000)
      test.update(0, 16);
    expect(test.shotIndex).toBe(1);
    expect(test.run.elapsedMs).toBeGreaterThanOrEqual(2000);
    expect(test.run.elapsedMs).toBeLessThanOrEqual(3400);
  },
);

it("Marine Scene applies range, burst and quality while old evolution/synergy stays disconnected", () => {
  const test = scene();
  test.enemies.forEach((e) => (e.state.progress01 = 0.5));
  test.update(0, 0);
  expect(test.shotIndex).toBe(0);
  test.progression.ranks.range = 2;
  test.progression.quality.range = 0.09;
  test.progression.ranks.burst = 3;
  test.progression.quality.burst = 3;
  test.progression.ranks["primary-damage"] = 1;
  test.progression.quality["primary-damage"] = 0.3;
  test.progression.ranks.penetration = 5;
  test.progression.quality.penetration = 5;
  test.refreshBuild();
  expect((test as unknown as { evolutions: Set<string> }).evolutions.size).toBe(
    0,
  );
  test.update(0, 300);
  expect(test.shotIndex).toBe(3);
  expect(test.enemies[0]!.state.hp).toBeLessThan(9970);
  test.manualPaused = true;
  test.update(0, 500);
  expect(test.shotIndex).toBe(3);
});

it("scales gameplay once at update entry while pause and focus input remain unscaled", () => {
  const normal = scene(),
    fast = scene();
  Object.assign(fast, { gameSpeed: 8 });
  const startProgress = fast.enemies[0]!.state.progress01;
  normal.update(0, 800);
  fast.update(0, 100);
  expect(fast.run.elapsedMs).toBe(normal.run.elapsedMs);
  expect(fast.enemies.map((e) => e.state)).toEqual(
    normal.enemies.map((e) => e.state),
  );
  expect(fast.shotIndex).toBe(normal.shotIndex);
  expect(fast.shotIndex).toBeGreaterThan(0);
  expect(fast.enemies[0]!.state.progress01).toBeGreaterThan(startProgress);
  expect(fast.director.elapsedMs).toBe(normal.director.elapsedMs);
  const pausedShots = fast.shotIndex;
  const pausedEnemies = fast.enemies.map((e) => ({ ...e.state }));
  fast.manualPaused = true;
  fast.update(0, 1000);
  fast.focusAt(1, 0);
  expect(fast.run.elapsedMs).toBeCloseTo(800);
  expect(fast.focus.targetId).toBeNull();
  expect(fast.shotIndex).toBe(pausedShots);
  expect(fast.enemies.map((e) => e.state)).toEqual(pausedEnemies);
});

it("owned special kills credit XP once", () => {
  const test = scene();
  expect(test.progression.special.acquireWeapon("grenade")).toBe(true);
  expect(test.progression.pendingChoices).toBe(0);
  test.enemies.forEach((e) => {
    e.state.progress01 = 0.1;
    e.state.hp = 1;
  });
  test.update(0, 800);
  expect(test.kills).toBe(2);
  expect(test.progression.xp).toBe(2);
  test.update(0, 100);
  expect(test.progression.xp).toBe(2);
});
it("X4 shares special projectile, cooldown and Stim clocks with ordinary simulation", () => {
  const normal = scene(),
    fast = scene();
  for (const test of [normal, fast]) {
    test.progression.special.acquireWeapon("missile");
    test.activateStim();
  }
  Object.assign(fast, { gameSpeed: 4 });
  normal.update(0, 1200);
  fast.update(0, 300);
  expect(fast.enemies.map((e) => e.state)).toEqual(
    normal.enemies.map((e) => e.state),
  );
  expect(fast.stimpack.timeToBoundaryMs).toBe(normal.stimpack.timeToBoundaryMs);
  expect(fast.run).toEqual(normal.run);
});

it("M6 separates 1.5x combat time from the real-time Stage clock", () => {
  const test = scene();
  test.update(0, 1000);
  expect(test.run.elapsedMs).toBeCloseTo(1000);
  expect(test.director.elapsedMs).toBeCloseTo(1500);
});

it("M6 capacitor snapshots one roll across every Gauss burst round", () => {
  const test = scene();
  test.progression.ranks.burst = 3;
  test.progression.quality.burst = 3;
  test.relics.owned.add("capacitor");
  test.refreshBuild();
  vi.mocked(Math.random).mockReturnValue(1).mockReturnValueOnce(0);
  test.update(0, 200);
  expect(test.shotIndex).toBe(3);
  const control = scene();
  control.progression.ranks.burst = 3;
  control.progression.quality.burst = 3;
  control.refreshBuild();
  control.update(0, 200);
  expect(10000 - test.enemies[0]!.state.hp).toBeCloseTo(
    2 * (10000 - control.enemies[0]!.state.hp),
  );
});
it("M6 replicator copies the complete burst once and never recursively copies", () => {
  const test = scene();
  test.progression.ranks.burst = 3;
  test.progression.quality.burst = 3;
  test.relics.owned.add("replicator");
  test.refreshBuild();
  vi.mocked(Math.random).mockReturnValue(0);
  test.update(0, 200);
  expect(test.shotIndex).toBe(6);
  const control = scene();
  control.progression.ranks.burst = 3;
  control.progression.quality.burst = 3;
  control.refreshBuild();
  control.update(0, 200);
  expect(10000 - test.enemies[0]!.state.hp).toBeCloseTo(
    2 * (10000 - control.enemies[0]!.state.hp),
  );
  expect(test.copiedAttacks).toHaveLength(0);
});
it("M6 reinforcement independently fires Gauss without duplicating special synchronization", () => {
  const test = scene();
  const sync = vi.spyOn(test.specialWeapons, "onPrimary");
  test.update(0, 100);
  expect(test.shotIndex).toBe(1);
  test.relics.owned.add("reinforcement");
  test.refreshBuild();
  test.update(0, 0);
  expect(test.shotIndex).toBe(2);
  expect(sync).toHaveBeenCalledTimes(1);
  test.update(0, 434);
  expect(test.shotIndex).toBe(3);
  expect(sync).toHaveBeenCalledTimes(2);
});
it("M6 core applies immediately, queues armament before relic reward, and commits the kill once", () => {
  const test = scene();
  test.enemies[0]!.state.elite = true;
  vi.mocked(Math.random).mockReturnValue(0);
  const states = test.enemies.map((e) => ({
    ...e.state,
    hp: e.state.id === 1 ? 0 : e.state.hp,
  }));
  test.applyEnemyStates(states);
  expect(test.progression.core).toBe("armament");
  expect(
    test.telemetry
      .report()
      .v2!.growthEvents.filter((e) => e.kind === "core-acquisition"),
  ).toEqual([expect.objectContaining({ id: "armament", nextLevel: 1 })]);
  expect(test.progression.special.capacity).toBe(3);
  expect(test.progression.special.offer()?.kind).toBe("acquire");
  expect(test.relics.pendingRewards).toBe(1);
  test.applyEnemyStates(states);
  expect(test.relics.pendingRewards).toBe(1);
});
it("M6 has no legacy lethal-damage rescue", () => {
  const test = scene();
  test.run.wallHp = 1;
  test.takeWallDamage(100);
  expect(test.run.status).toBe("failed");
  expect(test.run.wallHp).toBe(0);
});

it("saturation increases even a capped Gauss burst without removing recovery", () => {
  const test = scene();
  test.progression.ranks.burst = 100;
  test.progression.quality.burst = 100;
  test.progression.legendary.add("burst");
  test.progression.ranks["attack-speed"] = 100;
  test.progression.quality["attack-speed"] = 100;
  test.synergies.active.add("saturation");
  test.synergies.registerHits(Array.from({ length: 8 }, (_, i) => i));
  test.refreshBuild();
  const config = deriveMarineWeaponConfig(test.progression.growth);
  test.update(0, (config.shotIntervalMs - 100) / 1.5);
  expect(test.shotIndex).toBe(10);
  expect(test.rifle.timeToEventMs).toBeCloseTo(100);
});

it("M7 spawns one Boss at19:00, keeps it range-bound, and runs beyond20min", () => {
  const test = scene();
  test.enemies = [];
  test.run.elapsedMs = siegeBossBalance.spawnMs - 10;
  Object.assign(test.director, {
    elapsed: test.run.elapsedMs * 1.5,
    nextSpawnAtMs: Infinity,
    eliteIndex: 5,
  });
  test.update(0, 20);
  expect(test.enemies.filter((e) => e.state.boss)).toHaveLength(1);
  expect(test.shotIndex).toBe(0);
  test.run.elapsedMs = 20 * 60000;
  test.update(0, 10);
  expect(test.run.status).toBe("running");
  expect(test.run.elapsedMs).toBeGreaterThan(20 * 60000);
  expect(test.enemies.filter((e) => e.state.boss)).toHaveLength(1);
});
it("M7 Boss kill clears once and a prior Wall failure cannot become a clear", () => {
  for (const failed of [false, true]) {
    const test = scene();
    const boss = createSiegeBoss(50);
    test.enemies = [
      { state: boss, attackElapsedMs: 0, visual: { destroy: noop } },
    ];
    if (failed) test.takeWallDamage(test.run.wallHp);
    test.applyEnemyStates([{ ...boss, hp: 0 }]);
    expect(test.run.status).toBe(failed ? "failed" : "cleared");
    expect(test.progression.xp).toBe(0);
    test.applyEnemyStates([{ ...boss, hp: 0 }]);
    expect(test.kills).toBe(1);
  }
});
it("M7 charge attacks Wall, reinforcements spawn once, pause freezes Boss", () => {
  const test = scene();
  const boss = createSiegeBoss(50);
  boss.hp = boss.maxHp! * 0.65;
  boss.progress01 = siegeBossBalance.siegeProgress01;
  boss.boss!.phase = "siege-charge";
  boss.boss!.phaseRemainingMs = 1;
  test.enemies = [
    { state: boss, attackElapsedMs: 0, visual: { destroy: noop } },
  ];
  test.advanceWorld(2);
  expect(test.run.wallHp).toBe(12000 - siegeBossBalance.siegeWallDamage);
  expect(test.enemies.filter((e) => !e.state.boss)).toHaveLength(32);
  test.advanceWorld(2);
  expect(test.enemies.filter((e) => !e.state.boss)).toHaveLength(32);
  const remaining = test.enemies.find((e) => e.state.boss)!.state.boss!
    .phaseRemainingMs;
  test.manualPaused = true;
  test.update(0, 1000);
  expect(
    test.enemies.find((e) => e.state.boss)!.state.boss!.phaseRemainingMs,
  ).toBe(remaining);
});

it("Boss killed by input-triggered Ultimate immediately shows Result exactly once", () => {
  const test = scene();
  const boss = { ...createSiegeBoss(99), hp: 1, progress01: 0.6 };
  test.enemies = [
    { state: boss, attackElapsedMs: 0, visual: { destroy: noop } },
  ];
  test.burst.credit({ eliteKills: 20 });
  expect(test.activateUltimate()).toBe(true);
  const result = (
    test as unknown as { result: { show: ReturnType<typeof vi.fn> } }
  ).result;
  expect(result.show).toHaveBeenCalledTimes(1);
  expect(result.show.mock.calls[0]![0]).toMatchObject({
    status: "cleared",
    bossKilled: true,
  });
  test.update(0, 16);
  expect(result.show).toHaveBeenCalledTimes(1);
});

it("M9 renders each surviving enemy once per frame even across X4 combat substeps", () => {
  const test = scene();
  test.enemies = Array.from({ length: 700 }, (_, i) => ({
    state: enemy(i + 1),
    attackElapsedMs: 0,
    visual: { destroy: noop },
  }));
  Object.assign(test, { gameSpeed: 4 });
  const view = (
    test as unknown as { view: { renderEnemy: ReturnType<typeof vi.fn> } }
  ).view;
  view.renderEnemy = vi.fn();
  test.update(0, 64);
  expect(view.renderEnemy).toHaveBeenCalledTimes(700);
  for (let i = 0; i < 700; i++)
    expect(view.renderEnemy.mock.calls[i]![1]).toBe(test.enemies[i]!.state);
});
it("M9 damage application and focus changes never redraw every enemy transform", () => {
  const test = scene();
  const view = (
    test as unknown as {
      view: {
        renderEnemy: ReturnType<typeof vi.fn>;
        renderEnemyStatus: ReturnType<typeof vi.fn>;
      };
    }
  ).view;
  view.renderEnemy = vi.fn();
  view.renderEnemyStatus = vi.fn();
  test.focusAt(1, 0);
  test.focusAt(2, 0);
  expect(view.renderEnemy).not.toHaveBeenCalled();
  expect(view.renderEnemyStatus.mock.calls.length).toBeLessThanOrEqual(3);
  test.applyEnemyStates(
    test.enemies.map((e) =>
      e.state.id === 1 ? { ...e.state, hp: e.state.hp - 1 } : e.state,
    ),
  );
  expect(view.renderEnemy).not.toHaveBeenCalled();
});

it("M9 primary and Ultimate effects use current state snapshots before deferred rendering", () => {
  const test = scene();
  const view = (
    test as unknown as {
      view: {
        enemyVisualPoint: (state: EnemyState) => {
          x: number;
          y: number;
          scaleX: number;
        };
        showPrimary: ReturnType<typeof vi.fn>;
        showBarrage: ReturnType<typeof vi.fn>;
        renderEnemy: ReturnType<typeof vi.fn>;
      };
    }
  ).view;
  const point = vi.spyOn(view, "enemyVisualPoint");
  view.showPrimary = vi.fn();
  view.showBarrage = vi.fn();
  view.renderEnemy = vi.fn();
  test.update(0, 16);
  expect(view.showPrimary).toHaveBeenCalled();
  const first = view.showPrimary.mock.calls[0]![0][0];
  expect(point.mock.results.some((result) => result.value === first)).toBe(
    true,
  );
  expect(first).toEqual({ x: 1, y: 540, scaleX: 1 });
  expect(view.showPrimary.mock.invocationCallOrder[0]).toBeLessThan(
    view.renderEnemy.mock.invocationCallOrder[0]!,
  );
  point.mockClear();
  view.renderEnemy.mockClear();
  test.burst.credit({ eliteKills: 20 });
  expect(test.activateUltimate()).toBe(true);
  const points = view.showBarrage.mock.calls[0]![0];
  expect(points).toEqual(point.mock.results.map((result) => result.value));
  expect(points[0].y).toBeGreaterThan(540);
  expect(view.renderEnemy).not.toHaveBeenCalled();
});

it("M11 scene snapshots wall/XP/defense research and settles natural endings once", () => {
  const values = new Map<string, string>();
  const store = new MetaStore({
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v);
    },
  });
  store.importSave(
    JSON.stringify({
      kind: "horde-meta",
      version: 1,
      account: { rerollLevel: 2 },
      characters: {
        marine: { research: { "wall-hp": 20, "wall-defense": 10, xp: 10 } },
      },
    }),
  );
  vi.spyOn(metaStore, "beginRun").mockImplementation(() => store.beginRun());
  const settle = vi
    .spyOn(metaStore, "settleRun")
    .mockImplementation((id, summary, evidence) =>
      store.settleRun(id, summary, evidence),
    );
  vi.spyOn(metaStore, "recordProgress").mockImplementation((id, evidence) =>
    store.recordProgress(id, evidence),
  );
  const test = scene();
  const lifecycle = test as unknown as {
    prepareRun(): void;
    finishRun(): void;
    resultShown: boolean;
    result: { show: ReturnType<typeof vi.fn> };
    runTicket: { id: string };
  };
  lifecycle.prepareRun();
  expect(test.run.wallHp).toBe(runBalance.wallMaxHp * 4.5);
  expect(test.progression.rerollsRemaining).toBe(2);
  test.takeWallDamage(100);
  expect(test.run.wallHp).toBe(runBalance.wallMaxHp * 4.5 - 55);
  const gain = vi.spyOn(test.progression, "gainXp");
  test.applyEnemyStates(
    test.enemies.map((e, i) => (i === 0 ? { ...e.state, hp: 0 } : e.state)),
  );
  expect(gain).toHaveBeenCalledWith(enemyConfigs.grunt.xpOnKill * 2.3);
  const abandonedId = lifecycle.runTicket.id;
  lifecycle.prepareRun(); // same entry point as pause restart; no settlement
  expect(settle).not.toHaveBeenCalled();
  expect(store.read().progress.completedRuns).toBe(0);
  expect(store.read().activeRunId).not.toBe(abandonedId);
  test.run = { ...test.run, status: "failed", elapsedMs: 600000 };
  lifecycle.finishRun();
  lifecycle.finishRun();
  expect(settle).toHaveBeenCalledTimes(1);
  expect(store.read().progress.completedRuns).toBe(1);
  expect(
    lifecycle.result.show.mock.calls[0]![0].settlement.reward.gold,
  ).toBeGreaterThan(0);
  lifecycle.prepareRun();
  lifecycle.resultShown = false;
  test.run = { ...test.run, status: "cleared" };
  lifecycle.finishRun();
  lifecycle.finishRun();
  expect(store.read().progress.stage1ClearCount).toBe(1);
  expect(store.read().progress.completedRuns).toBe(2);
  expect(values.has(META_STORAGE_KEY)).toBe(true);
});

function operationScene() {
  const values = new Map<string, string>();
  const store = new MetaStore({
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      values.set(k, v);
    },
  });
  vi.spyOn(metaStore, "beginRun").mockImplementation(() => store.beginRun());
  vi.spyOn(metaStore, "recordProgress").mockImplementation((id, evidence) =>
    store.recordProgress(id, evidence),
  );
  vi.spyOn(metaStore, "settleRun").mockImplementation((id, summary, evidence) =>
    store.settleRun(id, summary, evidence),
  );
  const test = scene() as SceneHarness & {
    prepareRun(): void;
    finishRun(): void;
    resultShown: boolean;
    result: { show: ReturnType<typeof vi.fn> };
  };
  test.prepareRun();
  test.relics = new PrototypeRelics(Math.random, getUnlocks(store.read()));
  return { test, store };
}
it("M12 fresh scene gates rewards and natural failure opens grenade for the next Run", () => {
  const { test, store } = operationScene();
  expect(test.progression.special.capacity).toBe(0);
  expect(test.progression.special.acquireWeapon("grenade")).toBe(false);
  test.enemies[0]!.state.elite = true;
  test.applyEnemyStates(
    test.enemies.map((e, i) => (i === 0 ? { ...e.state, hp: 0 } : e.state)),
  );
  expect(test.relics.pending).toBe(false);
  expect(test.progression.core).toBeNull();
  expect(store.read().characters.marine.completedOperationRecords).toContain(
    "first-elite",
  );
  expect(
    store.read().characters.marine.completedOperationRecords,
  ).not.toContain("elite-sniper");
  test.takeWallDamage(test.run.wallHp);
  test.finishRun();
  const settlement = test.result.show.mock.calls[0]![0].settlement;
  expect(settlement.operations.completed).toContain("first-operation");
  expect(settlement.operations.completed).toContain("first-elite");
  expect(getUnlocks(store.read()).specialWeapons).toEqual(["grenade"]);
  test.prepareRun();
  expect(test.progression.special.capacity).toBe(1);
  expect(test.progression.special.acquireWeapon("grenade")).toBe(true);
});
it("M12 actual Gauss damage tracks unique action hits and kills, then survives manual restart", () => {
  const { test, store } = operationScene();
  test.progression.ranks.penetration = 3;
  test.progression.quality.penetration = 3;
  test.enemies = [1, 2, 3].map((id) => ({
    state: {
      ...enemy(id),
      hp: 1,
      progress01: 0.8 - id * 0.01,
      elite: id === 1,
    },
    attackElapsedMs: 0,
    visual: { destroy: noop },
  }));
  test.refreshBuild();
  test.update(0, 0);
  const marine = store.read().characters.marine;
  expect(marine.operationProgress.primaryKills).toBe(3);
  expect(marine.completedOperationRecords).toEqual(
    expect.arrayContaining(["penetration-understanding"]),
  );
  expect(test.progression.special.capacity).toBe(0);
  test.prepareRun();
  expect(store.read().progress.completedRuns).toBe(0);
  expect(
    store.read().characters.marine.completedOperationRecords,
  ).not.toContain("first-operation");
  expect(getUnlocks(store.read()).basicMods).toEqual(
    expect.arrayContaining(["ricochet"]),
  );
});
it("M12 repeated hits on one enemy do not unlock three-target record; real critical unlocks research", () => {
  const { test, store } = operationScene();
  test.enemies = [test.enemies[0]!];
  test.progression.ranks.burst = 3;
  test.progression.quality.burst = 3;
  test.refreshBuild();
  vi.mocked(Math.random).mockReturnValue(0);
  test.update(0, 200);
  expect(test.shotIndex).toBe(3);
  expect(
    store.read().characters.marine.completedOperationRecords,
  ).not.toContain("penetration-understanding");
  expect(store.read().characters.marine.completedOperationRecords).toContain(
    "first-critical",
  );
  expect(getUnlocks(store.read()).research).toContain("critical-damage");
});

it("M12 a synergy activated by a mastery unlock is saved before the next frame or choice", () => {
  const { test, store } = operationScene();
  for (const id of [
    "first-operation",
    "hold-line",
    "combat-adaptation",
    "first-elite",
    "endurance",
    "boss-encounter",
    "first-victory",
    "penetration-understanding",
    "continuous-fire",
    "elite-sniper",
    "mass-kills",
    "powerful-choice",
    "complete-rifle",
    "grenade-mastery",
    "retarget",
    "drone-mastery",
    "dual-armament",
    "first-critical",
  ] as const)
    store.completeRecord(id);
  expect(getUnlocks(store.read()).synergySystem).toBe(false); //21 points
  test.prepareRun();
  test.progression.ranks.burst = 1;
  test.progression.ranks.incendiary = 1;
  test.progression.special.acquireWeapon("missile");
  test.progression.special.acquireWeapon("drone");
  Object.assign(test.progression.special.weapons[0]!, {
    level: 10,
    tree: "hunter",
    branch: "b",
  });
  Object.assign(test.progression.special.weapons[1]!, {
    level: 10,
    tree: "squadron",
    branch: "b",
  });
  (test as unknown as { trackOperations(): void }).trackOperations();
  expect(test.synergies.active.has("hunt")).toBe(true);
  expect(
    test.telemetry
      .report()
      .v2!.growthEvents.filter(
        (e) => e.kind === "synergy-activation" && e.id === "hunt",
      ),
  ).toHaveLength(1);
  expect(store.read().characters.marine.completedOperationRecords).toEqual(
    expect.arrayContaining(["first-completion", "first-synergy"]),
  );
});

it("M12 mod branch pauses all combat even after the ordinary choice was consumed", () => {
  const test = scene();
  test.progression.ranks.burst = 4;
  test.progression.quality.burst = 4;
  test.progression.pendingChoices = 1;
  vi.mocked(Math.random).mockReturnValue(0.99999);
  expect(test.progression.offer().some((card) => card.id === "burst")).toBe(
    true,
  );
  vi.mocked(Math.random).mockReturnValue(0);
  expect(test.progression.choose("burst")).toBe(true);
  expect(test.progression.pendingChoices).toBe(0);
  expect(test.progression.ranks.burst).toBe(5);
  const before = test.run.elapsedMs;
  test.update(0, 500);
  expect(test.run.elapsedMs).toBe(before);
  expect(test.shotIndex).toBe(0);
  const ui = { showModBranch: vi.fn(), hide: vi.fn() };
  Object.assign(test, { choices: ui });
  const show = (CombatScene.prototype as unknown as { showChoices(): void })
    .showChoices;
  show.call(test);
  expect(ui.showModBranch).toHaveBeenCalledTimes(1);
  const select = ui.showModBranch.mock.calls[0]![1] as (id: string) => void;
  select("b");
  expect(test.progression.ranks.burst).toBe(6);
  expect(test.progression.branches).toEqual({ burst: "b" });
  expect(test.telemetry.report().v2!.growthEvents).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "basic-mod-branch",
        id: "burst",
        previousLevel: 5,
        nextLevel: 6,
        choice: expect.stringContaining("b:"),
      }),
      expect.objectContaining({
        kind: "basic-mod-growth",
        id: "burst",
        previousLevel: 5,
        nextLevel: 6,
      }),
    ]),
  );
  test.update(0, 0);
  expect(test.shotIndex).toBe(1);
});
it("M12 primary action snapshots mod branches for the entire burst", () => {
  const test = scene();
  test.progression.ranks.burst = 5;
  test.progression.quality.burst = 5;
  Object.assign(test.progression.branches, { burst: "a" });
  test.refreshBuild();
  test.update(0, 0);
  const actions = (
    test as unknown as {
      primaryActions: Map<
        unknown,
        { growth: { branches?: { burst?: string } } }
      >;
    }
  ).primaryActions;
  const started = [...actions.values()][0]!;
  expect(started.growth.branches).toEqual({ burst: "a" });
  Object.assign(test.progression.branches, { burst: "b" });
  expect(started.growth.branches).toEqual({ burst: "a" });
});

it("telemetry observes actual Gauss loss once and X8 uses the same Stage clock", () => {
  const normal = scene(),
    fast = scene();
  fast.gameSpeed = 8;
  const startHp = normal.enemies.reduce(
    (sum, entry) => sum + entry.state.hp,
    0,
  );
  normal.update(0, 1000);
  fast.update(0, 125);
  const a = normal.telemetry.report()!,
    b = fast.telemetry.report()!;
  expect(a.metrics.stageMs).toBeCloseTo(1000);
  expect(b.metrics).toEqual({ ...a.metrics, speed: 8 });
  const damage =
    startHp - normal.enemies.reduce((sum, entry) => sum + entry.state.hp, 0);
  expect(a.metrics.sourceDps.Gauss * a.metrics.windowSeconds).toBeCloseTo(
    damage,
  );
  expect(a.metrics.totalDps).toBe(a.metrics.sourceDps.Gauss);
  normal.manualPaused = true;
  normal.update(0, 10000);
  expect(normal.telemetry.report()!.metrics).toEqual(a.metrics);
});

it("telemetry integrates wall pressure and first mod acquisitions without repeat upgrades", () => {
  const test = scene();
  test.enemies[0]!.state.progress01 = 1;
  test.enemies[0]!.state.phase = "attacking";
  test.update(0, 1000);
  const report = test.telemetry.report()!;
  expect(
    (report.metrics.wallReachPerMin * report.metrics.windowSeconds) / 60,
  ).toBe(1);
  test.update(0, 1000);
  const later = test.telemetry.report()!;
  expect(
    (later.metrics.wallReachPerMin * later.metrics.windowSeconds) / 60,
  ).toBe(1);
  expect(later.metrics.wallDamage).toBeGreaterThan(0);
  test.progression.ranks.burst = 1;
  test.refreshBuild();
  test.progression.ranks.burst = 2;
  test.refreshBuild();
  expect(
    test.telemetry.report()!.modEvents.filter((e) => e.id === "burst"),
  ).toHaveLength(1);
});

it("telemetry v2 connects spawned lifetimes, near-wall thresholds and active-only frame performance", () => {
  const test = scene();
  Object.assign(test, { game: { loop: { actualFps: 60 } } });
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  test.gameSpeed = 8;
  test.enemies[0]!.state.progress01 = 0.75;
  test.enemies[1]!.state.progress01 = 0.9;
  test.update(0, 125);
  expect(test.telemetry.report().metrics).toMatchObject({
    nearWall75: 2,
    nearWall90: 1,
    speed: 8,
  });
  const first = test.telemetry.report().v2!.performance;
  expect(first).toMatchObject({
    frames: 1,
    averageFps: 60,
    minFps: 60,
    effectiveSpeed: 8,
  });
  expect(first.maxSubsteps).toBeGreaterThan(1);
  test.manualPaused = true;
  now = 10000;
  test.update(0, 10000);
  expect(test.telemetry.report().v2!.performance).toEqual(first);
  test.manualPaused = false;
  now += 125;
  test.update(0, 125);
  expect(test.telemetry.report().v2!.performance.effectiveSpeed).toBeCloseTo(8);
  const add = test as unknown as { addEnemy(enemy: EnemyState): void };
  const spawned = { ...enemy(999), kind: "runner" as const, hp: 1 };
  add.addEnemy(spawned);
  test.run = { ...test.run, elapsedMs: test.run.elapsedMs + 2000 };
  test.applyEnemyStates(
    test.enemies.map((e) =>
      e.state.id === 999 ? { ...e.state, hp: 0 } : e.state,
    ),
  );
  const report = test.telemetry.report();
  expect(report.metrics.spawns).toBe(1);
  expect(report.metrics.kills).toBe(1);
  expect(report.v2!.enemyLifetime.Runner).toMatchObject({
    count: 1,
    averageSeconds: 2,
  });
});

it("telemetry v2 distinguishes boss HP crossings from mechanics actually executed", () => {
  const test = scene();
  test.enemies = [];
  test.run = { ...test.run, elapsedMs: siegeBossBalance.spawnMs };
  test.advanceWorld(1);
  const boss = test.enemies.find((e) => e.state.boss)!;
  expect(boss).toBeDefined();
  test.applyEnemyStates([{ ...boss.state, hp: boss.state.maxHp! * 0.2 }]);
  test.advanceWorld(1);
  test.applyEnemyStates(test.enemies.map((e) => ({ ...e.state, hp: 0 })));
  const report = test.telemetry.report().v2!.bossEvents;
  const kinds = report.events.map((e) => e.kind);
  expect(kinds).toEqual(
    expect.arrayContaining([
      "spawn",
      "first-hit",
      "hp-65",
      "hp-25",
      "reinforcement",
      "final-charge",
      "death",
    ]),
  );
  expect(kinds).not.toContain("siege-charge");
  expect(kinds).not.toContain("wall-hit");
  expect(report.fightDuration).toBeGreaterThan(0);
});

it("telemetry records actual relic selection, replacement and skip callbacks", () => {
  const test = scene();
  const ui = {
    showPrototypeRelics: vi.fn(),
    showRelicReplacement: vi.fn(),
    hide: noop,
  };
  Object.assign(test, { choices: ui });
  const show = (CombatScene.prototype as unknown as { showChoices(): void })
    .showChoices;
  for (let reward = 0; reward < 4; reward++) {
    test.relics.pendingRewards++;
    show.call(test);
    const offered = test.relics.offer();
    const select = ui.showPrototypeRelics.mock.lastCall![1] as (
      id: string,
    ) => void;
    select(offered[0]!.id);
    if (test.relics.pendingReplacement) {
      show.call(test);
      if (reward === 2) {
        const replace = ui.showRelicReplacement.mock.lastCall![2] as (
          id: string,
        ) => void;
        replace([...test.relics.owned][0]!);
      } else {
        const skip = ui.showRelicReplacement.mock.lastCall![3] as () => void;
        skip();
      }
    }
  }
  const report = test.telemetry.report().v2!;
  expect(report.growthEvents.map((e) => e.kind)).toEqual([
    "relic-acquisition",
    "relic-acquisition",
    "relic-selection",
    "relic-replacement",
    "relic-selection",
    "relic-skip",
  ]);
  expect(report.powerSpikeObservations.map((o) => o.event.kind)).toEqual([
    "relic-acquisition",
    "relic-acquisition",
    "relic-replacement",
  ]);
});

it("incendiary rounds ignite actual Gauss victims; DoT gives primary kill XP without on-hit recursion", () => {
  const { test, store } = operationScene();
  test.progression.ranks.incendiary = 1;
  test.progression.quality.incendiary = 1;
  test.refreshBuild();
  test.update(0, 0);
  expect(test.incendiary.has(1)).toBe(true);
  const shotIndex = test.shotIndex;
  const hooks = vi.spyOn(test.specialWeapons, "onPrimary");
  const synergyHits = vi.spyOn(test.synergies, "registerHits");
  test.enemies[0]!.state.hp = 0.001;
  const xpBefore = test.progression.xp;
  test.advanceWorld(500);
  expect(test.kills).toBe(1);
  expect(test.progression.xp).toBeGreaterThan(xpBefore);
  expect(store.read().characters.marine.operationProgress.primaryKills).toBe(1);
  expect(test.incendiary.has(1)).toBe(false);
  expect(test.shotIndex).toBe(shotIndex);
  expect(hooks).not.toHaveBeenCalled();
  expect(synergyHits).not.toHaveBeenCalled();
  expect(test.telemetry.report().metrics.sourceDps.Gauss).toBeGreaterThan(0);
});

it("incendiary uses combat delta once at X8 and pauses during manual/level-up choice", () => {
  const a = scene(),
    b = scene();
  b.gameSpeed = 8;
  for (const t of [a, b]) {
    t.progression.ranks.incendiary = 1;
    const config = getIncendiaryStats(t.progression.growth);
    t.incendiary.ignite(1, 10, config);
  }
  a.update(0, 1000);
  b.update(0, 125);
  expect(b.enemies.map((e) => e.state.hp)).toEqual(
    a.enemies.map((e) => e.state.hp),
  );
  a.manualPaused = true;
  const hp = a.enemies[0]!.state.hp;
  a.update(0, 1000);
  expect(a.enemies[0]!.state.hp).toBe(hp);
  a.manualPaused = false;
  a.progression.pendingChoices = 1;
  a.update(0, 1000);
  expect(a.enemies[0]!.state.hp).toBe(hp);
});

it.each(["penetration", "ricochet", "multishot", "explosive"] as const)(
  "Gauss %s victims ignite once per round even with overlapping explosion hits",
  (mod) => {
    const test = scene();
    test.progression.ranks.incendiary = 1;
    test.progression.quality.incendiary = 1;
    test.progression.ranks[mod] = 3;
    test.progression.quality[mod] = 3;
    test.progression.ranks.explosive = 3;
    test.progression.quality.explosive = 3;
    test.refreshBuild();
    test.update(0, 0);
    expect(test.incendiary.has(1)).toBe(true);
    expect(test.incendiary.has(2)).toBe(true);
    const before = test.enemies.map((e) => e.state.hp);
    test.advanceWorld(500);
    const oneStack =
      gaussRifleBalance.damagePerRound *
      marineConfig.baseStats.damageMultiplier *
      getMarineStats(test.progression.growth).primaryDamageMultiplier *
      getIncendiaryStats(test.progression.growth).tickFactor;
    test.enemies.forEach((entry, i) =>
      expect(before[i]! - entry.state.hp).toBeCloseTo(oneStack),
    );
  },
);

it("the next burst round adds another stack; specials cannot ignite by themselves", () => {
  const test = scene();
  test.progression.ranks.incendiary = 1;
  test.progression.quality.incendiary = 1;
  test.progression.ranks.burst = 1;
  test.progression.quality.burst = 1;
  test.refreshBuild();
  test.update(0, 0);
  test.update(0, 150); // second round, still before the first 500ms burn tick
  expect(test.shotIndex).toBe(2);
  const before = test.enemies[0]!.state.hp;
  test.advanceWorld(500);
  const oneStack =
    gaussRifleBalance.damagePerRound *
    marineConfig.baseStats.damageMultiplier *
    getMarineStats(test.progression.growth).primaryDamageMultiplier *
    getIncendiaryStats(test.progression.growth).tickFactor;
  expect(before - test.enemies[0]!.state.hp).toBeCloseTo(oneStack * 2);
  const special = scene();
  special.progression.ranks.incendiary = 1;
  special.progression.special.acquireWeapon("drone");
  special.advanceWorld(1500);
  expect(special.enemies.some((e) => e.state.hp < 10000)).toBe(true);
  expect(special.incendiary.size).toBe(0);
});
