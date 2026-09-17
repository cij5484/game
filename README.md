# Horde Defense Prototype

모바일 웹 호드 디펜스의 그레이박스 프로토타입입니다. 현재 구현 범위는 **Milestone 12 — Combat Depth Rebalance + 5-Minute Playtest Run**입니다. 아래 수치는 모두 실제 모바일 플레이로 조정할 prototype tuning입니다.

## 한 판과 조작

- 빈 전장 Tap → 가장 가까운 살아있는 적, Enemy Tap → 그 명령의 우선 대상. 기본 Gauss는 3발 × 피해10, 발사 간격110ms, 점사 회복380ms입니다. 예약 명령은1개이며 연타가 발사 속도를 높이지 않습니다.
- 두 손가락 Tap → Stimpack. 기본 BOOST 5초×1.5 → CRASH 1초(공격 불가) → RECOVERY 2초입니다. NORMAL에서 다시 사용할 수 있습니다.
- ○ → Frost Nova, Z → Chain Lightning. 짧은 흔들림은 Tap, 잘못된 그림은 오발동 없이 무시합니다. 성벽의 ○/Z는 버튼이 아닌 cooldown 표시입니다.
- Wall HP12,000. 전투 시뮬레이션 시간300초를 버티면 PROTOTYPE CLEAR, HP0이면 RUN FAILED입니다. 선택창 Pause는 시간에 포함되지 않고 Burst Rhythm 중에는 전장과 Run 시간이0.08배로 흐르므로 실제 소요 시간은5분보다 깁니다.
- 결과 화면에 시간, 처치, Level, 남은 Wall HP, Primary 방향/강화, Stimpack/Magic 성장, Module/Evolution을 표시합니다. RETRY는 같은 설정의 새 Run을 시작하며 영구 보상은 없습니다.

## Horde / Encounter

처음부터 약한 Grunt45마리가 progress0.08~0.45에 분산 등장합니다. cap은 밀도 상한이며 실제 active 수를 보장하지 않습니다. 일반 적은 Elite용 한 칸을 예약하고, 막힌 spawn은 누적하지 않습니다.

| 시작(초) | Encounter            | 간격(ms) / batch | cap | Grunt/Runner/Shield |
| -------- | -------------------- | ---------------- | --- | ------------------- |
| 0        | GRUNT FLOOD          | 1500 / 6         | 80  | 95/5/0              |
| 30       | BREATHING ROOM       | 2200 / 3         | 80  | 90/10/0             |
| 45       | RUNNER RUSH          | 1400 / 7         | 90  | 65/30/5             |
| 60       | ARMORED HORDE        | 1200 / 8         | 95  | 60/20/20            |
| 90       | REGROUP              | 2200 / 3         | 95  | 85/10/5             |
| 105      | SHIELD ADVANCE       | 1200 / 9         | 100 | 50/15/35            |
| 135      | MIXED ONSLAUGHT      | 1100 / 10        | 110 | 50/30/20            |
| 165      | COUNTERATTACK WINDOW | 2200 / 4         | 110 | 80/15/5             |
| 180      | BREAK THE LINE       | 1000 / 10        | 115 | 45/30/25            |
| 210      | LAST BREATHER        | 2000 / 4         | 115 | 75/15/10            |
| 225      | SIEGE                | 1000 / 11        | 120 | 45/25/30            |
| 255      | FINAL PRESSURE       | 900 / 12         | 120 | 40/30/30            |

30/90/165/210초부터 각각15초는 완화 구간입니다. 마지막45초는 최대 압박입니다. Lane 가중치는1/1/1이며, 단계 경계에서 새 설정을 즉시 적용합니다. 생성표의 상한 없는 이론치는 약2,279마리/3,356XP이며 실제 수는 생존 적·처리량에 크게 제한됩니다.

