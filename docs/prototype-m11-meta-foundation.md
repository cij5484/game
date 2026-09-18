# Prototype M11 — Meta Foundation

M10 `4f34ee41053c210c0646864d82afb07f9b4f29a7`을 [PR25](https://github.com/cij5484/game/pull/25)로 main `f6f831a51f38912b604b479d26f8a3c236986d84`에 병합한 뒤 `codex/prototype-m11-meta-foundation`에서 진행한다. [GDD v0.15](design/GAME_GDD_v0.15.md)는 v0.14 전체를 승계하고 원본은 보존한다. **commit/push까지만**, main merge·다음 Milestone 자동 시작은 하지 않는다.

## Save와 Run Loop

시작은 Meta Hub다. Marine·Gold/Credits·출격·영구 연구·저장 관리를 표시하고, 출격→Combat→자연 종료 Result→다시 하기/메인으로 연결한다. Result는 생존시간·Kill·Elite/Boss Kill·획득/총 재화를 표시한다. 저장 실패를 지급 성공으로 표시하지 않는다.

localStorage key는 **`horde-defense:meta:v1`**, JSON은 `kind: "horde-meta"`, `version: 1`이다.

| 필드 | 내용 |
| --- | --- |
| `account` | 공유 Gold·Credits·Reroll Level |
| `characters.marine.research` | Marine별 연구 ID→Level |
| `progress` | 자연 종료 `completedRuns`, `stage1Cleared`, `stage1ClearCount` |
| `activeRunId` | 현재 Run의 지급 자격 |
| `lastSettlement` | 마지막 정산 Run ID·Reward 영수증 |

없는 알려진 필드는 default로 채우고 버전/종류·숫자·연구 ID/MAX를 검증한다. 잘못된 저장을 자동 초기화하지 않는다. Export/Import·확인 후 Reset은 Hub에 있으며 Balance JSON과 분리한다. Import는 진행 데이터를 교체하되 활성 Run/영수증은 비워 재사용하지 않는다. 개발 Balance Reset과 Meta Reset은 서로의 namespace를 변경하지 않는다.

자연 실패/공성 거인 Clear만 정산한다. 같은 Run 재정산은 같은 영수증을 돌려주며 재화/완료 수를 다시 더하지 않는다. 수동 Restart·브라우저 종료·Scene 강제 종료는 지급하지 않는다. 새 출격은 이전 미완료 Run을 대체한다. 영구 저장은 브라우저 로컬이며 Backend/클라우드 동기화는 없다.

## 보상 첫 공식

`m = min(Stage elapsedMs / 60000, 20)`을 사용한다. 개발 X2/X4를 별도 보상 배율로 곱하지 않는다.

```text
Gold = 100 + floor(25m) + min(100, floor(Kill × .02))
       + min(100, EliteKill × 10) + Clear 보너스 400
Credits = floor(m / 2) + min(5, EliteKill) + Clear 보너스 20
```

Clear 보너스는 Clear일 때만 더한다. 실패에도 기본 Gold와 생존/처치 기여를 지급한다. Kill/Elite/시간 기여는 상한이 있고 공식은 `data/meta.ts`에 둔다. 목표 경제 범위를 맞추기 위한 자동 Simulation은 하지 않는다.

## 연구·비용·적용 순서

11종을 기본무기/특수무기/방어/성장으로 분류한다. **20단계:** 기본화력·기본속도·특수피해·성벽HP. **10단계:** 치명확률·치명피해·특수주기·정예Boss피해·성벽피해감소·XP. **5단계:** 사거리. 돌파는 일반 증가량 대신 지정 증가량을 적용하며 상세 Level 효과/비용 표는 [GDD §3.13](design/GAME_GDD_v0.15.md#313-m11-meta--prototype-효과비용보상)을 따른다.

MAX Modifier는 순서대로 기본피해 ×4.25·기본 Rate ×2.7·특수피해 ×4.25·성벽HP ×4.5·치명확률 +.4·기존 치명배율 +2.1·특수 Cycle ×.4·정예Boss 피해 ×3.1·성벽 피격 ×.55·XP ×2.3·기본 Range coverage ×1.6이다. 이는 다음 Run 연구 효과이며 코드 기본값을 수정하지 않는다.

기본 비용 20개는 `120/180/260/380/650/850/1100/1400/1800/3000/4000/5000/6500/8000/12000/16000/21000/27000/35000/60000`이다. 기본화력/속도/특수피해/성벽HP 배율은 `1/1.25/1.2/1.1`. 10단계 연구는 첫 10개 기본 비용에 치명확률3·치명피해3·특수주기3.5·정예Boss3.5·성벽방어3·XP3을 곱해 반올림한다. 사거리는 `2000/5000/12000/30000/80000`이다.

출격 시 readonly Meta Snapshot을 만들고 Base/Runtime Balance·Meta·Run Growth·Temporary/Relic을 합성한다. 기본 속도는 Cycle을 Rate로 나누며 기존 Burst/Recovery 최저치를 유지한다. 특수 Cycle도 최소값과 미사일 Salvo 대기 한도를 유지한다. Crit은 확률 최대1·기존 배율에 보너스 추가. Range는 기본 coverage .45×1.6=.72→minProgress .28 이후 기존 Run 개선을 적용한다. 정예/Boss 피해는 direct/관통/도탄/폭발·Special·Ultimate에 대상별 1회, 미사일 예약에도 동일하게 반영한다. Ultimate는 기본/특수피해 연구 배율을 받지 않는다. Wall HP/피격/XP는 Scene 적용 지점에서 합성한다.

## Reroll과 개발 도구

Credits Reroll I/II/III는 **50/150/400 추가 비용**으로 순차 구매한다. 새 Run 시작 시 0~3회를 Snapshot하며 일반 Offer의 `[새로고침 N]`만 소비한다. XP/Level/선택권 추가 지급·Reroll 대성공·직전 카드 강제 제외·원하는 카드 보장은 없다. Tree/Branch/Transcendence/Overclock/Relic/Core 선택에서는 사용하지 않는다.

`/dev` **메타 진행**은 현재 Gold/Credits·연구/Reroll Level, Gold +1000, Credits +100, 확인 후 Meta Reset을 제공한다. DEV 지급은 Production에서 막는다. Save 변경은 다음 출격부터 적용하고 현재 Run Snapshot을 다시 만들지 않는다. M11에서는 기능 확인을 위해 연구 전체를 노출한다. 작전 기록·숙련·실제 점진 해금은 M12이며 자동 착수하지 않는다.

## 최소 확인 / 남은 일

**M11 통합 `npm.cmd run check`: 59파일/416테스트·TypeScript·Vite production build 통과.** 기존 Phaser500kB 초과 chunk 경고는 유지한다. Save/default/지속/JSON/reset·실패/Clear 정산 1회·수동 재시작 무보상·구매/MAX/잔액·연구 효과·Reroll 경계·Hub/Result 왕복·DEV 차단을 자동 테스트로 확인했다. HTTP LAN에서도 사용할 수 있도록 Run ID는 secure-context 전용 randomUUID 대신 getRandomValues를 사용한다.

브라우저는 기존 사용자 설정과 분리한 `127.0.0.1:5173`에서 Meta Hub, DEV Gold+1000/Credits+100, 화력 Lv1/Reroll I 구매, 새로고침 후 Gold880/Credits50 유지, 출격 후 전장 렌더를 확인했다. 임시 탭은 닫았고 기존 `localhost`의 사용자 Balance Override는 보존했다. 브라우저의 전체 자연 종료 Run은 수행하지 않았으며 해당 정산/왕복은 실제 Scene 로직과 UI lifecycle 자동 테스트 범위다. 실제 모바일 화면·경제 체감은 사용자 확인이 필요하다.

Prototype 한계: localStorage는 한 계정의 활성 게임 탭 하나를 전제로 한다. 다른 탭에서 새 출격하면 이전 Run은 정산 자격을 잃는다. 동시 다중 Run/다중 탭 거래는 지원하지 않는다. 저장 오류는 Result에서 재시도하거나 보상 포기를 확인한 뒤 Hub로 돌아갈 수 있다.

100 Run 경제 분석·평균 MAX까지 시간·자동 경제 적절성 판단·최종 Level·장시간 Balance Simulation은 하지 않는다. 경제와 성장 체감은 사용자 직접 Playtest 항목이다.
