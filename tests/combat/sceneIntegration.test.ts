import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("phaser", () => ({ default: { Scene: class {} } }));
import { CombatScene } from "../../src/game/scenes/CombatScene";
import type { EnemyState } from "../../src/game/enemies/enemySimulation";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import type { GaussRifle } from "../../src/game/combat/gaussRifle";
import type { WeaponHeat } from "../../src/game/combat/traitCombat";
import type { Progression } from "../../src/game/progression/progression";
import type { SpawnDirector } from "../../src/game/waves/spawnDirector";
import type {
  RelicCombat,
  EchoVolley,
} from "../../src/game/combat/relicCombat";
import type { Burst } from "../../src/game/combat/burst";
import { burstBalance } from "../../src/game/data/burst";
import { Stimpack } from "../../src/game/combat/stimpack";
import { stimpackBalance } from "../../src/game/data/balance";
import type { RunState } from "../../src/game/model/runState";

interface SceneHarness {
  rifle: GaussRifle;
  burst: Burst;
  heat: WeaponHeat;
  progression: Progression;
  director: SpawnDirector;
  relicCombat: RelicCombat;
  stimpack: Stimpack;
  shotIndex: number;
  kills: number;
  run: RunState;
  enemies: {
    state: EnemyState;
    attackElapsedMs: number;
    visual: { destroy(): void };
  }[];
  echoRounds: { dueMs: number; volley: EchoVolley }[];
  advanceWorld(deltaMs: number): number;
  applyEnemyStates(
    states: readonly EnemyState[],
    chargeBurst?: boolean,
    magicKill?: boolean,
    allowRelicEnergy?: boolean,
  ): void;
  takeWallDamage(damage: number): void;
  fireEchoes(): void;
  update(time: number, deltaMs: number): void;
}
const noop = () => {};
const enemy = (id: number): EnemyState => ({
  ...createPrototypeEnemy("grunt", "center", id, 0.5),
  progress01: 0.1,
  hp: 10000,
  maxHp: 10000,
});
function scene(): SceneHarness {
  const instance = new CombatScene();
  const harness = instance as unknown as SceneHarness;
  // Only presentation is replaced: real scene update, rifle, statuses, progression and rewards run.
  Object.assign(instance, {
    view: {
      showImpacts: noop,
      showNotice: noop,
      showPrimary: noop,
      showMagic: noop,
      renderEnemy: noop,
      renderWall: noop,
      renderProgression: noop,
    },
    pauseUi: { setBlocked: noop },
    renderCombat: noop,
    renderBurst: noop,
    showChoices: noop,
    flushNotices: noop,
  });
  harness.director.spawn(0);
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

it("scene overheat preserves current volley and the first buffered target", () => {
  const test = scene();
  test.progression.ranks.overheat = 1;
  for (let i = 0; i < 9; i++) test.heat.fire(test.progression.ranks);
  test.rifle.request({ manualTargetId: 1 });
  test.rifle.request({ manualTargetId: 2 });
  test.update(0, 0);
  expect(test.shotIndex).toBe(1);
  expect(test.heat.locked).toBe(true);
  test.update(0, 1000);
  expect(test.shotIndex).toBe(1);
  // Keep spawning out of this controlled run without replacing the director clock.
  Object.assign(test.director, { nextSpawnAtMs: 20000 });
  test.update(0, 7000);
  expect(test.shotIndex).toBe(6);
  expect(test.rifle.phase).toBe("idle");
  expect(test.enemies.every((entry) => entry.state.hp < 10000)).toBe(true);
});

it("a DoT level-up before a pending round pauses without consuming that round or extra world time", () => {
  const test = scene();
  test.rifle.request({ manualTargetId: 1 });
  test.update(0, 0);
  // Put the real rifle ten milliseconds before its second round.
  test.rifle.advance(100, noop);
  test.progression.xp = test.progression.threshold - 1;
  test.enemies[1]!.state = {
    ...enemy(2),
    hp: 0.001,
    burn: {
      dps: 1,
      remainingMs: 1000,
      depth: 0,
      spreadTargets: 0,
      spreadRadius: 0,
      maxDepth: 0,
    },
  };
  Object.assign(test.director, { nextSpawnAtMs: 5 });
  test.update(0, 16);
  expect(test.progression.pendingChoices).toBe(1);
  expect(test.run.elapsedMs).toBe(5);
  expect(test.shotIndex).toBe(1);
  test.progression.pendingChoices = 0;
  Object.assign(test.director, { nextSpawnAtMs: 20000 });
  test.update(0, 4);
  expect(test.shotIndex).toBe(1);
  test.update(0, 1);
  expect(test.shotIndex).toBe(2);
});

it("scene commits a kill reward once even when the same external states are applied again", () => {
  const test = scene();
  const states = test.enemies.map((entry) => ({
    ...entry.state,
    hp: entry.state.id === 1 ? 0 : entry.state.hp,
  }));
  test.applyEnemyStates(states, false);
  expect(test.kills).toBe(1);
  expect(test.progression.xp).toBe(1);
  test.applyEnemyStates(states, false);
  expect(test.kills).toBe(1);
  expect(test.progression.xp).toBe(1);
});

it("scene suppression delays the next wall attack once and expires local slowing", () => {
  const test = scene();
  test.enemies = [
    {
      state: {
        ...enemy(1),
        progress01: 1,
        phase: "attacking",
        suppressionAttackDelayMs: 200,
        suppressionMs: 500,
        suppressionSlow: 0.4,
        suppressionImmunityMs: 2900,
      },
      attackElapsedMs: 900,
      visual: { destroy: noop },
    },
  ];
  const wall = test.run.wallHp;
  test.advanceWorld(299);
  expect(test.run.wallHp).toBe(wall);
  test.advanceWorld(1);
  expect(test.run.wallHp).toBe(wall - 5);
  test.advanceWorld(201);
  expect(test.enemies[0]!.state.suppressionMs).toBe(0);
  expect(test.enemies[0]!.state.suppressionAttackDelayMs).toBe(0);
});

it("scene echo rounds retarget, consume a bounded queue and never create new volleys", () => {
  const test = scene();
  test.relicCombat.setLevels({ "ammo-replicator": 5 });
  const volley: EchoVolley = {
    targetId: 1,
    ranks: {},
    baseDamage: 1,
    rounds: 3,
    damageMultiplier: 1,
  };
  test.echoRounds = Array.from({ length: 20 }, () => ({ dueMs: 0, volley }));
  test.fireEchoes();
  expect(test.echoRounds).toHaveLength(14);
  expect(test.enemies[0]!.state.hp).toBe(10000);
  expect(test.enemies[1]!.state.hp).toBe(9994);
  expect(test.relicCombat.advance(1000)).toEqual([]);
});

it("DoT level-up in rhythm advances Burst and Stim only by consumed simulation time", () => {
  const test = scene();
  test.burst.credit({ eliteKills: 20 });
  test.burst.activate();
  test.stimpack.activate();
  test.progression.xp = test.progression.threshold - 1;
  test.enemies[1]!.state = {
    ...enemy(2),
    hp: 0.001,
    burn: {
      dps: 1,
      remainingMs: 1000,
      depth: 0,
      spreadTargets: 0,
      spreadRadius: 0,
      maxDepth: 0,
    },
  };
  Object.assign(test.director, { nextSpawnAtMs: 5 });
  test.update(0, 100);
  expect(test.run.elapsedMs).toBe(5);
  expect(test.burst.elapsedMs).toBe(5 / burstBalance.timeScale);
  expect(test.stimpack.timeToBoundaryMs).toBe(stimpackBalance.boostMs - 5);
});

it("scene recovery integration emits all queued rounds across fractional timing boundaries", () => {
  const test = scene();
  test.stimpack = new Stimpack({
    ...stimpackBalance,
    boostMs: 20,
    crashMs: 10,
    recoveryMs: 1000,
  });
  test.stimpack.activate();
  test.stimpack.advance(30);
  Object.assign(test.director, { nextSpawnAtMs: 20000 });
  test.rifle.request({ manualTargetId: 1 });
  test.rifle.request({ manualTargetId: 2 });
  test.update(0, 2500);
  expect(test.shotIndex).toBe(6);
  expect(test.rifle.phase).toBe("idle");
});

it("Full Echo preserves manual marking continuity on its alternate target", () => {
  const test = scene();
  test.shotIndex = 4;
  test.progression.ranks.marking = 1;
  test.enemies[1]!.state = { ...enemy(2), markStacks: 2, markShotIndex: 4 };
  const volley: EchoVolley = {
    targetId: 1,
    ranks: { marking: 1 },
    baseDamage: 1,
    rounds: 3,
    damageMultiplier: 1,
  };
  test.echoRounds = Array.from({ length: 3 }, () => ({ dueMs: 0, volley }));
  test.fireEchoes();
  expect(test.shotIndex).toBe(4);
  expect(test.enemies[1]!.state.markStacks).toBe(2);
  expect(test.enemies[1]!.state.markShotIndex).toBe(4);
  test.rifle.request({ manualTargetId: 2 });
  test.update(0, 0);
  expect(test.enemies[1]!.state.markStacks).toBe(3);
});

it("ultimate kills may salvage wall HP but cannot refill their own Burst through a relic", () => {
  const test = scene();
  test.relicCombat.setLevels({ "emergency-reclaimer": 5 });
  test.run.wallHp = 100;
  test.enemies[0]!.state.progress01 = 0.95;
  const dead = test.enemies.map((e) => ({
    ...e.state,
    hp: e.state.id === 1 ? 0 : e.state.hp,
  }));
  test.applyEnemyStates(dead, false, false, false);
  expect(test.run.wallHp).toBe(105);
  expect(test.burst.gauge).toBe(0);
});
it("scene intercepts lethal wall damage before failure and consumes rescue once", () => {
  const test = scene();
  test.relicCombat.setLevels({ "emergency-reclaimer": 5 });
  test.run.wallHp = 1;
  test.enemies[0]!.state.progress01 = 1;
  test.takeWallDamage(100);
  expect(test.run.status).toBe("running");
  expect(test.run.wallHp).toBe(1);
  expect(test.enemies[0]!.state.progress01).toBeCloseTo(0.84);
  test.relicCombat.advance(1200);
  test.takeWallDamage(100);
  expect(test.run.status).toBe("failed");
});