- Runner/Grunt/Shield 이동속도는 progress/s0.08/0.04/0.025입니다. 표시 scale이나 화면비는 이동 시간에 영향을 주지 않습니다.
- 성벽 도착 적은 lane별 표시 슬롯으로 분산합니다. 이 시각 배치는 공격/거리 판정에 사용하지 않습니다.
- 개발 서버에서 D로 Lane/FAR/NEAR, 적 종류/HP/progress, Stim, encounter/active 수, Gesture 경로/score/실패 이유를 표시합니다. 기본 OFF, 모바일 debug 버튼 없음.

## XP / Build 성장

- 처치 XP는 Grunt/Runner1, Shield3. 현재 Level을 L이라 할 때 다음 요구 XP는 `8 + 6×(L−1) + 2×(L−1)²`입니다. 초과 XP와 밀린 선택을 보존합니다.
- 획득1,000~2,500XP에서 계산상 약10~14회 선택을 목표로 합니다. 시간만으로 보장되는 횟수나 플레이 검증 결과는 아닙니다.
- Pool은 **21종 / 총73rank**. 현재 사용 가능한 능력, prerequisite 충족, 비MAX 카드에서 서로 다른3장을 weighted random으로 제안합니다. 이미 투자한 tag의 후보가 있으면 첫 슬롯에 해당 후보를 배정하고 나머지는 Hybrid 가능성을 유지합니다. Reroll 없음.
- 레벨/Module 선택 중 이동·공격·spawn·cooldown·Stim·VFX·Run 시간이 멈춥니다. 선택 완료 후 즉시 효과를 적용하고 재개합니다.

| 방향        | 기본 성장 / 최대 rank                          | 고급 효과                                                  |
| ----------- | ---------------------------------------------- | ---------------------------------------------------------- |
| RAPID       | 점사 +1발×5, 회복 −30ms×5, 발사 간격 −10ms×4   | tag6rank: 탄환 처치 시 주변1명에게60% 추가 피해, 탄환당1회 |
| PENETRATION | 관통 +1명×5, 피해 유지율 +8%p×4                | tag6rank: Shield 방어로 감소하는 피해의 절반 회복          |
| RICOCHET    | 도탄 +1회×3, 거리 +30×4, 피해 유지율 +8%p×4    | tag6rank: 첫 대상이 동결되어 있으면 도탄 +2회              |
| Stimpack    | Boost +0.5초×4, 배율 +0.1×3, Recovery −0.2초×3 | CRASH 1초의 위험은 유지                                    |
| Frost       | 범위 +60×5, 동결 +0.4초×5                      | tag6rank: 시전 범위에 즉시30 피해                          |
| Lightning   | 대상 +2×5, 피해 +12×5, 거리 +40×4              | tag6rank: 연쇄 주변 미적중3명에게60% 추가 피해             |

관통/도탄의 기본 추가 대상 피해 유지율은55%/60%이며 반복할 때마다 곱하는 감쇠가 아닙니다. 유지율 강화와 도탄 거리 강화는 해당 tag1rank부터 열립니다. Shield의 Primary 배율은0.5, Magic은 이 저항을 무시합니다. 기본 직접 피해10은 유지하면서 광역 확장 효율·spawn 처리량을 함께 조정했습니다.

## Tactical Magic / Burst

- Frost Nova: 가장 전방 적 중심 논리 반경550, 동결3.5초, cooldown20초. 동결은 이동과 Wall 공격을 멈춥니다. Runner 압박을 멈추고 고급 도탄과 연계할 수 있습니다.
- Chain Lightning: 반경300 내 최대12명에게 각50 피해, cooldown14초. 중복 타격 없이 연쇄합니다. 범위·대상·피해/분기 성장으로 순간 처리량을 늘립니다.
- 빈 전장 시전도 cooldown을 소모합니다. 긴 cooldown과 압박/완화 구간을 유지하며, Magic 없는 상황을 금지하는 hard counter는 만들지 않았습니다.
- Burst Gauge100: 명중0.2/처치1/Elite 추가8. READY에서 성벽 BURST 버튼을 직접 눌러 발동합니다.
- Rhythm은 실제 시간3초,0.5초 간격의5회 판정. PERFECT±70ms, GOOD±150ms, 나머지MISS. 전장0.08배속. 점수에 따라24~60명에게60~140 피해를 주며 모두MISS여도 최소 효과가 있습니다. Ultimate 처치 자체는 Gauge를 재충전하지 않습니다.

