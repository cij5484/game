# Prototype M6 — High-roll / Combat Tempo

2026-09-18. **모든 수치는 Prototype Tuning이며 최종 밸런스가 아니다.** Current Source of Truth: [GDD v0.10](design/GAME_GDD_v0.10.md). v0.9와 이전 구현 기록은 historical record로 보존한다. M5 `0ca568c7b0296dc123b99cc3171fe5b5de8beb22`를 먼저 main에 병합한 뒤 최신 main에서 `codex/prototype-m6-highroll-tempo`를 만들었다. M6은 **commit/push까지만**, main merge와 다음 Milestone 자동 시작은 하지 않는다.

## 직접 Playtest 피드백과 이번 범위

사용자는 M5도 너무 쉽고, X2/X4 전투 속도감이 X1보다 재미있으며, 수류탄이 너무 강하고 자주 발사되고, Level-Up 선택이 전투를 자주 끊고, 후반 적이 너무 쉽게 죽는다고 평가했다. 원 요청은 M4 Horde 유지였으나, 이후 사용자가 초기 적을80명보다 줄이고 시간이 흐를수록 공급을 훨씬 더 늘리도록 변경했다. 이 후속 요청을 우선하며 정상 Combat Tempo 상향, 생성 HP 곡선 강화, XP 성장 완화, 수류탄 약화를 함께 반영한다. 평범한 Run과 여러 시스템이 겹쳐 강해지는 High-roll Run을 함께 허용한다.

## Run Clock과 Combat Tempo

```text
runDelta = 실제 frame delta × Developer Speed (1 / 2 / 4)
combatDelta = runDelta × Normal Combat Tempo (1.5)
```

Stage 경과 시간은 runDelta만 사용한다. 정상 X1에서 일시정지·선택 시간을 제외한 Stage 목표는 실제 약20분이며 Combat Tempo가 종료 시간을 줄이지 않는다. Enemy 이동/공격, Spawn 진행, Gauss/특수무기 Cycle, 투사체, 드론, 전투 효과와 지속시간은 combatDelta를 사용한다. CombatScene.update가 runBalance.combatTempo를 한 번 곱하고, advanceWorld가 소비한 combat step÷tempo를 Stage에 전달한다. Stage 종료까지 남은 시간도 combat 단위로 변환해 정확한 종료 경계를 유지한다. 각 시스템 내부에 다시1.5를 곱하지 않는다. Phaser 전투 Flash/지연 효과도 `Scene.time.timeScale = Developer Speed × Combat Tempo`로 맞춘다. 네이티브 DOM 입력·Gesture·UI 시간은 실제 시간을 유지한다.

Pause 왼쪽 **X1→X2→X4→X1**과 재시작X1을 유지한다. X1은 새 정상 전투, X2/X4는 Stage Clock까지 빨라지는 **Development Tool / Not Final Feature**다. 초기 물량 감소/후반 공급 강화는 후속 사용자 요청을 따르며 정확한 수치는 아래 Horde 기록을 따른다. M3 이동속도1.5배 설정은 유지하고 새로운 정상 Tempo가 체감 이동을 더 빠르게 만든다.

## Horde — 후속 요청 반영

원 명세의 M4 물량 보존보다 나중에 주어진 **초기 적 감소 + 시간이 흐를수록 훨씬 강한 공급 증가** 요청을 우선했다. 시작 적은 **80→36명**, 선두3명과 위치/적 조합/최대 cap700은 유지한다. 이전 REGROUP/SECOND BREATHER/FINAL HOLD의 공급 급감은 제거하고 모든 구간을 pressure로 이어간다. 정상 X1의 실제 Stage 시간에 맞춘 공급은 다음과 같다.

