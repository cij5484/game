import { afterEach, expect, it } from "vitest";
import {
  runtimeObject,
  configureFields,
  setOverrides,
  updateOverride,
  getOverrides,
  resetOverrides,
} from "../../src/game/dev/runtimeBalance";
const live = runtimeObject("testBalance", {
  damage: 10,
  hp: 8,
  nested: { cycle: 800 },
  enabled: true,
});
configureFields([
  {
    id: "testBalance.damage",
    label: "피해",
    group: "검증",
    description: "설명",
    apply: "다음 공격부터",
    min: 0,
    max: 100,
    step: 1,
  },
  {
    id: "testBalance.hp",
    label: "체력",
    group: "검증",
    description: "설명",
    apply: "다음 적 생성부터",
    min: 1,
    max: 100,
  },
  {
    id: "testBalance.nested.cycle",
    label: "주기",
    group: "검증",
    description: "설명",
    apply: "다음 공격부터",
    min: 1,
    max: 10000,
  },
  {
    id: "testBalance.enabled",
    label: "활성",
    group: "검증",
    description: "설명",
    apply: "즉시 적용",
  },
]);
afterEach(resetOverrides);
it("keeps stable config references, preserves defaults and resets overrides", () => {
  const nested = live.nested;
  updateOverride("testBalance.nested.cycle", 400);
  expect(nested.cycle).toBe(400);
  expect(live.damage).toBe(10);
  expect(getOverrides()).toEqual({ "testBalance.nested.cycle": 400 });
  resetOverrides();
  expect(nested.cycle).toBe(800);
});
it("rejects unknown, prototype, nonfinite, wrongtype and out-of-range imports atomically", () => {
  updateOverride("testBalance.damage", 20);
  for (const value of [
    { unknown: 1 },
    { "__proto__.x": 1 },
    { "testBalance.damage": NaN },
    { "testBalance.damage": 101 },
    { "testBalance.enabled": 1 },
    { "testBalance.damage": 1.5 },
  ]) {
    expect(() => setOverrides(value)).toThrow();
    expect(live.damage).toBe(20);
  }
  setOverrides({ "testBalance.enabled": false });
  expect(live.enabled).toBe(false);
  expect(live.damage).toBe(10);
});
