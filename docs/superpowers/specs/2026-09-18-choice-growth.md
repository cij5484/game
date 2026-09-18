권장 추론 수준: High

현재 Prototype의 전투 입력과 성장 구조를
"항목 수 확대"가 아니라 "정해진 항목 안의 선택형 성장" 중심으로 재설계한다.

중요:
- 현재 branch `codex/milestone-12-combat-depth`에서 계속 작업한다.
- 현재 HEAD / git status를 먼저 확인한다.
- 사용자가 로컬에서 별도로 수정한 내용이 있다면 절대 reset / hard reset / checkout으로 덮어쓰지 않는다.
- 현재 HEAD 위에 통합한다.
- main에 merge하지 않는다.
- 다음 Milestone을 시작하지 않는다.

현재 기준 최신 설계 철학:

"새로운 시스템과 항목을 계속 추가하지 않는다.
정해진 핵심 시스템 안에서 업그레이드 시 선택지가 생기게 한다."

즉:

항목 수 증가 ↓
항목 내부 Build Branch ↑

가 이번 패스의 핵심이다.

────────────────────
1. Reference-Driven Design
────────────────────

구현 전 다음 성공작의 성장/전투 구조를 다시 조사한다.

- Deep Rock Galactic: Survivor
- 20 Minutes Till Dawn
- HoloCure
- Brotato
- Vampire Survivors
- Soulstone Survivors

특히 확인:

- 무기 레벨 중간에 행동 변화 선택을 주는 방식
- Overclock / Awakening / Evolution의 선택 시점
- 자동공격 + 수동 우선 타겟 구조
- 스킬/액티브 능력의 성장 분기
- 시너지 완성 순간을 어떻게 보상하는지
- 반복 +수치 업그레이드를 어떻게 줄이는지

특정 게임을 그대로 복제하지 않는다.

우리 게임에 맞는 원칙만 가져온다.

조사 결과는 기존 Reference 문서에 간단히 추가한다.

────────────────────
2. 기본 공격 → 자동 공격
────────────────────

현재:
Tap → 3점사

구조를 제거한다.

새 구조:

기본 공격은 자동.

- 캐릭터가 무기 Fire Rate에 맞춰 지속적으로 공격
- Smart Auto Target 사용
- 연타 입력으로 DPS가 변하는 구조 제거

입력:

적 Tap
→ 집중 공격 대상 지정

빈 전장 Tap
→ 수동 집중 대상 해제
→ Smart Auto Target 복귀

집중 대상이 죽으면:
→ 자동으로 Smart Target 복귀

중요:
표식탄처럼 수동 타겟을 강요하는 특성은 이번에 제거하므로
수동 타겟은 "위험 적 우선 제거"를 위한 전략 입력으로 사용한다.

향후:
Bomber / Siege / Buffer / Elite 등 위험 적을 직접 찍는 재미를 만든다.

────────────────────
3. Weapon Trait Pool 축소
────────────────────

현재 9종에서 아래 4종 제거:

- 소이탄
- 표식탄
- 제압탄
- 과열

이유:

소이탄:
행동 변화가 약하고 향후 화염방사 계열은
별도 Firebat 캐릭터 정체성으로 사용하는 것이 더 적합.

표식탄:
자동공격 전환 이후 집중 Target 시스템과 기능이 겹치고
화면 변화가 약함.

제압탄:
Frost의 군중제어와 역할이 겹침.

과열:
관리 부담이 재미보다 강하며
자동공격 구조와도 궁합이 좋지 않음.

과거 ID / 효과 / 시너지 / UI / 테스트에서
dead data가 남지 않게 정리한다.

────────────────────
4. 최종 Marine Weapon Trait
────────────────────

현재 Marine Weapon Trait은 우선 5종으로 고정:

1. 관통
2. 도탄
3. 다중탄
4. 폭발탄
5. 처형탄

억지로 개수를 채우지 않는다.

새로운 Trait은
정말 다른 플레이 경험을 제공하는 아이디어가 생길 때만 추가한다.

Trait Limit:

