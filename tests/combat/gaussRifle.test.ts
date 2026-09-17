import { expect, it } from "vitest";
import { GaussRifle } from "../../src/game/combat/gaussRifle";
import { gaussRifleBalance } from "../../src/game/data/weapons";
it("fires continuously without requests and keeps a stable fire rate", () => {
  const rifle = new GaussRifle(gaussRifleBalance);
  let rounds = 0;
  rifle.advance(1000, () => {
    rounds++;
  });
  expect(rounds).toBe(6);
});
it("does not fire at a held simulation endpoint and resumes exactly once", () => {
  const rifle = new GaussRifle(gaussRifleBalance);
  let rounds = 0;
  rifle.advance(0, () => {
    rounds++;
  });
  rifle.advance(
    200,
    () => {
      rounds++;
    },
    false,
  );
  expect(rounds).toBe(1);
  rifle.advance(0, () => {
    rounds++;
  });
  expect(rounds).toBe(2);
});
