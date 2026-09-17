import { upgrades, type UpgradeRanks } from "../data/upgrades";
import type { StimpackConfig } from "../model/types";

export type StimpackPhase = "normal" | "boost" | "crash" | "recovery";

export class Stimpack {
  private config: StimpackConfig;
  private readonly base: StimpackConfig;
  private state: StimpackPhase = "normal";
  private elapsedMs = 0;

  constructor(config: StimpackConfig) {
    this.config = config;
    this.base = config;
  }

  setUpgrades(ranks: UpgradeRanks): void {
    const bonus = (id: keyof UpgradeRanks) =>
      (ranks[id] ?? 0) * upgrades[id].amount;
    this.config = {
      ...this.base,
      boostMs: this.base.boostMs + bonus("stim-duration"),
      boostAttackSpeedMultiplier:
        this.base.boostAttackSpeedMultiplier + bonus("stim-speed"),
      recoveryMs: Math.max(1, this.base.recoveryMs - bonus("stim-recovery")),
    };
    this.advance(0);
  }

  get phase(): StimpackPhase {
    return this.state;
  }

  get canAttack(): boolean {
    return this.state !== "crash";
  }

  get attackSpeedMultiplier(): number {
    switch (this.state) {
      case "boost":
        return this.config.boostAttackSpeedMultiplier;
      case "crash":
        return 0;
      case "recovery":
        return this.elapsedMs / this.config.recoveryMs;
      case "normal":
        return 1;
    }
  }

  get timeToBoundaryMs(): number {
    switch (this.state) {
      case "boost":
        return Math.max(0, this.config.boostMs - this.elapsedMs);
      case "crash":
        return this.config.crashMs - this.elapsedMs;
      case "recovery":
        return Math.max(0, this.config.recoveryMs - this.elapsedMs);
      case "normal":
        return Infinity;
    }
  }

  activate(): boolean {
    if (this.state !== "normal") return false;
    this.state = "boost";
    this.elapsedMs = 0;
    return true;
  }

  advance(deltaMs: number): void {
    let remaining = Math.max(0, deltaMs);
    while (this.state !== "normal") {
      const step = Math.min(remaining, this.timeToBoundaryMs);
      this.elapsedMs += step;
      remaining -= step;
      if (this.timeToBoundaryMs > 0) return;
      this.state =
        this.state === "boost"
          ? "crash"
          : this.state === "crash"
            ? "recovery"
            : "normal";
      this.elapsedMs = 0;
    }
  }

  /** Caller splits simulation at timeToBoundaryMs before advancing this state. */
  weaponTimeFor(realMs: number): number {
    const duration = Math.min(Math.max(0, realMs), this.timeToBoundaryMs);
    return this.state === "recovery"
      ? (this.elapsedMs * duration + (duration * duration) / 2) /
          this.config.recoveryMs
      : duration * this.attackSpeedMultiplier;
  }

  /** Inverse integral places hitscan rounds at their exact real-time offsets. */
  realTimeFor(weaponMs: number): number {
    const duration = Math.max(0, weaponMs);
    if (duration === 0) return 0;
    if (this.state === "recovery") {
      return (
        Math.sqrt(this.elapsedMs ** 2 + 2 * this.config.recoveryMs * duration) -
        this.elapsedMs
      );
    }
    return duration / this.attackSpeedMultiplier;
  }
}
