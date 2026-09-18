import { expect, it, vi } from "vitest";
import type Phaser from "phaser";
vi.mock("phaser", () => ({ default: {} }));
import { EnemyPressureView } from "../../src/game/battlefield/EnemyPressureView";
import { createPrototypeEnemy } from "../../src/game/enemies/enemyFactory";
import { createSiegeBoss } from "../../src/game/enemies/siegeBoss";

function graphics() {
  return {
    parentContainer: {},
    clear: vi.fn().mockReturnThis(),
    setActive: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    lineBetween: vi.fn().mockReturnThis(),
    fillStyle: vi.fn().mockReturnThis(),
    fillCircle: vi.fn().mockReturnThis(),
    strokeCircle: vi.fn().mockReturnThis(),
  };
}
function harness() {
  const callbacks: (() => void)[] = [];
  const addGraphics = vi.fn(graphics);
  const view = Object.assign(Object.create(EnemyPressureView.prototype), {
    scene: {
      add: { graphics: addGraphics },
      time: {
        delayedCall: (_delay: number, callback: () => void) =>
          callbacks.push(callback),
      },
    },
    world: { add: vi.fn(), bringToTop: vi.fn() },
    flashPool: [],
    activeFlashes: 0,
    frameFlashes: 0,
    frameImpactTargets: 0,
    marineY: 922,
    wallY: 900,
    farY: 0,
    attackSlots: new Map(),
    debugVisible: false,
    focusId: null,
  }) as EnemyPressureView;
  return { view, addGraphics, callbacks };
}
const target = { x: 100, y: 200, scaleX: 1 } as Phaser.GameObjects.Container;

it("bounds transient objects per frame and active lifetime, then reuses Graphics", () => {
  const { view, addGraphics, callbacks } = harness();
  for (let frame = 0; frame < 6; frame++) {
    view.beginFrame();
    for (let shot = 0; shot < 30; shot++) view.showShot(target);
    expect(view.combatVfxCount).toBe(Math.min(64, (frame + 1) * 16));
  }
  expect(addGraphics).toHaveBeenCalledTimes(64);
  for (const expire of callbacks.splice(0)) expire();
  expect(view.combatVfxCount).toBe(0);
  const recycled = addGraphics.mock.results[63]!.value;
  expect(recycled.setVisible).toHaveBeenLastCalledWith(false);
  expect(recycled.setActive).toHaveBeenLastCalledWith(false);
  view.beginFrame();
  view.showShot(target);
  expect(view.combatVfxCount).toBe(1);
  expect(addGraphics).toHaveBeenCalledTimes(64);
  expect(recycled.setVisible).toHaveBeenLastCalledWith(true);
  expect(recycled.clear).toHaveBeenCalledTimes(3);
});

it("bounds visual target work across calls and resets only the frame budget", () => {
  const { view, addGraphics } = harness();
  const targets = Array.from({ length: 700 }, () => target);
  view.showMagic("frost-nova", targets);
  const effect = addGraphics.mock.results[0]!.value;
  expect(effect.strokeCircle).toHaveBeenCalledTimes(96);
  view.showMagic("frost-nova", targets);
  view.showShot(target);
  expect(addGraphics).toHaveBeenCalledTimes(1);
  view.beginFrame();
  view.showMagic("frost-nova", targets);
  expect(view.combatVfxCount).toBe(2);
  expect(addGraphics).toHaveBeenCalledTimes(2);
  expect(targets).toHaveLength(700);
});

