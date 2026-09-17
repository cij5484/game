import { burstBalance } from "../data/burst";

export type BurstCredit = Partial<
  Record<keyof typeof burstBalance.charge, number>
>;

const nonnegativeFinite = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

export class Burst {
  private charge = 0;
  private combatCredit: number = burstBalance.maxCombatCredit;

  get gauge(): number {
    return this.charge;
  }

  get ready(): boolean {
    return this.charge >= burstBalance.gaugeMax;
  }

  credit(result: BurstCredit): void {
    if (this.ready) return;
    const normalCredit = Math.min(
      this.combatCredit,
      nonnegativeFinite(result.hits ?? 0) * burstBalance.charge.hits +
        nonnegativeFinite(result.kills ?? 0) * burstBalance.charge.kills,
    );
    this.combatCredit -= normalCredit;
    this.charge = Math.min(
      burstBalance.gaugeMax,
      this.charge +
        normalCredit +
        nonnegativeFinite(result.eliteKills ?? 0) *
          burstBalance.charge.eliteKills,
    );
  }

  /** Refill the credit allowance with simulated combat time, never passive gauge. */
  advanceCharge(gameplayMs: number): void {
    this.combatCredit = Math.min(
      burstBalance.maxCombatCredit,
      this.combatCredit +
        (nonnegativeFinite(gameplayMs) / 1000) *
          burstBalance.combatCreditPerSecond,
    );
  }

  activate(): boolean {
    if (!this.ready) return false;
    this.charge = 0;
    return true;
  }
}
