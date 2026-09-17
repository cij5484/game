export type LaneId = "left" | "center" | "right";
export type EnemyKind = "grunt" | "runner" | "shield";

export interface MarineConfig {
  id: "marine";
  primaryAttackId: GaussRifleConfig["id"];
  secondaryAbilityId: StimpackConfig["id"];
  burstId: "marine-burst";
  baseStats: {
    damageMultiplier: number;
    attackSpeedMultiplier: number;
  };
}

export interface GaussRifleConfig {
  id: "gauss-rifle";
  roundsPerBurst: number;
  roundIntervalMs: number;
  burstRecoveryMs: number;
  maxBufferedCommands: number;
  damagePerRound: number;
}

export interface StimpackConfig {
  id: "stimpack";
  boostMs: number;
  boostAttackSpeedMultiplier: number;
  crashMs: number;
  recoveryMs: number;
}

export interface EnemyConfig {
  hp: number;
  /** Fraction of the spawn-to-wall distance travelled per second (0 to 1). */
  progressPerSecond: number;
  wallAttackDamage: number;
  wallAttackIntervalMs: number;
  /** Multiplier on incoming primary damage; 0.5 means half damage taken. */
  primaryDamageMultiplier: number;
  xpOnKill: number;
}

export interface FrostNovaConfig {
  id: "frost-nova";
  effect: "global-slow";
  cooldownMs: number;
  durationMs: number;
  /** Global movement only; wall attack cadence is unaffected. */
  moveSpeedMultiplier: number;
}

export interface ChainLightningConfig {
  id: "chain-lightning";
  effect: "chain-damage";
  cooldownMs: number;
  damagePerTarget: number;
  /** Total targets, including the initial target. */
  maxTargets: number;
  /** Maximum distance between consecutive targets in logical battlefield pixels. */
  chainRadiusPx: number;
}

export type MagicConfig = FrostNovaConfig | ChainLightningConfig;