기본 3종
전술 확장 코어 획득 시 4종

유지.

────────────────────
5. Weapon Trait 성장 방식 변경
────────────────────

각 Trait은 Lv1~5를 유지한다.

하지만 직선 성장 대신:

Lv1:
핵심 기능 획득

Lv2:
기본 성능 강화

Lv3:
A/B 분기 선택

Lv4:
선택한 분기 강화

Lv5:
선택한 분기의 Capstone

방식으로 변경한다.

중요:

Lv3에서 한 방향을 선택하면
같은 Run에서 반대 방향은 선택할 수 없다.

즉:
한 Trait 안에서도 Run마다 다른 Build가 생긴다.

────────────────────
6. 관통 분기 예시
────────────────────

Lv1:
관통 활성

Lv2:
관통 수 / 피해 유지 개선

Lv3 선택:

A. 직선 관통
- 관통 수와 피해 유지 집중
- Horde 한 줄 제거

B. 파쇄 관통
- 관통 횟수는 적지만
- 관통 지점 또는 마지막 적중에 충격파

Lv4:
선택 Branch 강화

Lv5:

A → 무손실 관통 / 깊은 직선 학살

B → 대형 파쇄 충격파 / 방패 대응

정확한 수치는 data-driven.

────────────────────
7. 도탄 분기 예시
────────────────────

Lv3 선택:

A. 연쇄 도탄
- 횟수
- 탐색 거리
- Horde 전체 확산

B. 강타 도탄
- 횟수는 적지만
- 도탄할수록 피해 증가
- 위험 적/Elite 대응

Lv5에서 두 형태가 확실히 다르게 보이게 한다.

────────────────────
8. 다중탄 분기 예시
────────────────────

Lv3 선택:

A. 광역 사격
- 탄 수 증가
- 넓은 각도
- 화면 커버

B. 집중 사격
- 탄 수는 적지만
- 좁은 각도로 집중
- 높은 개별 피해

Lv5:

A → 대형 Fan Barrage
B → 집중 Volley

처럼 실제 사격 형태가 달라져야 한다.

────────────────────
9. 폭발탄 분기
────────────────────

Lv3 선택:

A. 연쇄 폭발
- 폭발 처치 → 추가 폭발
- Horde 연쇄 제거

B. 압축 탄두
- 연쇄는 적거나 없음
- 큰 반경 / 큰 피해

Lv5:

A → Domino Explosion

B → Massive Detonation

플레이어 UI에는 자연스러운 한국어 이름 사용.

────────────────────
10. 처형탄 분기
────────────────────

Lv3 선택:

A. 사형 집행
- 처형 HP threshold 강화
- Elite / Shield 마무리

B. 죽음의 파동
- threshold는 낮게 유지
- 처형 성공 시 주변 적에게 강한 파동/피해

Lv5에서:
단일 강적 마무리 vs Horde 연쇄 처형
성격이 확실히 갈리게 한다.

────────────────────
11. 기본 강화
────────────────────

기본 강화는 현재 3종 유지:

- 공격력
- 공격속도
- 치명타 확률

더 이상 종류를 늘리지 않는다.

각각 안정적인 기본 성장 역할.

치명타 피해 배율은
사용자가 현재 조정한 최신 값 유지.

기본 강화는 Trait Slot 사용하지 않는다.

────────────────────
12. Magic 사용 입력
────────────────────

마법은 두 가지 입력 모두 허용한다.

서리장:
- ○ Gesture
- 또는 하단 서리장 아이콘 Tap

연쇄 번개:
- Z Gesture
- 또는 하단 번개 아이콘 Tap

두 방식:
- 완전히 같은 성능
- 같은 Cooldown
- Gesture에 별도 보너스 없음

Gesture:
빠르고 익숙한 숙련 입력

Icon:
확실한 fallback 입력

으로 정의한다.

마법 HUD 아이콘은 이제 실제 버튼이다.

Touch hit area는 충분히 크게 한다.

────────────────────
13. 보조 기술 입력
────────────────────

Marine 스팀팩:

기존:
- 두 손가락 Tap
- PC 보조 입력

