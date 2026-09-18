# Prototype M5 — Marine Special Weapons

2026-09-18. **구현 기록 / 모든 숫자는 Prototype Tuning이며 최종 밸런스가 아니다.** Current Source of Truth: [GDD v0.9](design/GAME_GDD_v0.9.md). v0.8은 historical record로 보존한다. M4는 [PR #19](https://github.com/cij5484/game/pull/19)로 main `68b9922`에 merge됐다. M5는 그 main에서 만든 `codex/prototype-m5-special-weapons`에서 **commit/push까지만** 하고 main merge나 다음 Milestone을 시작하지 않는다.

## 범위와 유지한 기준

수류탄·유도 미사일·드론의 자동 전투, Character Lv5/10 획득, 독립 Weapon Level, Lv3/6/10/15/20 성장, 특별 선택 Queue와 하단 슬롯을 연결한다. 세 무기와 구현 후보는 개발 테스트용으로 모두 해금한다. Run 시작은 두 슬롯 모두 **Unlocked / Empty**다. 완성형 점진 해금 UX나 계정 저장을 구현한 것은 아니다.

M4 초기 적80명, 후반 cap700, Spawn 간격/수량/XP, 기본무기 성장/HUD를 유지한다. 이동속도는 M3의 M2 대비1.5배, 생성 속도 배율 `.975 → 1.53` 그대로다. 추가 요청에 따른 **생성 시 Character Level HP 배율**과 개발용 배속은 아래에 별도로 기록한다. Marine Magic 연결은 복원하지 않는다.

## 획득, 성장과 Queue

- Character Lv5: 3종 중 첫 무기 선택. Lv10: 미보유2종 중 두 번째 선택. 최대2종, 중복 불가, 획득은 Weapon Lv1/quality0. 일반 레벨업 선택을 소비하지 않는다.
- 보유한 특수무기만 일반 카드 Pool에 들어간다. 카드는 현재→다음 Weapon Level, Tree/Branch, 기본 피해·주기 변화를 표시한다. Character Level과 Weapon Level은 독립이다.
- 일반 성장 +1, 독립6% Great Success면 총+2. M4 Character Level별 희귀도 확률을 재사용하며 일반/희귀/유니크/전설의 **Level당 quality 증가량**은 `1 / 1.6 / 2.4 / 3.2`다. 카드 종류 가중치1.3에 투자 배율 `min(2, 1+.1×(WeaponLevel−1))`을 적용한다. 희귀도는 Level 개수나 선택 트리를 대신하지 않는다.
- Lv3은 Main Tree3개, Lv6은 선택 Tree의 A/B, Lv10은 선택 경로의 Completion 자동 완성, Lv15는 해당 무기 초월3개, Lv20은 해당 무기 Overclock3개에서 선택한다. 특별 선택에는 희귀도·Great Success를 붙이지 않는다. Lv20 이후 숙련 성장도 가능하다.
- `SpecialProgression`이 획득/성장/특별 선택을 큐로 처리한다. Lv14 +2는 Lv15 초월 선택 뒤 남은 +1로 Lv16, Lv19 +2는 Lv20 Overclock 선택 뒤 Lv21이 된다. 남은 Level과 quality를 함께 보존한다.
- Scene은 **특수 Queue → 기존 유물 보상 → 일반 Character Level-Up** 순서로 기존 Card Selection UI를 연다. 선택 중 전투가 멈추며 초과 XP/밀린 일반 선택을 보존한다.

## 기본 수치와 공용 강화

| 무기 | Lv1 기본 피해 | 기본 Cycle | 기본 범위/투사체 | 공용 피해 coefficient | 공속 coefficient | 치명 coefficient |
| --- | --- | --- | --- | --- | --- | --- |
| 수류탄 | 100 | 3600ms | AoE 반경125, 비행720ms | .8 | .55 | .8 |
| 유도 미사일 | 150 | 2700ms | 속도440 논리단위/s, 수명6000ms | 1 | .7 | 1 |
| 드론 | 24 | 900ms | 지속 유닛 기본1기 | .75 | .85 | .9 |

`src/game/data/specialWeaponBalance.ts`와 `specialWeapons.ts`가 실제 수치/후보를 소유한다. `q=누적 quality`, `D/A/C=공용 공격력/공속/치명 strength`, `kd/ka/kc=무기별 coefficient`일 때 기본 성장식은 다음과 같다. Tree/Branch/Completion/초월/Overclock의 행동별 배율은 그 위에 적용한다.

```text
피해 = 기본피해 × (1+.11q) × (1+D×kd)
Cycle = max(180ms, 기본Cycle / (1+A×ka+min(.45,.012q)))
수류탄 기본반경 = 125 × (1+min(.3,.008q))
치명확률 = min(1−Number.EPSILON, .05 + .95×(C×kc)/(1+C×kc))
치명피해 = 1.75배
```

## Tree / Branch / Completion

세 무기 모두 Marine 기본 Range 밖을 공격할 수 있다. 수류탄은 발사 Event 때 살아 있는 적을150단위 공간 bin으로 묶어 가장 밀집한 유효 지역을 선택한다. 미사일은 Focus를 우선하고 정예/성벽 근접/Runner/Shield 위험도를 평가하며 이동 중 표적을 추적한다. 기본 미사일은 표적이 사라지면 소멸하고 성장에 따라 재지정한다. 드론은 계속 전장에 남으며 사격 Event에서 거리와 위험도·Focus를 평가한다. 매 Frame 적 쌍을 비교하는 O(N²) 밀집 계산을 넣지 않는다.

| 무기 | Lv3 Tree | Lv6 A → Lv10 | Lv6 B → Lv10 |
| --- | --- | --- | --- |
| 수류탄 | 집속탄 | 확산형 → 융단 폭격: 많은 작은 자탄 분산 | 중형 자탄형 → 다중 탄두: 적은 강한 자탄 |
| 수류탄 | 고폭탄 | 초대형 폭발형 → 초대형 고폭탄: 큰 반경/피해 | 공성형 → 벙커 버스터: 중심 추가 피해/방패 관통 |
| 수류탄 | 전술탄 | 지속 중력장 → 특이점: 반복 흡인 영역 | 압축 폭발 → 중력 붕괴: 흡인 후 지연 폭발 |
| 미사일 | 미사일 포화 | 전장 포화 → 미사일 스웜: 서로 다른 표적 | 집중 포화 → 미사일 살보: 위험 표적 집중 |
| 미사일 | 헌터 킬러 | 처형자 → 킬 체인: 처치 뒤 다음 발사 연쇄 | 약점 사냥꾼 → 전술 사냥꾼: 동일 표적 압박 |
| 미사일 | 특수 추적 | 연쇄 추적 → 연쇄 포식자: 같은 투사체가 다음 표적 추적 | 재유도 → 불사조 미사일: 제한된 재유도/재공격 |
| 드론 | 드론 편대 | 분산 운용 → 전술 드론 네트워크: 표적 분담 | 군집 운용 → 울프팩: 같은 위험 표적 집중 |
| 드론 | 중무장 건십 | 기관포형 → 개틀링 건십: 빠른 지속 사격 | 중포형 → 시즈 건십: 느린 중포/방패 관통 |
| 드론 | 호위 드론 | 마린 동기화 → 미러 파이어: Gauss 연동 추가 사격 | 지원형 → 전술 윙맨: 표식으로 Gauss 지원 |

Lv4~5/7~9/11~14/16~19/20 이후에는 quality 기반 피해·주기·반경 숙련이 누적된다. 큰 행동 변화는 주요 Milestone에 집중한다. 이것은 최종 무기별 모든 Level 성장표를 완성했다는 뜻이 아니다.

## Lv15 초월 — 실제9종

| 무기 | 후보 | 구현 행동 |
| --- | --- | --- |
| 수류탄 | Smart Fuse / 스마트 신관 | 비행 중 기존 목표 군집이 사라지면 새 밀집 지점으로1회 보정 |
| 수류탄 | Aftershock Core / 여진 코어 | 주 폭발450ms 후 같은 지점 피해×.45/반경×.8 추가 폭발 |
| 수류탄 | Magnetic Primer / 자기 프라이머 | 주 폭발 직전 반경×1.35의 짧은 흡인 |
| 미사일 | Emergency Retargeting / 긴급 재지정 | 표적 사망 시 제한된 위험 표적 재획득 |
| 미사일 | Weakpoint Lock / 약점 고정 | 동일 표적 연속 적중당+.18, 추가5중첩 상한 |
| 미사일 | Threat Relay / 위협 릴레이 | 위험 표적 처치 시 다음 Cycle750ms 단축 |
| 드론 | Forward Deployment / 전진 배치 | 전방 배치와 먼 표적 우선, Marine Range 밖 피해×1.6 |
| 드론 | Combat Link / 전투 연결 | Focus 공동 공격 피해×1.4/주기×.7 |
| 드론 | Target Painter / 표적 도색 | 1800ms 표식, 해당 적 Gauss 피해×1.2 |

## Lv20 Overclock — 실제9종, 전체 목표15종 유지

| 무기 | 구현 후보 | 행동과 제한 |
| --- | --- | --- |
| 수류탄 | 전술 핵탄두 | 피해×3.3/반경×1.65/주기×2 |
| 수류탄 | 자동 유탄 난사 장치 | 180ms 간격4회, 각 피해×.62/반경×.78 |
| 수류탄 | 삼중 투척 시스템 | 서로 다른3지점 동시 투척 |
| 미사일 | 사냥 본능 폭주 | 위험한 동일 표적 반복 적중 강화, 추가5중첩 상한 |
| 미사일 | 전장 사냥망 | 최대6발을 서로 다른 표적에 배분, 각 피해×.7 |
| 미사일 | 불멸 유도체 | 최대6회 처치 연쇄/8회 표적 소실 재지정/수명6000ms |
| 드론 | 무인 전투군 | 현재 편대에5기 추가, 개별 피해×.7 |
| 드론 | 전투 순양기 | 대형1기, 피해×6/주기×2.2, 제한된 주변 피해 |
| 드론 | 완전 동기화 | 실제 Gauss 발사마다 보조 사격, 특수무기 피해가 재귀 발사를 만들지 않음 |

**Future 2종씩:** 수류탄 `영구 연쇄 반응 / 궤도 폭격 호출`, 미사일 `처형 연쇄 / 표적 삭제 명령`, 드론 `자율 전투 AI / 요격 지휘체계`. 무기당 Overclock5종 목표를3종으로 축소하지 않는다. Stage1에는 Ranged Enemy가 없으므로 드론 Enemy Projectile Interception은 미구현으로 보존한다.

## HUD와 개발 도구

Header는 공용 공격력/공속/치명 및 기존 Global Build를 소유한다. Gauss 슬롯은 기본무기 개조/Level/사거리/전설을 소유한다. 특수 슬롯은 획득 순서대로 **무기/Weapon Level/Tree/Branch/Completion/초월/Overclock**을 묶으며 다른 무기나 Header에 중복 표시하지 않는다. 작은 아이콘·Level·Badge를 사용하고 Tap/Click 시 기존 Pause Build Detail에서 상세를 확인한다.

일시정지 바로 왼쪽 작은 개발용 버튼은 `X1 → X2 → X4 → X1`로 순환한다. Run 시작/재시작은 X1. 게임 진행 시간과 전투 delta만 배속하고 네이티브 UI 클릭/터치·Gesture 실제 입력 시간은 가속하지 않는다. Pause/선택 화면은 그대로 전투를 멈춘다. Phaser 전역 timeScale은 사용하지 않는다. 제품의 영구 성장/최종 옵션이 아닌 Prototype 개발 도구다.

## Character Level에 따른 생성 HP

`x=max(0, CharacterLevel−1)`, `M=1+.015x+.0005x²`. `src/game/data/enemyScaling.ts`에서 계수를 조절한다. Enemy 생성 시 현재 Character Level로 계산하여 **본체 HP/maxHP와 Shield HP/maxShieldHP에 동일한 Level 배율**을 적용한다. 일반3종과 두 Elite 모두 해당하며 이미 생성된 적은 소급 변경하지 않는다.

| Character Level | 추가 HP 배율 |
| --- | --- |
| 1 | 1 |
| 10 | 1.1755 |
| 20 | 1.4655 |
| 40 | 2.3455 |
| 60 | 3.6255 |

기존 시간 기반 본체 HP `×1→1.1`은 유지하고 위 배율을 곱한다. Shield에는 기존 시간 HP 배율을 새로 추가하지 않으며 Level 배율만 적용한다. 이동속도/공격 주기/Horde Director는 이 식으로 변경하지 않는다. 사용자 추가 요청의 완만한 생성 HP 시험값이며 체감 난이도 적합성을 자동 판정하지 않는다.

## GDD와 현재 구현의 경계

이번 구현은 세 무기의 기본 전투와 성장 골격 및 각 초월3종/Overclock3종까지다. 전체 Lv15 Pool, 남은 Overclock2종씩, 점진 해금, 무장 확장/세 번째 무기, 신규 Relic/Core 구조, 이름 붙은 Synergy, 공성 거인, Gold/Credits/작전 기록/Challenge/Endless/Stage2+/신규 Character/Awakening/Final Art는 후속이다. Primitive/VFX를 사용하며 새 Asset은 만들지 않는다.

최종 성능·밀도·재미·난이도·성장 속도는 사용자의 직접 Playtest 대상이다. 장시간 자동 Simulation, 최종 Level/평균 DPS/생존시간/자동 Clear 분석으로 밸런스 결론을 내리거나 Horde를 낮추지 않는다. 기존 `0489ef9` 등의 검증은 역사 기록으로 남긴다.

## 최소 검증

**`npm run check` 통과:** 40개 파일/292개 테스트, TypeScript 검사, Vite production build 성공. 기존500kB chunk 경고가 남는다(JS 약1.334MB). 기존20분 자동 밸런스 사례4개는 짧은 correctness 확인으로 교체했다. 장시간 밸런스 Simulation이나 별도 대규모 Benchmark를 수행하지 않았다.

획득·최대2종/중복 금지·Milestone/잔여 성장·희귀도·공용 강화·공간/위험 표적/지속 드론·HUD 소유·Marine Magic 격리·배속/생성 HP correctness를 확인했다.

438×974 브라우저에서 X1→X2→X4→X1, Lv5의3무기 선택→수류탄 획득 후 일반 카드 유지, WeaponLv2의 대성공→Lv3 Tree선택→잔여 성장으로Lv4, 집속탄 Owner Badge, CharacterLv10의 미보유 미사일/드론2후보, 드론 획득/일반 성장/지속 유닛 표시, 슬롯Tap→Pause의 드론Lv2 상세를 확인했다. 브라우저에서 모든 분기와 Lv15/20을 순회하지 않았으며 해당 경계는 기능 테스트로 확인했다. 실제 모바일 성능과 조작감은 사용자 Playtest로 남긴다.

재시작 시 특수 슬롯이 미장착/X1로 초기화되고, 별도 짧은 Run에서 미사일 획득·슬롯 표시·원거리 Focus 대상 처리도 확인했다. 검증용 탭의 브라우저 error log는 없었다. 사용자 원래 게임 탭은 유지했다.

## 변경 파일

- 데이터/성장: `src/game/data/specialWeapons.ts`, `specialWeaponBalance.ts`, `enemyScaling.ts`; `src/game/progression/specialProgression.ts`, `marineProgression.ts`.
- 전투/생성/표현: `src/game/combat/specialWeapons.ts`, `primaryAttack.ts`; `src/game/enemies/enemyFactory.ts`; `src/game/scenes/CombatScene.ts`; `src/game/battlefield/EnemyPressureView.ts`.
- UI: `src/game/ui/BurstView.ts`, `LevelUpView.ts`, `PauseView.ts`, `ResultView.ts`, `buildSummary.ts`, `buildBar.css`.
- 기능 테스트: `tests/combat/specialWeapons.test.ts`, `primaryAttack.test.ts`, `sceneIntegration.test.ts`; `tests/progression/specialProgression.test.ts`, `marineProgression.test.ts`; `tests/enemies/enemyScaling.test.ts`; `tests/data/buildSummary.test.ts`; `tests/ui/PauseView.test.ts`.
- 문서: 이 기록, `docs/design/GAME_GDD_v0.9.md`, `docs/superpowers/plans/2026-09-18-prototype-m5-special-weapons.md`, `README.md`, `CODEX-HANDOFF.md`.
