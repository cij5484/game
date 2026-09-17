# Horde Defense Prototype

모바일 웹 호드 디펜스의 그레이박스 프로토타입입니다. 현재는 **Milestone 11: Horde Power Fantasy / Gesture Reliability / Tactical Magic / Rhythm Burst**까지 구현했습니다. 세로 전장에서 적의 성벽 공격, Marine의 탭 기반 3점사와 두 손가락 탭 Stimpack을 플레이할 수 있습니다.

## 현재 화면 확인

- 빈 공간 탭은 성벽에 가장 가까운 살아있는 적을, 적 직접 탭은 그 명령 동안 해당 적을 우선 공격합니다. 타겟이 죽으면 자동 선택으로 전환합니다.
- 1회 탭 = 3발(발당 10 피해, 110ms 간격), 마지막 발 후 380ms 회복입니다. 다음 명령은 1개만 예약하며 추가 연타는 무시합니다. Shield는 기본공격 피해를 절반만 받습니다.
- 적 종류/HP/progress는 Debug Overlay에서만 표시합니다. 원거리 적에도 최소 44px 터치 영역을 적용하며, 실제 기기의 터치감은 사용자 검증 대상입니다.

- 시작 시 Grunt 30마리가 progress 0.08~0.45에 분산 등장합니다. Spawn Director가 단계별 생성량과 정원을 관리합니다.
- Runner → Grunt → Shield 순으로 성벽에 도착합니다. 가까워질수록 표시 크기가 커집니다.
- G/R/S는 적 종류, 빨간 테두리는 성벽 공격 상태입니다. 도착 후 공격 간격이 지나야 피해를 줍니다.
- 공용 Wall HP는 밀도 관찰용 임시 튜닝값 50,000입니다(최종 난이도 아님). 0이면 이동·공격·생성이 멈추고 RUN FAILED를 표시합니다. 새로고침하면 다시 시작합니다.
- 공식 화면 방향은 Mobile Portrait입니다. Phaser RESIZE로 viewport 전체를 배경/전장으로 채우며, 720×1280 논리 전장은 균일 배율로 화면 하단에 배치합니다. 긴 화면 위쪽과 태블릿 좌우의 추가 공간은 환경으로 채우며 이동 시간과 전투 밸런스는 달라지지 않습니다.
- 9:16 / 9:19.5 / 9:20 / 태블릿 세로 비율에 대응합니다. HUD와 전장 계층은 분리했습니다. 실제 기기 조작성과 Safe Area UI는 별도 확인·구현 대상입니다.
- 두 손가락 탭으로 Stimpack을 사용합니다. BOOST → 1초 CRASH(기본공격 불가) → 2초 RECOVERY(공격속도 점진 회복) 상태만 작은 HUD로 표시하며 NORMAL은 기본 화면에서 숨깁니다. Boost 지속시간/배율은 데이터의 prototype tuning 값을 사용합니다.
- 현재 Boost는 5초·1.5배이며 NORMAL에서만 다시 사용할 수 있습니다. Crash 중 새 공격 입력은 무시하고, 진행 중인 점사/예약 명령은 정지했다가 Recovery에서 재개합니다.
- 두 손가락은 120ms 안에 겹쳐 닿고 300ms 안에 떼어야 합니다(데이터에서 조정 가능). 드래그·길게 누르기는 공격하지 않습니다. 브라우저에서 세로 4개 비율과 일반 탭을 확인했으며, 실제 동시 두 손가락 입력·Safari/Android 시스템 제스처·노치 간섭은 기기 검증이 필요합니다.

## Horde / Debug

