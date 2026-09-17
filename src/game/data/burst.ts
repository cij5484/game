// Prototype tuning: combat performance charges Burst, never raw input count.
export const burstBalance = {
  gaugeMax: 100,
  charge: { hits: 0.02, kills: 0.08, eliteKills: 6 },
  combatCreditPerSecond: 0.45,
  maxCombatCredit: 3,
  ultimate: {
    targets: 60,
    damage: 140,
    presentationMs: 650,
  },
} as const;
