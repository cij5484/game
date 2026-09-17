import type { GaussRifleConfig } from "../model/types";

export interface AttackCommand {
  manualTargetId: number | null;
}

export class GaussRifle {
  private readonly config: GaussRifleConfig;
  private current: AttackCommand | null = null;
  private buffered: AttackCommand | null = null;
  private roundsRemaining = 0;
  private untilEventMs = 0;
  private state: "idle" | "firing" | "recovery" = "idle";

  constructor(config: GaussRifleConfig) {
    this.config = config;
  }

  get phase() {
    return this.state;
  }

  request(command: AttackCommand): void {
    if (this.state === "idle") {
      this.start(command);
    } else if (this.config.maxBufferedCommands > 0 && this.buffered === null) {
      this.buffered = { ...command };
    }
  }

  /** Round offsets let the caller advance gameplay to each hitscan instant. */
  advance(
    deltaMs: number,
    onRound: (command: AttackCommand, offsetMs: number) => void | boolean,
  ): void {
    let remainingMs = Math.max(0, deltaMs);
    let offsetMs = 0;
    while (this.state !== "idle") {
      if (remainingMs < this.untilEventMs) {
        this.untilEventMs -= remainingMs;
        return;
      }
      remainingMs -= this.untilEventMs;
      offsetMs += this.untilEventMs;
      if (this.state === "recovery") {
        const next = this.buffered;
        this.buffered = null;
        this.current = null;
        this.state = "idle";
        if (next === null) return;
        this.start(next);
      } else {
        const command = this.current!;
        this.roundsRemaining -= 1;
        this.state = this.roundsRemaining > 0 ? "firing" : "recovery";
        this.untilEventMs =
          this.roundsRemaining > 0
            ? this.config.roundIntervalMs
            : this.config.burstRecoveryMs;
        // Returning false lets a terminal run failure stop this frame immediately.
        if (onRound(command, offsetMs) === false) return;
      }
    }
  }

  private start(command: AttackCommand): void {
    this.current = { ...command };
    this.roundsRemaining = this.config.roundsPerBurst;
    this.untilEventMs = 0;
    this.state = "firing";
  }
}
