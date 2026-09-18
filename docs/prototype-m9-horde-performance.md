# Prototype M9 — Horde 성능

M8 `1719e74694e4cdf10211f3d04d1c976221223032`를 [PR23](https://github.com/cij5484/game/pull/23)로 main `7d1cae9`에 병합한 뒤 `codex/prototype-m9-horde-performance`에서 진행한다. Current Source of Truth는 전체 v0.12를 승계한 [GDD v0.13](design/GAME_GDD_v0.13.md)이며 v0.12 원본은 보존한다. M9는 **commit/push까지만**, main merge와 다음 Milestone 자동 시작은 하지 않는다.

## 실제 병목과 변경

- 가장 큰 낭비는 `advanceWorld` 내부 sub-step마다 전체 Enemy를 render하고, Damage/Focus에서도 다시 전체 Render하던 구조였다. 이제 movement·wall attack·Boss 등의 simulation 순서는 유지하고 실제 Phaser Frame 마지막에 Enemy transform을 한 번 갱신한다. Damage는 바뀐 HP/Shield 상태와 사망을 처리하고 생존 적 표시는 Frame 마지막에 갱신한다. Focus는 이전/새 대상 표시만 갱신한다. 숨긴 debug label은 매 Frame 갱신하지 않는다. 사격·필살기 효과는 이전 Container 위치 대신 현재 상태의 좌표를 사용하며, Lane/공격 slot/Boss inset 계산을 Enemy Render와 공유한다.
- 동일 상태의 readonly Enemy snapshot을 재사용하고 상태가 바뀌면 갱신한다. 이벤트 ID 색인을 재사용하며, 특수무기는 무피해 호출에서 입력 배열을 그대로 반환하고 첫 명중에서만 복사한다. 충격 유물이 없을 때 `applyImpact`도 불필요한 배열 복사를 생략한다.
- in-flight Missile은 캐시한 ID→index가 현재 배열에서도 해당 ID인지 확인한다. 순서·대상이 달라졌을 때만 재색인한다. Drone의 제외 Set·스탯 계산은 공격 이벤트에만 필요하며 동기화 사격은 같은 대상을 한 번 찾아 사망 상태를 매 발 확인한다. Grenade density와 기존 Smart Fuse의 재조준 시점·타겟 순서·Random draw는 유지한다.
- Shield Protection은 Lane별 보호 대상 후보를 정렬해 방패 뒤의 가까운 적을 찾고 보호 상태가 바뀐 적만 복사한다. 보호 거리·강도·지속 결과는 바꾸지 않는다.

## VFX와 개발 지표

순간 전투 VFX는 **Frame당 16개 Object, 활성 최대 64개**로 제한한다. 치명타 Text도 이 수에 포함한다. 일반 Impact 대상 표시는 **Frame당 96개**다. Damage·Kill·XP는 VFX 상한과 무관하게 모두 처리한다. 반복 Flash Graphics는 기존 표시 시간을 유지한 뒤 숨겨 재사용하고, 사격 Graphic은 공격별로 묶는다. Enemy 전체 Pool이나 대규모 Pool Framework는 추가하지 않았다.

`/dev`의 읽기 전용 **성능** 항목은 FPS·적 수·특수 유닛 수·전투 효과 수·프레임당 시뮬레이션 단계 수다. 같은 origin의 기존 DEV 상태 통신으로 약 1초마다 전달한다. 특수 유닛은 현재 표시 중인 Grenade/Missile/Drone 수다. 전투 효과 수는 활성 순간 Flash 그룹·치명타 Label 수이며 Graphic 안의 개별 도형·HUD·지속 지면 Graphic 수가 아니다. Production에서 패널/통신/Override를 비활성화하는 경계는 유지한다.

## 유지한 Gameplay

초기 Horde·Active Cap **700**·Spawn Batch/Interval·Enemy HP와 생성 시 Level Scaling·이동속도·Combat Tempo·XP·성장 weight·Gauss/특수무기 피해와 주기·Relic/Core/Synergy·Boss·Pause/Level-Up 시간 정지를 유지한다. Gameplay data 기본값은 수정하지 않는다. 대규모 Horde를 줄여 성능을 맞추지 않는다. 정상 X1이 우선이며 X2/X4는 개발 Stress 용도다.

## 최소 확인

- **M9 통합 `npm run check`: 51파일/373테스트, TypeScript·Vite build 통과.** 기존 Phaser 500kB 초과 chunk 경고는 유지한다. M8의 50파일/358테스트는 역사 결과다.
- 짧은 기능 fixture에서 **700 Enemy·X4·실제 delta 64ms 한 Frame**의 Enemy transform 호출은 기존 **17,500회 → 700회**다. 같은 simulation 결과를 확인하는 호출 수 회귀이며 실제 FPS 측정이나 장시간 Benchmark가 아니다.
- Special Weapons 집중 회귀 22개와 TypeScript 검사 통과. 무피해 입력 참조 보존·immutable 명중·재정렬/제거 대상 retarget·동기화 사격의 사망 처리·기존 주기/연쇄/Random 동작을 확인했다.
- 브라우저에서 `/dev`의 5개 실제 성능 값과 Pause 중 sub-step 0 표시를 확인했다. Runtime Override는 0개 상태다.

20분 자동 Run·평균 FPS 표·기기별 장시간 Stress Test·자동 밸런스/난이도 분석은 하지 않았다. 실제 끊김 개선과 실기기 체감은 사용자 직접 Playtest로 판단한다.