| Stage 분 | 평균 batch | 내부 interval ms | Active cap |
| --- | --- | --- | --- |
| 0 | 3 | 1800 | 175 |
| 3 | 8 | 1400 | 250 |
| 5 | 12 | 1300 | 250 |
| 6 | 18 | 1200 | 325 |
| 7.5 | 24 | 1100 | 375 |
| 9 | 32 | 1000 | 425 |
| 11 | 40 | 950 | 425 |
| 12 | 48 | 850 | 500 |
| 15 | 64 | 700 | 600 |
| 18 | 84 | 600 | 700 |
| 19 | 96 | 550 | 700 |

내부 interval은 combat time이며 정상 X1 실제 간격은 표의 값÷1.5다. 기존 batch±2/interval±12% 변동은 유지한다. Director는 combat clock으로 진행하므로 config의 Phase `atMs = 목표 Stage ms ×1.5`로 두어 마지막19분 구간이12분40초에 일찍 도착하지 않게 한다. Lane specialization은 실제9분. Elite 창은 기존 combat-clock 일정이다. 자동 결과로 물량을 낮춘 것이 아닌 사용자의 후속 방향을 반영한 시험값이다.
## Enemy HP와 XP

`x=max(0, CharacterLevel−1)`.

| 항목 | M5 | M6 |
| --- | --- | --- |
| 생성 HP 배율 | `1+.015x+.0005x²` | `1+.020x+.0008x²` |
| 다음 Level XP | `ceil(8+4x+.35x²)` | `ceil(8+5x+.50x²)` |

새 HP 배율은 Lv1 **1.0000**, Lv10 **1.2448**, Lv20 **1.6688**, Lv40 **2.9968**, Lv60 **4.9648**이다. Grunt/Runner/Shield 본체와 방패/Elite에 생성 당시 Character Level을 적용한다. 이미 생성된 적은 Level-Up 때 HP가 늘지 않는다. 기존 시간 기반 본체 HP 배율은 유지한다. 플레이어 성장에1:1로 따라붙는 적응형 HP 시스템이 아니다.

초반 Grunt1-shot과 빠른 초기 성장 방향을 유지하면서 중반 선택 중단과 후반 즉사 문제를 완화한다. Lv5/10 무기 획득과 Lv15/20 성장 경로는 유지한다. 특정 최종 Character Level은 목표로 잡지 않는다.

## 수류탄 변경

| 기본 Lv1 항목 | M5 정상 X1 | M6 내부 config | M6 정상 X1 체감 |
| --- | --- | --- | --- |
| 피해 | 100 | 65 | 65 |
| Cycle | 3600ms | 7800ms | **5200ms** |
| 반경 | 125 | 110 | 110 |

`7800 / 1.5 = 5200ms`. 이는 공용 공속·무기 quality·Relic·분기 효과가 없는 기본 반복 주기다. 획득 직후 첫 공격은 기존처럼 빠르게 시작한다. 공간 공격/다수 Grunt 처리/Impact 역할과 Lv3/6/10/15/20 성장을 유지한다. 미사일·드론에 별도 대규모 Nerf는 하지 않는다.

## Relic — 무레벨6종

기본 최대2개, 동일 Relic 중복 없음, 획득 즉시 완성, 패널티 없음. 첫 Elite 처치는 획득 기회 보장, 이후 **32%**. 미보유 유효 후보 최대3개 중1개 선택이다. 이미2개면 새 후보 선택 후 기존 하나 교체 또는 새 Relic 포기한다. Prototype에서는6종을 모두 해금한다.

| Relic | 실제 연결 / 첫 수치 |
| --- | --- |
| 고속 장전 장치 | 모든 특수무기 공격 Cycle ×.8, 즉20% 감소 |
| 충격 탄약 | 모든 공격 적중 시12% 확률로 progress .025 밀치기, Elite는 그25%인 .00625 |
| 정밀 조준기 | 공용 Critical Chance +12%p |
| 과충전 축전기 | Attack Action 시작 시8% 확률로 피해×2, Burst/Multishot 전체에 같은 판정 결과 |
| 탄약 복제기 | Basic Attack 전체를8% 확률로1회 반복, 복제는 복제를 발동하지 않음 |
| 전설 증원 병력 | Marine +1, 현재 Gauss/기본무기 개조를 사용한 독립 Auto Fire. 특수무기 복제 없음 |

