// Prototype tuning: combat performance charges Burst, never raw input count.
export const burstBalance = {
  gaugeMax: 100,
  charge: { hits: 0.02, kills: 0.08, eliteKills: 6 },
  combatCreditPerSecond: 0.45,
  maxCombatCredit: 3,
  rhythmMs: 3000,
  beatTargetsMs: [500, 1000, 1500, 2000, 2500],
  perfectWindowMs: 70,
  goodWindowMs: 150,
  gradeScore: { PERFECT: 1, GOOD: 0.5, MISS: 0 },
  timeScale: 0.08,
  ultimate: {
    minimumTargets: 24,
    bonusTargets: 36,
    minimumDamage: 60,
    bonusDamage: 80,
    presentationMs: 650,
  },
} as const;
