# Horde Defense Prototype

모바일 웹 호드 디펜스의 그레이박스 프로토타입입니다. 현재는 **Milestone 5: Marine Primary Combat**까지 구현했습니다. 적의 성벽 공격과 Marine의 탭 기반 3점사를 플레이할 수 있습니다.

## 현재 화면 확인

- 빈 공간 탭은 성벽에 가장 가까운 살아있는 적을, 적 직접 탭은 그 명령 동안 해당 적을 우선 공격합니다. 타겟이 죽으면 자동 선택으로 전환합니다.
- 1회 탭 = 3발(발당 10 피해, 110ms 간격), 마지막 발 후 380ms 회복입니다. 다음 명령은 1개만 예약하며 추가 연타는 무시합니다. Shield는 기본공격 피해를 절반만 받습니다.
- 적 표시는 종류와 남은 HP입니다. 원거리 적에도 최소 44px 터치 영역을 적용하며, 실제 기기의 터치감은 사용자 검증 대상입니다.

- 시작 시 Grunt / Runner / Shield가 등장하고, 10초마다 세 종류가 추가됩니다.
- Runner → Grunt → Shield 순으로 성벽에 도착합니다. 가까워질수록 표시 크기가 커집니다.
- G/R/S는 적 종류, 빨간 테두리는 성벽 공격 상태입니다. 도착 후 공격 간격이 지나야 피해를 줍니다.
- 공용 Wall HP는 임시 튜닝값 500입니다. 0이면 이동·공격·생성이 멈추고 RUN FAILED를 표시합니다. 새로고침하면 다시 시작합니다.
- Phaser RESIZE로 전체 viewport를 사용하고, 1280×720 기준 전장을 균일 배율로 맞춥니다. 긴 화면에서는 좌우 여백을 두어 이동 거리가 달라지지 않습니다. HUD와 전장 표시 계층은 분리했습니다.
- 16:9(1280×720), 19.5:9(1560×720), 20:9(1600×720), 태블릿 4:3(1024×768)에서 브라우저 확인을 완료했습니다. 실제 기기 조작성과 Safe Area UI는 아직 검증·구현하지 않았습니다.

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
- 가로 모드 기준 논리 해상도는 1280×720이며 화면에 맞춰 비율을 유지합니다.

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
