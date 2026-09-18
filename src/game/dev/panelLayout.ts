import type { BalanceField } from "./runtimeBalance";

type QuickCard = { id: string; title: string; fields: readonly string[] };
type QuickSection = { id: string; title: string; cards: readonly QuickCard[] };
const combat: QuickCard = {
  id: "combat",
  title: "전투 / Horde",
  fields: [
    "run.combatTempo",
    "run.wallMaxHp",
    "enemyScaling.movementMultiplier",
    "enemyLevelScaling.linear",
    "enemyLevelScaling.quadratic",
    "horde.stages.0.maxActiveEnemies",
    "horde.stages.0.batchSize",
    "horde.stages.0.spawnIntervalMs",
  ],
};
const gauss: QuickCard = {
  id: "gauss",
  title: "Gauss 기본값",
  fields: [
    "gauss.damagePerRound",
    "gauss.shotIntervalMs",
    "marine.primaryMinProgress01",
    "marineGrowth.baseCritChance",
    "marineGrowth.criticalMultiplier",
  ],
};
const growth: QuickCard = {
  id: "growth",
  title: "성장 / XP",
  fields: [
    "marineGrowth.initialXp",
    "marineGrowth.xpPerLevel",
    "marineGrowth.xpQuadratic",
  ],
};
const weights: QuickCard = {
  id: "weights",
  title: "카드 등장 · 카테고리 가중치",
  fields: [
    ...[0, 1, 2, 3].map((count) => `marineGrowth.newModWeight${count}`),
    "marineGrowth.ownedModWeight",
    "marineGrowth.maxModInvestment",
    "marineGrowth.specialGrowthWeight",
    "marineGrowth.maxSpecialInvestment",
    "marineGrowth.firstAcquisitionWeight",
    "marineGrowth.laterAcquisitionWeight",
    "marineGrowth.rangeWeight",
    "marineGrowth.greatSuccessChance",
  ],
};
const modCards: QuickCard[] = [
  [
    "penetration",
    "관통",
    "penetrationBaseRetention",
    "penetrationCountPerLevel",
  ],
  ["ricochet", "도탄", "ricochetBaseRetention", "ricochetDamageGrowth"],
  ["burst", "점사", "burstAdditionalRoundDamageFactor", "burstIntervalMs"],
  ["multishot", "다중탄", "multishotBaseDamage", "multishotDamagePerQuality"],
  ["explosive", "폭발탄", "explosionBaseDamage", "explosionBaseRadius"],
  ["heavy", "고위력 단발", "heavyDamagePerQuality", "heavyPenaltyExtra"],
].map(([id, title, ...power]) => ({
  id: id!,
  title: title!,
  fields: [
    `marineModWeights.${id}.acquisitionWeight`,
    `marineModWeights.${id}.growthWeight`,
    ...power.map((key) => `marineMods.${key}`),
  ],
}));
export const quickSections: readonly QuickSection[] = [
  {
    id: "overview",
    title: "대표 조정",
    cards: [
      combat,
      gauss,
      growth,
      {
        id: "frequency",
        title: "카드 빈도",
        fields: [
          "marineGrowth.newModWeight0",
          "marineGrowth.ownedModWeight",
          "marineGrowth.specialGrowthWeight",
          "marineGrowth.greatSuccessChance",
        ],
      },
      {
        id: "efficiency",
        title: "추가 공격 효율",
        fields: [
          "marineMods.burstAdditionalRoundDamageFactor",
          "marineMods.multishotBaseDamage",
          "marineMods.explosionBaseDamage",
        ],
      },
    ],
  },
  { id: "combat", title: "전투 / Horde", cards: [combat] },
  { id: "gauss", title: "Gauss", cards: [gauss] },
  { id: "weights", title: "카드 등장", cards: [weights] },
  { id: "mods", title: "기본무기 개조", cards: modCards },
  {
    id: "special",
    title: "특수무기",
    cards: [
      {
        id: "grenade",
        title: "수류탄",
        fields: [
          "special.grenade.damage",
          "special.grenade.radius",
          "special.grenade.cycleMs",
        ],
      },
      {
        id: "missile",
        title: "미사일",
        fields: [
          "special.missile.damage",
          "special.missileBehavior.baseSalvoCount",
          "special.missile.cycleMs",
        ],
      },
      {
        id: "drone",
        title: "드론",
        fields: [
          "special.drone.damage",
          "special.drone.cycleMs",
          "special.droneBaseCount",
        ],
      },
    ],
  },
  { id: "growth", title: "성장 / XP", cards: [growth] },
];

export const detailCategories = [
  "전체 게임",
  "적 / Horde",
  "Boss",
  "Gauss 기본값",
  ...modCards.map((card) => `기본무기 개조 · ${card.title}`),
  "성장 / Level-Up",
  "카드 등장 / 가중치",
  "희귀도 / Great Success",
  "수류탄",
  "미사일",
  "드론",
  "Relic",
  "Core",
  "Synergy",
  "Meta Progression",
  "Unlock / Save",
  "Performance / Debug",
  "프리셋 / JSON",
];
export function detailCategory(field: BalanceField): string {
  const id = field.id;
  if (id.startsWith("boss.")) return "Boss";
  if (/^(horde|enemies|enemyScaling|enemyLevelScaling|elite)\./.test(id))
    return "적 / Horde";
  if (id.startsWith("marineMods.")) {
    const match = modCards.find((card) =>
      id.slice(11).startsWith(card.id === "explosive" ? "explosion" : card.id),
    );
    return match ? `기본무기 개조 · ${match.title}` : "Gauss 기본값";
  }
  if (id.startsWith("marineModWeights.") || /Weight\d*$|Investment$/.test(id))
    return "카드 등장 / 가중치";
  if (
    id.startsWith("marineRarity.") ||
    id.endsWith("greatSuccessChance") ||
    field.group.includes("희귀도")
  )
    return "희귀도 / Great Success";
  if (/^special\.(grenade|missile|drone)/.test(id))
    return id.includes("grenade")
      ? "수류탄"
      : id.includes("missile")
        ? "미사일"
        : "드론";
  const weaponGroup = ["수류탄", "미사일", "드론"].find((name) =>
    field.group.includes(name),
  );
  if (weaponGroup) return weaponGroup;
  if (
    id.startsWith("gauss.") ||
    id.startsWith("marineQuality.") ||
    [
      "marine.primaryMinProgress01",
      "marineGrowth.baseCritChance",
      "marineGrowth.criticalMultiplier",
    ].includes(id)
  )
    return "Gauss 기본값";
  if (id.startsWith("marineGrowth.")) return "성장 / Level-Up";
  if (/core/i.test(id) || field.group.includes("코어")) return "Core";
  if (/synerg/i.test(id) || field.group.includes("시너지")) return "Synergy";
  if (id.startsWith("highroll.") || field.group.includes("유물"))
    return "Relic";
  if (id.startsWith("primaryAttack.")) return "Performance / Debug";
  return "전체 게임";
}