## Core — 즉시 지급3종

Elite 처치 시 **3%**, Run 최대1개, 무레벨. 유효 Pool에서 랜덤1개를 즉시 지급하며 Core 선택3장을 띄우지 않는다. 획득 후 추가 Core Roll은 없다. 같은 Elite에서 Relic과 동시 발생할 수 있으며 **Core 효과 → 필요한 Special Event Queue → Relic 선택 → 일반 Level-Up** 순서로 진행한다.

| Core | 실제 규칙 변경 |
| --- | --- |
| 무장 확장 | 특수무기2→3, FIFO 획득 이벤트1회 추가. 기존2개 보유 시 남은 마지막 무기를 Lv1로 지급. Lv5 전 획득하면 첫 무기를 일찍 얻고 이후 Lv5/10 이벤트로 총3개. 하단 세 번째 슬롯 동적 추가 |
| 개조 확장 | 기본무기 형태 개조3→4. 보유 Rank 유지, 이후 일반 후보에서 새 네 번째 개조 등장 가능 |
| 품질 개방 | 일반→희귀→유니크→전설, 전설 유지. 과거/미래 일반 성장에 실제 효과 소급 |

### 품질 개방의 소급

일반 성장의 원래/현재 희귀도와 실제 Level 증가량을 보존하여 공용 강화, 기본무기 개조, 사거리, 특수무기 일반 Level 성장의 quality에 증가분을1회 반영한다. 특수무기 이력은 이미 적용된 Level과 선택 Queue에 남은 Level을 구분하여 양쪽 quality를 갱신한다. 대성공의 +2 Level도 보존한다. 표시 Label만 올리지 않는다. 이후 일반 카드도 같은1단계 상승을 적용한다. 내부 `EPIC`은 화면의 유니크다.

Relic/Core와 Lv5/10 무기 획득, Lv3 Tree, Lv6 Branch, Lv15 초월, Lv20 Overclock에는 적용하지 않는다. 트리 선택과 이미 얻은 무기 Level을 다시 지급하지 않는다. 전설 행동은 현재 보유 Set에 반영하며 동일 행동을 중복 추가하지 않는다.

## Synergy — 조건 완성 시 자동3종

기본 개조 각각 Rank1 이상 + 두 특수무기의 정확한 분기 Lv10 Completion이 조건이다. **별도 카드 없음, Lv15/20 불필요, 한 번 활성화되면 Run 동안 유지**한다. 아래 시간은 전투 시간이다.

| Synergy | 조건 | 행동 / 첫 수치 |
| --- | --- | --- |
| 포화 소거 작전 | 점사+다중탄 / 수류탄 집속탄A 융단 폭격 / 미사일 포화A 미사일 스웜 | 1800ms 안에 서로 다른 적8명 적중 → 3500ms Saturation. Gauss 점사+2발, 자탄+4개, 미사일+3발. 활성 중 재갱신 없음 |
| 중력 살상지대 | 관통+폭발탄 / 수류탄 전술탄A 특이점 / 드론 건십A 개틀링 건십 | 실제 특이점 영역을 Kill Zone으로 표시. 내부 적에 Gauss 관통/폭발·드론 피해×1.45, 건십이 내부 적 우선 공격. 특이점 수명과 함께 종료 |
| 추적 섬멸망 | 점사+고위력 / 미사일 헌터B 전술 사냥꾼 / 드론 편대B 울프팩 | 최고 위험 적에 고정 Hunt Mark. Gauss/미사일/드론 집중 및 표적 피해×1.4. 죽거나 사라지면 다음 위험 표적으로1회 전이, 살아 있는 동안 점수 변동으로 왕복하지 않음 |

