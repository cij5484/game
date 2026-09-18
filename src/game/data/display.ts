import { weaponTraits } from "./traits";
import { abilityGrowth } from "./abilityGrowth";
import { relics } from "./relics";
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
export const display = {
  burst: "필살기",
  ready: "준비 완료",
  barrage: "제압 사격",
  elite: "정예",
  relic: "유물",
  core: "코어",
  evolution: "진화",
  synergy: "시너지",
  critical: "치명타",
  slow: "감속",
  cooldown: "대기",
  trait: "무기 특성",
  traitModification: "특성 개조",
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
    "자동 공격 · 적 탭 집중 타겟 / 빈 전장 탭 해제 · 두 손가락 또는 아이콘 스팀팩 · 원 또는 아이콘 서리장 · Z 또는 아이콘 번개 · 준비 완료 시 V 필살기",
} as const;
export const levelLabel = (level: number) => `${level}레벨`;
export const levelChange = (current: number, max: number) =>
  `${current} → ${current + 1}레벨${current + 1 === max ? " · 최대" : ""}`;
export const remainingLabel = (ms: number) =>
  ms > 0 ? `${(ms / 1000).toFixed(1)}초` : display.ready;

// Full branch descriptions come from the chosen growth row, never a stale fixed face.
export const choiceFaces: Record<
  string,
  { symbol: string; lines: readonly string[] }
> = {
  ...Object.fromEntries(
    Object.values(weaponTraits).map((t, i) => [
      t.id,
      {
        symbol: ["⇢", "↗", "⋔", "✹", "†"][i]!,
        lines: t.levels.map((l) => l.description),
      },
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(abilityGrowth).map(([id, t]) => [
      id,
      {
        symbol:
          id === "frost-growth" ? "❄" : id === "lightning-growth" ? "ϟ" : "✚",
        lines: t.levels.map((l) => l.description),
      },
    ]),
  ),
  ...Object.fromEntries(
    Object.values(relics).map((r) => [
      r.id,
      { symbol: r.symbol ?? "ϟ", lines: r.levels.map((l) => l.description) },
    ]),
  ),
  "primary-damage": { symbol: "⚔", lines: ["기본 공격력 +15%"] },
  "attack-speed": { symbol: "»", lines: ["공격속도 +6%"] },
  "crit-chance": { symbol: "✦", lines: ["치명 확률 +5%p"] },
};
