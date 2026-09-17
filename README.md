# Horde Defense Prototype

모바일 웹 호드 디펜스의 그레이박스 프로토타입입니다. 현재는 **Milestone 9: XP / Level Up / Build Growth**까지 구현했습니다. 세로 전장에서 적의 성벽 공격, Marine의 탭 기반 3점사와 두 손가락 탭 Stimpack을 플레이할 수 있습니다.

## 현재 화면 확인

- 빈 공간 탭은 성벽에 가장 가까운 살아있는 적을, 적 직접 탭은 그 명령 동안 해당 적을 우선 공격합니다. 타겟이 죽으면 자동 선택으로 전환합니다.
- 1회 탭 = 3발(발당 10 피해, 110ms 간격), 마지막 발 후 380ms 회복입니다. 다음 명령은 1개만 예약하며 추가 연타는 무시합니다. Shield는 기본공격 피해를 절반만 받습니다.
- 적 종류/HP/progress는 Debug Overlay에서만 표시합니다. 원거리 적에도 최소 44px 터치 영역을 적용하며, 실제 기기의 터치감은 사용자 검증 대상입니다.

- 시작 시 12마리가 progress 0~0.35에 분산 등장합니다. Spawn Director가 단계별 생성량과 정원을 관리합니다.
- Runner → Grunt → Shield 순으로 성벽에 도착합니다. 가까워질수록 표시 크기가 커집니다.
- G/R/S는 적 종류, 빨간 테두리는 성벽 공격 상태입니다. 도착 후 공격 간격이 지나야 피해를 줍니다.
- 공용 Wall HP는 밀도 관찰용 임시 튜닝값 50,000입니다(최종 난이도 아님). 0이면 이동·공격·생성이 멈추고 RUN FAILED를 표시합니다. 새로고침하면 다시 시작합니다.
- 공식 화면 방향은 Mobile Portrait입니다. Phaser RESIZE로 viewport 전체를 배경/전장으로 채우며, 720×1280 논리 전장은 균일 배율로 화면 하단에 배치합니다. 긴 화면 위쪽과 태블릿 좌우의 추가 공간은 환경으로 채우며 이동 시간과 전투 밸런스는 달라지지 않습니다.
- 9:16 / 9:19.5 / 9:20 / 태블릿 세로 비율에 대응합니다. HUD와 전장 계층은 분리했습니다. 실제 기기 조작성과 Safe Area UI는 별도 확인·구현 대상입니다.
- 두 손가락 탭으로 Stimpack을 사용합니다. BOOST → 1초 CRASH(기본공격 불가) → 2초 RECOVERY(공격속도 점진 회복) 상태만 작은 HUD로 표시하며 NORMAL은 기본 화면에서 숨깁니다. Boost 지속시간/배율은 데이터의 prototype tuning 값을 사용합니다.
- 현재 Boost는 5초·1.5배이며 NORMAL에서만 다시 사용할 수 있습니다. Crash 중 새 공격 입력은 무시하고, 진행 중인 점사/예약 명령은 정지했다가 Recovery에서 재개합니다.
- 두 손가락은 120ms 안에 겹쳐 닿고 300ms 안에 떼어야 합니다(데이터에서 조정 가능). 드래그·길게 누르기는 공격하지 않습니다. 브라우저에서 세로 4개 비율과 일반 탭을 확인했으며, 실제 동시 두 손가락 입력·Safari/Android 시스템 제스처·노치 간섭은 기기 검증이 필요합니다.

## Horde / Debug

- `src/game/data/horde.ts`에서 모든 생성 수치를 조절합니다. 적 비중 Grunt/Runner/Shield = 60/25/15, lane 가중치 1/1/1입니다.
- 0/60/120/180초 단계별로 생성 간격 3000/2200/1600/1200ms, batch 3/4/5/6, active 상한 24/36/48/60입니다.
- 매 30초 중 20초는 압박, 10초는 완화입니다. 완화 구간은 간격 ×1.8, batch ×0.5(내림). 상한에서 놓친 생성은 나중에 몰아서 생성하지 않습니다.
- 기본 HUD는 하단 성벽에 Wall HP와 마법 cooldown을 표시하고 활성 Stimpack 상태를 작게 표시합니다. 개발 서버에서 **D** 키로 Lane/FAR/NEAR, 조작 설명, 종류/HP/progress, Stim 상태, director 시간/단계/간격/batch/active 수를 표시합니다. 기본 OFF이며 모바일 버튼과 프로덕션 토글은 없습니다.
- 적을 처치하지 않으면 성벽에 쌓여 active 상한에 도달합니다. 빈자리는 처치 또는 다음 단계의 상한 증가 때 생깁니다. 성벽에 도착한 적은 lane별 4열의 안정적인 표시 슬롯으로 분산합니다. 표시 슬롯은 이동/성벽 피해/마법 거리 계산을 바꾸지 않습니다.
- Milestone 7 브라우저 관찰(390×844, 약 3분 20초): 65초 28/36 → 128초 48/48 → 193초 60/60, 콘솔 오류/경고 없음. 당시 성벽 앞 중첩 문제가 있었으며 Milestone 8에서 표시 슬롯으로 개선했습니다. 실제 모바일 FPS/터치 성능 측정이나 100~200마리 stress test는 수행하지 않았습니다.

