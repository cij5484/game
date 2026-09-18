# Prototype M5 Implementation Plan

Goal: 수류탄/미사일/드론의 전체 성장 골격, 기존 HUD 통합, 개발 배속과 spawn 시 Level HP tuning을 한 Milestone에서 구현한다.

Architecture: SpecialProgression은 특별 선택과 남은 Level을 보존하고 MarineProgression의 기존 일반 카드 Pool에 보유 무기만 추가한다. SpecialWeapons는 logical 좌표의 bounded projectile/drone 상태와 효과 이벤트를 계산하고 Scene의 기존 Kill/XP 경로에 합류한다. Game Speed는 Scene.update 입구의 delta만 변경한다. 사용자 상세 명세가 실행 승인이다.

- [x] M4 PR/main merge와 새 M5 branch.
- [x] Growth agent: data/specialWeapons, progression/specialProgression 및 marineProgression, focused tests.
- [x] Runtime agent: combat/specialWeapons, data/specialWeaponBalance, focused tests. 공간/위험 표적/지속 유닛 차별화.
- [x] Speed/HP agent: 기존 enemyScaling/enemyFactory, PauseView, focused tests. Scene integration은 메인.
- [x] Main: Scene 순차 선택/전투 업데이트, 기존 카드·Loadout·상세·결과, primitive rendering.
- [x] 기존20분 자동 밸런스 시뮬레이션을 짧은 correctness 검증으로 대체. npm run check, 브라우저 최소 기능 확인.
- [x] GDDv0.8 보존→v0.9, M5 기록, README/HANDOFF. commit/push만, M5 merge/다음 Milestone 금지.

배속은 입력/UI 시계에 적용하지 않고 gameplay delta 한 곳만 소유한다. HP는 생성 시 Character Level로 고정하며 기존 적을 소급 변경하지 않는다. M4 Horde와 M3 speed1.5배 유지. 자동 밸런스 결론/장시간 생존/DPS/최종Level 분석 금지.
