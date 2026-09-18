# Prototype M12 — Mastery / Progressive Unlocks

M11 `4b60a461b82b356f6e1d91fc1833f7f115de579e`을 [PR26](https://github.com/cij5484/game/pull/26)으로 main `ed75a424f97421a7aa1c56bac96af66c7cf45e0a`에 병합했다. 작업 브랜치는 `codex/prototype-m12-mastery-unlocks`. **M12는 commit/push만 하고 main merge/다음 Milestone은 진행하지 않는다.** Source of Truth는 [GDD v0.16](design/GAME_GDD_v0.16.md), v0.15 원본은 보존한다.

## 구현 범위

첫 계정의 선택지를 제한하고 실제 행동/작전 기록으로 게임 자체가 확장되는 Loop를 구현한다. 신규 디버프나 적 HP 변경은 없다. M11 연구 효과·비용·재화 보상·Reroll과 M10 미사일/M9 성능/Stage 1 기본값·개발 Balance Override를 유지한다. 모든 Point/요구량은 **Prototype Tuning**이다. Hades는 gradual unlock/장기 목표의 보조 참고이며 Main Combat Reference는 기존 두 작품이다.

## Fresh Save와 해금

새 계정: Gauss, 공용 공격력/공속/치명 확률, 관통/점사, 기존 Rare+ 사거리 카드, Stimpack/V Ultimate. 개조 한도는 기존3종이나 새 개조는 잠긴다. 특수 슬롯0, 특수무기/유물/Core/Synergy 잠금. 초기 연구는 기본무기 화력·공속·성벽 HP만 구매 가능하다. Boss 피해를 막는 등의 시스템적 첫 Run Clear 금지는 없다.

첫 **자연 실패 또는 Clear**에서 수류탄/특수 시스템/슬롯1을 연다. 다음 Run부터 Lv8+ 일반 Acquisition Category가 뽑히면 수류탄이 등장하며 일반 선택1회 소비, Hard Pity 없음. 숙련13의 슬롯2도 첫 자연 종료 뒤 적용하므로 첫 Run 도중 Point를 많이 얻어도 특수무기 시스템을 우회하지 않는다. 이후 슬롯2는 Lv14+첫 특수무기 보유 조건을 유지한다. 계정 슬롯0/1/2와 Run 무장 Core +1(최대3)을 분리하며 계정 갱신으로 Core 보너스를 잃지 않는다.

| 숙련 Point | 해금 |
| --- | --- |
| 3 | 유물 시스템: 고속 장전 장치/충격 탄약/정밀 조준기 + 성벽 피해 감소 연구 |
| 9 | 미사일 + XP 연구 |
| 13 | 특수 슬롯2 + 사거리 연구 |
| 17 | 드론 |
| 22 | 시너지 시스템 |

Core는 Point 대신 **Stage 1 첫 Clear**에서 증원 병력 유물과 함께 연다. 잠금 중에는 Elite Core RNG 자체를 호출하지 않는다. 해금 이후 기존 Core3종/약3%/Run최대1을 유지한다. 유물 직접 해금도 유물 시스템이 열려야 실제 후보에 들어간다. 첫 Run에서도 실제 행동에 따른 개조/유물 숙련 해금은 즉시 가능하며 다음 Offer부터 반영한다.

## 작전 기록

`src/game/data/operations.ts`: 28개 / 총40 Point. 숙련은 완료 ID의 Point 합으로 계산하며 별도 XP/Claim은 없다.

| 기록 | 조건 | Point | 직접 해금 |
| --- | --- | --- | --- |
| 첫 작전 종료 | 자연 실패/Clear 최초 | 1 | 수류탄·특수 시스템·슬롯1·특수 피해/주기 연구 |
| 전선 유지 | 한 Run 5분 | 1 | — |
| 전투 적응 | Character Lv10 | 1 | — |
| 첫 정예 격파 | 실제 Elite 처치 | 1 | 정예/Boss 피해 연구 |
| 버티는 힘 | 한 Run 10분 | 1 | — |
| 공성 거인 조우 | Boss 최초 등장 | 2 | — |
| 첫 승리 | Stage1 최초 Clear | 3 | Core·전설 증원 병력 |
| 관통의 이해 | 한 Gauss 공격 행동으로 서로 다른 적3명 실제 적중 | 1 | 도탄 |
| 연속 사격 | 점사 개조Lv3 | 1 | 다중탄 |
| 강적 저격 | Gauss로 Elite 처치 | 1 | 고위력 단발 |
| 대량 살상 | 한 Run 기본무기100Kill | 1 | 폭발탄 |
| 강력한 한 방 | Unique/Legendary 일반 성장 카드 실제 선택 | 1 | 과충전 축전기 |
| 완성된 소총 | 기본 개조3종 동시 보유 | 1 | 탄약 복제기 |
| 수류탄 숙련 | 수류탄Lv10 | 1 | 전술탄 Main Tree |
| 재추적 | 기본 Missile Retarget 누적10회 | 1 | 특수 추적 Main Tree |
| 드론 숙련 | 드론Lv10 | 1 | 호위 Main Tree |
| 수류탄 오버클록 | 해당 무기 OC 실제 최초 선택 | 2 | 삼중 투척 시스템 |
| 미사일 오버클록 | 해당 무기 OC 실제 최초 선택 | 2 | 불멸 유도체 |
| 드론 오버클록 | 해당 무기 OC 실제 최초 선택 | 2 | 완전 동기화 |
| 두 개의 무장 | 특수무기2종 동시 | 1 | — |
| 첫 완성 | 특수무기Lv10 | 2 | — |
| 첫 초월 | 특수무기Lv15 | 2 | — |
| 한계 돌파 | 특수무기Lv20 | 3 | — |
| 첫 유물 | 유물 첫 획득 | 1 | — |
| 유물 완성 | 유물2개 동시 | 1 | — |
| 첫 시너지 | 실제 활성화 | 2 | — |
| 규칙 파괴 | Core 실제 획득 | 2 | — |
| 치명적 적중 | 치명타 실제 피해 최초 | 1 | 치명 확률/피해 연구 |

동일 조건의 ‘기본무기 완성 준비’와 ‘완성된 소총’은 **하나의 기록으로 합쳐 +1만 지급**한다. 치명 연구의 실제 해금 조건을 위해 ‘치명적 적중’ +1을 명시했다. 모든 기록을 완료하지 않아도22 Point에 도달할 수 있으며 속도/재미 평가는 사용자 Playtest에서 한다.

Gauss는 한 공격 행동의 여러 점사탄에 걸쳐 Hit ID를 중복 제거한다. Primary Kill은 실제 Gauss 피해 직후 계산하여 동기화 Drone·Ultimate 처치를 섞지 않는다. 치명타는 실제 본체/개인방패 피해가 있어야 한다. Missile Retarget은 사라진/죽은 표적 대신 실제 새 표적을 잡은 기본 재유도를 계정 누적하며 적중 후 Chain/Tracking 반복 사냥은 제외한다. RNG 호출 빈도는 바꾸지 않는다.

## 특수무기 내부 Pool / 연구

| 무기 | 초기 Lv3 Main Tree | 기록 해금 | 초기 OC2종 | 최초 OC 후3번째 |
| --- | --- | --- | --- | --- |
| 수류탄 | 집속탄/고폭탄 | 수류탄Lv10→전술탄 | 전술 핵탄두/자동 유탄 난사 장치 | 삼중 투척 시스템 |
| 미사일 | 포화/Hunter Killer | 기본 재유도10회→특수 추적 | 사냥 본능 폭주/전장 사냥망 | 불멸 유도체 |
| 드론 | 편대/중무장 Gunship | 드론Lv10→호위 | 무인 전투군/전투 순양기 | 완전 동기화 |

첫 OC에는2개만 보인다. 해금 직후 현재 Offer를 재생성하지 않으며 세 번째는 미래 Offer에 등장한다. Lv15 초월3종은 모두 유지한다. 기본 개조/특수 획득/유물/트리/OC/연구는 실제 해금 데이터로 필터하고 Core·Synergy는 실행 자체를 차단한다. 기존 공개 옵션이 없으면 가짜/잠긴 후보를 채우지 않는다.

Gold 연구는 초기3종, 첫 자연 종료의 특수2종, 첫 실제 치명타의 치명2종, 첫 Elite의 정예/Boss1종, 숙련3/9/13의 방어/XP/사거리3종 순으로 공개한다. 구매 함수에서도 잠금을 검사한다. 이미 구매한 M11 연구는 예외로 계속 공개·구매·효과 적용한다. 연구 효과는 기존처럼 출격 Snapshot이며 기록 해금 자체가 중간에 연구 효과를 지급하지 않는다.

## Save v2 / Migration

localStorage key는 기존 `horde-defense:meta:v1`을 유지하고 JSON **version만2**로 올린다. `kind:horde-meta`, `account` 재화/Reroll, Marine research, Stage진행을 보존한다. Marine에 `completedOperationRecords`와 최소 `operationProgress`를 저장하고 Point/Unlock은 파생 계산한다. DEV 전체해금/슬롯 override만 별도 flag다.

`activeRunProgress`는 누적 처리를 위한 Run 재유도 절대 카운터와 이번 Run 완료 ID/새 해금을 보관한다. 누적 Retarget은 Run 값의 증가분만 합산해 재호출·재로드 중복을 막는다. 나머지 Run 조건은 계정 최고값으로만 보존하여 여러 Run의 Kill/동시 보유 수를 합산하지 않는다. 필요 임계값까지만 진행을 저장하고 이미 완료한 항목은 더 쓰지 않는다.

v1 이전 시 실제 완료 Run 기록은 첫 작전, 실제 Stage Clear는 첫 승리만 복원한다. 저장되지 않았던 과거 Kill/무기Level/행동을 추정하지 않는다. 연구Level≥1은 잠금과 무관하게 보존/해금 처리한다. 읽기 때 검증·정규화하고 다음 변경 시 v2로 저장한다. 오류 저장은 자동 덮어쓰지 않는다. 마지막 행동 evidence와 자연 종료 Reward/Record를 같은 저장에 포함해 저장 실패 재시도 시 중복 보상이 없게 한다.

수동 Restart/포기: 이미 완료한 행동 기록은 즉시 저장되어 유지하지만 자연 Run 완료·Gold/Credits를 지급하지 않는다. 새 Run은 Run 카운터를 초기화한다. 계정 기록은 유지한다. 한 브라우저 계정에 활성 게임 Run 하나를 전제하며 동시 다중 전투 탭은 지원 범위 밖이다. Export/Import는 v1/v2를 검증하고 활성 Run/정산 영수증을 재사용하지 않는다. Meta와 Balance의 namespace/JSON은 섞지 않는다.

## UI / 개발 도구

- Hub: 작전 기록4개 분류, 숙련/완료 수/진행/직접보상, 무장·해금 현황과 공개 가능한 조건, 잠긴 연구 구매 차단.
- Combat: 완료 순간만 짧은 Notification, 전투 Pause/진행 숫자 Spam 없음. Special HUD는 Locked/Empty/Equipped를 구분한다.
- Result: 이번 Run 완료 기록/획득 Point/신규 해금 목록. 전투 중 받은 기록도 중복 지급 없이 표시한다.
- `/dev`: 현재 숙련/시스템잠금, 특정 기록 완료, 모든 Prototype 콘텐츠 해금, 확인 후 점진 상태 초기화, 슬롯0/1/2. DEV 전체해금은 Point를 조작하지 않는다. 진행 초기화는 재화/구매연구 보존, 신규 계정 테스트는 기존 전체 Meta Reset을 사용한다. Balance Override/Presets는 보존한다.

## 검증

`npm.cmd run check`: **62개 파일 / 448개 테스트 통과**, TypeScript 및 Vite production build 통과. 기존 Phaser 500kB 초과 chunk 경고는 유지한다. 신규 correctness는 Save/해금 풀/실제 특수무기 evidence/Scene 행동 귀속·정산/Hub·Result·DEV·슬롯 UI에 추가했다.

브라우저는 별도 테스트 origin `127.0.0.2:5173`에서 Fresh 0Point/0슬롯·연구 잠금·28기록·직접 조건·출격 후 잠긴 특수 슬롯과 Stimpack/V를 확인했다. `/dev` 특정 기록 완료→1Point/슬롯1, 전체 해금→Point유지/슬롯2·유물/Core/Synergy 활성화를 확인했다. DEV 콘솔 오류 없음. 테스트 탭은 종료했고 사용자 `localhost` Meta/Balance는 조작하지 않았다. 자연 종료→다음 Run 해금과 Result는 자동 통합 테스트에서 확인했으며 브라우저 전체 Run Playtest로 표현하지 않는다.

 자동 다중 Run/해금 속도/경제 적절성/평균 해금 Run 수 분석은 수행하지 않는다. 실제 첫 Run 난이도와 해금 템포는 사용자 Playtest 항목이다.

## 범위 밖

Challenge, Endless, Stage2+, 신규 캐릭터/Awakening, 희귀 재화 소비, Variant, Credits 대형 상점, Final Art, Ranking/Backend, 전체 Relic10/Core5/Synergy6 확장은 구현하지 않는다. M12 코드는 기존 Prototype Pool을 점진 개방하는 범위다.
