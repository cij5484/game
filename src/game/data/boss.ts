// M7 prototype tuning; difficulty and encounter length await player playtest.
export const siegeBossBalance = {
  hp: 30000,
  spawnMs: 19 * 60_000,
  warningMs: 18 * 60_000 + 50_000,
  supply: {
    active: { batchSize: 8, spawnIntervalMs: 1400 },
    final: { batchSize: 32, spawnIntervalMs: 700 },
  },
  approachSpeed: 0.025,
  lateralAmplitude01: 0.12,
  siegeProgress01: 0.6,
  chargeMs: 6000,
  interruptDamage: 1800,
  siegeWallDamage: 1800,
  staggerMs: 3000,
  vulnerableMultiplier: 1.5,
  reinforcementHpRatio: 0.65,
  reinforcement: { grunt: 24, runner: 8 },
  finalHpRatio: 0.25,
  finalSpeed: 0.09,
  finalWallDamage: 1000,
  finalWallIntervalMs: 1800,
} as const;
