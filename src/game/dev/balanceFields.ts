import type { BalanceField } from "./runtimeBalance";
import "../data/run";
import "../data/enemies";
import "../data/elite";
import "../data/enemyScaling";
import "../data/weapons";
import "../data/balance";
import "../data/horde";
import "../data/marineGrowth";
import "../data/specialWeaponBalance";
import "../data/highroll";
import "../data/prototypeSynergies";
import "../data/boss";
import "../data/primaryAttack";

export const balanceFields: BalanceField[] = [];
const field = (
  id: string,
  label: string,
  group: string,
  description: string,
  apply: BalanceField["apply"] = "즉시 적용",
  min = 0,
  max = 100,
  step = 0.01,
  unit?: string,
) =>
  balanceFields.push({
    id,
    label,
    group,
    description,
    apply,
    min,
    max,
    step,
    ...(unit ? { unit } : {}),
  });

field(
  "run.combatTempo",
  "정상 전투 속도",
  "전체 게임",
  "전투 이동·공격·생성 시간을 함께 빠르게 합니다. 게임 안의 X1/X2/X4 배속과는 별도이며 실제 Stage 시계는 유지됩니다.",
  "즉시 적용",
  0.1,
  8,
  0.1,
  "배",
);
field(
  "run.wallMaxHp",
  "시작 성벽 체력",
  "전체 게임",
  "새 Run의 성벽 최대 체력입니다. 높이면 더 많은 공격을 버틸 수 있으며 현재 성벽은 소급 회복하지 않습니다.",
  "다음 Run부터",
  1,
  1000000,
  100,
);
field(
  "marine.primaryMinProgress01",
  "기본무기 사거리 시작 위치",
  "전체 게임",
  "적이 이 진행도에 도달하면 가우스가 조준합니다. 낮출수록 먼 적까지 공격하며 0은 입구, 1은 성벽입니다.",
  "다음 공격부터",
  0.25,
  1,
  0.01,
);

field(
  "horde.initialBatchSize",
  "초기 적 수",
  "적 / 물량",
  "Run 시작에 배치하는 적 수입니다. 높이면 처음 보이는 물량이 많아집니다.",
  "다음 Run부터",
  0,
  700,
  1,
  "명",
);
field(
  "enemyScaling.movementMultiplier",
  "전체 일반 적 이동속도 배율",
  "적 / 물량",
  "현재 살아 있는 일반 적과 정예의 이동속도에 곱합니다. 높이면 즉시 빨라지며 Boss 속도는 별도로 조절합니다.",
  "즉시 적용",
  0.05,
  10,
  0.05,
);
for (const [id, label, description, min, max, step] of [
  [
    "initialSpeedMultiplier",
    "초반 이동속도 배율",
    "초반에 생성된 적의 기준 이동속도입니다. 높이면 성벽에 더 빨리 접근합니다.",
    0.05,
    10,
    0.05,
  ],
  [
    "maxSpeedMultiplier",
    "후반 이동속도 배율",
    "시간이 충분히 지난 뒤 생성된 적의 기준 이동속도입니다. 높이면 후반 적이 빨라집니다.",
    0.05,
    10,
    0.05,
  ],
  [
    "maxHpMultiplier",
    "시간 경과 체력 배율",
    "시간이 충분히 지난 뒤 생성된 적의 본체 체력 배율입니다. 기존 적의 체력은 바꾸지 않습니다.",
    0.1,
    20,
    0.05,
  ],
] as const)
  field(
    `enemyScaling.${id}`,
    label,
    "적 / 물량",
    description,
    "다음 적 생성부터",
    min,
    max,
    step,
  );
