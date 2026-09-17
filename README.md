# Horde Defense Prototype

모바일 웹 호드 디펜스의 그레이박스 프로토타입입니다. 현재 구현 범위는 **Milestone 12 브랜치의 Weapon Trait / 유물 Build System 개편**입니다. 아래 수치는 모두 실제 모바일 플레이로 조정할 prototype tuning입니다.

## 한 판과 조작

- 빈 전장 Tap → 가장 가까운 살아있는 적, Enemy Tap → 그 명령의 우선 대상. 기본 Gauss는 3발 × 피해10, 발사 간격110ms, 점사 회복380ms입니다. 예약 명령은1개이며 연타가 발사 속도를 높이지 않습니다.
- 두 손가락 Tap 또는 PC 좌우 마우스 동시 클릭 → 자극제. 마우스는 120ms 내 합류 / 300ms 내 릴리스입니다. 기본 BOOST 5초×1.5 → CRASH 1초(공격 불가) → RECOVERY 2초입니다. NORMAL에서 다시 사용할 수 있습니다.
- ○ → 서리장, Z → 연쇄 번개. Circle recognizer 구조/threshold는 변경하지 않았습니다. 짧은 흔들림은 Tap, 잘못된 그림은 오발동 없이 무시합니다. 성벽의 ○/Z는 버튼이 아닌 cooldown 표시입니다.
- Wall HP12,000. 전투 시뮬레이션 시간300초를 버티면 방어 성공, HP0이면 방어 실패입니다. 선택창과 우측 최상단 일시정지 아이콘의 Pause는 시간에 포함되지 않고 Burst Rhythm 중에는 전장과 Run 시간이0.08배로 흐르므로 실제 소요 시간은5분보다 깁니다.
- 결과 화면에 시간, 처치, Level, 남은 Wall HP, 무기 특성/강화, 자극제/마법 성장, 유물/진화을 표시합니다. 재도전는 같은 설정의 새 Run을 시작하며 영구 보상은 없습니다.

## Horde / Encounter

처음부터 약한 Grunt65마리가 progress0.08~0.45에 분산 등장합니다. cap은 밀도 상한이며 실제 active 수를 보장하지 않습니다. 일반 적은 Elite용 한 칸을 예약하고, 막힌 spawn은 누적하지 않습니다.

| 시작(초) | Encounter            | 간격(ms) / batch | cap | Grunt/Runner/Shield |
| -------- | -------------------- | ---------------- | --- | ------------------- |
| 0        | GRUNT FLOOD          | 900 / 14         | 90  | 95/5/0              |
| 30       | BREATHING ROOM       | 1200 / 10        | 90  | 90/10/0             |
| 45       | RUNNER RUSH          | 850 / 16         | 100 | 65/30/5             |
| 60       | ARMORED HORDE        | 800 / 18         | 110 | 60/20/20            |
| 90       | REGROUP              | 1200 / 12        | 110 | 85/10/5             |
| 105      | SHIELD ADVANCE       | 750 / 20         | 120 | 50/15/35            |
| 135      | MIXED ONSLAUGHT      | 700 / 22         | 130 | 50/30/20            |
| 165      | COUNTERATTACK WINDOW | 1100 / 14        | 130 | 80/15/5             |
| 180      | BREAK THE LINE       | 650 / 24         | 135 | 45/30/25            |
| 210      | LAST BREATHER        | 1000 / 16        | 135 | 75/15/10            |
| 225      | SIEGE                | 600 / 26         | 150 | 45/25/30            |
| 255      | FINAL PRESSURE       | 500 / 30         | 160 | 40/30/30            |

30/90/165/210초부터 각각15초는 완화 구간입니다. 마지막45초는 최대 압박입니다. Lane 가중치는1/1/1이며, 단계 경계에서 새 설정을 즉시 적용합니다. 초기65마리와 cap90→160은 유지하고, 지속 리젠을 900ms/14마리에서 마지막45초 500ms/30마리까지 크게 높였습니다. 완화 구간에도 이전보다 많은 적을 보충합니다. 실제 적 수와 XP는 생존 적·처리량에 제한됩니다.

