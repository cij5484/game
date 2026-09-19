import {
  researchDefinitions,
  type ResearchId,
  type ResearchLevels,
} from "./meta";
import type { MarineTraitId } from "./marineGrowth";
import type { SpecialWeaponId } from "./specialWeapons";
import type { PrototypeRelicId } from "./highroll";

export type OperationId =
  | "first-operation"
  | "hold-line"
  | "combat-adaptation"
  | "first-elite"
  | "endurance"
  | "boss-encounter"
  | "first-victory"
  | "penetration-understanding"
  | "continuous-fire"
  | "elite-sniper"
  | "mass-kills"
  | "powerful-choice"
  | "complete-rifle"
  | "grenade-mastery"
  | "retarget"
  | "drone-mastery"
  | "grenade-overclock"
  | "missile-overclock"
  | "drone-overclock"
  | "dual-armament"
  | "first-completion"
  | "first-transcendence"
  | "limit-break"
  | "first-relic"
  | "relic-pair"
  | "first-synergy"
  | "rule-breaker"
  | "first-critical";
export interface OperationEvidence {
  elapsedMs?: number;
  characterLevel?: number;
  eliteKills?: number;
  bossEncountered?: boolean;
  primaryKills?: number;
  primaryEliteKills?: number;
  gaussActionHits?: number;
  criticalHits?: number;
  burstLevel?: number;
  basicModCount?: number;
  specialWeaponCount?: number;
  specialLevels?: Partial<Record<SpecialWeaponId, number>>;
  overclocks?: SpecialWeaponId[];
  relicCount?: number;
  synergyCount?: number;
  coreCount?: number;
  highRarityChoice?: boolean;
  missileRetargets?: number;
}
export interface OperationRecord {
  id: OperationId;
  title: string;
  category:
    "생존 / 진행" | "기본무기 / 특수무기" | "Build" | "Stage / 고급 도전";
  description: string;
  points: number;
  metric: keyof OperationEvidence | "completedRuns" | "stage1ClearCount";
  target: number;
  weapon?: SpecialWeaponId;
  rewards: string[];
}
const record = (
  id: OperationId,
  title: string,
  category: OperationRecord["category"],
  description: string,
  points: number,
  metric: OperationRecord["metric"],
  target: number,
  rewards: string[] = [],
  weapon?: SpecialWeaponId,
): OperationRecord => ({
  id,
  title,
  category,
  description,
  points,
  metric,
  target,
  rewards,
  ...(weapon ? { weapon } : {}),
});
export const operationRecords: readonly OperationRecord[] = [
  record(
    "first-operation",
    "첫 작전 종료",
    "생존 / 진행",
    "첫 Run 자연 종료 · 수동 재시작 제외",
    1,
    "completedRuns",
    1,
    ["특수무기 시스템", "수류탄", "특수 슬롯 1", "특수무기 피해·주기 연구"],
  ),
  record(
    "hold-line",
    "전선 유지",
    "생존 / 진행",
    "한 Run에서 5분 생존",
    1,
    "elapsedMs",
    300000,
  ),
  record(
    "combat-adaptation",
    "전투 적응",
    "생존 / 진행",
    "캐릭터 Lv10 도달",
    1,
    "characterLevel",
    10,
  ),
  record(
    "first-elite",
    "첫 정예 격파",
    "생존 / 진행",
    "정예 최초 처치",
    1,
    "eliteKills",
    1,
    ["정예·Boss 피해 연구"],
  ),
  record(
    "endurance",
    "버티는 힘",
    "생존 / 진행",
    "한 Run에서 10분 생존",
    1,
    "elapsedMs",
    600000,
  ),
  record(
    "boss-encounter",
    "공성 거인 조우",
    "Stage / 고급 도전",
    "Stage 1 Boss 최초 등장",
    2,
    "bossEncountered",
    1,
  ),
  record(
    "first-victory",
    "첫 승리",
    "Stage / 고급 도전",
    "Stage 1 최초 클리어",
    3,
    "stage1ClearCount",
    1,
    ["Core 시스템", "전설 — 증원 병력"],
  ),
  record(
    "penetration-understanding",
    "관통의 이해",
    "기본무기 / 특수무기",
    "한 Gauss 공격 행동으로 서로 다른 적 3명 실제 적중",
    1,
    "gaussActionHits",
    3,
    ["도탄"],
  ),
  record(
    "continuous-fire",
    "연속 사격",
    "기본무기 / 특수무기",
    "점사 개조 Lv3 도달",
    1,
    "burstLevel",
    3,
    ["다중탄"],
  ),
  record(
    "elite-sniper",
    "점화 실험",
    "기본무기 / 특수무기",
    "한 Run에서 기본무기로 적 50명 처치",
    1,
    "primaryKills",
    50,
    ["소이탄"],
  ),
  record(
    "mass-kills",
    "대량 살상",
    "기본무기 / 특수무기",
    "한 Run에서 기본무기로 적 100명 처치",
    1,
    "primaryKills",
    100,
    ["폭발탄"],
  ),
  record(
    "powerful-choice",
    "강력한 한 방",
    "Build",
    "Unique 또는 Legendary 일반 성장 최초 선택",
    1,
    "highRarityChoice",
    1,
    ["과충전 축전기"],
  ),
  // Same condition as '기본무기 완성 준비': one record, one point, one direct reward.
  record(
    "complete-rifle",
    "완성된 소총",
    "Build",
    "기본무기 형태 개조 3종 동시 보유",
    1,
    "basicModCount",
    3,
    ["탄약 복제기"],
  ),
  record(
    "grenade-mastery",
    "수류탄 숙련",
    "기본무기 / 특수무기",
    "수류탄 Lv10 완성",
    1,
    "specialLevels",
    10,
    ["수류탄 전술탄 트리"],
    "grenade",
  ),
  record(
    "retarget",
    "재추적",
    "기본무기 / 특수무기",
    "미사일 기본 재유도 누적 10회",
    1,
    "missileRetargets",
    10,
    ["미사일 특수 추적 트리"],
  ),
  record(
    "drone-mastery",
    "드론 숙련",
    "기본무기 / 특수무기",
    "드론 Lv10 완성",
    1,
    "specialLevels",
    10,
    ["드론 호위 트리"],
    "drone",
  ),
  record(
    "grenade-overclock",
    "수류탄 오버클록",
    "기본무기 / 특수무기",
    "수류탄 Lv20 오버클록 최초 선택",
    2,
    "overclocks",
    1,
    ["삼중 투척 시스템"],
    "grenade",
  ),
  record(
    "missile-overclock",
    "미사일 오버클록",
    "기본무기 / 특수무기",
    "미사일 Lv20 오버클록 최초 선택",
    2,
    "overclocks",
    1,
    ["불멸 유도체"],
    "missile",
  ),
  record(
    "drone-overclock",
    "드론 오버클록",
    "기본무기 / 특수무기",
    "드론 Lv20 오버클록 최초 선택",
    2,
    "overclocks",
    1,
    ["완전 동기화"],
    "drone",
  ),
  record(
    "dual-armament",
    "두 개의 무장",
    "Build",
    "특수무기 2종 동시 보유",
    1,
    "specialWeaponCount",
    2,
  ),
  record(
    "first-completion",
    "첫 완성",
    "Build",
    "특수무기 Lv10 최초 도달",
    2,
    "specialLevels",
    10,
  ),
  record(
    "first-transcendence",
    "첫 초월",
    "Build",
    "특수무기 Lv15 최초 도달",
    2,
    "specialLevels",
    15,
  ),
  record(
    "limit-break",
    "한계 돌파",
    "Build",
    "특수무기 Lv20 최초 도달",
    3,
    "specialLevels",
    20,
  ),
  record(
    "first-relic",
    "첫 유물",
    "Build",
    "유물 최초 획득",
    1,
    "relicCount",
    1,
  ),
  record(
    "relic-pair",
    "유물 완성",
    "Build",
    "한 Run에서 유물 2개 동시 보유",
    1,
    "relicCount",
    2,
  ),
  record(
    "first-synergy",
    "첫 시너지",
    "Build",
    "시너지 최초 활성화",
    2,
    "synergyCount",
    1,
  ),
  record(
    "rule-breaker",
    "규칙 파괴",
    "Build",
    "Core 최초 획득",
    2,
    "coreCount",
    1,
  ),
  record(
    "first-critical",
    "치명적 적중",
    "기본무기 / 특수무기",
    "치명타 최초 실제 적중",
    1,
    "criticalHits",
    1,
    ["치명타 확률·피해 연구"],
  ),
];
export const masteryThresholds = {
  relic: 3,
  missile: 9,
  specialSlot2: 13,
  drone: 17,
  synergy: 22,
} as const;
export interface UnlockState {
  basicMods: MarineTraitId[];
  specialWeapons: SpecialWeaponId[];
  specialCapacity: number;
  relicSystem: boolean;
  relics: PrototypeRelicId[];
  coreSystem: boolean;
  synergySystem: boolean;
  trees: Record<SpecialWeaponId, string[]>;
  overclocks: Record<SpecialWeaponId, string[]>;
  research: ResearchId[];
}
export interface OperationSaveSource {
  characters: {
    marine: {
      research: ResearchLevels;
      completedOperationRecords: readonly OperationId[];
      operationProgress: OperationEvidence;
      unlockAll?: boolean;
      specialCapacityOverride?: 0 | 1 | 2;
    };
  };
  progress: { completedRuns: number; stage1ClearCount: number };
}
export function getMasteryPoints(completed: readonly OperationId[]): number {
  return operationRecords
    .filter((record) => completed.includes(record.id))
    .reduce((sum, record) => sum + record.points, 0);
}
export function freshUnlocks(): UnlockState {
  return {
    basicMods: ["penetration", "burst"],
    specialWeapons: [],
    specialCapacity: 0,
    relicSystem: false,
    relics: [],
    coreSystem: false,
    synergySystem: false,
    trees: {
      grenade: ["cluster", "high-explosive"],
      missile: ["saturation", "hunter"],
      drone: ["squadron", "gunship"],
    },
    overclocks: {
      grenade: ["nuclear", "barrage"],
      missile: ["hunting", "network"],
      drone: ["army", "cruiser"],
    },
    research: ["primary-damage", "primary-speed", "wall-hp"],
  };
}
export function getUnlocks(save: OperationSaveSource): UnlockState {
  const marine = save.characters.marine,
    completed = marine.completedOperationRecords,
    points = getMasteryPoints(completed),
    result = freshUnlocks();
  if (marine.unlockAll)
    return {
      ...allUnlocks(),
      specialCapacity: marine.specialCapacityOverride ?? 2,
    };
  const has = (id: OperationId) => completed.includes(id);
  if (has("first-operation")) {
    result.specialWeapons.push("grenade");
    result.specialCapacity = 1;
    result.research.push("special-damage", "special-cycle");
  }
  if (points >= masteryThresholds.relic) {
    result.relicSystem = true;
    result.relics.push("loader", "impact", "precision");
    result.research.push("wall-defense");
  }
  if (points >= masteryThresholds.missile) {
    result.specialWeapons.push("missile");
    result.research.push("xp");
  }
  if (points >= masteryThresholds.specialSlot2) {
    if (has("first-operation")) result.specialCapacity = 2;
    result.research.push("range");
  }
  if (points >= masteryThresholds.drone) result.specialWeapons.push("drone");
  result.synergySystem = points >= masteryThresholds.synergy;
  if (has("first-victory")) {
    result.coreSystem = true;
    result.relics.push("reinforcement");
  }
  if (has("penetration-understanding")) result.basicMods.push("ricochet");
  if (has("continuous-fire")) result.basicMods.push("multishot");
  if (has("elite-sniper")) result.basicMods.push("incendiary");
  if (has("mass-kills")) result.basicMods.push("explosive");
  if (has("powerful-choice")) result.relics.push("capacitor");
  if (has("complete-rifle")) result.relics.push("replicator");
  if (has("grenade-mastery")) result.trees.grenade.push("tactical");
  if (has("retarget")) result.trees.missile.push("tracking");
  if (has("drone-mastery")) result.trees.drone.push("escort");
  if (has("grenade-overclock")) result.overclocks.grenade.push("triple");
  if (has("missile-overclock")) result.overclocks.missile.push("immortal");
  if (has("drone-overclock")) result.overclocks.drone.push("synchronization");
  if (has("first-critical"))
    result.research.push("critical-chance", "critical-damage");
  if (has("first-elite")) result.research.push("elite-boss-damage");
  for (const id of Object.keys(researchDefinitions) as ResearchId[])
    if ((marine.research[id] ?? 0) > 0 && !result.research.includes(id))
      result.research.push(id);
  if (marine.specialCapacityOverride !== undefined)
    result.specialCapacity = marine.specialCapacityOverride;
  return result;
}
export function allUnlocks(): UnlockState {
  return getUnlocks({
    characters: {
      marine: {
        research: {},
        completedOperationRecords: operationRecords.map((record) => record.id),
        operationProgress: {},
      },
    },
    progress: { completedRuns: 1, stage1ClearCount: 1 },
  });
}
export function getOperationProgress(
  record: OperationRecord,
  save: OperationSaveSource,
): number {
  if (save.characters.marine.completedOperationRecords.includes(record.id))
    return record.target;
  if (record.metric === "completedRuns" || record.metric === "stage1ClearCount")
    return Math.min(record.target, save.progress[record.metric]);
  const value = save.characters.marine.operationProgress[record.metric];
  if (record.metric === "specialLevels")
    return Math.min(
      record.target,
      record.weapon
        ? (save.characters.marine.operationProgress.specialLevels?.[
            record.weapon
          ] ?? 0)
        : Math.max(
            0,
            ...Object.values(
              save.characters.marine.operationProgress.specialLevels ?? {},
            ),
          ),
    );
  if (record.metric === "overclocks")
    return Number(
      !!record.weapon &&
        save.characters.marine.operationProgress.overclocks?.includes(
          record.weapon,
        ),
    );
  return Math.min(
    record.target,
    typeof value === "number" ? value : value === true ? 1 : 0,
  );
}
const labels: Record<string, string> = {
  "mod/penetration": "관통",
  "mod/burst": "점사",
  "mod/ricochet": "도탄",
  "mod/multishot": "다중탄",
  "mod/incendiary": "소이탄",
  "mod/explosive": "폭발탄",
  "weapon/grenade": "수류탄",
  "weapon/missile": "유도 미사일",
  "weapon/drone": "드론",
  "slot/1": "특수 슬롯 1",
  "slot/2": "특수 슬롯 2",
  "system/special": "특수무기 시스템",
  "system/relic": "유물 시스템",
  "system/core": "Core 시스템",
  "system/synergy": "시너지 시스템",
  "relic/loader": "고속 장전 장치",
  "relic/impact": "충격 탄약",
  "relic/precision": "정밀 조준기",
  "relic/capacitor": "과충전 축전기",
  "relic/replicator": "탄약 복제기",
  "relic/reinforcement": "전설 — 증원 병력",
  "tree/grenade/cluster": "수류탄 집속탄",
  "tree/grenade/high-explosive": "수류탄 고폭탄",
  "tree/grenade/tactical": "수류탄 전술탄",
  "tree/missile/saturation": "미사일 포화",
  "tree/missile/hunter": "헌터 킬러",
  "tree/missile/tracking": "특수 추적",
  "tree/drone/squadron": "드론 편대",
  "tree/drone/gunship": "중무장 건십",
  "tree/drone/escort": "드론 호위",
  "overclock/grenade/nuclear": "전술 핵탄두",
  "overclock/grenade/barrage": "자동 유탄 난사 장치",
  "overclock/grenade/triple": "삼중 투척 시스템",
  "overclock/missile/hunting": "사냥 본능 폭주",
  "overclock/missile/network": "전장 사냥망",
  "overclock/missile/immortal": "불멸 유도체",
  "overclock/drone/army": "무인 전투군",
  "overclock/drone/cruiser": "전투 순양기",
  "overclock/drone/synchronization": "완전 동기화",
};
export function unlockLabels(state: UnlockState): Record<string, string> {
  const keys = [
    ...state.basicMods.map((id) => `mod/${id}`),
    ...state.specialWeapons.map((id) => `weapon/${id}`),
    ...state.relics.map((id) => `relic/${id}`),
    ...state.research.map((id) => `research/${id}`),
  ];
  if (state.specialCapacity > 0) keys.push("system/special", "slot/1");
  if (state.specialCapacity > 1) keys.push("slot/2");
  if (state.relicSystem) keys.push("system/relic");
  if (state.coreSystem) keys.push("system/core");
  if (state.synergySystem) keys.push("system/synergy");
  for (const weapon of state.specialWeapons) {
    keys.push(
      ...state.trees[weapon].map((id) => `tree/${weapon}/${id}`),
      ...state.overclocks[weapon].map((id) => `overclock/${weapon}/${id}`),
    );
  }
  return Object.fromEntries(
    keys.map((key) => [
      key,
      key.startsWith("research/")
        ? `${researchDefinitions[key.slice(9) as ResearchId].title} 연구`
        : (labels[key] ?? key),
    ]),
  );
}
export const unlockRequirements: Record<string, string> = {
  "tree/grenade/cluster": "수류탄 해금 · Lv3 선택",
  "tree/grenade/high-explosive": "수류탄 해금 · Lv3 선택",
  "tree/missile/saturation": "유도 미사일 해금 · Lv3 선택",
  "tree/missile/hunter": "유도 미사일 해금 · Lv3 선택",
  "tree/drone/squadron": "드론 해금 · Lv3 선택",
  "tree/drone/gunship": "드론 해금 · Lv3 선택",
  "overclock/grenade/nuclear": "수류탄 해금 · Lv20 선택",
  "overclock/grenade/barrage": "수류탄 해금 · Lv20 선택",
  "overclock/missile/hunting": "유도 미사일 해금 · Lv20 선택",
  "overclock/missile/network": "유도 미사일 해금 · Lv20 선택",
  "overclock/drone/army": "드론 해금 · Lv20 선택",
  "overclock/drone/cruiser": "드론 해금 · Lv20 선택",
  "mod/penetration": "기본 해금",
  "mod/burst": "기본 해금",
  "mod/ricochet": "관통의 이해",
  "mod/multishot": "연속 사격",
  "mod/incendiary": "점화 실험",
  "mod/explosive": "대량 살상",
  "weapon/grenade": "첫 작전 종료",
  "weapon/missile": "숙련 9",
  "weapon/drone": "숙련 17",
  "slot/1": "첫 작전 종료",
  "slot/2": "숙련 13",
  "system/relic": "숙련 3",
  "system/core": "첫 승리",
  "system/synergy": "숙련 22",
  "system/special": "첫 작전 종료",
  "relic/loader": "숙련 3",
  "relic/impact": "숙련 3",
  "relic/precision": "숙련 3",
  "relic/capacitor": "강력한 한 방 + 유물 시스템",
  "relic/replicator": "완성된 소총 + 유물 시스템",
  "relic/reinforcement": "첫 승리 + 유물 시스템",
  "tree/grenade/tactical": "수류탄 숙련",
  "tree/missile/tracking": "재추적",
  "tree/drone/escort": "드론 숙련",
  "overclock/grenade/triple": "수류탄 오버클록",
  "overclock/missile/immortal": "미사일 오버클록",
  "overclock/drone/synchronization": "드론 오버클록",
  "research/primary-damage": "기본 해금",
  "research/primary-speed": "기본 해금",
  "research/wall-hp": "기본 해금",
  "research/special-damage": "첫 작전 종료",
  "research/special-cycle": "첫 작전 종료",
  "research/critical-chance": "치명적 적중",
  "research/critical-damage": "치명적 적중",
  "research/elite-boss-damage": "첫 정예 격파",
  "research/wall-defense": "숙련 3",
  "research/xp": "숙련 9",
  "research/range": "숙련 13",
};