field(
  "enemyLevelScaling.linear",
  "적 체력 선형 성장",
  "적 / 물량",
  "플레이어 레벨이 오를 때마다 기본적으로 추가되는 적 체력 증가량입니다. 높이면 새로 생성되는 적이 더 단단해집니다.",
  "다음 적 생성부터",
  0,
  1,
  0.001,
);
field(
  "enemyLevelScaling.quadratic",
  "적 체력 후반 성장",
  "적 / 물량",
  "플레이어 레벨이 높아질수록 적 체력이 더 빠르게 증가하는 정도입니다. 기존 적의 체력은 바꾸지 않습니다.",
  "다음 적 생성부터",
  0,
  0.1,
  0.0001,
);
for (const [kind, label] of [
  ["grunt", "일반병"],
  ["runner", "돌진병"],
  ["shield", "방패병"],
] as const) {
  field(
    `enemies.${kind}.hp`,
    `${label} 본체 체력`,
    "적 / 물량",
    `${label}의 기본 본체 체력입니다. 높이면 새로 생성되는 적을 처치하기 어려워집니다.`,
    "다음 적 생성부터",
    1,
    100000,
    1,
  );
  field(
    `enemies.${kind}.progressPerSecond`,
    `${label} 기본 이동속도`,
    "적 / 물량",
    "전투 시간 1초에 전진하는 거리 비율입니다. 높이면 살아 있는 적도 더 빨리 성벽에 접근합니다.",
    "즉시 적용",
    0.001,
    1,
    0.001,
  );
  field(
    `enemies.${kind}.wallAttackDamage`,
    `${label} 성벽 공격력`,
    "적 / 물량",
    "성벽에 도달한 적의 한 번 공격 피해입니다. 높이면 성벽이 더 빨리 무너집니다.",
    "다음 공격부터",
    0,
    10000,
    1,
  );
}
field(
  "enemies.shield.shieldHp",
  "방패병 방패 체력",
  "적 / 물량",
  "방패병이 본체 앞에서 흡수하는 피해량입니다. 높이면 새 방패병의 방패를 깨기 어려워집니다.",
  "다음 적 생성부터",
  0,
  100000,
  1,
);
const phaseLabels = [
  "0분 첫 물량",
  "3분 첫 공세",
  "5분 전선 확대",
  "6분 방패 소개",
  "7분30초 방패 전진",
  "9분 혼합 전선",
  "11분 넓은 전선",
  "12분 물량 증가",
  "15분 대공세",
  "18분 최종 공세",
  "19분 기본 공급",
];
for (const [index, name] of phaseLabels.entries()) {
  const prefix = `horde.stages.${index}`;
  const description = `${name} 구간의 값입니다. Boss 경고 이후에는 보스 카테고리의 전용 공급이 우선합니다.`;
  field(
    `${prefix}.spawnIntervalMs`,
    `${name} · 생성 간격`,
    `적 / 물량 · ${name}`,
    `${description} 낮추면 더 자주 생성되며 이미 예약된 생성 타이머는 유지합니다.`,
    "다음 적 생성부터",
    100,
    60000,
    50,
    "전투 ms",
  );
  field(
    `${prefix}.batchSize`,
    `${name} · 생성 묶음 수`,
    `적 / 물량 · ${name}`,
    `${description} 높이면 한 번에 보충되는 적 수가 늘어납니다.`,
    "다음 적 생성부터",
    0,
    700,
    1,
    "명",
  );
  field(
    `${prefix}.maxActiveEnemies`,
    `${name} · 최대 동시 적 수`,
    `적 / 물량 · ${name}`,
    `${description} 높이면 전장 물량과 성능 부담이 함께 커질 수 있습니다.`,
    "다음 적 생성부터",
    1,
    2000,
    1,
    "명",
  );
  for (const [kind, label] of [
    ["grunt", "일반병"],
    ["runner", "돌진병"],
    ["shield", "방패병"],
  ] as const)
    field(
      `${prefix}.enemyWeights.${kind}`,
      `${name} · ${label} 비중`,
      `적 / 물량 · ${name}`,
      `${description} 다른 두 적에 비해 높일수록 이 적이 자주 생성됩니다. 세 비중을 모두 0으로 둘 수 없습니다.`,
      "다음 적 생성부터",
      0,
      1000,
      1,
    );
}
for (const [kind, label] of [
  ["runner", "광폭 돌진병"],
  ["shield", "중장 방패병"],
] as const) {
  field(
    `elite.${kind}.hp`,
    `${label} 체력`,
    "적 / 물량",
    "정예 적의 기본 본체 체력입니다. 높이면 다음 정예가 더 많은 피해를 버팁니다.",
    "다음 적 생성부터",
    1,
    100000,
    1,
  );
  field(
    `elite.${kind}.progressPerSecond`,
    `${label} 이동속도`,
    "적 / 물량",
    "정예의 기본 전진 속도입니다. 높이면 성벽에 더 빨리 접근합니다.",
    "즉시 적용",
    0.001,
    1,
    0.001,
  );
}
field(
  "elite.shield.shieldHp",
  "중장 방패병 방패 체력",
  "적 / 물량",
  "정예 방패가 흡수하는 피해량입니다. 현재 살아 있는 정예의 방패는 바꾸지 않습니다.",
  "다음 적 생성부터",
  0,
  100000,
  1,
);
field(
  "elite.runner.telegraphMs",
  "광폭 돌진 준비 시간",
  "적 / 물량",
  "돌진 전에 멈춰 경고하는 시간입니다. 길게 하면 다음 돌진에 대응할 시간이 늘어납니다.",
  "다음 공격부터",
  100,
  20000,
  50,
  "전투 ms",
);
field(
  "elite.runner.chargeMs",
  "광폭 돌진 지속 시간",
  "적 / 물량",
  "급가속을 유지하는 시간입니다. 늘리면 한 번의 돌진으로 더 멀리 이동합니다.",
  "다음 공격부터",
  100,
  20000,
  50,
  "전투 ms",
);
field(
  "elite.runner.chargeSpeedMultiplier",
  "광폭 돌진 속도 배율",
  "적 / 물량",
  "돌진 중 기본 속도에 곱하는 값입니다. 높이면 돌진 중인 정예가 더 빨라집니다.",
  "즉시 적용",
  0.1,
  20,
  0.1,
);
for (let index = 0; index < 5; index++) {
  for (const [edge, label] of [
    [0, "시작"],
    [1, "끝"],
  ] as const)
    field(
      `elite.windows.${index}.${edge}`,
      `${index + 1}번째 정예 등장 창 ${label}`,
      "적 / 물량",
      "정예 등장 시간을 무작위로 정할 전투 시계 범위입니다. 이미 예약된 등장 시각은 바꾸지 않으므로 새 Run에서 확인하세요.",
      "다음 Run부터",
      0,
      7200000,
      1000,
      "전투 ms",
    );
}

