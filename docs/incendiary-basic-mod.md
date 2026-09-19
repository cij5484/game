# 소이탄 구현 기록

- `heavy`를 `incendiary`로 교체. 다른 기본개조/특수무기 밸런스는 유지한다.
- Burn state: `Incendiary`의 Enemy id별 Map에 Stack, Stack당 피해, 남은 시간, Tick 누적시간, 적용 시 성장값을 저장한다. 사망/삭제/새 Run에 제거하고 전투 simulation delta만 사용한다.
- Tick: 500ms마다 `(0.025 + quality×0.010) × 비치명 Gauss 화력 × Stack`; Meta 및 대상 피해 Layer를 포함한다. 기본 지속3000ms/최대2 Stack. 치명타/on-hit/파생 공격 없이 피해만 처리한다.
- Stack: Round 결과의 실제 피해 대상별 1회 점화. Burst 다음 Round는 재점화한다. 상한에서도 지속시간을 갱신하며 Tick 시점은 미루지 않고 Stack당 피해는 더 큰 값을 유지한다.
- A 연소 확산: 사망 시 2명/반경90/1 Stack/전달0.70. Lv6~9 선형 성장, Lv10 화염 전염은 4명/140/2 Stack/0.90. 사망 wave별 공간 격자로 가까운 생존 대상을 찾고 이후 Tick에만 피해를 준다.
- B 열축적: 최대4 Stack부터 선형 성장. Lv10 임계 과열은 최대6, 효율+15%, 최대 Stack Tick×1.6. Lv11+ 품질 성장 유지, 신규 Legendary 동작 없음.
- Save: `elite-sniper` 완료 기록을 보존한다. 점화 실험(한 Run 기본무기50처치)은 소이탄을 해금하고 기존 완료자는 즉시 승계한다. Save version/Run migration 없음.
- Synergy: 추적 섬멸망은 점사+소이탄+전술 사냥꾼+Wolfpack. 표적 피해×1.4 유지.
- Kill/XP/Operation/드롭은 공통 사망 흐름, Telemetry는 Gauss/Total에 포함한다. 별도 DoT 보조 DPS는 추가하지 않는다. 기존 적 렌더링의 따뜻한 tint로 상태를 표시한다.

## /dev keys

Quick: `marineModWeights.incendiary.acquisitionWeight`(0.80), `marineModWeights.incendiary.growthWeight`(1.00), `incendiary.baseTickFactor`, `incendiary.durationMs`, `incendiary.baseMaxStacks`.

Detail은 같은 key를 사용하며 `incendiary.` 아래 다음 실제 설정17개를 노출한다:
`tickMs`, `durationMs`, `baseMaxStacks`, `baseTickFactor`, `tickFactorPerQuality`, `aSpreadTargets`, `aCompletionSpreadTargets`, `aSpreadRadius`, `aCompletionSpreadRadius`, `aTransferStacks`, `aCompletionTransferStacks`, `aSpreadFactor`, `aCompletionSpreadFactor`, `bMaxStacks`, `bCompletionMaxStacks`, `bEfficiencyBonus`, `bOverheatMultiplier`.

Legacy weight 두 key는 새 소이탄 key로 이관하며 새 key가 있으면 우선한다. `marineMods.heavyDamagePerQuality`, `heavyPenaltyBase`, `heavyPenaltyExtra`, `heavyPenaltyQualityDecay`만 무시한다. 그 외 알 수 없는 key/잘못된 값은 원자적으로 거부한다.

검증 범위: 관련 단위/통합 테스트와 build. 전체 suite와 장시간 자동 플레이는 실행하지 않는다.
