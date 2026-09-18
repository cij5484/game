import { runtimeObject } from "../dev/runtimeBalance";
import type { MarineTraitId } from "./marineGrowth";
import type { SpecialWeaponId } from "./specialWeapons";

export type PrototypeSynergyId = "saturation" | "kill-zone" | "hunt";
interface PrototypeSynergyDefinition {
  id: PrototypeSynergyId;
  title: string;
  symbol: string;
  description: string;
  mods: readonly MarineTraitId[];
  completions: readonly {
    id: SpecialWeaponId;
    tree: string;
    branch: "a" | "b";
  }[];
}

// Prototype tuning: all durations use the shared combat clock.
export const prototypeSynergyBalance = runtimeObject("synergies", {
  enabled: { saturation: true, "kill-zone": true, hunt: true },
  saturation: {
    distinctHits: 8,
    windowMs: 1800,
    durationMs: 3500,
    extraBurstRounds: 2,
    extraSubmunitions: 4,
    extraMissiles: 3,
  },
  killZoneMultiplier: 1.45,
  huntMultiplier: 1.4,
} as const);

export const prototypeSynergyDefinitions: Record<
  PrototypeSynergyId,
  PrototypeSynergyDefinition
> = {
  saturation: {
    id: "saturation",
    title: "포화 소거 작전",
    symbol: "≋",
    description:
      "점사 + 다중탄 · 융단 폭격 + 미사일 스웜 Lv10. 전투 시간 1.8초 안에 서로 다른 적 8명 적중 시 3.5초간 점사 +2발, 자탄 +4개, 미사일 +3발. 활성 중 갱신 없음.",
    mods: ["burst", "multishot"],
    completions: [
      { id: "grenade", tree: "cluster", branch: "a" },
      { id: "missile", tree: "saturation", branch: "a" },
    ],
  },
  "kill-zone": {
    id: "kill-zone",
    title: "중력 살상지대",
    symbol: "◎",
    description:
      "관통 + 폭발탄 · 특이점 + 개틀링 건십 Lv10. 특이점 내부 적에게 가우스 관통·폭발과 드론 피해 ×1.45, 건십이 해당 구역을 우선 공격.",
    mods: ["penetration", "explosive"],
    completions: [
      { id: "grenade", tree: "tactical", branch: "a" },
      { id: "drone", tree: "gunship", branch: "a" },
    ],
  },
  hunt: {
    id: "hunt",
    title: "추적 섬멸망",
    symbol: "⌖",
    description:
      "점사 + 고위력 단발 · 전술 사냥꾼 + 울프팩 Lv10. 위험 표적에 사냥 표식: 가우스·미사일·드론 집중 및 피해 ×1.4. 처치 후 다음 위험 표적으로 전이. 수동 조준·가우스 사거리 유지.",
    mods: ["burst", "heavy"],
    completions: [
      { id: "missile", tree: "hunter", branch: "b" },
      { id: "drone", tree: "squadron", branch: "b" },
    ],
  },
};