field(
  "gauss.damagePerRound",
  "가우스 기본 피해",
  "기본무기",
  "성장 배율을 곱하기 전 탄환 한 발의 피해입니다. 높이면 새 공격의 피해가 커집니다.",
  "다음 공격부터",
  0,
  100000,
  1,
);
field(
  "gauss.shotIntervalMs",
  "가우스 기본 공격 주기",
  "기본무기",
  "성장 전 기본 공격 간격입니다. 낮추면 공격이 빨라지며 점사 내부 회복 한계는 유지됩니다.",
  "다음 공격부터",
  100,
  30000,
  10,
  "전투 ms",
);
field(
  "marineGrowth.criticalMultiplier",
  "가우스 치명타 피해 배율",
  "기본무기",
  "치명타가 발생했을 때 피해에 곱하는 값입니다. 높이면 치명타 한 발이 강해집니다.",
  "다음 공격부터",
  1,
  20,
  0.05,
);
field(
  "marineGrowth.baseCritChance",
  "가우스 기본 치명타 확률",
  "기본무기",
  "성장 전 치명타 확률입니다. 0.05는 5%이며 높이면 치명타가 더 자주 발생합니다.",
  "다음 공격부터",
  0,
  1,
  0.01,
);
for (const [id, label] of [
  ["primary-damage", "공용 공격력"],
  ["attack-speed", "공용 공격속도"],
  ["crit-chance", "공용 치명타"],
  ["range", "사거리"],
] as const) {
  for (const [rarity, rarityLabel] of [
    ["COMMON", "일반"],
    ["RARE", "희귀"],
    ["EPIC", "유니크"],
    ["LEGENDARY", "전설"],
  ] as const) {
    if (id === "range" && rarity === "COMMON") continue;
    field(
      `marineQuality.${id}.${rarity}`,
      `${label} · ${rarityLabel} 카드 증가량`,
      "기본무기",
      "해당 성장 카드 한 레벨이 더하는 효과량입니다. 높이면 이후 선택한 카드가 더 강해지며 이미 선택한 효과는 유지됩니다.",
      "다음 레벨업부터",
      0,
      id === "range" ? 0.3 : 5,
      0.005,
    );
  }
}
for (const [id, label, max] of [
  ["heavyDamagePerQuality", "고위력 · 숙련 피해 계수", 5],
  ["heavyPenaltyBase", "고위력 · 기본 주기 배율", 5],
  ["heavyPenaltyExtra", "고위력 · 추가 주기 대가", 5],
  ["heavyPenaltyQualityDecay", "고위력 · 숙련 주기 대가 완화", 5],
  ["burstAdditionalRoundDamageFactor", "점사 · 추가탄 기본 피해율", 1],
  ["burstAdditionalRoundDamagePerQuality", "점사 · 추가탄 숙련 피해 증가", 1],
  ["burstAdditionalRoundDamageMax", "점사 · 추가탄 피해율 상한", 1],
  ["burstDamagePerQuality", "점사 · 숙련 피해 계수", 1],
  ["burstIntervalMs", "점사 · 내부 발사 간격", 2000],
  ["burstSpeedPerQuality", "점사 · 숙련 속도 계수", 1],
  ["penetrationCountPerLevel", "관통 · 레벨당 대상 증가", 5],
  ["penetrationBaseRetention", "관통 · 기본 후속 피해 비율", 2],
  ["ricochetBaseRetention", "도탄 · 기본 후속 피해 비율", 2],
  ["ricochetRadiusPerQuality", "도탄 · 숙련 탐색 거리", 100],
  ["ricochetDamageGrowth", "도탄 · 연쇄 피해 성장", 1],
  ["multishotBaseDamage", "다중탄 · 기본 보조탄 피해 비율", 5],
  ["multishotDamagePerQuality", "다중탄 · 숙련 피해 계수", 1],
  ["explosionBaseRadius", "폭발탄 · 기본 반경", 500],
  ["explosionRadiusPerQuality", "폭발탄 · 숙련 반경 증가", 100],
  ["explosionBaseDamage", "폭발탄 · 기본 피해 비율", 5],
  ["explosionDamagePerQuality", "폭발탄 · 숙련 피해 계수", 1],
] as const)
  field(
    `marineMods.${id}`,
    label,
    "기본무기",
    id.startsWith("burstAdditionalRound")
      ? "첫 탄은 100%이며 추가탄에만 기본율 + 숙련 증가 × max(0,품질−1)을 상한까지 적용합니다. 피해·치명타와 합성하고 파생 효과에도 한 번만 곱합니다."
      : id === "heavyPenaltyBase"
        ? "고위력 공격주기의 기준 배율입니다. 1은 기본 주기이며 숙련 대가와 A/B 분기 배율이 추가 합성됩니다."
        : id === "heavyPenaltyExtra"
          ? "고위력 기준 주기에 더하는 대가입니다. 실제 추가량은 이 값을 (1 + 숙련 완화 계수 × 품질)로 나눕니다."
          : id === "heavyPenaltyQualityDecay"
            ? "고위력 품질이 높을 때 추가 주기 대가를 줄이는 계수입니다. 높이면 숙련에 따라 추가 대가가 더 빠르게 줄어듭니다."
            : id === "burstIntervalMs"
              ? "점사 안에서 탄환 사이의 기준 간격입니다. 낮추면 점사가 빨라지며 기존 최소 간격 안전장치는 유지됩니다."
              : "보유한 개조의 실제 행동에 사용되는 계수입니다. 높이면 해당 피해·대상 수·범위 성장이 커지며 안전 상한은 유지됩니다.",
    "다음 공격부터",
    id === "burstIntervalMs" ? 55 : id === "heavyPenaltyBase" ? 1 : 0,
    max,
    id === "burstIntervalMs" ? 5 : 0.005,
  );