## Elite / Module / Evolution

- Elite는 Grunt 기반 HP120, 금색·확대 표시. 첫60초, 이후40초 간격이며 cap이 막히면 다음 기회로 보류합니다.
- Elite 처치 시 PEN/STORM 보상 선택. Lv1→2→3, MAX 제외, 둘 다MAX이면 빈 보상창 없이 진행. 최대3종이며 슬롯이 차면 새 종류를 후보에서 제외합니다. 현재2종이라 교체 UI는 없습니다.
- PEN: 관통 +1 → +2·폭 +16 → 마지막 관통 지점 반경90에50% 충격파. 직접 맞은 적은 중복 타격하지 않습니다.
- STORM: 추가 도탄1·거리 +40 → 거리 +80 → 추가 도탄2. 일반 도탄 강화와 합산합니다.
- PENETRATION rank2 + PEN Module Lv3 → HYPER GAUSS. 추가 관통 +3명, 폭×1.6, 굵은 청록 tracer와 잠깐의 중앙 알림입니다. Recipe는 별도 데이터에 있습니다.

## Portrait / Mobile

Phaser RESIZE와720×1280 논리 전장, Full-Bleed 환경을 유지합니다. 긴 화면 위쪽/태블릿 좌우 공간은 환경으로 채우며 전투 거리·난이도는 viewport 크기로 바뀌지 않습니다. 하단 성벽에 HP·Level/XP·Module·Magic·Burst·Run 시간을 모으고 상단에 새 패널을 만들지 않습니다.

`viewport-fit=cover`와 CSS `env(safe-area-inset-*)`를 읽어 전장/HUD를 안전 영역에 맞추고, 배경은 화면 끝까지 유지합니다. Canvas touch scroll/selection/callout과 overscroll을 억제합니다. 선택/결과 dialog는 가용 높이 안에서 스크롤합니다. iOS/Android의 홈 인디케이터, 노치, 두 손가락 시스템 제스처,120마리에서의 FPS·터치감은 실제 기기 확인이 필요합니다.

## 검증 범위 / 과거 기록

- Milestone12: `npm.cmd run check` 23개 파일/83 tests, TypeScript/build 통과. XP/prerequisite, 효과, Encounter, Run 종료, Safe Area 핵심 동작의 RED→GREEN 확인.
- 390×844 브라우저 Run 관찰:273초 FINAL PRESSURE에서119/120마리, Lv14, Wall HP11,726. 이후 화면이 새 Run으로 넘어가 CLEAR 결과창 자체는 읽지 못했습니다. 별도 무입력 Run은0:54에 FAILED 결과 표시, RETRY 후5:00/Lv1/HP12,000/Burst0% 초기화 확인. 콘솔 오류/경고 없음.
- 300초 CLEAR 경계·종료 상태 고정은 핵심 테스트로 확인했습니다. 위 관찰은 빌드별 승률·Magic 의존도·재미 검증이나120마리 실기기 성능 측정 완료를 의미하지 않습니다.
- Milestone9 당시59 tests, Milestone10 당시68 tests, Milestone11 당시76 tests 및 TypeScript/build 통과 기록이 있습니다. 각각 당시 구현 기준이며 현재 테스트 수가 아닙니다.
- Milestone11 당시390×844/768×1024에서 초기 군세·HUD·수동 Burst/MISS/복귀를 관찰했습니다. 당시 강화 후 전장이 빠르게 비는 문제가 이번 재조정의 출발점입니다.
- 브라우저 도구의 자유곡선/동시 다중 터치 제한으로 실제 ○/Z·두 손가락 인식률은 기기 검증 대상입니다. Vite 번들 크기 경고는 기존 제한이며120마리 실기기 성능 측정은 아직 없습니다.

