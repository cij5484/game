# Prototype M7 — Boss / Random Acquisition

2026-09-18. **Prototype Tuning이며 최종 밸런스가 아니다.** Current Source of Truth: [GDD v0.11](design/GAME_GDD_v0.11.md). v0.10 원본과 이전 구현 기록을 historical record로 보존한다.

M6 `4b06c39e82683cd809fbb2bec544424cd5aa1187`을 [PR21](https://github.com/cij5484/game/pull/21)로 main `544aa1f3d68a46e20d99f10f4c523e01e26c9cf4`에 먼저 병합했다. 최신 main에서 `codex/prototype-m7-boss-acquisition`을 만들었다. M7은 **commit/push 후 정지**, main merge와 다음 Milestone 자동 시작은 하지 않는다.

## 사용자 Playtest 피드백과 변경

특수무기가 너무 일찍 나오고, 기본 개조 획득/성장이 지나치게 자주 등장해 한 개조가 빠르게 강해진다는 피드백을 반영한다. Gauss 중심 성장 시간이 존재하고 RNG에 따라 무기·개조 완성도가 크게 달라지도록 획득 방식과 빈도를 변경한다. 개조 효과와 보유 특수무기 성장 빈도를 대규모로 Nerf하지 않는다.

## Special Weapon Acquisition

Lv5/Lv10 고정 지급과 별도 획득창을 제거했다. 일반 Level-Up 3장 안에 **신규 무장** 카드로 표시한다. 카드 선택은 일반 성장 선택1회를 소비하고 미보유 무기 하나를 Weapon Lv1로 얻는다.

| 조건 | Category weight |
| --- | --- |
| 미보유, Character Lv8 이상 |0.30 |
| 이미1종 이상 보유, Character Lv14 이상, capacity 미만 |0.20 |

공용 강화 카드 하나의 base weight1.0 대비 상대 가중치이며 고정 등장 확률(%)은 아니다. Acquisition Category를 먼저 추첨하고 그 안에서 미보유 무기 하나를 랜덤 선택한다. 세 무기의 weight를 따로 합산하지 않으며 한 Offer 최대1장이다.

기본 최대2종, 무장 확장 Core일 때만3종. Lv8 이전 일반 획득 카드 없음, Lv14 이전 두 번째 일반 획득 카드 없음. Hard Pity·특정 Level 강제 지급·Boss 전 보장 없음. 특수무기를 늦게 얻거나1개만 얻거나 Gauss 중심으로 진행하는 Run을 허용한다.

Acquisition에는 Common/Rare/Unique/Legendary, Great Success, 품질 개방을 적용하지 않는다. 이후 보유 무기의 일반 성장에는 기존 희귀도·대성공·품질 개방과 Lv3/6/10/15/20/남은 Level Queue를 유지한다.

무장 확장 Core는 capacity3과 기존 예외 획득 Queue1회를 유지한다. 기존2종이면 남은 무기를 얻는다. 더 일찍 Core를 얻으면 미보유 무기1종을 먼저 얻고 남은 슬롯은 일반 Acquisition이 채울 수 있다. Lv5/10 이벤트를 복원하지 않는다.

## Basic Modification Categories

| 항목 | 첫값 / 규칙 |
| --- | --- |
| 신규 개조 획득 Category |0.45 |
| 보유 개조 성장 Category |0.35 |
| 개조 내부 Investment Bias |`min(1.4, 1+.1×rank)` |
| 한 Offer 개조 카드 |신규+성장 합계 최대1장 |
| 슬롯 |기본3종, 개조 확장 Core4종 |
| Range |별도weight0.25, Rare 이상, 최대5단계, 개조 슬롯·Offer 제한 미사용 |
| 보유 특수무기 성장 |기존 `1.3×min(2,1+.1×(WeaponLevel−1))` 유지 |

신규/보유 Category를 뽑은 뒤 내부 유효 개조 하나를 선택한다. 투자 Bias는 내부 선택에 적용하며 Category 전체 weight는 개조 수나 Level로 늘어나지 않는다.3슬롯이 차면 신규 Category를 Pool에서 제거하고 Core4슬롯이 열리면 다시 허용한다. 공용 공격력/공격속도/치명타가 기본 Pool을 구성한다.

## 공성 거인

Boss HP는 일반 적 Character Level Scaling을 적용하지 않는 **30,000** 첫값이다. 전장 상단에서 중앙 Soft Lane 부근으로 천천히 접근하며 logical progress를 사용한다. offset은 `.5 + .12×sin(progress×2π)`로 완만하게 변하므로 중앙 rail에 고정되지 않는다. Gauss의 기본 Range.55를 우회하지 않고 Focus Target 지정이 가능하다. Grenade/Missile/Drone은 기존 작전범위를 유지한다.

| Pattern | 수치 / 처리 |
| --- | --- |
| 경고 / 등장 |Stage18:50 공급 완화,19:00 등장1회 |
| 접근 |progress0부터 .025/combat second |
| 공성 Charge |progress.60에서 정지,6000combat ms 충전 Telegraph |
| Weakpoint |Charge 중 누적 본체 피해1800이면 중단 |
| 중단 성공 |공성 취소,3000combat ms Stagger, 받는 피해×1.5; 이후 공성 재개 |
| 중단 실패 |Wall1800피해, 다음6000combat ms Charge 반복 |
| 증원 |HP65% 이하에서 한 번, Grunt24+Runner8 |
| 최후 돌진 |HP25% 이하에서 공성 대신 Wall 직접 접근, 속도.09/combat second |
| 최후 Wall 공격 |도착 후1800combat ms마다1000피해; 첫 공격도1주기 후 |

본체는 모든 Phase에서 피해를 받는다. 약점 성공이 본체 피해의 전제인 강제 면역 기믹이 아니며 High-roll Build는 본체를 빠르게 처치할 수 있다. 공통 primary/effect 피해 처리에서 Charge 피해를 누적하므로 Gauss·특수무기·필살기 등 기존 공격 경로가 중단에 기여한다. Boss는 약한 밀치기·중력 끌어당김·Elite Shield 보호 aura 대상에서 제외한다.

정상 Combat Tempo1.5이므로6000combat ms 충전은 정상 X1 실제 약4초,3000combat ms Stagger는 약2초다. Stage19분 경계는 별도 Stage Clock이며 선택/Pause 중 정지한다.

| Boss Horde | 평균 batch / 내부 interval | cap |
| --- | --- | --- |
|18:50 공급 완화부터 일반 Boss Phase |8 / 1400combat ms |700 |
| 최후 돌진 |32 / 700combat ms |700 |

18:50 공급 완화부터 새 Elite를 억제하고 기존 전장 적은 유지한다. 증원은 새 Enemy Type 없이 Grunt/Runner만 사용하며 cap이 찼으면 남은 증원을 대기시켜 공간이 생길 때 보충한다. 경고 이전 공급과 초기36/cap700/CombatTempo1.5/기존Enemy속도방향/HPScaling/XP/Grenade/Relic6/Core3/Synergy3는 M6 그대로 유지한다.

## 종료·HUD·보상

**Boss 처치만 Stage Clear**, Wall HP0은 실패다.20:00에서 자동 Clear하거나 Stage time을 자르지 않는다. Boss 처치가 빠르면20분 전, 늦으면20분 뒤에도 종료할 수 있다. 실패 상태는 Boss 처치 처리로 성공이 되지 않는다. 목표 약19~21분은 Playtest 방향이며 자동 검증으로 달성/적정성을 판단하지 않는다.

큰 Primitive 실루엣과 Scale/Tint/Outline, Boss HP/상태, 약점, 충전 예고, Stagger를 표시한다. Header는 공용 강화·Relic·Core·Synergy, Bottom은 기본무기/개조·특수무기 전용 성장·Stimpack·Ultimate 소유권을 유지한다. Special Slot은 시작 시 Unlocked/Empty이고 획득 순서대로 채우며 무장 확장 Core가 세 번째 슬롯을 연다.

Result는 Stage Clear/실패와 해당 Run의 Boss Kill을 기록한다. Gold/Credits/희귀영구재화/Stage2 Unlock/영구 기록 저장은 구현하지 않는다. 작전 기록/점진AccountUnlock/Challenge/Endless/Stage2+/신규Character/Awakening/FinalArt/전체Relic·Core·Synergy 확장도 Future로 보존한다.

## GDD와 구현 경계

v0.11의 M7 획득·Category·Boss·종료 규칙을 구현한다. Weakpoint는 별도 공격 좌표/HP 객체 대신 Charge 중 본체 누적 피해 Threshold 방식이다. Boss 보상은 현재 Run Result에 한정한다. 전체 Future 경제/계정/콘텐츠 Pool이 구현됐다는 뜻이 아니다. 첫 수치의 적정성은 아직 승인되지 않았다.

## 최소 검증

**통합 `npm.cmd run check`:46개 파일/342개 테스트, TypeScript 검사와 Vite production build 통과.** 기존500kB 초과 bundle 경고는 남는다. 390×844 브라우저의 짧은 독립 UI fixture에서 실제 EnemyPressureView/createSiegeBoss의 Charge 상태(HP/이름/약점/게이지), 실제 MarineProgression/LevelUpView의 Lv8 획득 카드(희귀도 없음), 실제 게임 시작의 Empty Special Slot을 확인했다. 브라우저 오류는 없었고 임시 preview HTML은 제거했다. 전체 Boss Run이나 자연 RNG 획득 Playtest를 수행했다는 뜻은 아니다. M6의43파일/323테스트와 과거 브라우저 확인을 M7 검증으로 재사용하지 않는다.

검증 범위는 획득 Level/보유 조건·capacity·Offer별 한도·quality 제외·기존 성장 Queue, 개조 Category/3·4슬롯/Bias, Boss19분/20분 자동 종료 제거/처치 Clear/Wall 실패/약점 중단/증원/최후 돌진 등 기능 correctness다. Boss의 짧은 시간 분할 단위 테스트는 Pattern 동작 확인이며 장시간 자동 Run이나 밸런스 검사와 다르다.

획득시점이 적절한지, 개조가 충분히 드문지, Boss HP/난이도/길이가 재미있는지, 전체 Run 난이도·최종Level·평균DPS·자동Clear 결과는 평가·보고하지 않는다. 사용자 직접 Playtest 후 조정한다.

## 변경 파일

- 성장/카드: `marineGrowth`, `marineProgression`, `specialProgression`, `LevelUpView`, `BurstView` 및 기능 테스트.
- Boss/전투: `data/boss`, `enemies/siegeBoss`, `EnemyState`, 공통 `damage`/`actionRelics`/`specialWeapons`, `runState`, Director/CombatScene 및 기능 테스트.
- 표시/결과: Enemy/Boss 표현, Battlefield HUD, Result의 현재 Run Boss Kill.
- 문서: GDD v0.11, 이 기록, README, CODEX-HANDOFF. v0.10 원본은 변경하지 않음.

최종 통합 보완: 필살기 입력으로 Boss를 처치해도 즉시 Result를 한 번만 열도록 공통 처치 경로에서 종료 처리를 호출한다. 최종 cap에 도달한 Boss 등장 전 공급은 Boss 자리1개를 예약하며, 증원은 cap 내 빈자리가 생길 때 처리한다. 이 두 경로를 포함한 최종 check는46파일/342테스트 및 TypeScript/Vite 통과다.
