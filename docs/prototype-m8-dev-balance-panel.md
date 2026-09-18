# Prototype M8 — 한국어 실시간 개발자 밸런스 패널

2026-09-18. **Prototype Development Tool / Not Final Game Feature.** Current Source of Truth: [GDD v0.12](design/GAME_GDD_v0.12.md). v0.11 전체 설계·기본값·Future를 승계하고 원본은 historical record로 보존한다. Runtime Override는 GDD 확정값이나 정식 기본 밸런스 변경이 아니다.

M7 `60f19c02dceceaa1009562f866024632f5b29e8d`을 [PR22](https://github.com/cij5484/game/pull/22)로 main `9fa09f492d1d459d69249c6575637d03f1f2cadc`에 병합한 뒤 `codex/prototype-m8-dev-balance-panel`에서 진행한다. M8은 **commit/push 후 정지**, main merge와 다음 Milestone 자동 시작은 하지 않는다.

## 실행

`npm.cmd run dev -- --host 0.0.0.0`으로 실행한 같은 origin에서 게임 `/`와 패널 `/dev`를 별도 창으로 연다. Vite가 출력한 실제 포트를 사용한다. 같은 브라우저 프로필에서 게임 연결됨/대기 중과 게임의 X1/X2/X4·Character Level·반영된 변경 수를 확인한다. 정식 게임 Header/Battlefield/Bottom에는 개발 메뉴를 추가하지 않는다.

한국어 Label·짧은 설명·Hover Tooltip·적용 시점, 현재값·기본값·변경됨·항목 되돌리기를 제공한다. 숫자 직접 입력과 Toggle을 사용하고 이름/설명/분류/항목명으로 검색한다. 합계 제약 때문에 즉시 적용할 수 없는 여러 수정은 입력 대기 상태로 유지하고 **입력값 적용**으로 함께 반영한다.

수류탄·미사일·드론 기본 주기는 **현재 Combat Tempo의 X1 실제 초**로 입력한다. 내부 값은 combat ms다. 기본 수류탄5.2초=7800÷1.5÷1000이며 JSON에는7800으로 남는다. 희귀도는 기존1000분율과%를 함께 표시한다.

## Runtime 구조와 통신

`data/*.ts`의 기존 기본 설정을 `runtimeObject(root, defaults)`로 등록한다. 개발 환경에서는 안정된 같은 형태의 객체에 Override를 적용하고 기존 게임 시스템이 그 값을 읽는다. 기본값은 별도로 보존한다. Production에서는 그대로 코드 기본 설정을 반환한다.

`balanceFields.ts`는 dot-path ID, 한국어 Label/설명/Category/적용 시점/입력 범위를 정의한다. `runtimeBalance.ts`가 허용 필드·타입·범위를 검사해 전체 변경을 적용하고, `runtimeBridge.ts`가 같은 origin의 **BroadcastChannel `game.prototype.balance.v1`**로 게임과 패널을 연결한다. 연결 확인은 짧은 status/ping 메시지를 사용한다. 별도 Backend/DB/WebSocket Server나 새 의존성은 없다.

개발용 localStorage의 `game.prototype.balance.v1`에 적용된 Override만 저장한다. 새로고침할 때 로드하며 전체 Reset은 이 저장값을 삭제한다. 이름 있는 Preset은 별도 `horde-dev-balance-presets-v1`에 저장/불러오기/삭제하며 전체 Reset 후에도 보존한다. 잘못된 저장 설정은 적용하지 않는다.

## 현재 조절 범위

| 분류 | 대표 항목 |
| --- | --- |
| 전체 게임 |정상CombatTempo, 시작성벽HP, Marine Range; 현재 개발배속 상태 표시 |
| 적 / 물량 |초기수,11개 개별 접힘Phase의 interval/batch/cap/Grunt·Runner·Shield비중, 실시간 이동배율, 생성시 속도/HP배율, 적본체/방패HP, HP선형·제곱계수, EliteHP/속도/Charge/5등장창 |
| 기본무기 |Gauss피해/주기/치명타, 희귀도별 공용/Range카드 증가량, 관통·도탄·점사·다중탄·폭발탄·고위력 주요 계수 |
| 특수무기 |수류탄/미사일/드론 피해·X1실제Cycle, 수류탄 반경/집속·고폭·전술 대표값, 미사일속도/탄수/위험우선도, 드론수/배치/건십·편대 대표값 |
| 성장 / 레벨업 |획득Lv8/14·weight, 개조신규/성장weight·Bias, 보유한도, XP3계수, 대성공, 후보수 |
| 희귀도 / 랜덤 |Lv1~9/10~19/20~29/30+의 일반·희귀·유니크·전설 확률 |
| 유물 |첫Elite보장, 이후Drop, 보유한도, 장전/충격/정밀/과충전/복제 대표값 |
| 코어 |Drop, 최대0~1개, 무장/개조/품질 후보ON/OFF |
| 시너지 |3종ON/OFF, 중력/추적 배율, 포화 지속시간 |
| 보스 |HP, 등장/공급완화시각, 접근/충전/약점/취약/성벽피해, 최후Threshold/속도/반복공격, 증원/Phase별 공급 |
| 프리셋 / 저장 |개별/전체Reset, 이름저장/불러오기/삭제, JSONExport/Import/파일저장 |

## 적용 시점

| 시점 | 처리 |
| --- | --- |
| 즉시 |CombatTempo, 살아 있는 일반/정예의 이동배율, 이후Drop·시너지토글 |
| 다음 적 생성부터 |Phase 생성간격/batch/cap/비중, 본체/방패/Elite/Boss HP, 레벨별HP성장, 생성 당시 시간성장·속도배율. 기존HP/MaxHP 보존 |
| 다음 공격부터 |Gauss/특수무기 피해·주기·대표계수·새 투사체. 이미 발사/예약된 동작을 다시 만들지 않음. Boss 기존 타이머를 소모한 뒤 새 간격 사용 |
| 다음 레벨업부터 |새 Level의 XP 요구량, 아직 열지 않은Offer의 weight/rarity/대성공/증가량/후보수. 현재 레벨 요구XP와 이미 열린 카드 후보·증가량·대성공 확률 유지 |
| 다음 Run부터 |초기적수·시작성벽HP·개조/특수무기/유물 보유한도·Elite등장창 |

생성 간격·batch는 패널에서 즉시 Runtime 값이 바뀌고 **다음 Spawn 계산부터** 사용한다. 이미 예약한 생성 타이머는 유지한다. 유물 보유 한도도 Run 생성 때 고정하여 다음 Run부터 적용한다.

CombatTempo를 바꿔도 StageClock과 게임 내X1/X2/X4를 별도로 유지한다. Horde 구간은 작성 당시 TimelineTempo로 Stage 경계를 해석하여 실시간Tempo 변경으로 Stage구간까지 앞당기지 않는다. Enemy HP를 소급 변경하거나 기존 무기를 지우지 않는다. 단일 코어 보유 규칙도 그대로라 최대 수 입력 범위는0~1이다.

## JSON과 Validation

```json
{
  "version": 1,
  "overrides": {
    "gauss.damagePerRound": 12,
    "special.grenade.cycleMs": 9000,
    "highroll.firstRelicGuaranteed": false
  }
}
```

Export/Preset은 적용된 Override만 저장하며 입력 대기값은 포함하지 않는다. Import/불러오기는 현재 Override 전체를 교체한다. 코드 기본값과 같아진 값은 Override에서 제거한다.

알 수 없는 필드·위험한 객체 경로·잘못된 타입·비유한 숫자·범위 밖 값·정수필드의 소수는 거절한다. 희귀도는 구간별 합계1000(100%), 적 비중은 적어도 하나 양수, Elite창은 시작≤끝, Boss공급완화시각≤등장시각을 검증한다. 실패하면 부분 적용하지 않고 오류를 표시한다.

## Production과 확장 경계

`main.ts`의 `import.meta.env.DEV` 분기에서만 패널/Bridge를 동적 import한다. Production의 `/dev`는 사용 불가 문구만 표시하고 localStorage Override를 읽거나 BroadcastChannel을 열지 않는다. 설정 파일은 Production 기본값을 그대로 반환한다.

추가 항목은 기존 Runtime 객체에 값과 한국어 metadata를 추가하고 실제 소비 경로를 연결한다. 큰 Framework나 통계 Dashboard를 만들지 않는다. 새 콘텐츠와 기본 밸런스 변경, 자동 AI 밸런스 판단, 장시간 Simulation은 하지 않는다. 사용자가 확정한 JSON만 별도 요청으로 코드/GDD 기본값에 반영한다.

## 최소 검증

**M8 통합 `npm run check`:50개 파일/358개 테스트, TypeScript 검사와 Vite production build 통과.** 기존 Phaser chunk500kB 초과 경고는 남는다. 마지막 Phase별 접힘 분류/적용 시점 문구 변경 후 개발도구 관련15테스트도 통과했다. M7의46파일/342테스트와 UI fixture 확인은 해당 역사 기록이며 M8 결과로 재사용하지 않는다.

실제 브라우저에서 `/dev`의243개 조절 항목, 같은 origin 게임 연결/X1·X4/Character Level/반영된 Override 수를 확인했다. 일반병 기본HP8→12 변경 후 게임 확인 응답1개, Reset 후0개, Preset 저장·불러오기와 새로고침 유지, JSON 내보내기·알 수 없는 필드 거절·유효HP10 Import, 검색·Tooltip·수류탄5.2 X1초 표시를 확인했다. 종료 전 Override를 Reset하고 테스트 Preset을 삭제했다. 별도 페이지의 패널 조작은 게임 입력과 분리된다.

Production preview `127.0.0.1:5175/dev`에서 개발환경 전용 사용 불가 문구를 확인했고 빌드에 Panel/Bridge 자산이 포함되지 않았다. 기능 테스트는 다음Spawn HP/기존HP 보존, 열린Offer 후보·증가량·대성공과 현재Level XP 고정, batch0·StageClock, Production guard를 확인한다.

이 검증은 연결·저장·적용 경계의 correctness만 확인한다. 자동 밸런스 판단이나 장시간 Run을 수행하지 않았으며 값의 재미·난이도는 사용자 직접 Playtest로 판단한다.