for (const [id, label] of [
  ["penetration", "관통"],
  ["ricochet", "도탄"],
  ["burst", "점사"],
  ["multishot", "다중탄"],
  ["explosive", "폭발탄"],
  ["heavy", "고위력"],
] as const) {
  for (const [kind, kindLabel] of [
    ["acquisitionWeight", "신규 획득 가중치"],
    ["growthWeight", "성장 가중치"],
  ] as const)
    field(
      `marineModWeights.${id}.${kind}`,
      `${label} · ${kindLabel}`,
      "카드 등장 / 가중치",
      kind === "acquisitionWeight"
        ? "신규 개조 Category가 당첨된 뒤 해금된 미보유 개조 중 하나를 고르는 상대 가중치입니다. Category 자체 빈도는 바꾸지 않습니다."
        : "보유 개조 성장 Category 안에서 이 가중치와 투자 편향을 곱해 선택합니다. Category 전체 가중치는 보유 개수와 무관하게 고정입니다.",
      "다음 레벨업부터",
      0,
      20,
      0.05,
    );
}

for (const [id, label, min, max, step] of [
  ["newModWeight0", "신규 개조 Category · 보유 0종", 0, 20, 0.01],
  ["newModWeight1", "신규 개조 Category · 보유 1종", 0, 20, 0.01],
  ["newModWeight2", "신규 개조 Category · 보유 2종", 0, 20, 0.01],
  ["newModWeight3", "신규 개조 Category · 보유 3종/Core", 0, 20, 0.01],
  ["rangeWeight", "사거리 카드 등장 가중치", 0, 20, 0.01],
  ["ownedModWeight", "보유 개조 성장 가중치", 0, 20, 0.05],
  ["maxModInvestment", "개조 투자 편향 상한", 1, 10, 0.05],
  ["specialGrowthWeight", "보유 특수무기 성장 카테고리 가중치", 0, 20, 0.05],
  ["maxSpecialInvestment", "특수무기 내부 투자 편향 상한", 1, 10, 0.05],
  ["traitLimit", "기본 개조 최대 종류", 1, 6, 1],
  ["firstAcquisitionLevel", "첫 특수무기 등장 레벨", 1, 100, 1],
  ["laterAcquisitionLevel", "두 번째 특수무기 등장 레벨", 1, 100, 1],
  ["firstAcquisitionWeight", "첫 특수무기 획득 가중치", 0, 20, 0.05],
  ["laterAcquisitionWeight", "두 번째 특수무기 획득 가중치", 0, 20, 0.05],
  ["specialCapacity", "특수무기 기본 최대 종류", 1, 3, 1],
  ["initialXp", "필요 경험치 · 기본값", 1, 10000, 1],
  ["xpPerLevel", "필요 경험치 · 선형 증가", 0, 1000, 0.5],
  ["xpQuadratic", "필요 경험치 · 후반 증가", 0, 100, 0.05],
  ["greatSuccessChance", "대성공 확률", 0, 1, 0.01],
  ["choiceCount", "일반 레벨업 카드 수", 1, 4, 1],
] as const) {
  const capacity = id === "traitLimit" || id === "specialCapacity";
  const description =
    id === "specialGrowthWeight"
      ? "보유 무기 수와 무관한 성장 카테고리 전체 가중치입니다. 한 선택창에 최대 1장만 나오며, 뽑힌 뒤 보유 무기를 내부 추첨합니다."
      : id === "maxSpecialInvestment"
        ? "특수 성장 카테고리가 뽑힌 뒤 어떤 보유 무기를 키울지 정하는 투자 편향 상한입니다. 카테고리 전체 등장 가중치는 늘리지 않습니다."
        : id.includes("AcquisitionLevel")
          ? "새 특수무기 획득 카드가 등장하기 시작하는 최소 캐릭터 레벨입니다. 낮추면 일찍 등장할 수 있지만 지급을 보장하지 않습니다."
          : id.includes("Weight")
            ? "레벨업 후보에서 해당 종류가 등장하는 상대 빈도입니다. 높이면 더 자주 등장하며 이미 열린 카드는 바꾸지 않습니다."
            : id.includes("Xp") || id.startsWith("xp")
              ? "다음 레벨에 필요한 경험치 공식의 계수입니다. 높이면 레벨업에 더 많은 경험치가 필요합니다."
              : id === "greatSuccessChance"
                ? "일반 성장 선택이 두 레벨 오를 확률입니다. 0.06은 6%이며 신규 특수무기 획득이나 Lv5 개조 분기 등 특별 선택에는 적용하지 않습니다."
                : id === "maxModInvestment"
                  ? "이미 투자한 개조가 다시 뽑히는 편향의 상한입니다. 높이면 한 개조에 성장이 집중되기 쉽습니다."
                  : id === "choiceCount"
                    ? "다음 일반 레벨업 선택에서 제시할 카드 수입니다. 이미 열린 선택창의 후보는 유지됩니다."
                    : "새 Run에서 사용할 보유 한도입니다. 기존 Run의 무기를 삭제하거나 열린 선택창을 변경하지 않습니다.";
  field(
    `marineGrowth.${id}`,
    label,
    "성장 / 레벨업",
    description,
    capacity ? "다음 Run부터" : "다음 레벨업부터",
    min,
    max,
    step,
  );
}
for (const [band, range] of [
  "Lv1~9",
  "Lv10~19",
  "Lv20~29",
  "Lv30 이상",
].entries()) {
  for (const [index, label] of ["일반", "희귀", "유니크", "전설"].entries())
    field(
      `marineRarity.bands.${band}.weights.${index}`,
      `${range} · ${label} 확률`,
      "희귀도 / 랜덤",
      "1000분율 확률입니다. 780은 78%이며 같은 레벨 구간의 네 값을 합쳐1000으로 맞춥니다. 사거리와 중복 전설 제외 시 유효 등급끼리 다시 정규화합니다.",
      "다음 레벨업부터",
      0,
      1000,
      1,
      "‰",
    );
}

