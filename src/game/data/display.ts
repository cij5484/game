// Player copy only. Internal IDs stay English; another locale can supply this shape.
export const rarityLabels = {
  COMMON: "일반",
  RARE: "희귀",
  EPIC: "유니크",
  LEGENDARY: "전설",
} as const;
export const upgradeCategoryLabels = {
  basic: "기본 강화",
  "weapon-trait": "무기 특성",
  magic: "마법 강화",
  secondary: "보조 기술 강화",
} as const;
export const magicLabels = {
  "frost-nova": "서리장",
  "chain-lightning": "연쇄 번개",
} as const;
export const stimLabels: Record<string, string> = {
  normal: "정상",
  boost: "각성",
  crash: "탈진",
  recovery: "회복",
};
export const gradeLabels = {
  PERFECT: "완벽",
  GOOD: "좋음",
  MISS: "실패",
} as const;
export const display = {
  burst: "필살기",
  ready: "준비 완료",
  barrage: "제압 사격",
  tap: "탭",
  rhythmHint: "선에 맞춰 탭",
  elite: "정예",
  relic: "유물",
  core: "코어",
  evolution: "진화",
  synergy: "시너지",
  critical: "치명타",
  slow: "감속",
  cooldown: "대기",
  trait: "무기 특성",
  choose: "강화 카드 선택",
  reward: "정예 격파 · 유물 선택",
  paused: "전투 일시정지 · 하나를 선택하세요",
  result: "전투 결과",
  cleared: "방어 성공",
  failed: "방어 실패",
  retry: "다시 시작",
  none: "없음",
  time: "전투 시간",
  killsLevel: "처치 / 레벨",
  wall: "성벽",
  primary: "기본 강화",
  primaryAttack: "기본 공격",
  secondary: "보조 기술",
  secretEvolution: "비밀 진화",
  stimpack: "전투 스팀팩",
  magicGrowth: "마법 강화",
  baseWeapon: "기본 가우스 소총",
  experience: "경험치",
  expansion: "전술 확장 코어 획득",
  expansionDetail: "무기 특성 한도 3 → 4",
  pause: "일시정지",
  resume: "계속하기",
  restart: "다시 시작하기",
  pauseDetail: "전투와 모든 재사용 대기시간이 멈췄습니다.",
  battlefieldDescription:
    "세로 전장: 빈 곳 탭 자동 점사, 적 탭 우선 공격, 두 손가락 탭 또는 마우스 좌우 동시 클릭 전투 스팀팩, 원 서리장, Z 연쇄 번개",
} as const;
export const levelLabel = (level: number) => `${level}레벨`;
export const levelChange = (current: number, max: number) =>
  `${current} → ${current + 1}레벨${current + 1 === max ? " · 최대" : ""}`;
export const remainingLabel = (ms: number) =>
  ms > 0 ? `${(ms / 1000).toFixed(1)}초` : display.ready;

