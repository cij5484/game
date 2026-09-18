import { gaussActionRoundLimit } from "../data/weapons";
import type { GaussRifleConfig } from "../model/types";
/** Autonomous weapon clock. Focus input never starts, buffers or speeds up an attack. */
export class GaussRifle {
  private untilShotMs = 0;
  private nextRound = 0;
  private burstRounds = 1;
  private roundIntervalMs = 100;
  private recoveryMs = 800;
  private config: GaussRifleConfig;
  constructor(config: GaussRifleConfig) {
    this.config = config;
  }
  get timeToEventMs() {
    return this.untilShotMs;
  }
  /** These describe the next event, including while waiting for its endpoint. */
  get roundInBurst() {
    return this.nextRound + 1;
  }
  get startsAttack() {
    return this.nextRound === 0;
  }
  setConfig(config: GaussRifleConfig) {
    this.config = config;
  }
  advance(
    deltaMs: number,
    onRound: (offsetMs: number) => void | boolean,
    includeEndpoint = true,
  ): void {
    let remaining = Math.max(0, deltaMs);
    let offset = 0;
    while (true) {
      if (
        remaining < this.untilShotMs ||
        (!includeEndpoint && remaining === this.untilShotMs)
      ) {
        this.untilShotMs -= remaining;
        // Inverse recovery integration can leave a sub-nanosecond endpoint residue.
        if (this.untilShotMs < 1e-9) this.untilShotMs = 0;
        return;
      }
      remaining -= this.untilShotMs;
      offset += this.untilShotMs;
      if (this.startsAttack) {
        // Snapshot the cycle: upgrades cannot truncate an attack already in flight.
        this.burstRounds = Math.max(
          1,
          Math.min(
            gaussActionRoundLimit,
            Math.floor(
              Number.isFinite(this.config.burstRounds)
                ? this.config.burstRounds!
                : 1,
            ),
          ),
        );
        this.roundIntervalMs = Math.max(
          1,
          Number.isFinite(this.config.roundIntervalMs)
            ? this.config.roundIntervalMs!
            : 100,
        );
        const cycleMs = Number.isFinite(this.config.shotIntervalMs)
          ? this.config.shotIntervalMs
          : 800;
        this.recoveryMs = Math.max(
          1,
          cycleMs - (this.burstRounds - 1) * this.roundIntervalMs,
        );
      }
      this.nextRound = (this.nextRound + 1) % this.burstRounds;
      this.untilShotMs = this.startsAttack
        ? this.recoveryMs
        : this.roundIntervalMs;
      if (onRound(offset) === false) return;
    }
  }
}
