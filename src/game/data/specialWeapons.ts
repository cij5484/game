import type { UpgradeRarity } from "./upgrades";

export type SpecialWeaponId = "grenade" | "missile" | "drone";
export interface SpecialWeaponState {
  id: SpecialWeaponId;
  level: number;
  quality: number;
  tree?: string;
  branch?: "a" | "b";
  transcendence?: string;
  overclock?: string;
}
export interface SpecialOption {
  id: string;
  title: string;
  symbol: string;
  description: string;
}
export interface SpecialTreeDefinition extends SpecialOption {
  branches: Record<"a" | "b", SpecialOption & { completion: string }>;
}
export interface SpecialWeaponDefinition extends SpecialOption {
  id: SpecialWeaponId;
  trees: SpecialTreeDefinition[];
  transcendences: SpecialOption[];
  overclocks: SpecialOption[];
}
const option = (
  id: string,
  title: string,
  symbol: string,
  description: string,
): SpecialOption => ({ id, title, symbol, description });
const tree = (
  id: string,
  title: string,
  symbol: string,
  description: string,
  a: [string, string, string],
  b: [string, string, string],
): SpecialTreeDefinition => ({
  ...option(id, title, symbol, description),
  branches: {
    a: { ...option("a", a[0], symbol, a[2]), completion: a[1] },
    b: { ...option("b", b[0], symbol, b[2]), completion: b[1] },
  },
});

export const specialWeaponDefinitions: Record<
  SpecialWeaponId,
  SpecialWeaponDefinition
