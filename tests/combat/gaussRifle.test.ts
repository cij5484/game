import { expect, it } from "vitest";
import { GaussRifle } from "../../src/game/combat/gaussRifle";
import { gaussRifleBalance } from "../../src/game/data/weapons";
const burst = {
  ...gaussRifleBalance,
  burstRounds: 3,
  roundIntervalMs: 100,
};
it("fires continuously without requests and keeps a stable fire rate", () => {
  const rifle = new GaussRifle(gaussRifleBalance);
  let rounds = 0;
  rifle.advance(1000, () => {
    rounds++;
  });
  expect(rounds).toBe(2);
});

it("separates rounds within one attack from the full attack cycle", () => {
  const rifle = new GaussRifle(burst);
  const times: number[] = [];
  rifle.advance(800, (offset) => {
    times.push(offset);
  });
  expect(times).toEqual([0, 100, 200, 800]);
});

it("attack speed shortens the cycle without changing burst size or spacing", () => {
  const rifle = new GaussRifle({ ...burst, shotIntervalMs: 400 });
  const times: number[] = [];
  rifle.advance(800, (offset) => {
    times.push(offset);
  });
  expect(times).toEqual([0, 100, 200, 400, 500, 600, 800]);
});

it("captures the cycle configuration and preserves a due round on upgrade", () => {
  const rifle = new GaussRifle(burst);
  const times: number[] = [];
  rifle.advance(
    100,
    (offset) => {
      times.push(offset);
    },
    false,
  );
  expect(rifle.timeToEventMs).toBe(0);
  rifle.setConfig({
    ...burst,
    burstRounds: 2,
    roundIntervalMs: 50,
    shotIntervalMs: 400,
  });
  rifle.advance(750, (offset) => {
    times.push(100 + offset);
  });
  expect(times).toEqual([0, 100, 200, 800, 850]);
});

it("retains pending rounds when a level-up callback stops advancement", () => {
  const rifle = new GaussRifle(burst);
  const times: number[] = [];
  rifle.advance(800, (offset) => {
    times.push(offset);
    return false;
  });
  expect(times).toEqual([0]);
  expect(rifle.timeToEventMs).toBe(100);
  rifle.advance(800, (offset) => {
    times.push(offset);
  });
  expect(times).toEqual([0, 100, 200, 800]);
});

it("produces identical bursts across split ticks and held endpoints", () => {
  const rifle = new GaussRifle(burst);
  const times: number[] = [];
  let elapsed = 0;
  for (const delta of [37, 63, 100, 400, 200, 100]) {
    rifle.advance(
      delta,
      (offset) => {
        times.push(elapsed + offset);
      },
      false,
    );
    elapsed += delta;
  }
  expect(times).toEqual([0, 100, 200, 800]);
  rifle.advance(0, (offset) => {
    times.push(elapsed + offset);
  });
  expect(times).toEqual([0, 100, 200, 800, 900]);
});

it("caps rounds and gives even an extreme attack speed positive recovery", () => {
  const rifle = new GaussRifle({
    ...burst,
    burstRounds: 999,
    roundIntervalMs: 2,
    shotIntervalMs: 0.001,
  });
  const times: number[] = [];
  rifle.advance(18, (offset) => {
    times.push(offset);
  });
  expect(times).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
  expect(rifle.timeToEventMs).toBe(1);
  expect(rifle.startsAttack).toBe(true);
});

it("reports which round is next and enforces positive within-burst spacing", () => {
  const rifle = new GaussRifle({ ...burst, roundIntervalMs: 0 });
  expect(rifle.startsAttack).toBe(true);
  expect(rifle.roundInBurst).toBe(1);
  rifle.advance(0, () => {});
  expect(rifle.startsAttack).toBe(false);
  expect(rifle.roundInBurst).toBe(2);
  expect(rifle.timeToEventMs).toBe(1);
});

it("never overlaps bursts when their span exceeds the requested cycle", () => {
  const rifle = new GaussRifle({ ...burst, shotIntervalMs: 50 });
  const times: number[] = [];
  rifle.advance(402, (offset) => {
    times.push(offset);
  });
  expect(times).toEqual([0, 100, 200, 201, 301, 401, 402]);
});
it("does not fire at a held simulation endpoint and resumes exactly once", () => {
  const rifle = new GaussRifle(gaussRifleBalance);
  let rounds = 0;
  rifle.advance(0, () => {
    rounds++;
  });
  rifle.advance(
    800,
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
