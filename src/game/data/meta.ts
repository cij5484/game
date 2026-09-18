export type ResearchId =
  | "primary-damage"
  | "primary-speed"
  | "special-damage"
  | "wall-hp"
  | "critical-chance"
  | "critical-damage"
  | "special-cycle"
  | "elite-boss-damage"
  | "wall-defense"
  | "xp"
  | "range";
export type ResearchLevels = Partial<Record<ResearchId, number>>;
export interface ResearchDefinition {
  id: ResearchId;
  title: string;
  category: "기본무기" | "특수무기" | "방어" | "성장";
  maxLevel: number;
  increments: readonly number[];
  costs: readonly number[];
  effectUnit: "percent" | "percentage-points" | "multiplier";
  breakthroughLevels: readonly number[];
}

// M11 prototype prices and effects; economy pacing is owned by user playtest.
export const researchBaseCosts = [
  120, 180, 260, 380, 650, 850, 1100, 1400, 1800, 3000, 4000, 5000, 6500, 8000,
  12000, 16000, 21000, 27000, 35000, 60000,
] as const;
export const rerollCosts = [50, 150, 400] as const;

function research(
  id: ResearchId,
  title: string,
  category: ResearchDefinition["category"],
  maxLevel: number,
  increment: number,
  breakthroughs: Record<number, number>,
  costMultiplier = 1,
  effectUnit: ResearchDefinition["effectUnit"] = "percent",
): ResearchDefinition {
  return {
    id,
    title,
    category,
    maxLevel,
    effectUnit,
    increments: Array.from(
      { length: maxLevel },
      (_, i) => breakthroughs[i + 1] ?? increment,
    ),
    costs: researchBaseCosts
      .slice(0, maxLevel)
      .map((cost) => Math.round(cost * costMultiplier)),
    breakthroughLevels: Object.keys(breakthroughs).map(Number),
  };
}

export const researchDefinitions: Record<ResearchId, ResearchDefinition> = {
  "primary-damage": research(
    "primary-damage",
    "기본무기 화력",
    "기본무기",
    20,
    0.1,
    { 5: 0.25, 10: 0.35, 15: 0.45, 20: 0.6 },
  ),
  "primary-speed": research(
    "primary-speed",
    "기본무기 공격속도",
    "기본무기",
    20,
    0.05,
    { 5: 0.15, 10: 0.2, 15: 0.25, 20: 0.3 },
    1.25,
  ),
  "special-damage": research(
    "special-damage",
    "특수무기 피해",
    "특수무기",
    20,
    0.1,
    { 5: 0.25, 10: 0.35, 15: 0.45, 20: 0.6 },
    1.2,
  ),
  "wall-hp": research(
    "wall-hp",
    "성벽 최대 HP",
    "방어",
    20,
    0.1,
    { 5: 0.3, 10: 0.4, 15: 0.5, 20: 0.7 },
    1.1,
  ),
  "critical-chance": research(
    "critical-chance",
    "치명타 확률",
    "기본무기",
    10,
    0.03,
    { 5: 0.06, 10: 0.1 },
    3,
    "percentage-points",
  ),
  "critical-damage": research(
    "critical-damage",
    "치명타 피해",
    "기본무기",
    10,
    0.15,
    { 5: 0.35, 10: 0.55 },
    3,
    "multiplier",
  ),
  "special-cycle": research(
    "special-cycle",
    "특수무기 공격주기 감소",
    "특수무기",
    10,
    0.04,
    { 5: 0.1, 10: 0.18 },
    3.5,
  ),
  "elite-boss-damage": research(
    "elite-boss-damage",
    "정예·Boss 피해",
    "기본무기",
    10,
    0.15,
    { 5: 0.35, 10: 0.55 },
    3.5,
  ),
  "wall-defense": research(
    "wall-defense",
    "성벽 피해 감소",
    "방어",
    10,
    0.04,
    { 5: 0.05, 10: 0.08 },
    3,
  ),
  xp: research("xp", "XP 획득량", "성장", 10, 0.1, { 5: 0.2, 10: 0.3 }, 3),
  range: {
    ...research("range", "기본무기 사거리 · 초고가", "기본무기", 5, 0.1, {
      5: 0.2,
    }),
    costs: [2000, 5000, 12000, 30000, 80000],
  },
};