- `src/game/data/horde.ts`에서 모든 생성 수치를 조절합니다. 적 비중 Grunt/Runner/Shield는 0초 90/10/0 → 30초 75/20/5 → 60초 이후 60/25/15, lane 가중치 1/1/1입니다.
- 0/30/60/120초 단계별로 생성 간격 2000/1800/1600/1400ms, batch 4/5/6/7, active 상한 50/60/70/80입니다. 처치가 없으면 10초에 일반 적49마리로 채워집니다. Elite를 위해 한 칸을 예약합니다.
- 매 30초 중 20초는 압박, 10초는 완화입니다. 완화 구간은 간격 ×1.8, batch ×0.5(내림). 상한에서 놓친 생성은 나중에 몰아서 생성하지 않습니다.
- 기본 HUD는 하단 성벽에 Wall HP와 마법 cooldown을 표시하고 활성 Stimpack 상태를 작게 표시합니다. 개발 서버에서 **D** 키로 Lane/FAR/NEAR, 조작 설명, 종류/HP/progress, Stim 상태, director 시간/단계/간격/batch/active 수를 표시합니다. 기본 OFF이며 모바일 버튼과 프로덕션 토글은 없습니다.
- 적을 처치하지 않으면 성벽에 쌓여 active 상한에 도달합니다. 빈자리는 처치 또는 다음 단계의 상한 증가 때 생깁니다. 성벽에 도착한 적은 lane별 4열의 안정적인 표시 슬롯으로 분산합니다. 표시 슬롯은 이동/성벽 피해/마법 거리 계산을 바꾸지 않습니다.
- Milestone 7 브라우저 관찰(390×844, 약 3분 20초): 65초 28/36 → 128초 48/48 → 193초 60/60, 콘솔 오류/경고 없음. 당시 성벽 앞 중첩 문제가 있었으며 Milestone 8에서 표시 슬롯으로 개선했습니다. 실제 모바일 FPS/터치 성능 측정이나 100~200마리 stress test는 수행하지 않았습니다.

## Gesture Magic

- 한 손가락으로 ○를 그리면 Frost Nova, 왼쪽 위에서 오른쪽 아래로 Z를 그리면 Chain Lightning이 즉시 발동합니다. 짧은 흔들림은 Tap, 인식 실패는 공격/마법 없이 무시합니다. 두 손가락 입력은 Stimpack만 처리합니다.
- Frost Nova: 가장 전방의 살아있는 적 중심 논리 반경550, 3.5초 동결(이동과 Wall 공격 정지), cooldown20초. 동결된 적은 밝은 청록색입니다.
- Chain Lightning: 가장 전방 적부터 인접 적으로 반경300 내 최대12명, 각50 피해, 같은 적 중복 없음, cooldown14초. Shield의 기본공격 저항은 마법에는 적용하지 않습니다.
- 성벽 안 ○/Z 상태는 버튼이 아닙니다. 빈 전장에 시전해도 cooldown은 소모합니다. Gesture threshold는 data/gesture.ts, 입력 시간/샘플 한계는 data/input.ts에서 조절합니다.
- D Debug에서만 완료된 입력 path, circle/Z score, 인식 결과와 실패 이유·핵심 판정값을 표시합니다. 화면 표시 좌표와 마법의 논리 거리(648×1075)는 분리되어 있습니다.
- 포인터 경로→인식→마법 효과→cooldown 차단 통합 테스트를 실행했습니다. 브라우저에서는 Tap, 잘못된 선의 거부, 성벽 HUD/군중 배치를 확인했습니다. 현재 브라우저 도구는 자유곡선·동시 다중 터치를 지원하지 않아 실제 ○/Z 및 두 손가락 조작은 기기 확인이 필요합니다.

## 성장 루프