for (const [weapon, label] of [
  ["grenade", "수류탄"],
  ["missile", "미사일"],
  ["drone", "드론"],
] as const) {
  const group = `특수무기 · ${label}`;
  field(
    `special.${weapon}.damage`,
    weapon === "missile" ? "미사일 발당 피해" : `${label} 기본 피해`,
    group,
    weapon === "missile"
      ? "성장 전 미사일 한 발의 기본 피해입니다. 일제사격 전체 피해가 아니며 여러 발이 맞으면 각각 적용됩니다."
      : "성장 전 한 번 공격의 기본 피해입니다. 높이면 다음 공격부터 더 강해집니다.",
    "다음 공격부터",
    0,
    100000,
    1,
  );
  field(
    `special.${weapon}.cycleMs`,
    weapon === "missile" ? "미사일 일제사격 주기" : `${label} 기본 공격 주기`,
    group,
    "입력값은 개발 배속 X1에서의 실제 초이며 내부에는 전투 시계 ms로 저장합니다. 낮추면 더 자주 공격하며 이미 예약된 공격은 유지됩니다.",
    "다음 공격부터",
    100,
    60000,
    50,
    "전투 ms",
  );
}
field(
  "special.grenade.radius",
  "수류탄 기본 폭발 반경",
  "특수무기 · 수류탄",
  "기본 폭발이 닿는 논리 거리입니다. 높이면 더 넓은 적 무리를 공격합니다.",
  "다음 공격부터",
  1,
  1000,
  5,
);
for (const [id, label, max] of [
  ["grenadeBehavior.cluster.damage", "집속탄 자탄 피해 비율", 10],
  ["grenadeBehavior.cluster.radius", "집속탄 자탄 반경 배율", 5],
  ["grenadeBehavior.highExplosive.damage", "고폭탄 피해 배율", 10],
  ["grenadeBehavior.highExplosive.radius", "고폭탄 반경 배율", 5],
  ["grenadeBehavior.tactical.damage", "전술탄 기본 피해 배율", 10],
  ["grenadeBehavior.tactical.radius", "전술탄 중력장 반경 배율", 5],
  ["grenadeBehavior.tactical.pull", "전술탄 끌어당김 세기", 1],
  ["grenadeBehavior.tactical.tickDamage", "중력장 반복 피해 비율", 5],
] as const)
  field(
    `special.${id}`,
    label,
    "특수무기 · 수류탄",
    "해당 수류탄 트리를 선택했을 때 사용하는 공격 계수입니다. 높이면 해당 피해·범위·끌어당김이 강해집니다.",
    "다음 공격부터",
    0,
    max,
    0.05,
  );
for (let index = 0; index < 3; index++)
  field(
    `special.grenadeBehavior.cluster.count.${index}`,
    `집속탄 자탄 수 · Lv${[3, 6, 10][index]}`,
    "특수무기 · 수류탄",
    "집속탄 계열에서 해당 성장 단계가 만드는 자탄 수입니다. 높이면 넓게 공격하지만 처리량도 늘어납니다.",
    "다음 공격부터",
    1,
    30,
    1,
  );