> = {
  grenade: {
    id: "grenade",
    title: "수류탄",
    symbol: "✹",
    description: "적이 밀집한 공간을 찾아 자동 투척 · 착탄 광역 피해",
    trees: [
      tree(
        "cluster",
        "집속탄",
        "✹",
        "폭발 후 자탄으로 넓은 공간을 여러 번 폭격",
        ["확산형", "융단 폭격", "많은 작은 폭발을 넓게 분산"],
        ["중형 자탄형", "다중 탄두", "적은 수의 강한 자탄으로 주변 폭격"],
      ),
      tree(
        "high-explosive",
        "고폭탄",
        "●",
        "단일 폭발의 피해와 반경 강화",
        ["초대형 폭발형", "초대형 고폭탄", "큰 반경과 강한 단일 폭발"],
        ["공성형", "벙커 버스터", "중심부 피해 강화 · 방패와 정예 공략"],
      ),
      tree(
        "tactical",
        "전술탄",
        "◎",
        "중력으로 적의 위치를 모으고 변형",
        ["지속 중력장", "특이점", "지속 영역이 적을 중심으로 끌어당김"],
        ["압축 폭발", "중력 붕괴", "적을 모은 뒤 강한 지연 폭발"],
      ),
    ],
    transcendences: [
      option(
        "smart-fuse",
        "스마트 신관",
        "⌖",
        "착탄 전 군집이 사라지면 새로운 밀집 지점으로 보정",
      ),
      option(
        "aftershock",
        "여진 코어",
        "≋",
        "주 폭발 후 같은 지점에 작은 추가 폭발",
      ),
      option(
        "magnetic",
        "자기 프라이머",
        "◎",
        "주 폭발 직전 짧은 흡인으로 적을 모음",
      ),
    ],
    overclocks: [
      option(
        "nuclear",
        "전술 핵탄두",
        "☢",
        "매우 큰 피해와 반경 · 투척 주기 증가",
      ),
      option(
        "barrage",
        "자동 유탄 난사 장치",
        "≋",
        "한 주기에 여러 번 시간차 투척 · 개별 피해와 반경 감소",
      ),
      option(
        "triple",
        "삼중 투척 시스템",
        "⋔",
        "서로 다른 세 지점에 동시에 투척",
      ),
    ],
  },
  missile: {
    id: "missile",
    title: "유도 미사일",
    symbol: "↗",
    description: "집중 표적과 위험한 적을 찾아 유도 추적 · 강한 단일 피해",
    trees: [
      tree(
        "saturation",
        "미사일 포화",
        "⋔",
        "여러 미사일을 전장에 투입",
        ["전장 포화", "미사일 스웜", "서로 다른 적을 광범위하게 사냥"],
        ["집중 포화", "미사일 살보", "여러 발을 하나의 위험 표적에 집중"],
      ),
      tree(
        "hunter",
        "헌터 킬러",
        "⌖",
        "정예와 위험 표적 제거 능력 강화",
        ["처형자", "킬 체인", "위험 표적 처치 후 다음 공격으로 연결"],
        [
          "약점 사냥꾼",
          "전술 사냥꾼",
          "같은 강적에게 반복 적중할수록 피해 증가",
        ],
      ),
      tree(
        "tracking",
        "특수 추적",
        "↗",
        "표적 재지정과 추적 지속 강화",
        ["연쇄 추적", "연쇄 포식자", "처치 후 같은 미사일이 다음 표적을 사냥"],
        [
          "재유도",
          "불사조 미사일",
          "표적이 사라져도 재유도하며 공격 기회 유지",
        ],
      ),
    ],
    transcendences: [
      option(
        "emergency-retarget",
        "긴급 재지정",
        "↗",
        "비행 중 표적이 죽으면 다음 위험 표적을 재획득",
      ),
      option(
        "weakpoint-lock",
        "약점 고정",
        "⌖",
        "동일 표적 연속 적중 피해 증가 · 중첩 상한 적용",
      ),
      option(
        "threat-relay",
        "위협 릴레이",
        "»",
        "위험 표적 처치 시 다음 발사 주기를 앞당김",
      ),
    ],
    overclocks: [
      option(
        "hunting",
        "사냥 본능 폭주",
        "⌖",
        "한 위험 표적을 집요하게 공격할수록 큰 피해",
      ),
      option(
        "network",
        "전장 사냥망",
        "⋔",
        "여러 미사일을 서로 다른 위험 표적에 배분",
      ),
      option(
        "immortal",
        "불멸 유도체",
        "∞",
        "처치 후 다음 표적을 계속 추적 · 횟수와 수명 제한",
      ),
    ],
  },
  drone: {
    id: "drone",
    title: "드론",
    symbol: "◇",
    description: "전장에 계속 머무르는 독립 전투 유닛 · 자동 표적 선정과 사격",
    trees: [
      tree(
        "squadron",
        "드론 편대",
        "⋔",
        "드론 수와 분산 운용 강화",
        ["분산 운용", "전술 드론 네트워크", "서로 다른 진로와 표적을 분담"],
        ["군집 운용", "울프팩", "하나의 위험 표적에 편대 화력 집중"],
      ),
      tree(
        "gunship",
        "중무장 건십",
        "◆",
        "한 기의 무장과 화력 강화",
        ["기관포형", "개틀링 건십", "빠른 지속 사격"],
        ["중포형", "시즈 건십", "느리지만 강한 중포 · 방패와 정예 공략"],
      ),
      tree(
        "escort",
        "호위 드론",
        "◇",
        "마린과 협동하여 추가 화력 지원",
        ["마린 동기화", "미러 파이어", "가우스 공격과 연동되는 추가 드론 사격"],
        ["지원형", "전술 윙맨", "마린 표적을 지원하고 전투 보너스 제공"],
      ),
    ],
    transcendences: [
      option(
        "forward-deployment",
        "전진 배치",
        "»",
        "먼 적을 적극 사냥 · 마린 사거리 밖 표적에 효율 증가",
      ),
      option(
        "combat-link",
        "전투 연결",
        "◇",
        "마린 집중 표적을 함께 공격하면 드론 화력과 사격속도 증가",
      ),
      option(
        "target-painter",
        "표적 도색",
        "⌖",
        "공격한 적에 짧은 표식 · 가우스 추가 피해",
      ),
    ],
    overclocks: [
      option("army", "무인 전투군", "⋔", "드론 수 크게 증가 · 개별 화력 조정"),
      option(
        "cruiser",
        "전투 순양기",
        "◆",
        "한 기의 대형 건십 · 느리고 강한 중포",
      ),
      option(
        "synchronization",
        "완전 동기화",
        "≋",
        "가우스 공격마다 동기화된 보조 공격 · 재귀 발동 없음",
      ),
    ],
  },
};

// Numeric strength is independent of level; special choices themselves have no rarity.
export const specialQualityIncrements: Record<UpgradeRarity, number> = {
  COMMON: 1,
  RARE: 1.6,
  EPIC: 2.4,
  LEGENDARY: 3.2,
};

export function getSpecialCompletion(
  state: SpecialWeaponState,
): string | undefined {
  if (state.level < 10 || !state.branch) return undefined;
  return specialWeaponDefinitions[state.id].trees.find(
    (t) => t.id === state.tree,
  )?.branches[state.branch].completion;
}
