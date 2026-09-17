import { describe, expect, it } from "vitest";
import { GaussRifle } from "../../src/game/combat/gaussRifle";
import { gaussRifleBalance } from "../../src/game/data/weapons";

describe("Gauss Rifle cadence", () => {
  it("can defer a round exactly at a primary-lockout boundary without losing it", () => {
    const weapon = new GaussRifle(gaussRifleBalance);
    const shots: number[] = [];
    weapon.request({ manualTargetId: null });
    weapon.advance(
      110,
      (_, offset) => {
        shots.push(offset);
      },
      false,
    );
    expect(shots).toEqual([0]);
    weapon.advance(0, (_, offset) => {
      shots.push(offset);
    });
    expect(shots).toEqual([0, 0]);
  });
  it("keeps the same fire rate under spam and reserves only one next command", () => {
    const shoot = (spam: boolean) => {
      const weapon = new GaussRifle(gaussRifleBalance);
      const shots: number[] = [];
      weapon.request({ manualTargetId: null });
      weapon.advance(0, (_, offset) => {
        shots.push(offset);
      });
      for (let time = 10; time <= 1800; time += 10) {
        if (spam || time % 600 === 10) weapon.request({ manualTargetId: null });
        weapon.advance(10, (_, offset) => {
          shots.push(time - 10 + offset);
        });
      }
      // After the single buffered burst, the weapon must stop without new input.
      weapon.advance(2000, (_, offset) => {
        shots.push(1800 + offset);
      });
      expect(weapon.phase).toBe("idle");
      return shots;
    };
    expect(shoot(true)).toEqual(shoot(false));
    expect(shoot(true)).toEqual([
      0, 110, 220, 600, 710, 820, 1200, 1310, 1420, 1800, 1910, 2020,
    ]);
  });

  it("preserves the first buffered manual command and has no persistent target lock", () => {
    const weapon = new GaussRifle(gaussRifleBalance);
    const targets: (number | null)[] = [];
    weapon.request({ manualTargetId: 7 });
    weapon.request({ manualTargetId: 8 });
    weapon.request({ manualTargetId: 9 });
    weapon.advance(1200, (command) => {
      targets.push(command.manualTargetId);
    });
    weapon.request({ manualTargetId: null });
    weapon.advance(600, (command) => {
      targets.push(command.manualTargetId);
    });
    expect(targets).toEqual([7, 7, 7, 8, 8, 8, null, null, null]);
    expect(weapon.phase).toBe("idle");
  });

  it("uses configured timing and emits exact offsets even for a large frame", () => {
    const weapon = new GaussRifle({
      ...gaussRifleBalance,
      roundIntervalMs: 20,
      burstRecoveryMs: 40,
    });
    const offsets: number[] = [];
    weapon.request({ manualTargetId: null });
    weapon.request({ manualTargetId: null });
    weapon.advance(200, (_, offset) => {
      offsets.push(offset);
    });
    expect(offsets).toEqual([0, 20, 40, 80, 100, 120]);
    expect(weapon.phase).toBe("idle");
  });
});