field(
  "special.missileSpeed",
  "미사일 비행 속도",
  "특수무기 · 미사일",
  "전투 시간 1초당 논리 이동속도입니다. 현재 비행 중인 미사일에도 즉시 적용됩니다.",
  "즉시 적용",
  10,
  3000,
  10,
);
for (const [id, label, description, min, max, step, unit] of [
  [
    "missileBehavior.baseSalvoCount",
    "기본 일제사격 수",
    "기본 유도미사일이 한 번의 공격에서 발사하는 미사일 수입니다. 포화 계열 추가 발수는 여기에 더합니다.",
    1,
    16,
    1,
    "발",
  ],
  [
    "missileBehavior.salvoIntervalMs",
    "미사일 간 발사 간격",
    "한 일제사격 안에서 다음 미사일을 발사하기까지의 X1 실제 시간입니다. 이미 예약된 일제사격은 유지됩니다.",
    15,
    3000,
    15,
    "전투 ms",
  ],
  [
    "missileBehavior.baseRetargets",
    "기본 재유도 횟수",
    "목표가 먼저 죽었을 때 다른 적을 다시 추적할 수 있는 기본 횟수입니다. 추적 계열과 긴급 재지정의 추가 횟수는 여기에 더합니다.",
    0,
    30,
    1,
    "회",
  ],
  [
    "missileLifetimeMs",
    "미사일 추적 수명",
    "새 미사일이 발사된 뒤 사라지기까지의 X1 실제 시간입니다. 재유도 중에도 남은 수명을 사용하며 성장 효과가 수명을 연장할 수 있습니다.",
    100,
    60000,
    50,
    "전투 ms",
  ],
  [
    "missileBehavior.hunter.threatDamage",
    "헌터 킬러 · 강적 피해 배율",
    "헌터 킬러 계열이 정예·보스·방패·돌진병 또는 성벽 앞 위험 적을 공격할 때 발당 피해에 곱하는 값입니다.",
    0,
    20,
    0.05,
    "배",
  ],
  [
    "missileBehavior.tracking.retargets",
    "특수 추적 · 추가 재유도 횟수",
    "특수 추적 계열에서 기본 재유도 횟수에 더하는 값입니다. 완성형의 연쇄 적중과는 별도입니다.",
    0,
    30,
    1,
    "회",
  ],
  [
    "missileBehavior.emergencyRetargets",
    "긴급 재지정 · 추가 재유도 횟수",
    "Lv15 긴급 재지정 선택 시 기본·트리 재유도 횟수에 더하는 값입니다.",
    0,
    30,
    1,
    "회",
  ],
] as const)
  field(
    `special.${id}`,
    label,
    "특수무기 · 미사일",
    description,
    "다음 공격부터",
    min,
    max,
    step,
    unit,
  );
field(
  "special.missileBehavior.damageReservation",
  "과잉 피해 방지 예약",
  "특수무기 · 미사일",
  "켜면 비행 중인 미사일의 예상 피해를 고려해 이미 충분히 예약된 적을 피합니다. 체력이 높은 적에는 여러 발을 집중할 수 있습니다.",
  "다음 표적 선택부터",
);
for (let index = 0; index < 3; index++)
  field(
    `special.missileBehavior.saturation.additionalCount.${index}`,
    `포화 추가 미사일 수 · Lv${[3, 6, 10][index]}`,
    "특수무기 · 미사일",
    "포화 계열에서 기본 일제사격 수에 더하는 미사일 수입니다. 기본 3발일 때 1·2·4를 더하면 총 4·5·7발입니다.",
    "다음 공격부터",
    0,
    30,
    1,
  );
for (const [id, label] of [
  ["elite", "정예 우선도"],
  ["runner", "돌진병 우선도"],
  ["wall", "성벽 위협 우선도"],
] as const)
  field(
    `special.targeting.${id}`,
    `미사일 · ${label}`,
    "특수무기 · 미사일",
    "미사일·드론이 공유하는 위험도 점수입니다. 높이면 해당 적을 더 우선하며 미사일의 예약 피해와 집중 조준도 함께 고려합니다.",
    "다음 공격부터",
    0,
    5000,
    10,
  );
field(
  "special.droneBaseCount",
  "기본 드론 수",
  "특수무기 · 드론",
  "추가 편대 효과가 없을 때의 기본 드론 수입니다. 높이면 독립 공격 드론이 늘어납니다.",
  "다음 공격부터",
  1,
  10,
  1,
);
field(
  "special.droneBehavior.defaultDepth",
  "드론 기본 배치 깊이",
  "특수무기 · 드론",
  "드론의 기본 전장 배치 위치입니다. 값이 클수록 성벽에 가깝게 배치됩니다.",
  "다음 공격부터",
  0,
  1200,
  10,
);
field(
  "special.droneBehavior.gunship.damage",
  "건십 기본 피해 배율",
  "특수무기 · 드론",
  "건십 계열이 기본 드론 피해에 곱하는 값입니다. 높이면 건십의 한 번 공격이 강해집니다.",
  "다음 공격부터",
  0.1,
  20,
  0.1,
);
for (let index = 0; index < 3; index++)
  field(
    `special.droneBehavior.squadron.count.${index}`,
    `드론 편대 수 · Lv${[3, 6, 10][index]}`,
    "특수무기 · 드론",
    "편대 계열의 드론 수입니다. 높이면 동시에 공격하는 드론이 늘어납니다.",
    "다음 공격부터",
    1,
    20,
    1,
  );
for (let index = 0; index < 2; index++) {
  field(
    `special.droneBehavior.gunship.gatlingCycle.${index}`,
    `개틀링 건십 주기 배율 · Lv${[6, 10][index]}`,
    "특수무기 · 드론",
    "기관포 공격 간격에 곱하는 값입니다. 낮추면 더 빠르게 사격합니다.",
    "다음 공격부터",
    0.05,
    5,
    0.05,
  );
  field(
    `special.droneBehavior.squadron.wolfpackDamage.${index}`,
    `울프팩 피해 배율 · Lv${[6, 10][index]}`,
    "특수무기 · 드론",
    "울프팩 편대의 집중 피해에 곱하는 값입니다. 높이면 편대 공격이 더 강해집니다.",
    "다음 공격부터",
    0.1,
    10,
    0.05,
  );
}