Gauss는 기본 성장의 최대8발에 Saturation +2발을 허용하는10발 안전 상한을 사용한다. 포화 시 Burst 내부 간격을 기존 Attack Cycle에 맞춰 압축하고100ms 회복 구간을 보존하여 추가 탄환 때문에 다음 Cycle이 늘어나지 않게 한다. 수동 Focus가 Hunt보다 우선하며 Gauss Range는 우회하지 않는다. Saturation 상태, Kill Zone 영역, Hunt Mark를 전장에 표시한다. Hunt Mark는 실제 렌더링된 적 공격 슬롯을 따라가며, 기본/증원 Marine은 성벽 위에서 보이도록 배치한다. 목표 체감은 일반 강화 여러 번 < Synergy < 강력한 Relic이며 적정 세기는 자동 Simulation으로 판정하지 않는다.

## HUD / Legacy 경계

Header Global Build는 공용 강화·Relic·Core·Synergy를 소유한다. Relic/Core에 가짜 Level을 붙이지 않으며 Tap/Click은 기존 Build Detail로 이어진다. Bottom은 Gauss/개조, 각 특수무기/전용 성장, Stimpack, Ultimate를 소유하며 무장 확장 시 세 번째 Special Slot을 추가한다. Final Art는 하지 않는다.

Legacy Lv1~5 Relic, 여러 Core/선택형 Synergy와 Marine Magic은 새 Marine Runtime에 연결하지 않는다. 기존 데이터/코드/역사 테스트는 필요에 따라 보존한다. 새 Runtime은 무레벨 Relic/Core와 자동 조건 Synergy를 별도 관리한다.

전체10 Relic/5 Core/6 Synergy 설계는 GDD에 보존한다. 공성 거인 Boss, Gold/Credits/작전 기록/점진 Unlock UX, Challenge/Endless/Stage2+, 신규 Character/Awakening, 나머지 전체 Pool과 Final Art는 이번 범위 밖이다.

## 최소 검증

**통합 `npm run check` 통과: 43개 파일/323개 테스트, TypeScript 검사와 Vite production build 성공.** 기존500kB 초과 bundle 경고는 남는다. M5의40파일/292테스트와 이전 baseline 검증은 해당 역사 기록으로 보존한다.

기능 테스트 확인: Stage/Combat Clock 분리와 X1/X2/X4, 생성 HP와 기존 적 보존, XP/수류탄 실제 주기, Relic2개/중복/교체, Core1개, 품질 소급,3 Synergy 자동 조건과 전투 행동, Header/세 번째 슬롯, Marine Magic 제외, TypeScript/build 및 기존 핵심 테스트.

실제 localhost 브라우저에서 기본 HUD/자동 공격/일반 성장/Pause/X1→X2→X4→X1을 확인했다. 별도 임시 UI fixture는360×780에서 Header6개 Badge/상세, 특수3슬롯, Relic 선택/교체를 확인한 뒤 제거했다. 이 fixture 검증을 자연 Run의 희귀 Core 획득이나 전체 Synergy 전투 시각 검증으로 해석하지 않는다. 해당 희귀 조건과 전투 동작의 correctness는 단위/통합 테스트로 확인했다.
장시간20분 Run 분석, 최종 Level, 평균 DPS/생존시간, 자동 Clear로 난이도 판정, 과도한 Benchmark는 수행하지 않는다. 난이도·재미·속도감·성장감과 모바일 체감은 사용자 직접 Playtest로 남긴다.

## 변경 소유 파일

- 전투/시간/튜닝: CombatScene, PrimaryAttack, SpecialWeapons, EnemyScaling, MarineGrowth 및 combat tempo 데이터.
- High-roll: Prototype Relic/Core 데이터와 Progression, 일반 성장 이력/소급, PrototypeSynergies 데이터/runtime.
- HUD: Build Summary, Burst/Result/Level-Up UI와 동적 특수 슬롯.
- 문서: GDD v0.10, 이 기록, README, CODEX-HANDOFF. 기존 v0.9 원본과 이전 구현 검증은 보존한다.
