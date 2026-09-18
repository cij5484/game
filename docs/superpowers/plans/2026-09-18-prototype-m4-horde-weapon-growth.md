# Prototype M4 Implementation Plan

Goal: M3 화면/사거리/속도를 유지하면서 물량과 Marine Run 성장의 전투 체감을 강화한다.

Architecture: 기존 SpawnDirector와 primaryAttack/Gauss clock을 확장한다. Marine 전용 성장 데이터/후보 상태는 Legacy Mage/분기 자산과 분리하고, 기존 LevelUpView/BuildBar/Pause를 재사용한다. 사용자 명세가 설계/실행 승인이며 별도 main merge는 하지 않는다.

- [x] Director: phase별 공급량/cap 및 lane 분산을 튜닝하고 seed 비교 테스트.
- [x] 성장: 레벨/quality/전설을 분리. 3공용+6개조+사거리 후보, 희귀도, 가중치, 대성공과 무효 후보 테스트.
- [x] 전투: 시간차 점사 clock, 6개조 자연 조합, 사거리와 snapshot 연결. 실제 Scene Pause/Stim/V/보상 보존.
- [x] UI: 기존 카드·Header·Gauss 배지·상세·결과 화면 연결. 대성공 짧은 피드백.
- [x] 검증: 핵심 Red/Green, npm run check, 실제 Scene20분 가속 측정, 브라우저.
- [x] 문서: v0.7 보존→v0.8 작성, M4 기록·README·HANDOFF. 단일 coherent commit/push 후 STOP.

담당 파일 경계: Director agent는 data/horde + waves/spawnDirector + 해당 tests, growth agent는 신규 marineGrowth/marineProgression/tests, clock agent는 gaussRifle + GaussRifleConfig + 해당 tests. 메인은 Scene/primaryAttack/UI/docs와 통합을 맡는다.

추가 사용자 피드백: 최초 M4 물량의약2.5배(초기80/cap700)를 반영. 전체37파일265테스트와build통과. 후반실기기렌더링은사용자검증항목.