field(
  "highroll.firstRelicGuaranteed",
  "첫 정예 유물 기회 보장",
  "유물",
  "켜면 첫 정예 처치에서 유물 선택 기회를 보장합니다. 끄면 첫 정예도 일반 드롭 확률을 사용합니다.",
);
field(
  "highroll.relicDropChance",
  "유물 드롭 확률",
  "유물",
  "정예 처치 후 유물 기회가 발생할 확률입니다. 0.32는32%이며 높이면 유물을 얻기 쉽습니다.",
  "즉시 적용",
  0,
  1,
  0.01,
);
field(
  "highroll.relicCapacity",
  "유물 최대 보유 수",
  "유물",
  "새 Run에서 동시에 보유할 수 있는 유물 수입니다. 한도를 넘은 새 유물은 교체하거나 포기합니다.",
  "다음 Run부터",
  1,
  6,
  1,
);
for (const [id, label, description, max] of [
  [
    "loaderCycleMultiplier",
    "고속 장전 · 주기 배율",
    "특수무기 반복 주기에 곱합니다. 낮추면 더 자주 발사합니다.",
    2,
  ],
  [
    "impactChance",
    "충격 탄약 · 밀치기 확률",
    "적중 시 약한 밀치기가 발생할 확률입니다. 높이면 더 자주 밀칩니다.",
    1,
  ],
  [
    "precisionBonus",
    "정밀 조준 · 치명타 추가 확률",
    "공용 치명타 확률에 더하는 값입니다. 0.12는12%p입니다.",
    1,
  ],
  [
    "overchargeChance",
    "과충전 · 발생 확률",
    "공격 행동이 과충전될 확률입니다. 높이면 강화 공격이 더 자주 나갑니다.",
    1,
  ],
  [
    "overchargeMultiplier",
    "과충전 · 피해 배율",
    "과충전된 공격 행동 전체 피해에 곱합니다. 높이면 발동 시 더 강해집니다.",
    20,
  ],
  [
    "replicationChance",
    "탄약 복제 · 발생 확률",
    "기본 공격 행동을 한 번 추가 반복할 확률입니다. 높이면 복제가 더 자주 발생하며 재복제는 없습니다.",
    1,
  ],
] as const)
  field(
    `highroll.${id}`,
    label,
    "유물",
    description,
    "다음 공격부터",
    id === "loaderCycleMultiplier" ? 0.05 : 0,
    max,
    0.01,
  );
field(
  "highroll.coreDropChance",
  "코어 드롭 확률",
  "코어",
  "정예 처치 때 코어를 추첨할 확률입니다. 0.03은3%이며 Run 보유 한도는 별도로 적용합니다.",
  "즉시 적용",
  0,
  1,
  0.01,
);
field(
  "highroll.maxCores",
  "Run 최대 코어 수",
  "코어",
  "현재 Prototype은 코어1개까지 지원합니다.0으로 바꾸면 새 코어 드롭을 막으며 이미 얻은 코어를 제거하지 않습니다.",
  "즉시 적용",
  0,
  1,
  1,
);
for (const [id, label] of [
  ["armament", "무장 확장"],
  ["modification", "개조 확장"],
  ["quality", "품질 개방"],
] as const)
  field(
    `highroll.coreEnabled.${id}`,
    `${label} 코어 후보 포함`,
    "코어",
    "끄면 이후 코어 추첨 후보에서 제외합니다. 이미 획득한 코어 효과는 유지합니다.",
  );
for (const [id, label] of [
  ["saturation", "포화 소거 작전"],
  ["kill-zone", "중력 살상지대"],
  ["hunt", "추적 섬멸망"],
] as const)
  field(
    `synergies.enabled.${id}`,
    `${label} 사용`,
    "시너지",
    "끄면 해당 시너지의 전투 효과를 비활성화합니다. 성장·조건 기록은 보존합니다.",
  );
field(
  "synergies.killZoneMultiplier",
  "중력 살상지대 피해 배율",
  "시너지",
  "중력장 안의 적에게 적용하는 시너지 피해 배율입니다. 높이면 구역 집중 화력이 강해집니다.",
  "다음 공격부터",
  1,
  10,
  0.05,
);
field(
  "synergies.huntMultiplier",
  "추적 섬멸망 피해 배율",
  "시너지",
  "사냥 표적에 집중하는 시너지 피해 배율입니다. 높이면 표적 제거가 빨라집니다.",
  "다음 공격부터",
  1,
  10,
  0.05,
);
field(
  "synergies.saturation.durationMs",
  "포화 소거 작전 지속 시간",
  "시너지",
  "포화 효과가 유지되는 시간입니다. 높이면 다음 발동의 추가 화력 시간이 길어집니다.",
  "다음 공격부터",
  100,
  30000,
  100,
  "전투 ms",
);