유지.

추가:
- 하단 스팀팩 아이콘 Tap

동일한 스팀팩을 발동한다.

세 입력 방식에 성능 차이 없음.

────────────────────
14. Magic Upgrade 대수술
────────────────────

현재의 반복 수치형 카드들을 크게 정리한다.

삭제/통합 후보:

- 서리 강도 +몇% 반복
- 지속시간 +0.8초 반복
- 번개 대상 +2 반복
- 번개 연결거리 +40 반복
- 비슷한 작은 수치 성장

마법은 각각
적은 수의 강력한 성장 선택지를 갖는다.

────────────────────
15. Frost Branch
────────────────────

서리장은 크게 2방향.

A. 전장 제어
- 더 강한 Slow
- 더 긴 지속
- 새 Spawn 적도 강력하게 제어

최종 예:
화이트아웃
→ 일정 시간 전장 전체 극한 제어

B. 파쇄
- Frost 상태 적이 Primary에 더 취약
- Frost 상태 적 처치 시 냉기 파열

최종 예:
절대 파쇄
→ 연쇄 냉기 폭발

중요:
작은 수치 카드 여러 장보다
행동 변화가 확실한 카드 몇 장을 우선.

────────────────────
16. Chain Lightning Branch
────────────────────

A. 연쇄
- 더 많은 적
- 처치 시 재연쇄
- Horde 제거

최종:
대규모 Chain Cascade

B. 낙뢰
- 대상 수는 상대적으로 적음
- 높은 피해
- Elite / 위험 적 우선
- 추가 낙뢰

최종:
천둥 폭풍
→ 사용 후 짧은 시간 추가 낙뢰 발생

연결거리 +40 같은
체감 약한 반복 카드는 제거/통합한다.

────────────────────
17. Magic Upgrade 수
────────────────────

각 Magic에
작은 Upgrade 10개씩 만들지 않는다.

원칙:

기본 강화 1~2개
+
Branch 선택
+
Branch 강화
+
Capstone

정도의 압축된 구조를 목표.

"마법 업그레이드를 먹으면 확실히 달라진다"
가 핵심.

────────────────────
18. 스팀팩 Upgrade 대수술
────────────────────

현재:

- 지속 +0.5초
- 공격속도 +0.1
- Recovery -0.2초

반복 구조를 제거/통합한다.

스팀팩도 운용 방식 선택으로 변경.

예시 Branch:

A. 고농도 투약
- 공격속도/화력 크게 상승
- 대신 Crash 또는 Recovery 부담 증가

B. 안정 투약
- Boost는 조금 약함
- Crash / Recovery 감소
- 자주 안정적으로 사용

C. 재투약
- Boost 중 한 번 추가 사용 가능
- Boost 연장/강화
- 대신 종료 후 강한 후유증

3방향이 과하면
A/B 두 Branch만 우선 구현해도 된다.

중요:
보조 기술 강화 카드가
단순 +숫자 카드처럼 느껴지지 않게 한다.

Crash 1초라는 현재 핵심 기준은
Branch가 명시적으로 변경하지 않는 이상 유지한다.

────────────────────
19. 필살기 Rhythm System 제거
────────────────────

기존:

Gauge 100%
→ Burst 버튼
→ Slow Motion
→ 3초 Rhythm
→ 5회 타이밍
→ 점수 기반 Ultimate

전부 제거한다.

관련:
- rhythm state
- PERFECT / GOOD / MISS
- beat timing
- grade scaling
- 불필요 UI
- 테스트

정리.

────────────────────
20. Character Ultimate Gesture
────────────────────

새 필살기 구조:

Gauge 충전
→ 100%
→ 준비 완료
→ 캐릭터 고유 Ultimate Gesture 입력
→ 즉시 필살기 발동

Marine은 Prototype용
고유 Gesture 하나를 설계한다.

조건:

- 일반 Magic Gesture와 쉽게 구분
- 한 손가락으로 그릴 수 있음
- 너무 복잡하지 않음
- 실제 모바일에서 재현성이 높음

