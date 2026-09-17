// Player copy only. Internal IDs stay English; another locale can supply this shape.
export const rarityLabels = {
  COMMON: "일반",
  RARE: "희귀",
  EPIC: "영웅",
  LEGENDARY: "전설",
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
  evolution: "진화",
  synergy: "시너지",
  critical: "치명타",
  slow: "감속",
  cooldown: "대기",
  trait: "무기 특성",
  choose: "강화 선택",
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
  primary: "기본 공격 강화",
  stimpack: "전투 자극제",
  magicGrowth: "마법 강화",
  baseWeapon: "기본 가우스 소총",
  experience: "경험치",
  expansion: "전술 확장 코어 획득",
  expansionDetail: "무기 특성 한도 2 → 3",
  pause: "일시정지",
  resume: "계속하기",
  pauseDetail: "전투와 모든 재사용 대기시간이 멈췄습니다.",
  battlefieldDescription:
    "세로 전장: 빈 곳 탭 자동 점사, 적 탭 우선 공격, 두 손가락 탭 또는 마우스 좌우 동시 클릭 전투 자극제, 원 서리장, Z 연쇄 번개",
} as const;
export const levelLabel = (level: number) => `${level}레벨`;
export const levelChange = (current: number, max: number) =>
  `${current} → ${current + 1}레벨${current + 1 === max ? " · 최대" : ""}`;
export const remainingLabel = (ms: number) =>
  ms > 0 ? `${(ms / 1000).toFixed(1)}초` : display.ready;

// Compact card faces; full effect descriptions remain on the accessible button.
export const choiceFaces = {
  rapid: {
    symbol: "»",
    lines: [
      "4점사 · 빠른 회복",
      "5점사 · 빠른 발사",
      "처치 연쇄 +1명",
      "6점사 · 연쇄 강화",
      "7점사 · 연쇄 2명",
    ],
  },
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
  critical: {
    symbol: "✦",
    lines: [
      "치명 20% · 피해 ×2",
      "치명 30% · ×2.3",
      "치명 35% · 충격파",
      "치명 45% · 파동 강화",
      "치명 55% · 메아리",
    ],
  },
  "stim-duration": { symbol: "+", lines: ["각성 지속 +0.5초"] },
  "stim-speed": { symbol: "»", lines: ["각성 공속 배율 +0.1"] },
  "stim-recovery": { symbol: "↻", lines: ["회복 시간 −0.2초"] },
  "frost-strength": { symbol: "❄", lines: ["서리 감속 +4%p"] },
  "frost-duration": { symbol: "❄", lines: ["서리 지속 +0.6초"] },
  "frost-shatter": { symbol: "❄", lines: ["서리 시전 · 전역 30피해"] },
  "chain-targets": { symbol: "ϟ", lines: ["번개 대상 +2명"] },
  "chain-damage": { symbol: "ϟ", lines: ["번개 피해 +12"] },
  "chain-radius": { symbol: "ϟ", lines: ["번개 연결 거리 +40"] },
  "storm-fork": { symbol: "ϟ", lines: ["번개 분기 +3명"] },
  "rapid-overdrive": { symbol: "»", lines: ["처치 연쇄 3명 · 100%"] },
  "siege-lance": { symbol: "⇢", lines: ["관통 100% · 충격파"] },
  "ricochet-cascade": { symbol: "↗", lines: ["최종 도탄 · 3명 분기"] },
  "siege-core": {
    symbol: "⬡",
    lines: [
      "방패 명중 → 번개 단축",
      "번개 대기 단축 강화",
      "마법 → 방패 무시 3발",
      "강화탄 5발 · 방패 ×1.5",
      "강화탄 7발 · 성벽 회복",
    ],
  },
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
} as const;