## 실행

Node.js 24 LTS와 npm을 사용합니다. Windows PowerShell에서는 `npm.cmd`를 사용합니다.

```powershell
npm.cmd ci
npm.cmd run dev -- --host 0.0.0.0
```

- 이 PC: <http://localhost:5173/>
- 현재 LAN 주소: <http://192.168.0.2:5173/> (2026-09-17 기준)
- 실제 휴대폰에서는 PC와 같은 Wi-Fi/로컬 네트워크에 연결한 뒤 LAN 주소를 엽니다. PC가 유선으로 연결되어 있어도 같은 공유기의 네트워크이면 됩니다.
- IP는 바뀔 수 있습니다. `ipconfig`의 IPv4 주소와 Vite가 출력한 포트를 사용합니다.
- 접속이 차단되면 Windows 방화벽의 개인 네트워크 허용 상태와 공유기의 기기 간 통신 제한을 확인합니다.
- 공식 세로 기준 논리 해상도는 720×1280이며, 화면 크기는 이동·피해 계산에 사용하지 않습니다.

## 검사 명령

```powershell
npm.cmd test
npm.cmd run test:watch
npm.cmd run build
npm.cmd run check
```

`check`는 테스트 후 TypeScript 검사와 프로덕션 빌드를 실행합니다. ESLint와 Prettier는 계획에 따라 개발 의존성으로 설치했으며, 별도 lint 검사는 현재 Task 1의 검사 범위에 없습니다.

## Task 1 검증 및 조정 사항

- 스모크 테스트를 먼저 실행해 `createGame` 모듈이 없는 상태에서 실패함을 확인했습니다.
- `npm.cmd run check`: 테스트 1개 통과, strict TypeScript 검사 및 프로덕션 빌드 성공.
- 데스크톱 브라우저에서 localhost 접속, 1280×720 캔버스와 문구·사각형 표시를 확인했습니다.
- Vite를 `0.0.0.0:5173`으로 실행하고, 이 PC의 브라우저에서 LAN 주소로도 같은 장면이 표시됨을 확인했습니다. 두 주소 모두 브라우저 콘솔 오류·경고가 없었습니다. 다른 기기에서의 LAN 접속 및 실제 Android/iPhone 검증은 아직 하지 않았습니다.
- Phaser가 포함된 JS 번들은 약 1,199 kB, gzip 약 320 kB로 Vite의 500 kB 경고가 있습니다. 크기 경고를 숨기거나 측정 전 최적화를 추가하지 않았습니다.

계획에서 조정한 부분:

- 기존 문서를 덮어쓰지 않도록 `npm.cmd create vite@latest .git/vite-task1 -- --template vanilla-ts --no-interactive`로 임시 템플릿을 만든 뒤 필요한 설정만 적용했습니다. 기존 문서 4개는 원문 그대로 보존했습니다.
- 구현 계획의 Phaser 3 범위를 지키기 위해 `npm.cmd install phaser@3`으로 설치했습니다.
- Node 환경에서는 Phaser를 직접 import하면 `window is not defined`가 발생하므로 스모크 테스트에서만 Phaser를 대체했습니다. 실제 Phaser 렌더링은 별도의 브라우저 확인으로 검증합니다.
- 새 저장소의 작업 브랜치는 `codex/task-1-foundation`입니다.

## 기준 문서

- [게임 디자인](docs/design/GAME_GDD_v0.1.md)
- [프로토타입 기술 사양](docs/design/PROTOTYPE_TECHNICAL_SPEC_v0.1.md)
- [구현 계획](docs/superpowers/plans/2026-09-17-core-combat-prototype-implementation-plan.md)

다음 Milestone은 사용자 검토·승인 후 별도로 진행합니다.
