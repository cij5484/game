# 개발용 Balance Telemetry

`/dev` → 간편 조정의 **실시간 밸런스**에서 같은 origin의 게임 Run을 관찰한다. 게임 밸런스를 바꾸거나 자동 플레이하지 않는다.

## 시간과 측정

- 모든 시간은 `CombatScene.run.elapsedMs`의 **Stage 시간**이다. X4의 실제 7.5초는 30 Stage초이며, 일시정지/성장 선택 중에는 증가하지 않는다. `combatTempo`나 개발 배속을 Telemetry에서 다시 곱하지 않는다.
- DPS = 최근 30 Stage초의 실제 몸체 + 방패 HP 감소 / 관찰 시간. 시작 후 30초 미만이면 현재까지의 시간으로 나눈다. Overkill과 이미 죽은 적의 피해는 제외한다.
- Source: **Gauss / Grenade / Missile / Drone / Other**. 가우스와 동기화 드론은 각각의 피해 적용 지점에서 따로 관찰한다. 기본무기 개조/증원/복제 공격은 Gauss, 필살기는 Other이며 시너지의 배율 증가는 해당 무기 출처에 포함한다. Source DPS 합 = Total DPS.
- KPM = 최근 Window 처치 수 / Window초 × 60.
- 활성 적 평균은 약 1 Stage초마다 관찰한다. 프레임마다 적 배열을 복사하지 않는다.
- Wall Damage는 피해 감소와 HP 0 하한 적용 후 실제 감소량이다. Wall Reach는 적 ID별 최초 성벽 도착만 집계하고 분당 환산한다. 반복 공격/밀려난 뒤 재접근은 추가 도착이 아니다.
- Elite/Boss Combat TTK는 **첫 실제 Player 피해 → 사망**의 Stage초다. 이동/대기 시간은 제외한다. 첫 타격으로 죽으면 0초다. Elite 최근 값과 Run 평균, Boss TTK를 표시한다.

## Build와 이벤트

현재 Build는 기존 `marineBuildSummary` / `highrollBuildSummary`를 재사용한다. 기본 개조 Level·분기·완성형, 특수무기 Level·트리·분기·초월·Overclock 및 유물/코어/시너지를 기록한다.

각 기본무기 개조의 첫 획득 때 직전 15 Stage초 DPS를 저장하고, 획득 후 15 Stage초가 지나면 post DPS 및 변화율을 기록한다. 같은 개조의 Level 상승은 새 획득으로 세지 않는다. **적 밀도·다른 성장·Target 상황이 포함될 수 있는 관찰값이며 인과적인 성능 평가가 아니다.** pre DPS가 0이면 변화율은 계산하지 않는다.

Snapshot: **3:00 / 5:00 / 7:30 / 10:00 / 12:00 / 15:00 / 18:00 / Boss 등장 / Run 종료**. 각 시점에 시간·Level·성벽·활성 적/평균·DPS·KPM·성벽 피해·Build를 포함한다. 시간 경계를 지난 첫 관찰 프레임의 상태이며 정확한 관찰 Stage 시간도 함께 저장한다.

## 저장 및 리포트

리포트는 version, result, metrics, build, Elite TTK 통계, modEvents, 중요 events, snapshots로 구성한다. `/dev`에서 **이번 Run 리포트 복사**로 텍스트를 복사하고 JSON도 복사할 수 있다. 진행 중에는 현재 관찰값을 제공한다.

종료된 마지막 Run 하나만 개발용 localStorage `horde-defense.dev.last-balance-report.v1`에 보관한다. Meta Save, Gold/Credits, 작전 기록, Balance Override에는 쓰지 않는다. 저장 실패는 전투 진행을 막지 않는다.

최근 피해/처치/성벽 집계는 초 단위 bounded bucket이며 Window 경계에 최대 1 Stage초 미만의 집계 근사가 있다. 초 단위 bucket/적 평균은 최대 30개, 중요 이벤트와 Elite TTK 목록은 각각 최근 최대 256개다. Elite Run 평균/표본 수는 누적 counter로 유지한다. 모든 Hit를 영구 보관하지 않는다. 개발 bridge는 약 1 real초마다 상태를 전달하며 집계 시간은 Stage 시간이다.

`import.meta.env.DEV`에서만 전투 관찰 및 bridge/UI가 활성화된다. Production에서는 no-op이며 저장/집계를 실행하지 않는다. 이 도구로 난이도·재미·최적 Build를 자동 판정하지 않는다.
