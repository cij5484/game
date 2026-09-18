# Prototype M3 — Layout + Build HUD

2026-09-18. Current Design Source: [GDD v0.7](design/GAME_GDD_v0.7.md).

M2 `a656b122e97850a086bf8a3ca0f74dc15a3b1a5b` → [PR #17](https://github.com/cij5484/game/pull/17) merge `9df9878` → `codex/prototype-m3-layout-build-hud`. M3는 commit/push까지만 수행하며 main merge는 하지 않는다. GDD v0.6 원본은 보존한다.

## 범위와 진행

Header / Battlefield / Bottom 분리, Build 소유권별 표시, 첫 교전 단축을 구현했다. 작업 중 추가 사용자 요청인 **몹 이동속도 기존 대비1.5배**도 반영했다. 신규 성장/특수무기/보상 시스템은 추가하지 않았다.

레이아웃·Build grouping·실제 Scene 첫 사격 테스트 작성 → 실패 확인 → 기존 View/HUD/input 최소 수정 → 브라우저 확인 → 전체 검사 순서로 진행했다. 읽기 전용 독립 리뷰에서 작은 화면의 배지 잘림을 발견해 flex 축소/스크롤로 수정했다.

## 실제 화면 좌표

`layout.ts`가 safe-area를 제외한 폭 W, 높이 H로 세 Rectangle을 계산한다. 모든 계수는 시각 배치용 Prototype Tuning이며 gameplay 수치가 아니다.

- `scale = min(W / 720, H / 1280)`
- `Header.height = min(H × .16, max(72, 150 × scale))`
- `Bottom.height = min(H × .24, max(118, 220 × scale))`
- `Battlefield.y = Header.y + Header.height`
- `Battlefield.height = H - Header.height - Bottom.height`
- `Bottom.y = Battlefield.y + Battlefield.height`
- `screenY = Battlefield.y + clamp(progress01, 0, 1) × (Battlefield.height - 44 × scale)`

progress0은 Battlefield 최상단, progress1은 Battlefield 안의 Wall 접촉점이다. 마지막44 reference units는 Marine과 Wall 연결 여유이며 HUD 높이와 별개다. 가로는720 reference 중앙 정렬과 기존3 Soft Lane을 유지한다. Fake Perspective는 기존 visual scale 함수만 사용한다. resize는 화면 mapping만 바꾸며 논리 이동시간/사거리/공격 판정은 바꾸지 않는다.

Header와 Bottom 배경은 화면 끝까지 채운다. world/debug/gesture graphics에는 실제 Battlefield Rectangle의 GeometryMask를 적용해 Enemy·tracer·VFX가 Header/Bottom에 그려지지 않게 한다. Wall HP는 Bottom 내부, Marine은 Battlefield 하단에 놓는다. Safe-area는 resize 시만 읽는다.

## HUD / Legacy ownership mapping

| 현재 항목 | 표시 위치 / 의미 |
| --- | --- |
| Level/XP/시간/Pause | 독립 Header |
| 공용 공격력/공격속도/치명타 성장 | Header Global Build |
| Legacy Relic/Core/Synergy | Header Global Build |
| Legacy 무기 특성/Hyper Gauss | 하단 Gauss 슬롯 배지 |
| 스팀팩 고유 성장 | 하단 스팀팩 슬롯 배지 |
| Legacy Magic 성장 | `legacyMagic`으로 구분; Marine 런타임에는 후보/표시/효과 연결 없음 |

이는 UI adapter 분류다. Legacy 공용 성장의 실제 적용 대상이나 수학식을 확장하지 않았다. 최종 기본무기6종, 사거리 카드, 신규 시너지, 무레벨 유물/신규 코어를 구현했다는 의미가 아니다.

하단은 `[가우스] [특수1] [특수2] [스팀팩] [필살기]`와 Wall HP다. Gauss 슬롯은 항상 표시한다. 특수 슬롯2개는 자물쇠/잠김 표시를 유지한다. 작은 `WeaponSlotState`로 locked/empty/equipped와 소유 배지 목록을 표현할 수 있지만 현재 특수무기 슬롯은 locked만 사용한다. 향후 세 번째 슬롯은 같은 flex row에 추가할 수 있으며 코어 동작은 구현하지 않았다.

배지는 기호+현재 Level만 상시 표시한다. Header 배지는 가로, 슬롯 배지는 세로 스크롤한다. 슬롯/배지 Tap은 기존 Pause 상세 화면을 재사용하여 이름·현재 Level/상태·효과를 보여준다. Desktop에는 title hover와 focus 표시를 제공한다. 별도 Tooltip framework나 최종 Art는 만들지 않았다.

## 입력 격리

DOM Header/Bottom은 canvas 위에서 자기 영역의 입력을 받는다. `bindTapInput`은 canvas 좌표로 변환한 시작점/끝점 및 Gesture 전체 path가 Battlefield 안인지 확인한다. 도중 HUD 밖으로 넘어가는 드래그는 취소한다. 슬롯 상세 Pause는 기존 input cancel을 사용한다. 따라서 UI 클릭이 Focus Target/V Gesture로 전달되지 않는다. 스팀팩 버튼의 기존 명시적 발동 동작은 유지한다.

## 첫 교전과 이동속도 Tuning

M1 중거리 `progress01 ≥ .55`, Gauss800ms/피해10은 유지한다. 초기24 Grunt 중 선두3명만 `.43~.445`에 배치하고 나머지21명은 기존 `.08~.30`을 유지한다.

추가 사용자 요청에 따라 생성 시 이동속도 배율의 양 끝을 M2 `.65→1.02`에서 `.975→1.53`으로 변경했다. 같은 생성 시점에서 일반/정예/돌진 이동속도가 기존의1.5배다. 성장 곡선의 선형 형태, HP 곡선, 돌진 예고/지속시간, Wall 공격 주기는 유지한다.

| 일반 적 | 시작 progress/s | 20분 생성 progress/s |
| --- | ---: | ---: |
| Grunt | .0312 | .04896 |
| Runner | .073125 | .11475 |
| Shield | .024375 | .03825 |

첫 사격 이론값은 `(.55 - initialProgress) / .0312`로 약3.365~3.846초다. 실제 `CombatScene.update`를16ms step으로 실행하고 입력 없이 첫 정상 Gauss Shot을 측정했다.

| RNG fixture | 실제 첫 Shot |
| --- | ---: |
| 0 | 3872ms |
| .5 | 3632ms |
| .999 | 3392ms |

목표3~5초를 만족한다. 화면의 이동거리만 줄여 시간이 단축됐다고 간주하지 않았다.

## M2 보존 / 차이

Grunt/Runner/Shield, Shield HP→Body HP, 광폭 돌진병/중장 방패병,20분 Director의 pressure/relief와 lane composition,Focus,스팀팩,V Ultimate,Marine Legacy Magic 분리를 유지한다. M2 gameplay 차이는 위의 초기 선두 위치와 명시적으로 요청된 이동속도1.5배뿐이다. HP/공격/Spawn 수/보상 규칙은 바꾸지 않았다.

GDD와 임의로 달라진 설계는 없다. 소유권 분류는 현재 Legacy 데이터에 대한 임시 mapping이며 미래 특수무기 성장/새 시너지 등은 문서의 Future로 남겨 두었다.

## 검증 기록

- 최초 Layout/grouping/첫 Shot 테스트:8개 FAIL 확인 후 PASS.
- 이동속도 기대값을1.5배로 먼저 변경:7개 FAIL 확인 후 데이터 조정으로 PASS. 일반3종·정예2종·시간별 곡선·Wall 도착 잔여시간을 확인했다.
- 전체 검사에서 기존 속도를 기대하던 simulation/Legacy Magic fixture6개가 실패하여 새 이동속도에 맞게 기대값만 갱신했다. Magic 구현/데이터/Marine 분리에는 변경이 없다.
- `npm run check`: **35 test files / 231 tests PASS**, TypeScript 및 Vite production build PASS.
- 첫 사격 로그 확인: `npm test -- tests/combat/sceneIntegration.test.ts -t "first normal Gauss" --silent=false --reporter=verbose` — 3 PASS, 나머지20개는 이 명령의 filter로 제외. 위 전체 검사에서는 모두 실행했다.
- 기존20분 Scene endurance fixture도 통과. 이 fixture는 매 step Wall HP를 채우므로 실제 생존/난이도 검증 결과로 해석하지 않는다.
- 브라우저 세로390×844/태블릿768×1024/작은360×640에서 영역 분리·Wall/Loadout 확인. Layout test는360×640,390×844,360×800,768×1024와safe insets를 검증한다.
- 브라우저에서 기본무기 배지의 하단 소유 슬롯, 공용 공격력 배지의 Header 배치, 배지 Tap→Pause 상세를 확인했다. 360×640에서3개 무기 배지의 넘친 내용을 스크롤해 마지막 배지에 접근할 수 있음을 확인했다.
- 입력 fixture에서 Header/Bottom Tap과 경계를 넘는 Gesture 차단, canvas 좌표 변환 및 기존 Tap/두 손가락/마우스 동시 클릭 흐름 확인.
- Vite의 기존500kB 이상 chunk 경고는 남아 있다. 신규 의존성/Asset은 추가하지 않았다.

## 남은 확인

실제 모바일에서 작은 배지 터치/스크롤, safe-area, V Gesture 사용감은 사용자 플레이테스트가 필요하다. 이동속도1.5배는 Wall 압박을 높이므로 장시간 생존 난이도는 재평가해야 한다. 새 특수무기/6개조/새 보상/Meta/Boss와 다음 Milestone은 시작하지 않았다.

## 변경 파일

- `CODEX-HANDOFF.md`
- `README.md`
- `src/game/battlefield/EnemyPressureView.ts`
- `src/game/battlefield/layout.ts`
- `src/game/data/enemyScaling.ts`
- `src/game/data/horde.ts`
- `src/game/input/tapInput.ts`
- `src/game/scenes/CombatScene.ts`
- `src/game/ui/BuildBar.ts`
- `src/game/ui/BurstView.ts`
- `src/game/ui/PauseView.ts`
- `src/game/ui/buildBar.css`
- `src/game/ui/buildSummary.ts`
- `src/game/ui/combatHud.css`
- `src/game/waves/spawnDirector.ts`
- `src/style.css`
- `tests/battlefield/layout.test.ts`
- `tests/combat/magic.test.ts`
- `tests/combat/sceneIntegration.test.ts`
- `tests/data/buildSummary.test.ts`
- `tests/enemies/enemyScaling.test.ts`
- `tests/enemies/enemySimulation.test.ts`
- `tests/input/tapInput.test.ts`
- `tests/waves/spawnDirector.test.ts`
- `docs/design/GAME_GDD_v0.7.md`
- `docs/prototype-m3-layout-build-hud.md`