- 처치 XP: Grunt/Runner 1, Shield 3. Lv.1에서 다음 레벨 요구 XP는5, 이후 매 레벨 +3입니다. 초과 XP는 보존합니다.
- 레벨업 시 적/생성/무기/Stimpack/마법 cooldown/VFX 시간을 멈추고 서로 다른 강화3개 중 하나를 선택합니다. 여러 레벨이 밀리면 차례대로 선택합니다.
- 후보는 현재 능력의 비MAX 카드에서 중복 없는 weighted random(현재 각 weight1)으로 뽑습니다. Reroll 없음. 8종 총22rank를 모두 소진하면 빈 선택창 없이 계속 진행하며, 마지막 남은 후보가3개 미만이면 남은 카드만 표시합니다.
- RAPID: 점사 +1발(rank3 MAX: 6발), 회복 −60ms(rank3 MAX: 200ms). 진행 중 탄환 예약을 초기화하지 않으며 다음 점사/발사 이벤트부터 적용합니다.
- PENETRATION: 뒤쪽 논리 ray 내 추가 적 +1(rank3). RICOCHET: 마지막 적중점 주변180 내 미적중 적1명(rank1). 관통은 청록선, 도탄은 주황선으로 표시합니다. 같은 탄환에 중복 hit 없음.
- Frost 범위 +60 / 동결 +500ms(각 rank3), Lightning 대상 +3 / 피해 +15(각 rank3). Cooldown은 유지합니다.
- XP/Level은 성벽의 HP 옆에 작게 표시합니다. 공식 수치는 data/upgrades.ts와 data/primaryAttack.ts의 prototype tuning입니다.
- Milestone 9 검증: 전체59 tests와 TypeScript/build 통과. 브라우저에서 XP 증가, 3장 선택창, 선택 후 재개와 주황색 도탄 연결선을 확인했습니다. Rapid/관통/마법 강화별 수치·피해·cooldown 보존은 핵심 테스트로 검증했으며 모든 강화 조합의 실제 기기 플레이 평가는 아직 하지 않았습니다.

## Elite / Module / Evolution

- Elite는 Grunt 기반 HP120(기본 ×4), 금색 외곽선·◆ ELITE 표시·크기 ×1.15입니다. 60초부터 25초 간격으로 생성합니다. 일반 적 정원 한 칸을 예약하며 전체 active 상한은 유지합니다. 가득 찼으면 생성 기회를 보류하고 몰아서 생성하지 않습니다.
- Elite 처치 시 전투를 멈추고 PEN / STORM 중 하나를 선택합니다. 일반 레벨업도 동시에 발생하면 Module 선택부터 처리합니다. 같은 Module 재선택은 Lv1→2→3 MAX, MAX는 후보 제외, 모두 MAX이면 빈 보상창 없이 진행합니다.
- 한 Run 최대3종입니다. 슬롯이 차면 새 종류를 후보에서 제외하고 보유한 비MAX Module만 성장시킵니다. 현재2종이므로 교체 UI 없이 후보 제한으로 처리합니다.
- PEN: Lv1 관통 +1명 → Lv2 관통 +2명·폭 +16 → Lv3 마지막 관통 적 주변 반경90에 기본공격의50% 충격파. 직접 맞은 적에는 중복 피해를 주지 않습니다.
- STORM: Lv1 추가 도탄1회·반경 +40 → Lv2 반경 +80 → Lv3 추가 도탄2회. 기존 Ricochet 강화의 도탄1회와 합산하며 같은 탄환은 같은 적을 반복 타격하지 않습니다.
- Hyper Gauss recipe: 일반 PENETRATION 강화 rank2 이상 + PEN Module Lv3. 조건과 효과는 data/evolutions.ts에 분리되어 있으며, 충족 후 한 번만 진화합니다.
- 진화 시 추가 관통 +4명, 관통 폭 ×2, 굵은 청록 tracer와 중앙 EVOLUTION / HYPER GAUSS 알림을 표시합니다. 기본3점사와 cadence/buffer 규칙은 유지합니다.
- 보유 Module은 하단 성벽에 짧게 표시합니다. 새 상단 패널은 없습니다. 모든 수치는 prototype tuning이며, 기존 Wall HP50,000은 관찰용입니다.
- Milestone 10 당시 검증: 핵심 Module/recipe/무기 효과/Elite 테스트를 포함한 전체68 tests와 TypeScript/build 통과. 390×844 브라우저에서 금색 Elite, PEN Lv1→2→3·STORM Lv3 HUD와 진화 후 굵은 청록 tracer를 확인했고 콘솔 오류/경고는 없었습니다. 중앙 진화 알림 순간은 직접 캡처하지 못했습니다. 실제 휴대폰의 보상 빈도·진화 만족감·터치/성능 평가는 사용자 검증 대상입니다.