## Gesture Magic

- 한 손가락으로 ○를 그리면 Frost Nova, 왼쪽 위에서 오른쪽 아래로 Z를 그리면 Chain Lightning이 즉시 발동합니다. 짧은 흔들림은 Tap, 인식 실패는 공격/마법 없이 무시합니다. 두 손가락 입력은 Stimpack만 처리합니다.
- Frost Nova: 가장 전방의 살아있는 적 중심 논리 반경220, 1.5초 동결(이동과 Wall 공격 정지), cooldown8초. 동결된 적은 밝은 청록색입니다.
- Chain Lightning: 가장 전방 적부터 인접 적으로 반경180 내 최대4명, 각25 피해, 같은 적 중복 없음, cooldown6초. Shield의 기본공격 저항은 마법에는 적용하지 않습니다.
- 성벽 안 ○/Z 상태는 버튼이 아닙니다. 빈 전장에 시전해도 cooldown은 소모합니다. Gesture threshold는 data/gesture.ts, 입력 시간/샘플 한계는 data/input.ts에서 조절합니다.
- D Debug에서만 완료된 입력 path와 인식 결과/confidence를 표시합니다. 화면 표시 좌표와 마법의 논리 거리(648×1075)는 분리되어 있습니다.
- 포인터 경로→인식→마법 효과→cooldown 차단 통합 테스트를 실행했습니다. 브라우저에서는 Tap, 잘못된 선의 거부, 성벽 HUD/군중 배치를 확인했습니다. 현재 브라우저 도구는 자유곡선·동시 다중 터치를 지원하지 않아 실제 ○/Z 및 두 손가락 조작은 기기 확인이 필요합니다.

## 성장 루프

- 처치 XP: Grunt/Runner 1, Shield 3. Lv.1에서 다음 레벨 요구 XP는5, 이후 매 레벨 +3입니다. 초과 XP는 보존합니다.
- 레벨업 시 적/생성/무기/Stimpack/마법 cooldown/VFX 시간을 멈추고 서로 다른 강화3개 중 하나를 선택합니다. 여러 레벨이 밀리면 차례대로 선택합니다.
- 후보는 현재 능력의 비MAX 카드에서 중복 없는 weighted random(현재 각 weight1)으로 뽑습니다. Reroll 없음. 8종 총22rank를 모두 소진하면 빈 선택창 없이 계속 진행하며, 마지막 남은 후보가3개 미만이면 남은 카드만 표시합니다.
- RAPID: 점사 +1발(rank3 MAX: 6발), 회복 −60ms(rank3 MAX: 200ms). 진행 중 탄환 예약을 초기화하지 않으며 다음 점사/발사 이벤트부터 적용합니다.
- PENETRATION: 뒤쪽 논리 ray 내 추가 적 +1(rank3). RICOCHET: 마지막 적중점 주변180 내 미적중 적1명(rank1). 관통은 청록선, 도탄은 주황선으로 표시합니다. 같은 탄환에 중복 hit 없음.
- Frost 범위 +60 / 동결 +500ms(각 rank3), Lightning 대상 +1 / 피해 +10(각 rank3). Cooldown은 유지합니다.
- XP/Level은 성벽의 HP 옆에 작게 표시합니다. 공식 수치는 data/upgrades.ts와 data/primaryAttack.ts의 prototype tuning입니다.
- Milestone 9 검증: 전체59 tests와 TypeScript/build 통과. 브라우저에서 XP 증가, 3장 선택창, 선택 후 재개와 주황색 도탄 연결선을 확인했습니다. Rapid/관통/마법 강화별 수치·피해·cooldown 보존은 핵심 테스트로 검증했으며 모든 강화 조합의 실제 기기 플레이 평가는 아직 하지 않았습니다.

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