// Compact card faces; full effect descriptions remain on the accessible button.
export const choiceFaces = {
  penetration: {
    symbol: "⇢",
    lines: [
      "관통 +1명",
      "관통 +2명",
      "관통 +3 · 방패 약화",
      "관통 +4 · 방패 약화",
      "관통 +5 · 충격파",
    ],
  },
  ricochet: {
    symbol: "↗",
    lines: [
      "도탄 1회",
      "도탄 2회",
      "도탄 3회 · 분기",
      "도탄 4회 · 분기 강화",
      "도탄 5회 · 2명 분기",
    ],
  },
  multishot: {
    symbol: "⋔",
    lines: [
      "동시탄 +1 · 55%",
      "동시탄 +1 · 80%",
      "동시탄 +2 · 75%",
      "동시탄 +3 · 85%",
      "동시탄 +4 · 100%",
    ],
  },
  explosive: {
    symbol: "✹",
    lines: [
      "적중 시 폭발",
      "폭발 범위·피해 증가",
      "처치 시 추가 폭발",
      "추가 폭발 2곳",
      "대폭발 · 추가 3곳",
    ],
  },
  execution: {
    symbol: "†",
    lines: [
      "체력 10% 이하 처형",
      "체력 15% 이하 처형",
      "20% 처형 · 충격파",
      "25% 처형 · 충격파",
      "30% 처형 · 대충격파",
    ],
  },
  "primary-damage": { symbol: "⚔", lines: ["기본 공격력 +15%"] },
  "attack-speed": { symbol: "»", lines: ["공격 속도 +6%"] },
  "crit-chance": { symbol: "✧", lines: ["치명 확률 +5%p"] },
  "frost-vulnerability": { symbol: "❄", lines: ["서리 중 기본 피해 +15%"] },
  "frost-deathburst": { symbol: "❉", lines: ["서리 중 처치 → 냉기 폭발"] },
  "chain-killchain": { symbol: "ϟ", lines: ["번개 처치 → 연쇄 연장"] },
  "chain-strike": { symbol: "↯", lines: ["번개 6번째 적중 → 낙뢰"] },
  "last-bulwark": {
    symbol: "▣",
    lines: [
      "첫 위기 → 비상 방어",
      "비상 방어 지속 강화",
      "공속·마법 회복 강화",
      "위기 보호 강화",
      "강력한 비상 방어 · 1회",
    ],
  },
  "berserker-seal": {
    symbol: "⚑",
    lines: [
      "성벽 소모 → 각성 피해",
      "각성 피해 +40%",
      "각성 피해 +60%",
      "각성 피해 +80%",
      "각성 피해 +100%",
    ],
  },
  "time-gear": {
    symbol: "◷",
    lines: [
      "마법 교대 → 재충전",
      "교대 재충전 강화",
      "교대 → 성벽 회복",
      "교대 회복 강화",
      "교대 재충전·회복 극대화",
    ],
  },
  "stim-duration": { symbol: "+", lines: ["각성 지속 +0.5초"] },
  "stim-speed": { symbol: "»", lines: ["각성 공속 배율 +0.1"] },
  "stim-recovery": { symbol: "↻", lines: ["회복 시간 −0.2초"] },
  "frost-strength": { symbol: "❄", lines: ["서리 감속 +6%p"] },
  "frost-duration": { symbol: "❄", lines: ["서리 지속 +0.8초"] },
  "frost-shatter": { symbol: "❄", lines: ["서리 시전 · 전역 30피해"] },
  "chain-targets": { symbol: "ϟ", lines: ["번개 대상 +2명"] },
  "chain-damage": { symbol: "ϟ", lines: ["번개 피해 +18"] },
  "chain-radius": { symbol: "ϟ", lines: ["번개 연결 거리 +40"] },
  "storm-fork": { symbol: "ϟ", lines: ["번개 분기 +3명"] },
  "rapid-overdrive": { symbol: "»", lines: ["처치 연쇄 3명 · 100%"] },
  "siege-lance": { symbol: "⇢", lines: ["관통 100% · 충격파"] },
  "ricochet-cascade": { symbol: "↗", lines: ["최종 도탄 · 3명 분기"] },
  "tesla-coil": {
    symbol: "ϟ",
    lines: [
      "12발 명중 → 전격",
      "10발 → 전격 2명",
      "치명타 충전 · 전격 3명",
      "번개 → 전격 즉시 준비",
      "6발 → 5명 · 마법 단축",
    ],
  },
  incendiary: {
    symbol: "♨",
    lines: [
      "명중 → 화상",
      "화상 피해·지속 강화",
      "화상 사망 → 전염",
      "전염 범위·강도 강화",
      "강한 화상 연쇄",
    ],
  },
  marking: {
    symbol: "⌖",
    lines: [
      "연속 명중 → 표식",
      "표식 중첩 강화",
      "MAX 표식 → 약점 노출",
      "처치 → 위험 적에 이전",
      "MAX 표식 → 마무리",
    ],
  },
  suppression: {
    symbol: "≋",
    lines: [
      "명중 → 국지 제압",
      "제압 감속 강화",
      "임계 제압 → 밀침",
      "성벽 공격 지연 강화",
      "임계 제압 → 충격파",
    ],
  },
  overheat: {
    symbol: "♨",
    lines: [
      "연속 사격 → 발열",
      "고열 피해 증가",
      "고열 → 소이 효과",
      "냉각 효율 개선",
      "레드라인 · 과열 주의",
    ],
  },
  "ammo-replicator": {
    symbol: "❯",
    lines: [
      "점사 → 지연 복제",
      "복제 주기 단축",
      "일부 특성 계승",
      "복제탄·피해 강화",
      "완전 점사 복제",
    ],
  },
  "frost-resonator": {
    symbol: "❖",
    lines: [
      "서리 명중 → 취성",
      "취성 축적 강화",
      "파쇄 피해 강화",
      "파쇄 범위 강화",
      "파쇄 → 제한 연쇄",
    ],
  },
  "adrenaline-pump": {
    symbol: "+",
    lines: [
      "각성 처치 → 연장",
      "각성 연장 강화",
      "처치 흐름 → 피해",
      "연장 상한 증가",
      "레드라인 · 회복 부담",
    ],
  },
  "emergency-reclaimer": {
    symbol: "⊕",
    lines: [
      "성벽 앞 처치 → 회수",
      "회수량 강화",
      "회복·에너지 강화",
      "회수 상한 증가",
      "런당 1회 치명 피해 방지",
    ],
  },
} as const;