## Milestone 11 — Tactical Magic / Rhythm Burst

- Primary는 항상 사용할 수 있는 지속 화력, Magic은 긴 cooldown을 가진 위기 해결 수단입니다. Frost의 대규모 CC와 Lightning의 순간 연쇄 처리를 언제 쓸지 판단하는 방향이며 위 수치는 모두 prototype tuning입니다.
- Circle 인식은 일정 경로 간격의 32개 샘플을 사용합니다. 열린 원의 끝점 거리만 엄격하게 보던 판정과, 기울어진 타원을 축별 정규화할 때 반경 오차가 커지는 문제를 보완했습니다. 타원 기울기 보정 후 정규화하고 경로 길이 대비 끝점 거리·누적 회전량·회전 방향 일관성·반경 오차를 함께 확인합니다. 시작점/시계·반시계에 종속되지 않으며 Z는 원래 화면 방향에서 별도로 평가합니다. 실제 손가락 입력의 편의성은 기기 확인이 필요합니다.
- Burst Gauge100: 적중당0.2, 처치당1, Elite 처치 추가8. 빈 탭으로는 충전하지 않고 READY가 되어도 자동 발동하지 않습니다. 성벽의 BURST 버튼으로 직접 시작합니다.
- Rhythm은 실제 시간3초, 0.5/1/1.5/2/2.5초의5회 타이밍 탭입니다. 전장 시간은0.08배로 흐릅니다. PERFECT ±70ms / GOOD ±150ms, 그 밖은 MISS이며 한 탭은 한 판정을 소비해 연타 재시도를 막습니다.
- Full Auto / Suppressive Barrage는 점수0~1에 따라 최대24~60명에게60~140 피해를 주는 한 번의 광역 일제사격입니다. 전부 MISS여도 최소 효과가 있습니다. Build별 Burst 변형은 구현하지 않았습니다.
- 하단 성벽에 HP·Level/XP·Module·Magic cooldown·Burst Gauge/READY/버튼을 모읍니다. 상단에 새 HUD 패널은 만들지 않습니다. Rhythm 중에만 타이밍·판정 피드백을 표시합니다.
- 최소 검증 대상: Circle fixture, Horde pacing, Magic 효과/cooldown, Burst grading, TypeScript/build. 이 절은 브라우저·실기기 검증 완료를 의미하지 않습니다.
- 사용자가 직접 확인: 대충 그린 원/타원과 Z 구별, 초반30~50마리 밀도, Magic을 아껴 쓰는 판단, 수동 Burst/슬로모션/타이밍 손맛, Ultimate 대량 처치, 성벽 HUD 가독성. 실제 휴대폰 FPS와 터치·Safe Area,80마리 상태의 조작성은 별도 평가가 필요합니다.
## Milestone 11 검증 기록

- `npm.cmd run check`: 22개 파일,76 tests 및 TypeScript/build 통과. Circle fixture, Burst 판정, Horde pacing 신규 동작의 RED→GREEN 확인.
- 브라우저390×844/768×1024: 시작 Grunt 군세, 하단 HUD, 성과 기반 충전, READY 유지, 수동 발동, Rhythm TAP/MISS 표시, 전투 복귀 확인. 콘솔 오류/경고 없음.
- 도구가 자유곡선·동시 다중 터치를 지원하지 않아 실제 ○/Z의 기기 인식률은 미검증입니다. 대규모 Freeze/Lightning/Ultimate 피해는 테스트로 확인했으며, 실제 대량 처치 연출과 Slow Motion 체감은 사용자 플레이 확인이 필요합니다.
- 관찰 중 강화 후 전장이 빠르게 비는 구간이 있어 생성량/Primary/Magic 상대 효율 추가 튜닝이 필요합니다. 실기기80마리 성능 측정과150~200 stress test는 하지 않았습니다. 기존 Vite 번들 크기 경고 유지.

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