구현 전에 후보 Gesture 몇 개를 검토하고
Circle / Z와 인식 충돌이 가장 적은 형태를 선택한다.

Ultimate Gesture recognizer는:

Gauge < 100%
→ OFF

Gauge = 100%
→ ON

준비되지 않았을 때
Ultimate Gesture를 그려도
오발동하지 않는다.

────────────────────
21. Ultimate HUD
────────────────────

하단 필살기 아이콘:

- 원형 Gauge
- Gauge 100% → 강한 READY 표현
- 발광 / Pulse 가능

Tap 행동:

필살기 즉발 X

Tap:
→ 작은 Gesture Hint 표시

예:
Marine Ultimate Gesture의 경로 안내

실제 Ultimate 발동:
→ Gesture

────────────────────
22. Ultimate 효과
────────────────────

Marine 필살기는
현재 Suppressive Barrage 계열 정체성 유지 가능.

단:
Rhythm 점수에 따른
24~60 targets / damage scaling은 제거한다.

Gauge를 어렵게 채우는 만큼
발동하면 항상 강력해야 한다.

정확한 target/damage는
prototype tuning으로 재조정.

Run당 대략 1~2회 수준의 희귀 이벤트 철학 유지.

────────────────────
23. Synergy 구조 재정리
────────────────────

현재 12 Synergy 중
삭제 Trait에 의존하는 것은 제거/대체한다.

특히:
- 소이탄
- 표식탄
- 제압탄
- 과열

조건을 사용하는 Synergy는 정리.

남아 있는 Trait / Magic / Basic Upgrade 기준으로
자연스러운 Synergy만 보존한다.

모든 조합에 억지로 Synergy를 넣지 않는다.

────────────────────
24. Synergy 활성 방식
────────────────────

현재:
조건 충족 → 즉시 자동 활성

방식을 개선한다.

Prototype에서는:

조건 충족
→ Synergy "해금 상태"
→ 다음 Level-Up 또는 적절한 특별 선택에서
   Synergy 카드가 후보로 등장 가능
→ 선택
→ 활성화

방식을 우선 검토/구현한다.

Synergy Card:
- Trait Slot 사용 안 함
- 희귀 일반 카드와 시각적으로 구분
- "조합을 완성했다"는 순간 제공

예:

관통 + 폭발탄 충족
→ 다음 선택에서
[시너지]
심층 폭발

등장.

단:
RNG 때문에 조건을 만족해도 Run 끝날 때까지
절대 안 나오는 것은 피한다.

Soft guarantee 또는 높은 후보 우선권을 둔다.

목표:
조용히 뒤에서 ON 되는 것보다
플레이어가 Build 완성 순간을 느끼게 한다.

────────────────────
25. Relic
────────────────────

이번 패스에서는
새 Relic 종류를 더 추가하지 않는다.

현재 8종 유지.

다만 점검:

- 하나의 Relic에 너무 많은 unrelated effect가 들어갔는지
- 핵심 Trigger + Payoff가 바로 이해되는지
- 행동 변화가 눈에 보이는지

필요하면 단순화.

새 콘텐츠 추가 금지.

────────────────────
26. Core 정리
────────────────────

현재 Core를 다시 검토.

유지 우선:
- 전술 확장 코어: Trait 3 → 4
- 유물 확장 코어
- 공명 코어: Synergy 강화

유물 확장 코어 개선:
단순 슬롯 +1만 하지 말고
획득 즉시 유물 선택 1회도 제공하는 방향 검토.

재설계 후보:

행운 코어
→ 삭제 또는 교체

추천:
"선택 확장 코어"
→ Level-Up 후보 3장 → 4장

과부하 코어
→ 단순 모든 Trait +1 대신
Run 규칙을 바꾸는 효과로 재설계.

후보:
- 일정 조건에서 두 카드 선택
또는
- Trait 하나의 Lv5 이후 특별 Capstone 허용

과도하게 복잡하면 이번에는
선택 확장 코어 교체까지만 구현.

────────────────────
27. HUD / Input consistency
────────────────────

