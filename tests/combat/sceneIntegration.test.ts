import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("phaser", () => ({ default: { Scene: class {} } }));
import { CombatScene } from "../../src/game/scenes/CombatScene";
import type { EnemyState } from "../../src/game/enemies/enemySimulation";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import type { GaussRifle } from "../../src/game/combat/gaussRifle";
import type { MarineProgression as Progression } from "../../src/game/progression/marineProgression";
import { SpawnDirector } from "../../src/game/waves/spawnDirector";
import type {
  RelicCombat,
  EchoVolley,
} from "../../src/game/combat/relicCombat";
import type { Burst } from "../../src/game/combat/burst";
import type { TargetFocus } from "../../src/game/combat/targeting";
import type { Point } from "../../src/game/input/gestureRecognizer";
import { Stimpack } from "../../src/game/combat/stimpack";
import { stimpackBalance } from "../../src/game/data/balance";
import { runBalance } from "../../src/game/data/run";
import type { Relics } from "../../src/game/progression/relics";
import type { RunState } from "../../src/game/model/runState";

interface SceneHarness {
  spawnBatch(): void;
  rifle: GaussRifle;
  relics: Relics;
  refreshBuild(): void;
  burst: Burst;
  progression: Progression;
  director: SpawnDirector;
  relicCombat: RelicCombat;
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
    view: {
      createEnemy: () => ({ destroy: noop }),
      showImpacts: noop,
      showNotice: noop,
      showPrimary: noop,
      showMagic: noop,
      showBarrage: noop,
      showGesture: noop,
      renderEnemy: noop,
      renderWall: noop,
      renderProgression: noop,
      setFocus: noop,
      pickEnemy: (x: number) => (x > 0 ? x : null),
    },
    pauseUi: { setBlocked: noop, setBuildDetails: noop },
    buildBar: { render: noop },
    burstUi: { renderBuild: noop },
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
  expect(spam.run.elapsedMs).toBe(999);
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
    const castHook = vi.spyOn(test.relicCombat, "onMagic");
    const frostHook = vi.spyOn(test.relicCombat, "onPrimaryFrost");
    const before = test.enemies.map((e) => ({ ...e.state }));
    test.handleGesture(points, points);
    expect(test.enemies.map((e) => e.state)).toEqual(before);
    expect(test.kills).toBe(0);
    expect(test.progression.xp).toBe(0);
    expect(test).not.toHaveProperty("magic");
    expect(castHook).not.toHaveBeenCalled();
    test.update(0, 800);
    control.update(0, 800);
    expect(test.enemies.map((e) => e.state)).toEqual(
      control.enemies.map((e) => e.state),
    );
    expect(frostHook).not.toHaveBeenCalled();
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
it("echo level-up before a pending shot pauses without consuming that shot or extra world time", () => {
  const test = scene();
  test.update(0, 0);
  test.rifle.advance(790, noop);
  test.progression.xp = test.progression.threshold - 1;
  test.enemies[1]!.state.hp = 1;
  test.echoRounds = [
    {
      dueMs: 5,
      volley: {
        targetId: 1,
        ranks: {},
        baseDamage: 1,
        rounds: 1,
        damageMultiplier: 1,
      },
    },
  ];
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
  test.update(0, 2500);
  // Recovery contributes500 weapon-ms; subsequent1500ms total2000ms => shots at0/800/1600.
  expect(test.shotIndex).toBe(3);
  expect(test.rifle.timeToEventMs).toBeCloseTo(400);
  expect(test.run.elapsedMs).toBeCloseTo(2500);
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
it("scene echo rounds retarget, consume a bounded queue and never create new echoes", () => {
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
it("ultimate kills salvage wall HP without refilling their own gauge through a relic", () => {
  const test = scene();
  test.relicCombat.setLevels({ "emergency-reclaimer": 5 });
  test.run.wallHp = 100;
  test.enemies[0]!.state.progress01 = 0.95;
  test.applyEnemyStates(
    test.enemies.map((e) => ({
      ...e.state,
      hp: e.state.id === 1 ? 0 : e.state.hp,
    })),
    false,
    false,
    false,
  );
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

it("ultimate presentation crosses Stim boundaries before delayed echo kills and defers choices until it ends", () => {
  const test = scene();
  test.ultimateRemainingMs = 650;
  test.stimpack.activate();
  test.stimpack.advance(4999);
  test.relicCombat.setLevels({ "adrenaline-pump": 5 });
  test.progression.xp = test.progression.threshold - 1;
  test.enemies[1]!.state.hp = 1;
  test.echoRounds = [
    {
      dueMs: 8,
      volley: {
        targetId: 1,
        ranks: {},
        baseDamage: 1,
        rounds: 1,
        damageMultiplier: 1,
      },
    },
  ];
  test.update(0, 16);
  expect(test.kills).toBe(1);
  expect(test.stimpack.phase).toBe("crash");
  expect(test.stimpack.timeToBoundaryMs).toBe(985);
  expect(test.run.elapsedMs).toBe(16);
  expect(test.ultimateRemainingMs).toBe(634);
  expect(test.progression.pendingChoices).toBe(1);
  test.update(0, 634);
  expect(test.run.elapsedMs).toBe(650);
  expect(test.ultimateRemainingMs).toBe(0);
  expect(test.stimpack.timeToBoundaryMs).toBe(351);
  expect(test.shotIndex).toBe(1);
  test.update(0, 1000);
  expect(test.run.elapsedMs).toBe(650);
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
  expect(presenting.ultimateRemainingMs).toBe(250);
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
  test.update(0, 799);
  expect(test.shotIndex).toBe(1);
  test.update(0, 1);
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
        choices.every(
          (c) => c.ability === "gauss-rifle" || c.ability === "stimpack",
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

it.each([
  { seed: 42, build: ["penetration", "burst", "explosive"] },
  { seed: 73, build: ["ricochet", "multishot", "heavy"] },
  { seed: 2026, build: ["burst", "multishot", "explosive"] },
])(
  "advances twenty minutes with M4 growth and bounded horde ($seed)",
  ({ seed, build }) => {
    // Technical endurance check with wall refill; not a survival/balance claim.
    let rng = seed;
    vi.spyOn(Math, "random").mockImplementation(() => {
      rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
      return rng / 4294967296;
    });
    const test = scene();
    test.enemies = [];
    Object.assign(test, { nextEnemyId: 0 });
    Object.assign(test.director, { nextSpawnAtMs: 0 });
    let peak = 0,
      sum = 0,
      samples = 0;
    const phases = Array.from({ length: 4 }, () => ({
      sum: 0,
      n: 0,
      peak: 0,
      level: 1,
    }));
    const started = performance.now();
    while (test.run.elapsedMs < runBalance.durationMs && samples++ < 3000) {
      while (test.progression.pendingChoices > 0) {
        const offered = test.progression.offer();
        const pick =
          offered.find((c) => build.includes(c.id)) ??
          offered.find((c) =>
            ["primary-damage", "attack-speed", "range", "crit-chance"].includes(
              c.id,
            ),
          ) ??
          offered[0];
        expect(pick).toBeDefined();
        test.progression.choose(pick!.id);
        test.refreshBuild();
      }
      while (test.relics.pendingRewards > 0) {
        const card = test.relics.offer()[0];
        if (!card) break;
        test.relics.choose(card.id);
        test.refreshBuild();
      }
      test.run.wallHp = runBalance.wallMaxHp;
      test.update(0, 1000);
      peak = Math.max(peak, test.enemies.length);
      sum += test.enemies.length;
      const phase =
        phases[Math.min(3, Math.floor(test.run.elapsedMs / 300000))]!;
      phase.sum += test.enemies.length;
      phase.n++;
      phase.peak = Math.max(phase.peak, test.enemies.length);
      phase.level = test.progression.level;
      expect(test.enemies.length).toBeLessThanOrEqual(700);
    }
    expect(test.run.elapsedMs).toBe(runBalance.durationMs);
    expect(test.run.status).toBe("cleared");
    expect(test.kills).toBeGreaterThan(0);
    console.log(
      JSON.stringify({
        kind: "M4 scene wall-refill technical fixture",
        seed,
        build,
        elapsedMs: Math.round(performance.now() - started),
        kills: test.kills,
        level: test.progression.level,
        averageActive: Math.round((sum / samples) * 100) / 100,
        peak,
        phases: phases.map((p) => ({
          average: Math.round((p.sum / p.n) * 100) / 100,
          peak: p.peak,
          level: p.level,
        })),
        ranks: test.progression.ranks,
      }),
    );
  },
  30000,
);

it("Marine reward growth excludes magic-only relics and exhausts without pausing forever", () => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  const test = scene();
  test.relics.expandCapacity();
  for (let i = 0; i < 25; i++) {
    test.relics.reward();
    const cards = test.relics.offer();
    expect(
      cards.every((c) => c.id !== "time-gear" && c.id !== "frost-resonator"),
    ).toBe(true);
    if (cards[0]) test.relics.choose(cards[0].id);
  }
  expect(test.relics.pendingRewards).toBe(0);
});

it.each([0, 0.5, 0.999])(
  "first normal Gauss shot starts in 3-5s at RNG %s without input",
  (random) => {
    const test = scene();
    test.director = new SpawnDirector(() => random);
    test.enemies = [];
    test.spawnBatch();
    while (test.shotIndex === 0 && test.run.elapsedMs < 6000)
      test.update(0, 16);
    expect(test.shotIndex).toBe(1);
    expect(test.run.elapsedMs).toBeGreaterThanOrEqual(3000);
    expect(test.run.elapsedMs).toBeLessThanOrEqual(5000);
    console.log(`First shot at ${test.run.elapsedMs}ms, random=${random}`);
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

it("records an unassisted-wall M4 run with automatic ability use", () => {
  let rng = 42;
  vi.spyOn(Math, "random").mockImplementation(() => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  });
  const test = scene();
  test.enemies = [];
  Object.assign(test, { nextEnemyId: 0 });
  Object.assign(test.director, { nextSpawnAtMs: 0 });
  let steps = 0,
    peak = 0;
  while (test.run.status === "running" && steps++ < 4000) {
    while (test.progression.pendingChoices > 0) {
      const choices = test.progression.offer();
      const desired = ["burst", "penetration", "explosive"];
      const pick =
        choices.find(
          (c) =>
            desired.includes(c.id) && (test.progression.ranks[c.id] ?? 0) < 5,
        ) ??
        choices.find((c) =>
          ["primary-damage", "attack-speed", "range"].includes(c.id),
        ) ??
        choices.find((c) => desired.includes(c.id)) ??
        choices[0]!;
      test.progression.choose(pick.id);
      test.refreshBuild();
    }
    while (test.relics.pendingRewards > 0) {
      const c = test.relics.offer()[0];
      if (!c) break;
      test.relics.choose(c.id);
      test.refreshBuild();
    }
    test.activateStim();
    if (test.enemies.length >= 20) test.activateUltimate();
    test.update(0, 1000);
    peak = Math.max(peak, test.enemies.length);
  }
  expect(test.run.status).not.toBe("running");
  expect(test.run.elapsedMs).toBeLessThanOrEqual(runBalance.durationMs);
  console.log(
    JSON.stringify({
      kind: "M4 no wall refill; automated choices and abilities, not human playtest",
      seed: 42,
      status: test.run.status,
      timeSeconds: Math.round(test.run.elapsedMs / 1000),
      kills: test.kills,
      level: test.progression.level,
      peak,
      wallHp: Math.ceil(test.run.wallHp),
      ranks: test.progression.ranks,
    }),
  );
}, 30000);
