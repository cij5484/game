import type { UpgradeRanks } from "../data/upgrades";
import type { GrowthBranches } from "../data/growth";
import { getAbilityEffects } from "../data/abilityGrowth";
import type { StimpackConfig } from "../model/types";

export type StimpackPhase = "normal" | "boost" | "crash" | "recovery";

export class Stimpack {
  private config: StimpackConfig;
  private readonly base: StimpackConfig;
  private state: StimpackPhase = "normal";
  private elapsedMs = 0;
  private boostDamageMultiplier = 1;
  private extensionMs = 0;
  private recoverySurchargeMs = 0;

  private get recoveryDurationMs(): number {
    return this.config.recoveryMs + this.recoverySurchargeMs;
  }

  constructor(config: StimpackConfig) {
    this.config = config;
    this.base = config;
  }

  setUpgrades(ranks: UpgradeRanks, branches: GrowthBranches = {}): void {
    const effects = getAbilityEffects(ranks, branches);
    this.boostDamageMultiplier = effects.stimDamageMultiplier;
    this.config = {
      ...this.base,
      boostMs: this.base.boostMs + effects.stimDurationBonusMs,
      boostAttackSpeedMultiplier:
        this.base.boostAttackSpeedMultiplier + effects.stimSpeedBonus,
      crashMs: Math.max(1, this.base.crashMs * effects.stimCrashMultiplier),
      recoveryMs: Math.max(
        1,
        this.base.recoveryMs * effects.stimRecoveryMultiplier,
      ),
    };
    this.advance(0);
  }

  get primaryDamageMultiplier(): number {
    return this.state === "boost" ? this.boostDamageMultiplier : 1;
  }

  get phase(): StimpackPhase {
    return this.state;
  }

  get phaseProgress(): number {
    if (this.state === "normal") return 1;
    const duration = this.elapsedMs + this.timeToBoundaryMs;
    return Math.min(1, this.elapsedMs / Math.max(1, duration));
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
        return this.elapsedMs / this.recoveryDurationMs;
      case "normal":
        return 1;
    }
  }

  get timeToBoundaryMs(): number {
    switch (this.state) {
      case "boost":
        return Math.max(
          0,
          this.config.boostMs + this.extensionMs - this.elapsedMs,
        );
      case "crash":
        return Math.max(0, this.config.crashMs - this.elapsedMs);
      case "recovery":
        return Math.max(0, this.recoveryDurationMs - this.elapsedMs);
      case "normal":
        return Infinity;
    }
  }

  activate(): boolean {
    if (this.state !== "normal") return false;
    this.extensionMs = 0;
    this.recoverySurchargeMs = 0;
    this.state = "boost";
    this.elapsedMs = 0;
    return true;
  }

  /** Bounded per activation; only accepted extension adds recovery debt. Crash is unchanged. */
  extendBoost(
    amountMs: number,
    capMs: number,
    recoveryCostRatio = 0.5,
  ): number {
    if (
      this.state !== "boost" ||
      !Number.isFinite(amountMs) ||
      !Number.isFinite(capMs) ||
      !Number.isFinite(recoveryCostRatio)
    )
      return 0;
    const accepted = Math.min(
      Math.max(0, amountMs),
      Math.max(0, capMs - this.extensionMs),
    );
    this.extensionMs += accepted;
    this.recoverySurchargeMs +=
      accepted * Math.max(0, Math.min(1, recoveryCostRatio));
    return accepted;
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
          this.recoveryDurationMs
      : duration * this.attackSpeedMultiplier;
  }

  /** Inverse integral places hitscan rounds at their exact real-time offsets. */
  realTimeFor(weaponMs: number): number {
    const duration = Math.max(0, weaponMs);
    if (duration === 0) return 0;
    if (this.state === "recovery") {
      return (
        Math.sqrt(
          this.elapsedMs ** 2 + 2 * this.recoveryDurationMs * duration,
        ) - this.elapsedMs
      );
    }
    return duration / this.attackSpeedMultiplier;
  }
}