function definitionAt(id: ResearchId, level: number) {
  if (!Object.hasOwn(researchDefinitions, id))
    throw new Error("알 수 없는 연구입니다.");
  const definition = researchDefinitions[id];
  if (!Number.isSafeInteger(level) || level < 0 || level > definition.maxLevel)
    throw new Error("연구 레벨이 올바르지 않습니다.");
  return definition;
}
export function getResearchEffect(id: ResearchId, level: number): number {
  return Number(
    definitionAt(id, level)
      .increments.slice(0, level)
      .reduce((sum, value) => sum + value, 0)
      .toFixed(10),
  );
}
export function getResearchCost(
  id: ResearchId,
  currentLevel: number,
): number | null {
  return definitionAt(id, currentLevel).costs[currentLevel] ?? null;
}

export interface MetaModifiers {
  readonly primaryDamageMultiplier: number;
  readonly primarySpeedMultiplier: number;
  readonly specialDamageMultiplier: number;
  readonly specialCycleMultiplier: number;
  readonly wallHpMultiplier: number;
  readonly criticalChanceBonus: number;
  readonly criticalMultiplierBonus: number;
  readonly eliteBossDamageMultiplier: number;
  readonly wallDamageMultiplier: number;
  readonly xpMultiplier: number;
  readonly rangeMultiplier: number;
}
export function createMetaModifiers(
  levels: ResearchLevels,
): Readonly<MetaModifiers> {
  const effect = (id: ResearchId) => getResearchEffect(id, levels[id] ?? 0);
  return Object.freeze({
    primaryDamageMultiplier: 1 + effect("primary-damage"),
    primarySpeedMultiplier: 1 + effect("primary-speed"),
    specialDamageMultiplier: 1 + effect("special-damage"),
    specialCycleMultiplier: 1 - effect("special-cycle"),
    wallHpMultiplier: 1 + effect("wall-hp"),
    criticalChanceBonus: effect("critical-chance"),
    criticalMultiplierBonus: effect("critical-damage"),
    eliteBossDamageMultiplier: 1 + effect("elite-boss-damage"),
    wallDamageMultiplier: 1 - effect("wall-defense"),
    xpMultiplier: 1 + effect("xp"),
    rangeMultiplier: 1 + effect("range"),
  });
}
export const neutralMetaModifiers = createMetaModifiers({});

export interface RunSummary {
  status: "failed" | "cleared";
  elapsedMs: number;
  kills: number;
  eliteKills: number;
  bossKills: number;
}
export interface RunReward {
  gold: number;
  credits: number;
}
export const runRewardBalance = {
  maximumMinutes: 20,
  gold: {
    participation: 100,
    perMinute: 25,
    perKill: 0.02,
    killCap: 100,
    perElite: 10,
    eliteCap: 100,
    clear: 400,
  },
  credits: { minutesPerCredit: 2, perElite: 1, eliteCap: 5, clear: 20 },
} as const;
export function calculateRunReward(summary: RunSummary): RunReward {
  if (
    !summary ||
    (summary.status !== "failed" && summary.status !== "cleared") ||
    !Number.isFinite(summary.elapsedMs) ||
    summary.elapsedMs < 0 ||
    [summary.kills, summary.eliteKills, summary.bossKills].some(
      (count) => !Number.isSafeInteger(count) || count < 0,
    )
  )
    throw new Error("Run 결과가 올바르지 않습니다.");
  const minutes = Math.min(
    summary.elapsedMs / 60000,
    runRewardBalance.maximumMinutes,
  );
  const { gold, credits } = runRewardBalance;
  return {
    gold:
      gold.participation +
      Math.floor(minutes * gold.perMinute) +
      Math.min(gold.killCap, Math.floor(summary.kills * gold.perKill)) +
      Math.min(gold.eliteCap, summary.eliteKills * gold.perElite) +
      (summary.status === "cleared" ? gold.clear : 0),
    credits:
      Math.floor(minutes / credits.minutesPerCredit) +
      Math.min(credits.eliteCap, summary.eliteKills * credits.perElite) +
      (summary.status === "cleared" ? credits.clear : 0),
  };
}