- Runner/Grunt/Shield 이동속도는 progress/s0.08/0.032/0.025입니다. Grunt만 이전보다20% 느리며 표시 scale이나 화면비는 이동 시간에 영향을 주지 않습니다.
- 성벽 도착 적은 lane별 표시 슬롯으로 분산합니다. 이 시각 배치는 공격/거리 판정에 사용하지 않습니다.
- 개발 서버에서 D로 Lane/FAR/NEAR, 적 종류/HP/progress, Stim, encounter/active 수, Gesture 경로/score/실패 이유를 표시합니다. 기본 OFF, 모바일 debug 버튼 없음.

## XP / Weapon Trait 성장

현재 기준은 [GDD v0.2](docs/design/GAME_GDD_v0.2.md)입니다. v0.1은 과거 문서로 원문 보존합니다. **플레이어 문구는 한국어 우선, 내부 id/type은 영어**입니다. 이름/설명은 콘텐츠 data, 공통 HUD/버튼/상태는 display text에서 관리하며 i18n 프레임워크는 쓰지 않습니다.

- 처치 XP Grunt/Runner1, Shield3. 레벨 L의 다음 요구 XP는 8+6(L−1)+2(L−1)². 밀린 선택/초과 XP 보존.
- 특성: **속사 / 관통 / 도탄 / 다중탄 / 폭발탄 / 치명타**, 각 Lv1~5. 기본 2종 제한이며 꽉 차면 미보유 특성은 후보에서 제외합니다. 기존 특성/자극제/현재 마법은 계속 성장합니다.
- Elite 처치별 3%의 별도 **전술 확장 코어**는 이번 Run 특성 한도를 2→3으로 높입니다. 유물 슬롯을 사용하지 않으며 중복 확장은 없습니다.
- 유효한 비MAX 후보에서 중복 없이 최대 3장. 일반/희귀/영웅/전설 가중치 10/4/1/0.25, 투자 rank당 +8% bias(최대×1.6). 실제 등장 확률은 후보 구성에 따라 달라집니다. Reroll 없음.
- 레벨업 최대3개·유물1~2개 선택지를 화면 중앙에 가로 정렬한 정사각형 카드로 표시합니다. 카드에는 기호·한글명·짧은 효과·희귀도·현재→다음 레벨을 보여주고, 전체 설명은 aria/title에 보존합니다. 기호는 추후 이미지로 대체할 수 있습니다. 레벨/유물 선택 및 수동 일시정지는 전장·공격·Spawn·cooldown·자극제·필살기 리듬·Run/VFX 시간을 멈춥니다.
- 기존 점사수/회복/관통/도탄 파편 카드를 특성의 누적 Lv1~5로 대체했습니다. 전체 30개 레벨 효과는 [GDD 특성 표](docs/design/GAME_GDD_v0.2.md#6-weapon-trait와-선택)와 data/traits.ts를 봅니다.
- 속사: 4→7점사, Lv3 처치 연쇄. 관통: 추가1→5명, Lv3 방패 대응/Lv5 충격파. 도탄:1→5회, Lv3 최종 분기. 다중탄: 추가1→4명 동시 사격. 폭발탄: 범위65→145, Lv3 제한된 처치 연쇄. 치명타:20%×2→55%×3, Lv3 충격파/Lv5 메아리.
- 전설 3종은 해당 특성 Lv4부터: 폭주 연쇄3명100%, 공성 관통포100% 유지+반경140 충격파, 연쇄 폭풍탄3명 최소80% 분기(Lv5의 기존100% 유지). 기본 특성 MAX에 전설은 필요하지 않습니다.
- 자극제/서리장/번개 성장 수치는 이전 rebalance와 동일합니다. 마법 영웅 효과는 해당 tag6rank부터입니다.

## 시너지

- **심층 폭발:** 관통1 + 폭발탄1 → 관통 중 적중 지점마다 폭발.
- **살상 도탄:** 도탄1 + 치명타1 → 치명타 도탄+2회, 치명타 피해 전파.
- **탄막 폭풍:** 속사1 + 다중탄1 → 매4번째 발사에 온전한 피해 추가 동시탄2발.

## Tactical Magic / Burst

- Frost Nova: 전역 이동속도×0.5,7초 지속, cooldown30초. 효과 중 새로 생성되는 적도 느려집니다. Wall 공격·spawn·Primary·다른 cooldown은 느려지지 않습니다. 범위 강화는 전역 감속 강화로 대체했습니다.
- Chain Lightning: 연결 반경360 내 최대30명에게 각75 피해, cooldown24초. 중복 타격 없이 연쇄합니다. 범위·대상·피해/분기 성장으로 순간 처리량을 늘립니다.
- 빈 전장 시전도 cooldown을 소모합니다. 긴 cooldown과 압박/완화 구간을 유지하며, Magic 없는 상황을 금지하는 hard counter는 만들지 않았습니다.
- Burst Gauge100: 명중0.02/처치0.08/Elite 추가6. 일반 전투 기여의 허용량은 최대3, 전투 시뮬레이션1초당0.45씩 회복하며 Elite 보너스는 제한 밖입니다. 시간만으로 Gauge가 차거나 초과 기여가 이월되지 않습니다. READY는 성벽 BURST 버튼을 직접 누를 때까지 유지합니다. 무제한 명중·처치와 Elite7회도300초 총180 이하로 제한되어 이번 수치에서는 한 번의 완충이 상한입니다. 1~2회 목표 중1회 쪽의 보수적 시작값이며 실제 전투 기여가 낮으면0회에 그칠 위험이 있습니다.
- Rhythm은 실제 시간3초,0.5초 간격의5회 판정. PERFECT±70ms, GOOD±150ms, 나머지MISS. 전장0.08배속. 점수에 따라24~60명에게60~140 피해를 주며 모두MISS여도 최소 효과가 있습니다. Ultimate 처치 자체는 Gauge를 재충전하지 않습니다.

## Elite / 유물 / 진화

- Elite는 Grunt 기반 HP120, 첫60초/이후40초, 금색 확대 표시. 처치 보상은 기존 PEN/STORM Module을 제거하고 **공성 코어 / 테슬라 코일**로 재설계했습니다.
- 유물은 Run 전용 Lv1→5, 최대3종. 같은 유물 재획득 시 레벨 증가, MAX 제외, 슬롯이 차면 미보유 후보 제한. 현재2종이라 교체 UI는 없습니다.
- **공성 코어:** Lv1 방패 명중 번개−60ms(발당 최대240) → Lv2 −120ms(최대480) → Lv3 마법 후3발 방패 무시 → Lv4 5발/방패 피해×1.5 → Lv5 7발/×2/마법마다 성벽120 회복.
- **테슬라 코일:** Lv1 명중12발마다 전격1명/피해12 → Lv2 10발/2명/16 → Lv3 치명타 추가 충전+2(총3)/3명/20 → Lv4 번개 시전 후 다음 명중 전격/4명/24 → Lv5 6발/5명/30/전격 적중 시 두 마법−400ms. 전격 거리240, 재귀 충전/중복 타격 없음.
- **관통Lv4 + 공성 코어Lv3 → 초관통 가우스 (Hyper Gauss)**. 추가 관통3명/폭×1.6/굵기8 청록 tracer. recipe는 traits/relics/magic 조건을 지원하는 데이터입니다.
- 유물 효과는 단순 관통+1/도탄+1 대신 Primary와 마법/성벽을 연결합니다. 상세 누적 효과는 [GDD 유물 표](docs/design/GAME_GDD_v0.2.md#8-유물--구-module-대체)를 봅니다.

## Portrait / Mobile

Phaser RESIZE와720×1280 논리 전장, Full-Bleed 환경을 유지합니다. 긴 화면 위쪽/태블릿 좌우 공간은 환경으로 채우며 전투 거리·난이도는 viewport 크기로 바뀌지 않습니다. 하단 성벽에 HP·레벨/XP·유물·마법·필살기·Run 시간을 모읍니다. 특성은 선택창 요약과 결과창에서 표시하여 하단 전장 공간을 유지합니다. 우측 최상단에는 한국어 접근성 이름을 가진 작은 일시정지 아이콘만 두며 상단의 큰 패널은 만들지 않습니다.

`viewport-fit=cover`와 CSS `env(safe-area-inset-*)`를 읽어 전장/HUD를 안전 영역에 맞추고, 배경은 화면 끝까지 유지합니다. Canvas touch scroll/selection/callout과 overscroll을 억제합니다. 선택/결과 dialog는 가용 높이 안에서 스크롤합니다. iOS/Android의 홈 인디케이터, 노치, 두 손가락 시스템 제스처,160마리에서의 FPS·터치감은 실제 기기 확인이 필요합니다.

## 검증 범위 / 과거 기록

- 현재 Build System 개편: `npm.cmd run check` — 26개 파일 / 92 tests, TypeScript/build 통과. 특성 슬롯/확장/MAX, 유물 Lv5, 세 시너지 조건과 Hyper Gauss 신규 recipe를 핵심 테스트로 확인했습니다. 브라우저에서는 한국어 카드, 레벨 표시, 특성 2/2 상태와 기존 특성/자극제 선택지를 확인했습니다. 별도 브라우저에서 일시정지 중 4:55와 적 위치가 두 번의 화면 관찰에서 유지되고, 계속하기 후 4:47과 적 이동이 재개됨을 확인했습니다. 콘솔 오류는 없었습니다. 실제 재미/자연적인 MAX 도달/모바일 조작은 사용자 평가 대상입니다.

- 이전 Combat Rebalance Pass (현재 개편 이전 기록): `npm.cmd run check` 23개 파일/89 tests와 TypeScript/build 통과. 브라우저에서16초68/90,34초83/90,53초64/100마리 및 ○/Z 사용 후 cooldown을 관찰했습니다. Burst는53초23%,68초29%,94초47%였습니다. Frost 중 신규 spawn의 시각 변화·후반160마리·Legendary 자연 추첨은 직접 관찰하지 못했습니다. 실기기 성능·Gesture 사용감·승률은 미확정입니다.

- 이전 Milestone12: `npm.cmd run check` 23개 파일/83 tests, TypeScript/build 통과. XP/prerequisite, 효과, Encounter, Run 종료, Safe Area 핵심 동작의 RED→GREEN 확인.
- 이전 Milestone12 390×844 브라우저 Run 관찰:273초 FINAL PRESSURE에서119/120마리, Lv14, Wall HP11,726. 이후 화면이 새 Run으로 넘어가 CLEAR 결과창 자체는 읽지 못했습니다. 별도 무입력 Run은0:54에 FAILED 결과 표시, 재도전 후5:00/Lv1/HP12,000/Burst0% 초기화 확인. 콘솔 오류/경고 없음.
- 300초 CLEAR 경계·종료 상태 고정은 핵심 테스트로 확인했습니다. 위 관찰은 빌드별 승률·Magic 의존도·재미 검증이나120마리 실기기 성능 측정 완료를 의미하지 않습니다.
- Milestone9 당시59 tests, Milestone10 당시68 tests, Milestone11 당시76 tests 및 TypeScript/build 통과 기록이 있습니다. 각각 당시 구현 기준이며 현재 테스트 수가 아닙니다.
- Milestone11 당시390×844/768×1024에서 초기 군세·HUD·수동 Burst/MISS/복귀를 관찰했습니다. 당시 강화 후 전장이 빠르게 비는 문제가 이번 재조정의 출발점입니다.
- 브라우저 도구의 자유곡선/동시 다중 터치 제한으로 실제 ○/Z·두 손가락 인식률은 기기 검증 대상입니다. Vite 번들 크기 경고는 기존 제한이며 현재 cap160마리의 실기기 성능 측정은 아직 없습니다.

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

- [현재 게임 디자인 v0.2](docs/design/GAME_GDD_v0.2.md)
- [프로토타입 기술 사양](docs/design/PROTOTYPE_TECHNICAL_SPEC_v0.1.md)
- [구현 계획](docs/superpowers/plans/2026-09-17-core-combat-prototype-implementation-plan.md)

현재 변경은 codex/milestone-12-combat-depth에서 계속하며 main에는 merge하지 않습니다. 실제 재미/문구/모바일 입력/유물·특성 MAX 도달성/후반160마리 성능은 사용자 Playtest로 평가하고 이후 merge 여부를 결정합니다. 다음 Milestone은 시작하지 않습니다.