it("updates shield, focus and Boss status without transforms or hidden debug text", () => {
  const { view } = harness();
  const shape = {
    setFillStyle: vi.fn().mockReturnThis(),
    setStrokeStyle: vi.fn().mockReturnThis(),
  };
  const label = { setText: vi.fn() };
  const bar = {
    setDisplaySize: vi.fn(),
    setText: vi.fn(),
    setVisible: vi.fn(),
  };
  const visual = {
    getAt: (index: number) => (index === 0 ? shape : label),
    getData: () => bar,
    setPosition: vi.fn(),
    setScale: vi.fn(),
    setY: vi.fn(),
  };
  const enemy = createPrototypeEnemy("shield", "center", 1);
  view.setFocus(enemy.id);
  view.renderEnemyStatus(
    visual as unknown as Phaser.GameObjects.Container,
    enemy,
    true,
  );
  expect(shape.setFillStyle).toHaveBeenCalledWith(0xb2f7ff);
  expect(shape.setStrokeStyle).toHaveBeenCalledWith(7, 0xffffff);
  expect(bar.setDisplaySize).toHaveBeenCalledWith(56, 7);
  expect(label.setText).not.toHaveBeenCalled();
  view.renderEnemyStatus(
    visual as unknown as Phaser.GameObjects.Container,
    createSiegeBoss(2),
  );
  expect(bar.setText).toHaveBeenCalled();
  expect(visual.setPosition).not.toHaveBeenCalled();
  expect(visual.setScale).not.toHaveBeenCalled();
  expect(visual.setY).not.toHaveBeenCalled();
});

it("uses current-state effect snapshots and the same geometry for the final enemy transform", () => {
  const { view, addGraphics } = harness();
  const enemy = {
    ...createPrototypeEnemy("grunt", "center", 1),
    progress01: 0.7,
  };
  const point = view.enemyVisualPoint(enemy);
  expect(point).toEqual({ x: 360, y: 630, scaleX: 0.85 });
  view.showPrimary([point], [], [enemy.id]);
  expect(addGraphics.mock.results[1]!.value.lineBetween).toHaveBeenCalledWith(
    360,
    922,
    360,
    630,
  );
  enemy.progress01 = 0.8;
  expect(point.y).toBe(630);
  const visual = { setPosition: vi.fn().mockReturnThis(), setScale: vi.fn() };
  const status = vi
    .spyOn(view, "renderEnemyStatus")
    .mockImplementation(() => {});
  const geometry = vi.spyOn(view, "enemyVisualPoint");
  for (const state of [
    enemy,
    createSiegeBoss(2),
    { ...createSiegeBoss(3), progress01: 1 },
  ]) {
    geometry.mockClear();
    view.renderEnemy(visual as unknown as Phaser.GameObjects.Container, state);
    expect(geometry).toHaveBeenCalledOnce();
    const current = geometry.mock.results[0]!.value;
    expect(visual.setPosition).toHaveBeenLastCalledWith(current.x, current.y);
    expect(visual.setScale).toHaveBeenLastCalledWith(current.scaleX);
    expect(status).toHaveBeenLastCalledWith(visual, state, false);
  }
  expect(view.enemyVisualPoint(createSiegeBoss(4)).y).toBe(92.5);
  expect(
    view.enemyVisualPoint({ ...createSiegeBoss(4), progress01: 1 }).y,
  ).toBe(842);
});

it("keeps attack slots stable for effect snapshots and releases them on lane changes or knockback", () => {
  const { view } = harness();
  const first = {
    ...createPrototypeEnemy("grunt", "center", 1),
    progress01: 1,
    phase: "attacking" as const,
  };
  const second = { ...first, id: 2 };
  expect(view.enemyVisualPoint(first)).toEqual({ x: 279, y: 900, scaleX: 1 });
  expect(view.enemyVisualPoint(second)).toEqual({ x: 333, y: 888, scaleX: 1 });
  expect(view.enemyVisualPoint(first)).toEqual({ x: 279, y: 900, scaleX: 1 });
  expect(view.enemyVisualPoint({ ...first, lane: "left" }).x).toBe(63);
  expect(view.enemyVisualPoint({ ...first, id: 3 }).x).toBe(279);
  view.enemyVisualPoint({ ...second, phase: "moving", progress01: 0.5 });
  expect(view.enemyVisualPoint({ ...first, id: 4 }).x).toBe(333);
});
