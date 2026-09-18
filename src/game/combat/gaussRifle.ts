import type { GaussRifleConfig } from "../model/types";
/** Autonomous weapon clock. Focus input never starts, buffers or speeds up an attack. */
export class GaussRifle {
  private untilShotMs = 0;
  private config: GaussRifleConfig;
  constructor(config: GaussRifleConfig) {
    this.config = config;
  }
  get timeToEventMs() {
    return this.untilShotMs;
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
      this.untilShotMs = Math.max(1, this.config.shotIntervalMs);
      if (onRound(offset) === false) return;
    }
  }
}
