# Prototype M2 — Stage 1 Core

기준: [GDD v0.6](design/GAME_GDD_v0.6.md), [M1 구현](prototype-m1-combat-foundation.md).
M1 PR #16을 main에 merge한 `0449a9b`에서 `codex/prototype-m2-stage1-core` 분기.
이 문서는 구현 기록이며 아래 수치는 **Prototype Tuning**, 최종 설계 확정값이 아니다.

## 유지한 M1 / 이번 범위

- Marine 기본 공격 피해10 / 단발800ms / 유효 논리 위치 `progress01 ≥ 0.55` 유지.
- Focus Target, 스팀팩, V 필살기, XP·선택 Pause, 수동 Pause/재시작, Portrait Full-Bleed 유지.
- Enemy 이동·공격·보호 범위는 논리 progress/Lane을 사용한다. 화면 scale/attack slot은 표현에만 사용한다.
- Run duration 1,200,000ms. 선택/일시정지는 전투 시간을 소비하지 않는다. 19~20분 임시 방어 후 기존 방어 성공 결과로 종료. **Boss 미구현**.

## Enemy / Elite tuning

| 종류 | 본체 HP | 방패 HP | 기본 progress/s | 성벽 피해 / 주기 |
| --- | ---: | ---: | ---: | --- |
| Grunt | 8 | 없음 | .032 | 5 / 1,000ms |
| Runner | 10 | 없음 | .075 | 3 / 750ms |
| Shield | 20 | 30 | .025 | 8 / 1,500ms |
| 광폭 돌진병 | 80 | 없음 | .075 | 8 / 750ms |
| 중장 방패병 | 48 | 100 | .022 | 10 / 1,500ms |

- 생성 시점의 20분 진행도에 따라 본체 HP ×1→1.10, 기본 이동속도 ×.65→1.02를 선형 적용한다. 생성 후 고정이며 기존 적이 실시간 강화되지 않는다. 방패 HP는 고정.
- Grunt는 끝까지 HP8~8.8로 기본 피해10 한 발에 제거 가능하다. Elite 보호 중에는 예외.
- 일반 Shield의 기본 공격 피해는 실제 방패 HP부터 차감한다. 초과 피해는 본체에 전달하며 방패가 깨지면 복구하지 않는다. 기존 관통 성장의 shieldBypass 비율은 본체에 직접 전달한다.
- 기존 필살기/유물 추가 피해는 개인 방패를 우회하는 기존 비기본공격 경로를 유지한다. Elite 보호 피해 배율은 적용한다. 최종 방패 상성 설계는 후속 검토 대상.
- 광폭 돌진병: progress .60에서 **1,200ms 정지 Telegraph → 1,000ms ×3.2 돌진 → 정상 이동/성벽 공격**. 이동 시간 분할과 성벽 도착 후 공격 시간을 보존한다.
- 중장 방패병: 방패가 남아 있는 동안 같은 Lane에서 뒤쪽 progress 간격 .14 이내 일반 적 최대4명에게 받는 피해 ×.60. 가까운 대상 우선, 보호 중첩 없음. 본인/다른 Elite는 제외. 방패 파괴 또는 사망 시 보호 종료.
- 방패는 청록색 잔량 바, 파괴 후 회색 tint로 구분. Elite는 확대/금색 윤곽과 이름, 돌진 준비·돌진 색상/문구, 보호 대상은 청록 윤곽으로 표현한다. 신규 Asset 없음.
- Legacy Grunt ×4 Elite는 사용하지 않는다. 옛 Grunt Elite factory 요청도 Runner Elite로 정규화하며 각 Elite는 독립 데이터 HP/속도/성벽 피해를 갖는다.

## 20분 Director

| 구간 | 의도 | 간격 ms | batch | active cap | Grunt/Runner/Shield 기본 가중치 |
| --- | --- | ---: | ---: | ---: | --- |
| 0~3분 | 먼 Grunt Horde / 낮은 압박 | 2,200 | 2 | 50 | 99/1/0 |
| 3~5분 | 첫 압박 | 1,800 | 4 | 70 | 92/8/0 |
| 5~6분 | 완화 | 3,000 | 2 | 70 | 98/2/0 |
| 6~7.5분 | Shield 소수 도입 | 1,800 | 5 | 90 | 91/6/3 |
| 7.5~9분 | Shield 혼합 증가 | 1,700 | 6 | 100 | 84/8/8 |
| 9~11분 | Lane별 복합 압박 | 1,500 | 8 | 120 | 78/12/10 |
| 11~12분 | 완화 | 2,800 | 3 | 120 | 94/4/2 |
| 12~15분 | 증가하는 Horde | 1,350 | 10 | 140 | 80/12/8 |
| 15~18분 | 후반 Horde | 1,100 | 14 | 165 | 78/14/8 |
| 18~19분 | 최대 압박 | 850 | 20 | 180 | 76/16/8 |
| 19~20분 | Boss 대신 임시 방어 | 2,000 | 6 | 180 | 92/6/2 |

