# Prototype M1 — Combat Foundation

GDD v0.6를 main에 반영한 PR #15 이후의 제한된 구현 패스다. 전체 Stage 1 Prototype 완성이 아니다.

## 적용한 Prototype Tuning

| 항목 | 첫값 |
| --- | --- |
| Marine 기본무기 진입 경계 | `marineConfig.primaryMinProgress01 = 0.55` |
| Gauss 발사 주기 | 800ms, 자동 단발 |
| Gauss 기본 피해 | 10 |
| Grunt 기본 HP | 8 |

사거리는 spawn=0 / Wall=1의 논리 progress 기준으로 Wall 쪽 45% 구간이다. 세 Lane에 동일한 경계를 적용하며 원형 pixel 거리나 sprite scale을 사용하지 않는다. 횡방향 거리 모델을 새로 만들지 않았다. 수치는 플레이테스트 후 변경 가능하다.

Auto Target은 사거리 안에서 기존 ‘Wall에 가장 가까운 살아있는 적’ 우선순위를 유지한다. 사거리 밖 Focus는 유지하되 다른 적으로 자동 발사하지 않고 기다린다. 진입 후 발사 준비가 됐으면 다음 combat step에서 발사한다(현재 simulation step 최대16ms). 이미 발사한 탄의 cooldown은 Focus 변경으로 초기화하지 않는다. 죽거나 사라진 Focus는 해제하며 빈 전장 Tap은 Auto로 복귀한다.

준비된 무기는 타겟이 없을 때 readiness를 유지한다. 기존 다중탄 추가 조준과 복제 사격의 조준도 같은 경계를 사용한다. 관통·도탄·폭발 등 이미 시작된 공격의 기존 후속 효과 거리/전파 규칙은 이번에 재설계하지 않았다. 마법은 공유 타겟팅 함수의 기본 동작을 그대로 사용하므로 소총 Range에 제한되지 않는다.

피해를 올리지 않고 Grunt HP만 낮췄다. 기존 spawn-time HP scaling과 Elite 배율은 유지한다. 따라서 일반 Grunt는 기존 성장 범위에서 HP8~8.8이며 기본 피해10으로 처치된다. 기존 Grunt 기반 Elite도 파생 HP가32~35.2로 낮아진다. Elite 재설계는 하지 않았다. Runner/Shield 데이터는 변경하지 않았다.

## 보존 범위와 확인

이동·Soft Lane·progress01·perspective·Wall·XP·Card UI·Pause·Gesture·Stimpack·Spawn Director·Portrait layout·기존 VFX는 유지했다. 새 Asset이나 Range UI는 추가하지 않았다. 기존300초 Run 및 성장 시스템은 그대로라 느린 사격에 대한 후반 난이도는 아직 재조정하지 않았다.

사거리/Focus/단발/Grunt1-shot/추가 조준의 실패 테스트를 먼저 확인했다. `npm run check`: 34파일220테스트, TypeScript 및 production build 통과. 기존 bundle-size 경고는 남는다. 모바일 조작감과 체감 난이도는 실제 플레이 평가가 필요하며 이번 패스에서 실기 검증했다고 주장하지 않는다.

GDD 목표 설계 변경 없이 시험 수치와 구현 차이만 기록한다. 특수무기·새 성장·20분 Director·새 Enemy/Elite/Boss·Meta는 미구현 상태로 남긴다.