for (const [id, label, description, apply, min, max, step, unit] of [
  [
    "hp",
    "공성 거인 최대 체력",
    "다음에 등장하는 Boss의 체력입니다. 높이면 처치에 더 많은 피해가 필요하며 현재 Boss는 소급 변경하지 않습니다.",
    "다음 적 생성부터",
    1,
    1000000,
    100,
    "",
  ],
  [
    "spawnMs",
    "보스 등장 시각",
    "Stage 시계 기준 등장 시간입니다. 낮추면 이번 Run에서 아직 등장하지 않은 Boss가 일찍 나타납니다.",
    "즉시 적용",
    1000,
    7200000,
    1000,
    "Stage ms",
  ],
  [
    "warningMs",
    "보스 경고 시작 시각",
    "일반 물량을 줄이고 Boss를 예고할 Stage 시각입니다. Boss 등장보다 늦게 설정하지 마세요.",
    "즉시 적용",
    0,
    7200000,
    1000,
    "Stage ms",
  ],
  [
    "approachSpeed",
    "보스 접근 이동속도",
    "공성 준비 위치까지 전진하는 속도입니다. 높이면 플레이어에게 빨리 접근합니다.",
    "즉시 적용",
    0.001,
    1,
    0.001,
    "",
  ],
  [
    "chargeMs",
    "공성 충전 시간",
    "공성 공격 전에 약점을 공격할 시간입니다. 늘리면 다음 충전부터 끊기 쉬워집니다.",
    "다음 공격부터",
    100,
    60000,
    100,
    "전투 ms",
  ],
  [
    "interruptDamage",
    "약점 중단 필요 피해",
    "충전 중 이만큼 본체 피해를 넣으면 공성을 취소합니다. 높이면 중단이 어려워집니다.",
    "즉시 적용",
    1,
    100000,
    50,
    "",
  ],
  [
    "staggerMs",
    "약점 중단 취약 시간",
    "충전을 끊은 뒤 Boss가 멈춰 취약해지는 시간입니다. 높이면 다음 중단 보상이 커집니다.",
    "다음 공격부터",
    100,
    60000,
    100,
    "전투 ms",
  ],
  [
    "vulnerableMultiplier",
    "취약 중 받는 피해 배율",
    "Boss가 취약한 동안 받는 피해에 곱합니다. 높이면 약점 중단 뒤 더 큰 피해를 넣습니다.",
    "다음 공격부터",
    1,
    20,
    0.1,
    "",
  ],
  [
    "siegeWallDamage",
    "공성 공격 성벽 피해",
    "충전을 끊지 못했을 때 성벽이 받는 피해입니다. 높이면 실패 부담이 커집니다.",
    "다음 공격부터",
    0,
    100000,
    100,
    "",
  ],
  [
    "finalHpRatio",
    "최후 돌진 시작 체력 비율",
    "최대 체력 대비 이 비율 이하에서 최후 돌진합니다. 높이면 돌진이 더 일찍 시작됩니다.",
    "즉시 적용",
    0.01,
    1,
    0.01,
    "",
  ],
  [
    "finalSpeed",
    "최후 돌진 이동속도",
    "마지막 단계에서 성벽으로 전진하는 속도입니다. 높이면 처치해야 할 시간이 줄어듭니다.",
    "즉시 적용",
    0.001,
    1,
    0.001,
    "",
  ],
  [
    "finalWallDamage",
    "최후 돌진 성벽 피해",
    "성벽에 도달한 Boss의 반복 공격 피해입니다. 높이면 성벽이 빠르게 무너집니다.",
    "다음 공격부터",
    0,
    100000,
    100,
    "",
  ],
  [
    "finalWallIntervalMs",
    "최후 돌진 공격 간격",
    "성벽 도달 후 반복 공격하는 간격입니다. 낮추면 더 자주 공격합니다.",
    "다음 공격부터",
    100,
    30000,
    100,
    "전투 ms",
  ],
  [
    "reinforcementHpRatio",
    "증원 호출 체력 비율",
    "이 비율 이하에서 한 번 증원을 부릅니다. 높이면 증원이 일찍 오며 이미 호출한 증원은 반복하지 않습니다.",
    "즉시 적용",
    0.01,
    1,
    0.01,
    "",
  ],
  [
    "reinforcement.grunt",
    "증원 일반병 수",
    "증원 호출 때 추가하는 일반병 수입니다. 높이면 물량이 많아지며 cap이 차면 대기합니다.",
    "즉시 적용",
    0,
    700,
    1,
    "명",
  ],
  [
    "reinforcement.runner",
    "증원 돌진병 수",
    "증원 호출 때 추가하는 돌진병 수입니다. 높이면 빠른 적의 압박이 커집니다.",
    "즉시 적용",
    0,
    700,
    1,
    "명",
  ],
] as const)
  field(
    `boss.${id}`,
    label,
    "보스",
    description,
    apply,
    min,
    max,
    step,
    unit || undefined,
  );
for (const [phase, label] of [
  ["active", "일반 보스전"],
  ["final", "최후 돌진"],
] as const) {
  field(
    `boss.supply.${phase}.batchSize`,
    `${label} · 일반 적 생성 수`,
    "보스",
    "Boss 단계에서 한 번에 보충하는 일반 적 수입니다. 높이면 Boss와 함께 상대할 물량이 많아집니다.",
    "즉시 적용",
    0,
    700,
    1,
  );
  field(
    `boss.supply.${phase}.spawnIntervalMs`,
    `${label} · 일반 적 생성 간격`,
    "보스",
    "Boss 단계에서 일반 적을 보충하는 간격입니다. 낮추면 더 빠르게 전장을 채웁니다.",
    "즉시 적용",
    100,
    60000,
    50,
    "전투 ms",
  );
}
