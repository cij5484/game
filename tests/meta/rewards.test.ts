import { expect, it } from "vitest";
import { calculateRunReward } from "../../src/game/data/meta";

it("uses stage time and bounded kill bonuses for failed and cleared rewards", () => {
  expect(
    calculateRunReward({
      status: "failed",
      elapsedMs: 0,
      kills: 0,
      eliteKills: 0,
      bossKills: 0,
    }),
  ).toEqual({ gold: 100, credits: 0 });
  expect(
    calculateRunReward({
      status: "failed",
      elapsedMs: 600_000,
      kills: 500,
      eliteKills: 2,
      bossKills: 0,
    }),
  ).toEqual({ gold: 380, credits: 7 });
  expect(
    calculateRunReward({
      status: "cleared",
      elapsedMs: 1_200_000,
      kills: 100_000,
      eliteKills: 50,
      bossKills: 1,
    }),
  ).toEqual({ gold: 1200, credits: 35 });
  expect(
    calculateRunReward({
      status: "cleared",
      elapsedMs: 9_999_999,
      kills: 1_000_000,
      eliteKills: 500,
      bossKills: 1,
    }),
  ).toEqual({ gold: 1200, credits: 35 });
  expect(() =>
    calculateRunReward({
      status: "failed",
      elapsedMs: NaN,
      kills: 0,
      eliteKills: 0,
      bossKills: 0,
    }),
  ).toThrow();
});
