import { burstBalance } from "../data/burst";

export type BurstGrade = "PERFECT" | "GOOD" | "MISS";
export type BurstResult = { score: number; grades: readonly BurstGrade[] };
export type BurstCredit = Partial<
  Record<keyof typeof burstBalance.charge, number>
>;

const nonnegativeFinite = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

export class Burst {
  private charge = 0;
  private active = false;
  private elapsed = 0;
  private judgments: BurstGrade[] = [];

  get gauge(): number {
    return this.charge;
  }

  get ready(): boolean {
    return !this.active && this.charge >= burstBalance.gaugeMax;
  }

  get phase(): "idle" | "rhythm" {
    return this.active ? "rhythm" : "idle";
  }

  get elapsedMs(): number {
    return this.elapsed;
  }

  get progress(): number {
    return this.elapsed / burstBalance.rhythmMs;
  }

  get beatIndex(): number {
    return this.judgments.length;
  }

  get grades(): readonly BurstGrade[] {
    return this.judgments;
  }

  credit(result: BurstCredit): void {
    if (this.active) return;
    for (const key of ["hits", "kills", "eliteKills"] as const) {
      this.charge = Math.min(
        burstBalance.gaugeMax,
        this.charge +
          nonnegativeFinite(result[key] ?? 0) * burstBalance.charge[key],
      );
    }
  }

  activate(): boolean {
    if (!this.ready) return false;
    this.charge = 0;
    this.active = true;
    this.elapsed = 0;
    this.judgments = [];
    return true;
  }

  tap(): BurstGrade | null {
    if (!this.active) return null;
    const target = burstBalance.beatTargetsMs[this.beatIndex];
    if (target === undefined) return null;
    const error = Math.abs(this.elapsed - target);
    const grade =
      error <= burstBalance.perfectWindowMs
        ? "PERFECT"
        : error <= burstBalance.goodWindowMs
          ? "GOOD"
          : "MISS";
    // Every tap consumes a beat, including early MISS: spam cannot retry it.
    this.judgments.push(grade);
    return grade;
  }

  /** Uses real time; the caller separately slows battlefield simulation. */
  advance(realMs: number): BurstResult | null {
    if (!this.active) return null;
    this.elapsed = Math.min(
      burstBalance.rhythmMs,
      this.elapsed + nonnegativeFinite(realMs),
    );
    let target = burstBalance.beatTargetsMs[this.beatIndex];
    while (
      target !== undefined &&
      this.elapsed > target + burstBalance.goodWindowMs
    ) {
      this.judgments.push("MISS");
      target = burstBalance.beatTargetsMs[this.beatIndex];
    }
    if (this.elapsed < burstBalance.rhythmMs) return null;
    this.active = false;
    return {
      score:
        this.judgments.reduce(
          (total, grade) => total + burstBalance.gradeScore[grade],
          0,
        ) / burstBalance.beatTargetsMs.length,
      grades: [...this.judgments],
    };
  }
}