- 초기24 Grunt를 progress .08~.30에 배치. 이후 Spawn은 progress0. Lane 내부 offset .12~.88로 넓게 분산한다.
- batch ±1, 간격 ±12%, 종류별 가중치 ±15%. Lane 선택은 동일 가중치이며 9분부터 Run마다 섞어 배정한 Lane 역할의 종류 가중치를 ×2 적용한다. 고정 행렬/단일 줄 이동이 아니다.
- 완화는 Spawn 중단이 아니라 보충량·위험 비중 감소. 이미 접근한 적을 제거하거나 강제로 뒤로 보내지 않는다.
- cap 최대180 유지. 일반 Spawn은 Elite용 한 칸을 예약하고 막힌 기회는 소급 누적하지 않는다. cap에 막힌 Elite만 다음 기회에 재시도한다.
- Elite 시점: 4~5분, 8~9분, 12~13분, 15:45~16:15, 18:00~18:45에서 각각 무작위. 처음 두 번은 Runner, 12분 이후는 Runner/Shield 각각50%. 정상 capacity에서는5회이며 극단적으로 가득 찬 상황은 지연 가능.
- D Debug는 현재 시간/Phase/active·cap/batch/interval을 유지한다.

## Marine과 Legacy Magic 분리

**Marine active loadout에서 Legacy Magic 분리, 코드 자체는 보존.**

- CombatScene은 Magic 인스턴스를 생성/업데이트하지 않는다. Frost Nova / Chain Lightning 발동, cooldown, 서리 감속·피해 배율, 지연 타격, 사망 연쇄와 Magic용 Relic hook을 호출하지 않는다.
- ○/Z는 기존 recognizer의 Debug 결과만 남기고 Marine 전투를 바꾸지 않는다. V는 기존 Marine 필살기로 유지한다.
- HUD에는 스팀팩/필살기만 배치. Legacy Magic HUD 경로는 선택적으로 보존한다.
- 기존 Progression의 availableAbilities에 gauss-rifle/stimpack만 전달하여 Magic 강화 후보를 제외한다. 새로운 Character/Mage architecture 없음.
- `combat/magic.ts`, Magic data, ability growth/gesture fixtures와 전용 Magic 테스트는 보존한다. Scene 통합 테스트는 Marine에서 무효임을 확인하도록 변경한다.
- 테슬라 유물의 기본 공격 후 arc는 Legacy 유물 효과이며 Chain Lightning 발동이 아니다. 기존 번개 선 렌더링을 재사용한다.

## Legacy 성장 / 보상 경계

- 기존 XP 및 카드·분기·유물·코어·진화 구조를 전면 재설계하지 않았다. 기존 clearExhausted/offer 처리를 재사용하며 후보 고갈 후 선택 Pause를 해제하고 XP/Level은 계속 진행한다.
- Elite 처치 시 기존 유물 선택, Core8%/Run최대2 구조 유지. v0.6의 첫 Elite 보장/이후30~35%/Core3% 시스템을 구현했다는 뜻이 아니다.
- 마법만으로 작동하는 시간 톱니/서리 공진기는 Marine 보상 후보에서도 제외한다. Relics에 선택적인 제외 목록만 전달하고 원본 데이터·효과·Legacy 테스트는 보존한다. 테슬라/보루 등의 마법 cooldown 부가 효과는 Marine에서 사용되지 않지만 기본 공격/성벽 효과는 유지한다.
- 새 기본무기6종 성장, 특수무기, 신규 유물/코어/시너지, Boss, Meta, Stage2+는 구현하지 않았다. GDD를 변경하지 않았다.

## 검증 및 한계

- 최초 M2 실패 테스트3개(방패 HP, 돌진 Telegraph,20분 Phase) 실패 확인 후 구현.
- 핵심 검사: 방패 소모/파괴, 제한된 보호와 해제, 돌진 시간 분할,5개 Elite Window, 단계별 cap/완화, Marine Magic 무효·성장 제외·후보 고갈.
- 20분 실제 Scene 로직 가속 검사: 자동 공격·Spawn·선택을 실행하고 정상 종료. 성벽 HP를 각 step 사이에 보충한 **기술적 진행 검사**로 생존 밸런스 검증이 아니다. 고정 RNG fixture의 측정 결과는 테스트 출력으로 기록한다.
- 내부 브라우저: Full-Bleed 전장,20분 타이머, 마법 없는 두 능력 HUD, 스팀팩 발동 확인. Elite 전 구간을 실제 시간으로 플레이하거나 모바일 성능을 인증하지 않았다.
- 검증: 35개 테스트 파일 / 227개 테스트 통과. TypeScript 및 production build 통과. 기존 번들500KB 경고 유지. 후반180 cap의 실기기 성능, 느린 기본 총+Magic 제외 상태의 성장별20분 생존 난이도, 완화 체감과 Elite 시인성은 사용자 플레이테스트 필요.

## 변경 파일

- Data/model: `src/game/data/{enemies,elite,horde,run}.ts`, `src/game/model/types.ts`.
- Simulation: `src/game/enemies/{enemyFactory,enemySimulation}.ts`, `src/game/waves/spawnDirector.ts`.
- Combat/reward: `src/game/combat/{damage,primaryAttack,barrage,relicCombat}.ts`, `src/game/progression/relics.ts`.
- Integration/presentation: `src/game/scenes/CombatScene.ts`, `src/game/battlefield/EnemyPressureView.ts`, `src/game/ui/BurstView.ts`.
- Tests: `tests/enemies/{stage1,enemyScaling,enemySimulation}.test.ts`, `tests/waves/spawnDirector.test.ts`, `tests/combat/{damage,sceneIntegration}.test.ts`.
- Documentation: 본 문서와 `README.md`. GDD v0.6 및 historical GDD는 수정하지 않았다.
