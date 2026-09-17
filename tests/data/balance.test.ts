import { describe, expect, it } from "vitest";
import {
  gaussRifleBalance,
  stimpackBalance,
} from "../../src/game/data/balance";

describe("prototype balance data", () => {
  it("keeps attack cadence and stim recovery in data", () => {
    expect(gaussRifleBalance.roundsPerBurst).toBe(3);
    expect(gaussRifleBalance.maxBufferedCommands).toBe(1);
    expect(stimpackBalance.crashMs).toBe(1000);
    expect(stimpackBalance.recoveryMs).toBe(2000);
  });
});