하단 성벽 HUD는
실제 전투 조작 패널 역할도 담당.

표시:

- Wall HP
- Level / XP
- 스팀팩
- 서리장
- 연쇄 번개
- 필살기

각 능력:
- 아이콘
- 원형 진행
- 준비 상태

마법/스팀팩:
아이콘 Tap 가능.

Ultimate:
Tap = Gesture Hint
Gesture = 발동.

전투 화면은 여전히
텍스트 과밀을 피한다.

────────────────────
28. 용어
────────────────────

플레이어 UI 용어 유지:

강화 카드 = Level-Up 선택지 전체

기본 강화
무기 특성
특성 개조
마법 강화
보조 기술 강화
유물
코어
시너지
진화
비밀 진화
필살기

"특성 슬롯"은
오직 무기 특성만 사용.

────────────────────
29. GDD 업데이트
────────────────────

GDD v0.2를 최신 Source of Truth로 갱신.

반영:

- 자동 공격
- 집중 타겟
- 최종 Marine Trait 5종
- Trait Lv3/Lv5 Branch
- Magic Icon fallback
- 스팀팩 Icon fallback
- Magic Branch 성장
- 스팀팩 Branch 성장
- Rhythm Burst 삭제
- Character Ultimate Gesture
- Synergy 특별 선택 방식
- Core 정리
- 향후 Firebat 화염방사 캐릭터 후보

중요:
현재 사용자 로컬에서 조정한 Horde/Enemy 숫자를
과거 값으로 덮어쓰지 않는다.

────────────────────
30. 병렬 작업
────────────────────

sub-agent 적극 활용.

Agent A:
자동공격 / Targeting / Input

Agent B:
Weapon Trait Branch 구조

Agent C:
Magic + 스팀팩 Branch 성장

Agent D:
Ultimate Gesture / Rhythm 제거

Agent E:
Synergy / Core migration + GDD

메인 Agent:
통합
HUD
충돌 정리
최종 검증

동일 파일 병렬 수정 피하기.

────────────────────
31. 최소 검증
────────────────────

필수:

자동 공격:
- 입력 없이 공격
- 적 Tap 집중타겟
- 빈 Tap 해제
- 집중 대상 사망 후 자동복귀

Trait:
- 최종 5종만 후보
- 기본 3 / Core 4
- Lv3 Branch 선택
- 반대 Branch 차단
- Lv5 Capstone

Magic:
- Gesture / Icon 동일 발동
- Cooldown 공유
- Branch 효과

스팀팩:
- 두 손가락 / Icon 동일 발동
- Branch 효과

Ultimate:
- Rhythm 완전 제거
- Gauge 미충전 시 Ultimate Gesture 무효
- READY일 때만 Gesture 발동
- Icon Tap은 Hint만 표시

Synergy:
- 삭제 Trait Recipe 제거
- 조건 충족 후 특별 후보 등장
- 선택 후 활성화
- Trait Slot 미사용

필수:
- tests
- TypeScript
- production build

실제 재미/밸런스는 사용자 Playtest.

────────────────────
32. 완료 보고
────────────────────

완료 후 commit/push하고 보고:

1. 시작 HEAD / 보존한 사용자 변경
2. 참고 게임에서 수용한 핵심 원칙
3. 자동공격 / 집중타겟 구현
4. 최종 Marine Trait 5종
5. 각 Trait Lv3 Branch A/B
6. 각 Trait Lv5 Capstone
7. 삭제한 기존 Trait / 데이터
8. Frost 성장 구조
9. Chain Lightning 성장 구조
10. 스팀팩 Branch
11. Gesture / Icon 입력 방식
12. Ultimate Gesture 선택 이유
13. Rhythm Burst 제거 범위
14. 남은 Synergy 전체 목록
15. Synergy 획득 방식
16. Core 변경
17. GDD 업데이트
18. tests / TypeScript / build
19. commit hash
20. 사용자가 직접 테스트할 항목
21. 발견된 밸런스/성능/UX 위험

작업 후:
- main merge 금지
- 다음 Milestone 금지
- 사용자 Playtest 대기