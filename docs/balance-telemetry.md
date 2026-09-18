# 개발용 Balance Telemetry v2

`/dev` → 간편 조정의 **실시간 밸런스**에서 같은 origin의 게임 Run을 관찰한다. 게임 밸런스를 바꾸거나 자동 플레이하지 않는다.

## 시간과 측정

- 모든 시간은 `CombatScene.run.elapsedMs`의 **Stage 시간**이다. X4의 실제 7.5초는 30 Stage초이며, 일시정지/성장 선택 중에는 증가하지 않는다. `combatTempo`나 개발 배속을 Telemetry에서 다시 곱하지 않는다.
- DPS = 최근 30 Stage초의 실제 몸체 + 방패 HP 감소 / 관찰 시간. 시작 후 30초 미만이면 현재까지의 시간으로 나눈다. Overkill과 이미 죽은 적의 피해는 제외한다.
- Source: **Gauss / Grenade / Missile / Drone / Other**. 가우스와 동기화 드론은 각각의 피해 적용 지점에서 따로 관찰한다. 기본무기 개조/증원/복제 공격은 Gauss, 필살기는 Other이며 시너지의 배율 증가는 해당 무기 출처에 포함한다. Source DPS 합 = Total DPS.
- KPM = 최근 Window 처치 수 / Window초 × 60.
- 활성 적 평균은 약 1 Stage초마다 관찰한다. 프레임마다 적 배열을 복사하지 않는다.
- Wall Damage는 피해 감소와 HP 0 하한 적용 후 실제 감소량이다. Wall Reach는 적 ID별 최초 성벽 도착만 집계하고 분당 환산한다. 반복 공격/밀려난 뒤 재접근은 추가 도착이 아니다.
- Elite/Boss Combat TTK는 **첫 실제 Player 피해 → 사망**의 Stage초다. 이동/대기 시간은 제외한다. 첫 타격으로 죽으면 0초다. Elite 최근 값과 Run 평균, Boss TTK를 표시한다.
- 최근 30 Stage초의 Spawn/Kill 총수와 분당 환산값을 함께 기록한다. 종류별 Spawn/Kill, `progress >= 0.75` / `>= 0.90` 적 수로 공급 과다, 처치력 부족, 성벽 앞 압박을 구분한다.
- 5 Stage초마다 Level, 성벽, 활성/근접 적, 최근 평균 적, DPS와 Source별 DPS, Spawn/Kill, 성벽 피해·도달, FPS/Substeps를 `timeline5s`에 저장한다. 기존 주요 시점 Snapshot도 유지한다.
- Weapon Contribution은 Gauss / Grenade / Missile / Drone / Other의 DPS와 Total 대비 비중이다. Enemy Lifetime은 종류별 Spawn→Death 누적 평균이며 Elite의 첫 타격→사망 TTK와 별개다.

## Build와 이벤트

현재 Build는 기존 `marineBuildSummary` / `highrollBuildSummary`를 재사용한다. 기본 개조 Level·분기·완성형, 특수무기 Level·트리·분기·초월·Overclock 및 유물/코어/시너지를 기록한다.

성장 이벤트는 일반 공격력/공속/치명, Basic Mod 획득·레벨·Lv5 분기·Lv10 완성, Special 획득·일반 성장·Lv3/Lv6/Lv10/Lv15/Lv20, Relic, Core, Synergy를 기록한다. 이벤트에는 Stage 시간, Character Level, 이름, 이전/이후 Level, Rarity와 선택/분기를 담고, 가능한 일반 Level-Up은 제시 카드와 실제 선택도 남긴다.

주요 성장 전후 각 15 Stage초 동안 DPS, KPM, 평균 Enemy, Near Wall 75%/90%를 `powerSpikeObservations`에 모은다. **적 밀도·다른 성장·Target 상황이 함께 변할 수 있는 관찰값이며 인과적인 성능 평가가 아니다.** pre DPS가 0이면 변화율은 계산하지 않는다.

Snapshot: **3:00 / 5:00 / 7:30 / 10:00 / 12:00 / 15:00 / 18:00 / Boss 등장 / Run 종료**. 각 시점에 시간·Level·성벽·활성 적/평균·DPS·KPM·성벽 피해·Build를 포함한다. 시간 경계를 지난 첫 관찰 프레임의 상태이며 정확한 관찰 Stage 시간도 함께 저장한다.

## 저장 및 리포트

v2 리포트는 `version: 1`과 기존 필드를 유지하고 선택적 `v2` payload에 `timeline5s`, `growthEvents`, `powerSpikeObservations`, `spawnKillPressure`, `enemyLifetime`, `weaponContribution`, `bossEvents`, `performance`를 추가한다. Boss는 Spawn, First Hit, HP 65%/25%, Reinforcement, Final Charge, Siege 시도/차단, Wall Hit, Death와 전투 TTK/전체 Fight Duration을 기록한다. Performance에는 설정 Speed, FPS 평균·최저, Substeps 평균·최대와 측정 가능한 경우 실제 진행 배율을 담는다.

`/dev` 카드에는 Spawn/min, Kill/min, Near Wall 75%, Near Wall 90%만 추가한다. v1 저장 리포트에 없는 값은 `0`으로 추정하지 않고 `—`로 표시한다. 기존 텍스트/JSON 복사와 함께 **AI 분석용 리포트 복사**가 RunSummary, FinalBuild, Final30s, WeaponContribution, Timeline5s, GrowthEvents, PowerSpikeObservations, SpawnKillPressure, NearWallPressure, EnemyLifetime, EliteTTK, BossEvents, Performance 섹션을 내보낸다.

종료된 마지막 Run 하나만 개발용 localStorage `horde-defense.dev.last-balance-report.v1`에 보관한다. Meta Save, Gold/Credits, 작전 기록, Balance Override에는 쓰지 않는다. 저장 실패는 전투 진행을 막지 않는다.

최근 피해/Spawn/Kill/성벽 집계와 적 평균은 최대 30개의 초 단위 bucket이며 Window 경계에 최대 1 Stage초 미만의 집계 근사가 있다. 5초 Timeline은 20분 Run 기준 약 240개, 최대 512개다. Growth/Power Spike/대기 관찰/일반·Boss 이벤트는 각각 최대 256개다. Enemy lifetime은 활성 적의 Spawn 시간과 종류별 누적 count/total 중심이며 모든 Hit나 사망 기록을 영구 저장하지 않는다. JSON은 복사 또는 Run 종료 저장 때만 생성하고 개발 bridge는 약 1 real초마다 상태를 전달한다.

`import.meta.env.DEV`에서만 전투 관찰 및 bridge/UI가 활성화된다. Production에서는 no-op이며 저장/집계를 실행하지 않는다. FPS/Substeps와 실제 진행 배율은 X8이 CPU 한계에 닿았는지 판단하기 위한 신뢰도 지표다. 이 도구와 AI 리포트는 관찰 자료이며 난이도·재미·최적 Build나 성장의 인과 효과를 자동 판정하지 않는다.

성능 요약은 전투가 실제 진행된 프레임만 포함한다. FPS는 Phaser actualFps의 평균/최저(평활된 값), Substeps는 프레임별 평균/최대다. 실제 진행 배율은 진행 Stage 시간 / 활성 real 시간이며, Pause·카드 선택은 제외하고 프레임 중간 정지는 소비한 비율만 센다. 종류별 Spawn/Kill과 lifetime은 Grunt/Runner/Shield/Elite를 서로 겹치지 않게 분류한다. Boss는 Spawn/Kill 총수에만 포함하고 lifetime 대신 Fight Duration을 사용한다.
