# GAME GDD v0.15

**Current Source of Truth — M11 Meta Foundation / 영구 성장**

작성일: 2026-09-18. **목표 설계와 구현·검증 기록을 구분한다.**
기준: [GDD v0.14](GAME_GDD_v0.14.md) 전체 설계·Prototype 기본값·기술 요구·Future·역사 기록을 승계한다. v0.14 원본은 수정하지 않는다. M10 `4f34ee41053c210c0646864d82afb07f9b4f29a7`은 [PR25](https://github.com/cij5484/game/pull/25) / main `f6f831a51f38912b604b479d26f8a3c236986d84`로 병합했다. M11은 `codex/prototype-m11-meta-foundation`에서 **commit/push 후 정지**하며 main merge와 다음 Milestone 자동 시작은 하지 않는다.

M11의 최신 Meta 규칙은 **§1.26 / §2.11 / §3.13 / §5**, 실제 구현·검증은 [M11 기록](../prototype-m11-meta-foundation.md)을 따른다. 이전 문서의 Gold 연구·Gold/Credits 보상·Save·Reroll 미구현/Prototype 제외 문구는 M11 범위에서 대체한다. 작전 기록·숙련·실제 점진 해금은 M12로 남긴다. Stage 1 전투·M10 미사일·M9 성능 구조와 코드 기본 밸런스를 유지하며, Meta 효과를 다음 Run의 별도 Modifier로 합성한다. M10 이하 통과 숫자는 역사 기록이다.
다섯 영역을 구분한다: **확정 목표 설계 / Prototype Scope / Prototype Tuning / Future·Not in Prototype / Current Implementation Gap**. 후보·미정은 각 영역에 명시한다. 확정은 구현됐다는 뜻이 아니며, Prototype 수치는 최종 밸런스가 아니다. 후보의 이름이 있어도 상세 효과가 확정된 것은 아니다.


게임의 최우선 디자인 기준:

1. **압도적인 적의 물량 공세**
2. **대량의 적을 시원시원하게 쓸어버리는 전투 쾌감**
3. **강해져도 끝까지 유지되는 긴장감과 난이도**
4. **Run 내부와 Run 외부 모두에서 확실하게 체감되는 성장**

후반에는 수십 마리를 빠르게 제거해도 더 많은 적이 밀려온다. 위험 적·정예·Boss가 우선순위 판단을 요구하고, 강한 Build가 전장을 쓸어버리는 중에도 물량과 위험 조합이 성벽을 위협한다. 과도한 HP Sponge나 Character Level/Meta Power에 적 HP를 실시간 1:1 대응시키는 방식으로 Power Spike를 지우지 않는다.

현재 목적은 **Stage 1 하나를 완성하여 핵심 재미가 실제로 존재하는지 검증하는 Prototype**이다. 완성형 게임 전체를 만드는 단계가 아니다. 사용자와 확정한 설계는 구현 여부와 관계없이 기록하되, 기록됐다는 이유로 현재 구현 범위에 넣지 않는다.

Prototype은 물량 공세, 대량 제거 쾌감, 강해져도 유지되는 긴장, **한 Run 안의 체감 성장**을 검증한다. M11부터 Run 밖 보상·연구·다음 Run 성장의 첫 반복 Loop도 구현 범위다. 전체 장기 Meta·Stage 2+·신규 캐릭터·Challenge/Endless는 여전히 범위 밖이다. 구현 범위는 §2, 시험 수치는 §3, 보류 설계는 §4, 현재 코드와의 차이는 §5를 따른다.

## 1. 확정 목표 설계

### 1.1 철학과 레퍼런스

**Mobile Portrait Horde Defense Roguelite. “플레이어도 미쳐가고 몬스터도 같이 미쳐간다.”** 강한 빌드는 실제로 Horde를 쓸어버린다. 성장을 억제하거나 Grunt를 HP Sponge로 만들어 난이도를 유지하지 않는다. Horde 수, 적 조합, 위험 적·Elite, Pressure Wave, Threat Budget으로 압박한다.

Main Reference는 **Deep Rock Galactic: Survivor**와 **20 Minutes Till Dawn** 두 작품을 유지한다. 전자는 자동전투·무기 성장·희귀도·Overclock, 후자는 성장 분기·시너지·진화·매 Run 다른 빌드를 참고한다. 원작 수치나 콘텐츠·아트·UI를 복제하는 명세는 아니다. 다른 작품은 [Reference Notes](REFERENCE_UI_NOTES.md)의 보조 비교 자료다. **Hades는 Main Combat Reference가 아니다.** gradual unlock, Meta Progression, 반복 Run 동기, first clear 이후 Challenge, 역할별 영구 재화, 다양한 무기/능력 경험을 유도하는 장기 목표의 보조 참고로만 사용한다.

High-Variance를 유지한다. 원하는 카드·전설이 없거나 특수무기를 Lv20까지 키우지 못할 수 있다. 반대로 전설·대성공·유물·초월·Overclock이 함께 터지는 Run도 허용한다. 모든 Run의 파워를 평준화하거나 원하는 빌드를 보장하지 않는다. 무효·잠긴·효과 없는 카드를 제외하는 것은 운 보정이 아니다.

### 1.2 캐릭터, 기본 공격, 보조 기술

Marine의 관련 콘텐츠 해금 후 기본 Loadout은 가우스 소총 + 특수무기 기본 최대 2종 + **스팀팩** + 고유 Gesture 필살기를 가진다. 향후 Mage는 고유 기본 공격·마법·보조 기술·필살기를 갖는 방향이다. 모든 캐릭터 공통 Magic 2종 및 Magic Slot 1→2→3 영구 해금은 폐기한다.

Marine의 서리장·연쇄 번개는 향후 기본 Loadout에서 분리한다. 콘텐츠는 마법사 계열 재사용을 위해 보존한다. 코드·데이터·테스트를 보존하며 M2에서 Marine runtime 연결을 끊었다. 특수무기는 ‘보조무기’와 혼용하지 않으며 보조 기술은 스팀팩 같은 능력이다.

초기 가우스 소총은 **느린 단발 자동사격**이다. 한 발이 보이고 초기 Grunt를 한 발에 처치할 수 있게 피해·HP·거리·스폰을 함께 조율한다. 정식 수치는 미정이며 M1~M4의 초기 Prototype 주기는800ms다. 과거200ms를 목표로 고정하지 않는다. 적 Tap은 집중 Target, 빈 전장 Tap은 집중 해제·자동 타겟 복귀다. 집중 Target 지정도 기본무기 사거리 제한을 우회하지 않는다. Tap 연타가 공격속도를 높이지 않는다. 초기 점사는 강제하지 않고 개조로 획득한다.

스팀팩 성장·개조 방향은 유지한다. 필살기는 캐릭터 고유 Gesture로 발동하며 Rhythm Game을 복원하지 않는다. 현재 Marine V 입력과 목표 원칙은 부합하나 최종 효과·성장·Gesture Pool은 별도 설계한다.

### 1.2.1 Marine 사거리와 3층 성장

Marine은 **중거리 전투 캐릭터**다. 기본 소총은 전장 최상단까지 항상 공격하지 않으며 **적이 기본무기 사거리 안에 들어와야 자동사격**한다. 적 접근 압박·거리 판단·특수무기 활용 가치를 높이는 구조다. 캐릭터별 사거리는 정체성의 핵심 축이다. 짧은 거리의 근접/화염방사, 장거리 저격형, 별도 공격 범위의 Mage는 향후 방향 예시다.

사거리의 세 층을 분리한다:

1. 캐릭터 고유 기본 사거리.
2. Gold 영구 사거리 연구: Marine 기본무기 사거리의 영구 성장.
3. Run 내부 사거리 강화: 해당 Run의 기본무기 사거리를 크게 증가.

Run 사거리는 **기본무기 전용 특수 성장 카드**다. 공용 강화도 7번째 형태 개조도 아니며 기본 개조 6종은 유지한다. **일반 등급 없이 희귀/유니크/전설만**, 낮은 기본 등장 가중치, 제한된 성장 단계를 사용한다. 약 5단계는 Prototype 방향이다. 최대 단계·효과·확률과 희귀도 조건부 추첨 방식은 최종 수치가 아니다.

Gold 연구만으로 기본 Marine이 언제나 전장 끝까지 사격하지 않는다. Gold와 Run의 좋은 사거리 카드가 함께 맞은 특별한 Run에서는 거의 전장 전체에 가까운 초장거리 Marine도 허용한다. 사거리 판정은 논리 좌표 기준이며 visual scale/physical pixel과 혼합하지 않는다. 정확한 거리 모델과 수치는 미정이다.

### 1.3 특수무기 획득과 공통 성장

Marine의 전체 초기 목표 Pool은 **수류탄 / 유도 미사일 / 드론**, 해금 후 기본 한 Run 최대 **2종**이다. 첫 Run부터 모든 무기와 슬롯을 제공한다는 뜻은 아니다(§1.20). 각각 자동 운용하며 긴 마법 cooldown 대신 반복적인 공격 Cycle을 갖는다. 획득 직후 유효 표적이 있다면 첫 공격을 빠르게 보여준다. 완성된 특수무기가 기본무기보다 높은 DPS를 담당해도 정상이다.

- **Character Lv5/Lv10 고정 지급과 별도 획득 이벤트는 폐기한다.** Character Level은 등장 가능 조건만 연다.
- **첫 무기: Character Lv8 이상. 두 번째: 첫 무기 보유 + Character Lv14 이상.** 일반 Level-Up 3장 중 낮은 확률의 Special Weapon Acquisition Card로 제시하고, 선택하면 일반 성장 선택 1회를 소비한다.
- 무기별 weight를 합산하지 않는다. Acquisition Category를 먼저 추첨한 뒤 미보유 해금 무기 하나를 Random으로 표시한다. 한 Offer 최대1장, 획득 시 항상 Weapon Lv1이다.
- 획득 카드에는 Rarity/Great Success/품질 개방을 적용하지 않는다. 이후 보유 무기의 일반 Level 성장에는 기존 규칙을 유지한다.
- Hard Pity, 특정 Level 강제 지급, Boss 전 보장 없음. 특수무기 없이 Gauss 중심으로 진행하거나 한 무기만 얻는 Run도 허용한다. 기본 최대2종이며 무장 확장 Core가 있을 때만3종까지 가능하다.
- 특수무기 자체 Level은 Character Level과 별개다. 보유한 무기만 일반 강화 후보에 들어간다.

| 특수무기 Level | 공통 성장 규칙 |
| --- | --- |
| Lv1~2 | 기본 성장 |
| Lv3 | 계정에서 해금된 주요 트리를 전부 제시하여 1개 선택. 전체 해금 후에는 3개 전부 공개. 미선택 트리는 해당 Run에서 잠김 |
| Lv4~5 | 선택 트리 강화 |
| Lv6 | 선택 트리 내부 A/B 세부 분기 |
| Lv7~9 | 선택 방향 강화 |
| Lv10 | 1차 완성형 |
| Lv11~14 | 현재 방향의 숙련 성장 |
| Lv15 | 초월 개조: 큰 후보 Pool에서 서로 다른 랜덤 3개 → 1개 선택 |
| Lv20 | Overclock: **해당 무기 전용 초기 5종 Pool**에서 서로 다른 랜덤 3개 → 1개 선택 |
| Lv20 이후 | 성장 지속 가능 |

위 표의 랜덤 3후보는 충분한 콘텐츠가 해금된 상태의 규칙이다. 계정 잠금 후보는 제시하지 않는다. 초기 Overclock이 약 2종뿐인 경우 등 후보 부족 시 구체 UI/처리는 미정이며, 잠긴 후보를 채워 넣지 않는다.

각 무기 Overclock 전체 초기 목표 Pool은 **정확히 5종**이다. 처음부터 5종 전부 해금되는 것은 아니다. 겹치는 역할은 합치거나 제거하며 후보를 무작정 늘리지 않는다. 5종이라는 목표와 아래 명칭은 채택하되 상세 효과·수치·호환 조건은 미정이다. 큰 장점과 대가를 가질 수 있다. Lv15 초월 Pool은 최종 확정하지 않는다.

### 1.4 수류탄

**공간을 공격하고 적 무리를 처리·변형하는 무기.** 자동 Target은 가장 밀집된 적 지역 우선이다. 전술탄은 중력과 적 배치 변화 중심이다.

| Lv3 주요 트리 | Lv6 세부 분기 | Lv10 1차 완성형 |
| --- | --- | --- |
| 집속탄 | 확산형 | 융단 폭격 |
| 집속탄 | 중형 자탄형 | 다중 탄두 |
| 고폭탄 | 초대형 폭발형 | 초대형 고폭탄 |
| 고폭탄 | 공성형 | 벙커 버스터 |
| 전술탄 | 지속 중력장 | 특이점 |
| 전술탄 | 압축 폭발 | 중력 붕괴 |

Lv11~14는 자탄·투척·중력 등 선택 계열의 정체성을 강화한다. 단순 수치 반복만으로 끝내지 않되 불필요하게 복잡하게 만들지 않는다. Lv15는 무기 규칙 하나를 크게 비트는 개조다.

Lv20 Overclock 초기 5종:

1. 전술 핵탄두
2. 자동 유탄 난사 장치
3. 삼중 투척 시스템
4. 영구 연쇄 반응
5. 궤도 폭격 호출

### 1.5 유도 미사일

**위험한 ‘표적’을 판단하고 추적·사냥하는 무기. “어디를 폭발시키는가”가 아니라 “누구를 죽이는가.”** 수류탄과 폭발 범위 경쟁을 하지 않는다. 위험 적·Elite·집중 Target을 고려하되 세부 우선순위는 미정이다.

| Lv3 주요 트리 | Lv6 세부 분기 | Lv10 1차 완성형 |
| --- | --- | --- |
| 미사일 포화 | 전장 포화 | 미사일 스웜 |
| 미사일 포화 | 집중 포화 | 미사일 살보 |
| Hunter Killer | 처형자 | 킬 체인 |
| Hunter Killer | 약점 사냥꾼 | 전술 사냥꾼 |
| 특수 추적 | 연쇄 추적 | 연쇄 포식자 |
| 특수 추적 | 재유도 | 불사조 미사일 |

Lv11~14는 탐색·집중·재지정·추적 유지를 강화한다. Lv15는 추적·판단·표적 규칙을 바꾸며 수류탄식 광역 폭발 강화는 피한다.

Lv20 Overclock 초기 5종:

1. 사냥 본능 폭주
2. 전장 사냥망
3. 불멸 유도체
4. 처형 연쇄
5. 표적 삭제 명령

### 1.6 드론

**전장에 지속적으로 존재하며 독립적으로 공격·지원하는 화력 플랫폼.** 발사 후 사라지는 무기가 아니다. 내부 AI가 복잡해도 플레이어가 외워야 하는 설명은 단순하게 유지한다.

| Lv3 주요 트리 | Lv6 방향 | Lv10 완성형 방향 |
| --- | --- | --- |
| 드론 편대 | 분산 운용 | 전술 드론 네트워크 |
| 드론 편대 | 군집 운용 | Wolfpack |
| 중무장 Gunship | 기관포형 | Gatling Gunship |
| 중무장 Gunship | 중포형 | Siege Gunship |
| 호위 드론 | Marine 동기화 공격 | Mirror Fire 계열 |
| 호위 드론 | 지원/보조형 | Tactical Wingman 계열 |

성장 중 **적 원거리 투사체 요격 기능을 획득할 수 있어야 한다.** 모든 투사체를 무조건 차단하지 않고 처리량 한계를 두어 원거리 적을 무력화하지 않는다. 확률/처리량 요격, 범위·동시 처리량 증가, 상위 성장의 반격·일부 반사는 가능한 성장 방향이다. **정확한 트리 배치는 미정**이다. Lv11~14 숙련 및 Lv15 초월은 공통 규칙을 따르며 드론별 상세 효과는 미정이다.

Lv20 Overclock 초기 5종:

1. 무인 전투군
2. 전투 순양기
3. 완전 동기화
4. 자율 전투 AI
5. 요격 지휘체계

### 1.7 기본무기 형태 개조

초기 최종 후보는 아래 **6종**으로 정리한다. 기본 한도는 한 Run **서로 다른 3종 자유 조합**이다. 공용 강화·특수무기·보조 기술·마법은 이 슬롯을 소비하지 않는다.

| 개조 | 핵심 정체성 |
| --- | --- |
| 관통 | 직선으로 뒤의 적까지 뚫음 |
| 도탄 | 적 사이를 옆으로 튐 |
| 점사 | 한 공격 Cycle에서 여러 발 연속 발사 |
| 다중탄 | 여러 방향으로 동시에 발사 |
| 폭발탄 | 적중 지점의 작은 광역 피해 |
| 고위력 단발 | 느리지만 강력한 한 발 |

처형탄은 기본 6종에서 제외한다. 향후 전설·유물·시너지 후보로 재평가할 수 있다.

최초 획득 Lv1, 같은 개조 재획득 시 Level 증가, **Level 상한 없음**. Lv1~10 사이 행동을 단계적으로 강화하고 Lv10 전후 1차 완성, Lv11+ 숙련을 지속한다. 골고루 투자하거나 한 개조에 집중할 수 있다. 특수무기처럼 복잡한 Lv3/Lv6 선택 트리를 사용하지 않는다. 최종 성장표는 미정이다. M4의 실제 첫안 공식과 workload 상한은 §3.6 및 구현 기록에 분리한다.

다중탄+관통+폭발탄처럼 자연스럽게 함께 적용되는 조합을 모두 이름 붙은 Synergy로 만들지 않는다.

### 1.8 기본무기 전설 변형

Level과 Rarity는 독립이다. **[전설] 관통 Lv1**이 가능하고 낮은 레벨에도 등장할 수 있다. 전설은 해당 개조에 강한 행동 변화를 붙이며 **추가 개조 슬롯을 소비하지 않는다**. 새 개조 자체의 슬롯 사용과 전설 효과의 추가 슬롯 없음은 구분한다.

서로 다른 전설은 한 Run에서 중첩 가능하지만 **같은 전설 중복 획득은 금지**한다. Lv5 도달 보상이나 MAX 보상이 아니다. 장점과 대가가 있는 변형도 가능하다. 특수무기의 고정 Lv20 Overclock과는 별개다. 상세 변형 Pool·상호작용은 미정이다.

### 1.9 공용 강화

종류는 **공격력 / 공격속도·공격주기 / 치명타 확률** 3가지다. 레벨 상한 없이 반복 성장한다. 치명타 피해 배율을 별도 성장 카드로 추가하지 않으며 목표 배율 수치는 이번에 변경·확정하지 않는다.

적용 가능한 기본무기·특수무기 전체에 영향을 주되 무기별 coefficient를 둔다. 공격속도는 소총 발사 간격, 수류탄 투척 Cycle, 미사일 발사 Cycle, 드론 사격속도 등 의미 있는 항목에 적용한다. 모든 무기에 같은 수치를 기계적으로 적용하지 않는다. 무한 레벨이 0/음수 공격 간격이나 무의미한 확률을 허용하는 것은 아니다. 점감 효율·실용 한계와 지속적으로 유효한 성장 처리는 상세 설계한다.

### 1.10 일반 레벨업, 후보와 희귀도

일반 레벨업은 **기본 랜덤 3장 중 1장**이다. 전설 유물로 4장까지 확장할 수 있지만 기본 4장이 아니다.

Pool: 공용 강화, 기본무기 전용 사거리 성장, 신규 기본무기 개조, 보유 개조 강화, 조건을 만족한 **특수무기 획득**, **보유한** 특수무기 강화, 보조 기술 강화, 그 밖의 사용 가능한 성장 카드. 미보유 특수무기 강화, 슬롯이 찬 뒤의 새 개조, 잠긴 반대 분기, 이미 보유한 동일 전설, 효과 없는 카드, MAX/적용 불가 카드는 제외한다. 반복 공용·숙련 성장으로 유효한 선택지를 유지한다.

**카드 종류를 먼저 선택하고 일반 성장의 희귀도를 별도로 판정**한다. 특수무기 획득은 희귀도 판정 대상이 아니다. 종류는 강화의 역할, 희귀도는 가치·드묾, Level은 성장량이다. 희귀도는 일반 / 희귀 / 유니크 / 전설로 표시한다. 높은 Level이 자동으로 전설이 되지 않는다. 희귀도별 정확한 효과는 무기·능력에 맞게 설계한다.

신규 Basic Modification Acquisition과 Owned Basic Modification Growth는 각각 하나의 Category다. 먼저 Category를 추첨하고 내부 유효 개조 하나를 선택한다. 한 Offer에서 두 Category를 합쳐 개조 관련 최대1장만 제시한다. Range는 별도 카드라 이 제한에 포함하지 않는다. 개조3종이 차면 신규 Category를 제외하고 개조 확장 Core로4슬롯이 열리면 다시 허용한다. 공용 공격력/공격속도/치명타 카드가 일반 Pool의 기본 뼈대다.

이미 투자한 방향은 조금 더 잘 등장할 수 있다. 기본 개조 성장 내부 후보의 Investment Bias만 최대×1.4로 완화하고 특수무기 등 다른 성장의 기존 최대×2는 유지한다. 구조는 `base weight × investment bonus`이며 보장이 아니다. **투자 가중치는 희귀도 확률을 바꾸지 않는다.** 강제 pity, N회 실패 후 보장, 고정 완성 순서는 두지 않는다. 시너지는 별도 카드를 뽑지 않고 조건 완성 시 자동 활성화한다. 현재 코드의 해금 시너지 한 자리 보장은 폐기 대상이다.

### 1.11 대성공과 선택 Queue

일반적인 **레벨 증가 카드 선택 후** 낮은 확률로 대성공하여 총 **+2 Level**을 얻는다. 희귀도와 별도 판정이며 일반·전설 모두 가능하다. 최초 기본무기 개조 획득/강화, 공용 강화, 특수무기의 일반 레벨 강화, 보조 기술의 일반 성장 카드에 적용한다.

Special Weapon Acquisition Card와 Core의 무기 획득, Lv3/6 분기 선택 자체, Lv15 초월 선택 자체, Lv20 Overclock 선택 자체, 유물, 코어에는 적용하지 않는다.

중간 마일스톤을 건너뛰지 않는다:

- 특수무기 Lv14에서 +2: **Lv15 → 초월 선택 → 남은 +1 → Lv16**.
- Lv19에서 +2: **Lv20 → Overclock 선택 → 남은 +1 → Lv21**.

일반 레벨업·무기 획득·분기·초월·Overclock·유물은 **같은 Card Selection UI 문법**을 사용하며 제목·내용·후보 수가 다르다. 획득은 일반3장 안에 미보유 무기1종을 표시하며 별도 Lv5/10 선택창은 없다. 무기 Lv3은 모든 3트리, Lv6은 A/B, Lv15는 랜덤 3개, Lv20은 5종 중 랜덤 3개다. 점진 해금 상태에서는 유효한 해금 후보만 사용한다. **코어는 선택 UI의 예외로 랜덤 1개 즉시 지급**하며, 시너지도 카드 선택 없이 자동 활성화한다.

동시에 발생한 선택은 **Queue로 순차 처리**하여 누락·중복 지급을 막는다. 레벨업 선택 중 전투는 완전 Pause하고 남은 선택과 추가 레벨을 처리한다. 서로 다른 이벤트의 세부 우선순위와 후보 부족 처리는 미정이다. M3에서는 새 성장 Queue를 구현하지 않는다.

### 1.12 유물 — 한 번 획득하면 완성

유물은 **전투에 강력한 전역 Bonus를 더하는 패시브**다. **Level 없음, 동일 유물 중복 없음, 패널티 없음.** 기본 최대 2종이다. 세 번째 유물 기회에는 기존 하나를 교체하거나 획득을 거절할 수 있다.

v0.3의 ‘Lv1부터 강한 Trigger→Payoff, 공격적 연결 중심’보다 역할을 넓힌다. 간단히 이해되는 전역 보너스·방어·원거리 대응도 허용한다. 기존 유물 Lv1~5 강화와 비용을 동반하는 효과는 새 구조가 아니다.

방향 예시: 특수무기 Cycle 감소, 확률 약한 Knockback, 치명타 보너스, 확률 과충전, 방어, 원거리 대응. 초기 목표는 약 10종이며 아래 이름은 현재 후보 방향이다. 정확한 효과·수치는 미정/Prototype Tuning이다. 일부 희귀/유니크와 매우 희귀한 전설을 둔다.

**충격 탄약**은 모든 공격에 일정 확률로 약한 Knockback을 발생시킨다. 모든 공격이 항상 밀어내지는 않는다. 일반 적, 저항이 높은 무거운 적, 면역인 일부 적, 높은 저항/면역의 Boss를 구분할 수 있어야 한다. 저항 수치·적별 배치는 미정이다.

과충전 축전기 방향은 **공격 행동 시작 시** 낮은 확률을 한 번 판정한다. 점사·다중탄도 한 행동당 한 번이며 탄환마다 굴리거나 고정 N번째 공격으로 바꾸지 않는다. 한 공격 행동 전체가 과충전된다. 정확한 효과·확률은 미정이다.

전설 유물 확정 방향:

| 유물 | 역할 |
| --- | --- |
| 증원 병력 | 성벽에 Marine +1. 현재 기본 가우스 소총과 개조를 사용해 독립 자동 공격. 모든 특수무기를 복사하지 않음 |
| 선택 확장 장치 | 일반 레벨업 후보 **3→4**. 코어가 아니라 **전설 유물** |

초기 유물 후보 방향 10종: **고속 장전 장치 / 충격 탄약 / 정밀 조준기 / 비상 발전기 / 방탄 코팅 / 과충전 축전기 / 탄약 복제기 / 전술 재충전기 / 전설 증원 병력 / 전설 선택 확장 장치**. 위에서 정한 효과 외에는 명칭만으로 효과를 임의 확정하지 않는다. 처형 프로토콜은 초기 10종에 포함하지 않는 미래 미확정 후보다.

처음에는 약 3종만 해금하는 방향이며 진행·작전 기록으로 확장한다. 전설 두 유물은 비교적 후반 해금 방향이다. 기존 구현에 같은 이름이 있어도 Legacy 효과를 그대로 승계한다는 뜻이 아니다.

### 1.13 코어 — Run 규칙 변경

코어는 **Run 전용 초희귀 규칙 변경 아이템**이다. Level 없음, **한 Run 최대 1개**, 현재 Run에서 실제 적용 가능한 Pool 중 **랜덤 1개 즉시 획득**. 3개 중 선택하지 않으며 획득 후 추가 코어 드롭은 없다. 유효 후보가 없는 경우의 처리는 미정이다. 단순 스탯이 아니라 원래 불가능한 것을 가능하게 한다.

| 초기 코어 5종 | 규칙 변경 |
| --- | --- |
| 무장 확장 코어 | 특수무기 한도 2→3, 수류탄/미사일/드론 모두 운용 가능 |
| 개조 확장 코어 | 기본무기 형태 개조 3→4 |
| 유물 확장 코어 | 유물 2→3 |
| 이중 초월 코어 | 특수무기 **하나**의 Lv15 초월 개조 1→2. 이미 Lv15를 지났어도 추가 초월 선택 기회 소급 제공 |
| 품질 개방 코어 | 일반 레벨업 성장 카드 희귀도 +1단계, 과거 선택에도 소급하고 이후에도 지속 적용 |

품질 개방은 일반→희귀→유니크→전설, 전설은 유지한다. **유물·코어·Special Weapon Acquisition Card·Core 예외 획득·특수무기 Lv3/Lv6 분기·Lv15 초월·Lv20 Overclock·기타 특별 선택에는 적용하지 않는다.** 과거 성장 효과를 실제로 소급해야 하며 라벨만 바꾸는 기능이 아니다. 전설 행동·중복 금지와 소급 적용의 충돌 처리 등 상세는 미정이다.

이중 초월의 대상 무기 결정·추가 선택 UX, 무장 확장 후 세 번째 무기 지급 시점과 계정 잠금 관계는 상세 설계 대상이다. 코어 획득 자체는 선택하지 않되 효과로 생기는 초월 선택은 Queue로 처리할 수 있다.

v0.4 공명 코어 후보는 초기 Pool에서 제외한다. 선택지 3→4와 Marine +1은 계속 전설 유물이다. Run 밖 희귀 영구 재화명은 미정이며 Core 명칭을 재사용하지 않는다.

### 1.14 Run, Director, Meta와 Reroll

공식 Stage는 **최종 Boss전을 포함하여 약 20분 전후**다. 정확히 20:00 강제 종료가 아니다. 기본무기·특수무기 2종·Lv10 완성형·Lv15 초월·집중 투자 시 Lv20 Overclock·유물·코어·시너지·후반 Horde 폭증·Boss를 경험할 시간을 제공한다. 희귀 보상이나 완성 Build를 매 Run 보장하는 뜻은 아니다. Character Level 상한은 없다. v0.4의 평균 종료 Lv40~50과 Lv5/10 시점은 이전 Prototype 목표로서 20분/점진 해금 구조에 맞춰 재검토한다. 특수무기 Lv20은 집중 투자와 운이 맞은 후반 완성이지 매 Run 두 무기의 보장 보상이 아니다.

Director는 시간·Encounter Phase·Threat Budget·밀도·적 조합·Elite를 중심으로 설계한다. Character Level 또는 Meta Power와 적 능력치를 실시간 1:1로 맞추지 않고 성장 직후 적 스탯을 올려 Power Spike를 지우지 않는다. 초반에는 많은 Grunt가 멀리 보이되 느린 단발로 처치하고 성벽 도착까지 충분한 시간을 준다. 후반에는 처치보다 많은 스폰 압박도 허용한다. 강한 빌드에 위험 적 비율을 조금 조정하는 것은 미래 옵션이며 확정 구현이 아니다.

Reroll은 **기본 0회**, 무제한 금지. Meta에서 약 1→2→3회 확보하는 방향과 Run 안의 희귀 추가 획득을 유지한다. Meta 약 3회는 Run 전체 총량 상한 확정이 아니다. 획득량·비용·허용 화면·재등장 규칙은 미정이다.

Meta는 **매우 강력한 영구 전투력과 점진적 Build 개방**을 허용한다. v0.4의 중간 전투력/소수 단계 제한을 Gold 20/10/5단계 연구로 대체한다. 높은 Stage·Challenge·Endless가 그 힘을 받아준다. 초반 캐릭터도 후반에 유효해야 하며 Awakening은 메커니즘 변화 방향을 유지한다. 경제·희귀 재화명·저장 상세는 미정이다.

### 1.15 Portrait / Screen Ownership / Build HUD — v0.7 확정 목표

Portrait / 다양한 세로 화면비 / Safe Area를 유지한다. Full-Bleed는 화면 전체에 전장과 게임 UI가 빈 여백 없이 연결되는 표현을 뜻하며, **UI 뒤까지 전투를 그린다는 뜻이 아니다.** 화면은 실제 공간을 차지하는 세 독립 영역이다.

`Header → Battlefield → Wall / Bottom Combat HUD`

**Header와 Bottom HUD는 Battlefield 바깥의 독립 UI 공간**이다. Enemy·Projectile·Combat VFX는 Header에서 Spawn하거나 Header 뒤를 통과하지 않고 Bottom HUD 안으로 내려오지 않는다. Header/Bottom을 전체 화면 전투 위에 얹는 방식은 폐기한다.

#### Header: Run 정보와 Global Build

Character Level / XP / Stage 시간 / Pause를 표시한다. 공용 공격력·공격속도·치명타 확률 강화, Relic, Core, Synergy, 기타 Run-wide 효과를 Global Build 영역에 표시한다. 전투를 가리지 않고 Run 전체 상태를 읽는 곳이다. Synergy는 여러 무기의 조합이므로 한 무기 슬롯에 귀속시키지 않는다. 세부 정렬·크기는 Prototype Tuning.

#### Battlefield: 전투만 소유

Header 바로 아래에서 시작하고 Bottom HUD 앞에서 끝나는 **Battlefield Rectangle**을 계산한다. `progress01=0`은 그 Rectangle 최상단 Spawn, `progress01=1`은 내부 Wall 접촉점이다. 전체 화면 높이에 매핑하지 않는다. Marine·3 Soft Lane·fake perspective·Enemy·Projectile·Combat VFX를 이 영역에서 표현한다. clip/mask 또는 명확한 렌더링 소유권으로 밖으로 넘치지 않게 한다.

Wall 접촉은 전투 논리이고, Bottom HUD는 그 아래 고정 UI다. 성벽처럼 자연스럽게 연결해도 coordinate ownership은 구분한다. 화면비가 길어질 때 가운데 전장의 환경/시각적 깊이를 늘릴 수 있으나 논리 이동속도·사거리·도착시간은 달라지지 않는다.

#### Bottom: Loadout와 Weapon-owned Build

Wall HP와 `[기본무기] [특수1] [특수2] [스팀팩] [필살기]`를 표시한다. 기본 가우스 소총 슬롯은 항상 보이고 중앙 아이콘·이름/식별 정보가 있다. 특수무기 미구현/미해금 상태에서도 기본 **특수 슬롯 2개는 항상 잠금 표시**한다. v0.6의 빈 슬롯 숨김 원칙보다 이 Loadout 가시성 규칙을 우선한다.

| 슬롯 상태 | 의미 / 표시 |
| --- | --- |
| Locked | 계정 Slot/System 잠금. 자물쇠와 비활성 상태; 설명 확인은 가능 |
| Unlocked / Empty | 슬롯은 열렸으나 Run에서 아직 미획득. 빈 슬롯 / 미장착 |
| Equipped | 현재 획득한 수류탄·미사일·드론 등 해당 무기와 성장 표시 |

M3 당시 두 슬롯은 Locked였으며 실제 계정 해금/특수무기는 없었다. M5 개발 테스트에서는 두 슬롯을 Unlocked/Empty로 시작하고 Lv5/10 획득과 실제 무기를 연결한다. M5 당시 무장 확장 Core/세 번째 슬롯 획득은 Future였다. M7은 두 슬롯을 Unlocked/Empty로 시작해 일반 Acquisition 카드 선택 순서대로 채우고 M6 무장 확장 Core의3번째 슬롯을 유지한다.

#### Build Owner와 Upgrade Badge

- **기본무기 슬롯:** 형태 개조, 기본무기 전용 Range, Legendary Variant, 무기 진화 등. Header에 중복 나열하지 않는다. 슬롯만 봐도 현재 Gauss에 투자한 성장을 읽을 수 있어야 한다.
- **특수무기 슬롯:** 해당 무기 Level / Lv3 Main Tree / Lv6 Sub Branch / Lv10 Completion / Lv15 Transcendence / Lv20 Overclock / 기타 전용 성장. Grenade는 Grenade, Missile은 Missile, Drone은 Drone 슬롯에 묶는다. M5에서 실제 내용과 Tap/Click 상세를 연결하며 Header에 중복 표시하지 않는다.
- **스팀팩 슬롯:** 고유 성장/분기 표시 가능. M3는 존재하는 Legacy 스팀팩 성장을 연결했다. M4 일반 Pool은 공용/기본무기/사거리에 한정하여 기본 스팀팩만 유지한다.
- **Global Header:** 공용 강화·Relic·Core·Synergy. 현재 Legacy 공용 강화는 아직 Gauss 중심으로 적용돼도 의미상 Global로 분류하고 gameplay 효과를 바꾸지 않는다.

작은 아이콘·기호·약어·Level/상태 배지로 누적 표시한다. 긴 설명을 상시 나열하지 않는다. Slot/Badge Tap, Desktop Hover/키보드 Focus로 이름·현재 Level 또는 상태·짧은 효과를 확인한다. 기존 Pause/Build Detail을 재사용할 수 있으며 새로운 대형 Tooltip framework는 필요 없다. UI 입력이 Focus Target/Gesture로 새지 않게 한다. UI는 runtime state를 읽고 gameplay rule을 결정하지 않는다.

카드는 중앙 가로 배치의 간결한 형태를 유지한다. **큰 아이콘 → 이름 → 한 줄 효과와 핵심 숫자 → 종류 → 희귀도 → 필요 시 Level 변화** 순서이며 희귀도는 색뿐 아니라 글자/심볼로 표시한다. 일반/특별 선택은 같은 문법을 쓰되 후보 수를 억지로 같게 하지 않는다.

Pause는 계속하기 / 현재 빌드 / 다시 시작을 제공한다. 상세는 공용·무기·보조 기술·유물·코어·시너지를 구분하고 실제 효과를 설명한다. 무레벨 목표 유물/Core에 가짜 Level을 붙이지 않는다. 현재 Legacy 유물의 실제 Level은 Legacy mapping임을 구분한다. 공유/친구 기록·Backend는 Future다.

#### First Engagement — 확정 방향 / 시험 수치

멀리 많은 적이 보이면서도 첫 정상 Gauss 교전은 빨리 시작한다. 10초 이상 무행동 대기를 피하며 **Run 시작 후 약3~5초**를 첫 Prototype 목표로 시험한다. 확정 수치가 아니다. 시각 이동거리만 줄여서는 실제 시간이 단축되지 않으므로 simulation의 Run start→첫 정상 Shot 시간을 측정한다. 초기 Wave 위치·속도·소폭 Range 조정 등을 검토할 수 있으나 Marine 중거리 정체성을 유지하고 전장 전체 Range로 되돌리지 않는다.

M3는 Range .55와800ms를 유지하고 M3 초기24명 중3명만 progress .43~.445에 배치한다. 나머지는 기존 먼 배치를 유지한다. 추가 플레이 피드백에 따라 일반/정예 이동속도 곡선은 M2의1.5배(생성 시 배율 .65→.975, 최종1.02→1.53)로 조정한다. HP·공격 주기·돌진 예고 시간은 유지한다. 이는 Prototype Tuning이며 새로운 Enemy/Director 규칙 확정이 아니다.

#### M3 구현 / Future 경계

| 항목 | M3 실제 범위 | Future / 미정 |
| --- | --- | --- |
| 세 영역 | Safe Area 내 Header/Battlefield/Bottom rect와 전투 mask | Final styling/접근성 추가 조율 |
| Header | Level/XP/시간/Pause·현재 Global Build | 최종 신규 보상/시너지 시스템 |
| 기본무기 | Gauss 상시 슬롯·Legacy trait/진화 배지 | 최종6종/Range/전설 변형 신규 구현 |
| 특수무기 | 두 Locked 슬롯, locked/empty/equipped 표현 타입 | 실제 수류탄/미사일/드론, 성장 및 해금 |
| 보조 기술/필살기 | 기존 스팀팩·V 유지, 스팀팩 성장 배지 | 최종 전용 성장 확장 |
| 상세 | 기존 Pause 재사용, Hover title, UI 입력 격리 | Final tooltip 스타일 |

### 1.16 시너지, 진화와 용어

관통+폭발탄 같은 자연 조합은 시너지가 아니다. 시너지는 **특정 기본무기 Build + 특수무기 A의 특정 Lv10 완성형 + 특수무기 B의 특정 Lv10 완성형** 3중 조건을 완성하면 **자동 활성화**한다. 별도 카드를 뽑지 않고 Lv15 초월/Lv20 Overclock을 필수 조건으로 요구하지 않는다.

반드시 **새로운 행동 + 확실한 화력 상승**을 함께 제공한다. 체감 목표는 **일반 강화 여러 번 < 시너지 < 강력한 유물**이며 정확한 수치는 Tuning한다.

| 초기 시너지 첫안 | 기본무기 조건 | 특수무기 A Lv10 | 특수무기 B Lv10 | 효과 방향 |
| --- | --- | --- | --- | --- |
| 공성 삼각타격 | 관통 + 고위력 단발 | 벙커 버스터 | 킬 체인 | 강적에 공성 표식 → 세 무기 집중 → 장갑 붕괴와 큰 추가 피해 |
| 포화 소거 작전 | 점사 + 다중탄 | 융단 폭격 | 미사일 스웜 | 다수 적 동시 공격 시 포화 구역 → 점사·자탄·미사일 화력 증가 |
| 중력 살상지대 | 관통 + 폭발탄 | 특이점 | 개틀링 건십 | 특이점에 모인 적 지역의 Marine·폭발탄·건십 화력 증가 |
| 분산 폭격망 | 다중탄 + 도탄 | 다중 탄두 | 전술 드론 네트워크 | 여러 착탄 지점을 전투 노드화, 여러 Soft Lane 동시 장악 시 화력 증가 |
| 추적 섬멸망 | 점사 + 고위력 단발 | 전술 사냥꾼 | 울프팩 | 위험 적에 사냥 표식 → 세 무기 집중 → 처치 후 다음 위험 적으로 연쇄 |
| 역추적 방공망 | 도탄 + 고위력 단발 | 불사조 미사일 | 전술 윙맨 | 원거리 적 공격 시 발사 위치 노출 → 미사일·드론·도탄 역추적 및 강화 공격 |

명칭 대응: 개틀링 건십 = Gatling Gunship, 울프팩 = Wolfpack, 전술 윙맨 = Tactical Wingman 계열, ‘고위력’ = 고위력 단발. 기본무기 개조의 요구 Level, 표식·노드·장악 판정, 배율·지속시간·cooldown은 미정/Prototype Tuning이다. 여기의 조건·효과 방향은 사용자 첫안을 기록한 것이며 구현 완료가 아니다.

진화·초월·Overclock은 큰 완성 순간을 제공하지만 서로 같은 시스템은 아니다. 현 Hyper Gauss Recipe는 재평가한다. 비밀 진화·발견 정책은 미래 설계다.

공식 용어: 기본 공격, 기본무기, 기본무기 형태 개조, 공용 강화, 기본무기 전용 사거리 성장, 특수무기, 특수무기 강화, 보조 기술, 마법, 필살기, 강화 카드, 유물, 코어, 시너지, 진화, 비밀 진화, 초월 개조, Overclock, 작전 기록, 숙련 Point. ‘특성 슬롯’은 기본무기 개조 슬롯만 뜻한다. HUD 문자열은 이 소유권과 용어에 맞추되 gameplay 규칙을 새로 만들지 않는다.

### 1.17 Stage 1 Enemy / Elite / Boss

Stage 1 일반 Enemy는 **3종만** 사용한다. 적 종류를 늘리는 대신 수량·비율·Soft Lane 압박·조합·Elite·Boss로 변화를 만든다.

| 일반 적 | Prototype 역할과 행동 |
| --- | --- |
| Grunt / 일반병 | Horde 대부분, 대량 처치 쾌감. 느리고 약하며 초기 느린 Gauss 한 발 처치를 목표. 후반에도 HP Sponge 대신 수량 중심 압박. 관통·점사·폭발·수류탄으로 수십 마리를 빠르게 제거 가능 |
| Runner / 돌진병 | 첫 우선 처리 위험 적. Grunt와 비슷하거나 낮은 HP도 가능, 훨씬 빠르게 무리 사이를 전진. Wall 접근 시 Auto Target 위험도 상승을 검토하되 과다 동시 Spawn 금지 |
| Shield / 방패병 | Stage 1 후반부 역할, 첫 소개는 6~9분 첫안. 느리며 **방패 HP→본체 HP**를 우선 사용. 방패 파괴 전 화력 흡수로 전선 압박. 단순 피해50% 감소 방식 대체 목표. 일반형의 주변 적 전체 보호는 사용하지 않음 |

Shield는 고위력 단발·관통 등의 가치를 확인하는 대상이다. 방패 초과 피해·관통 상호작용의 정확한 규칙은 미정이며 임의로 확정하지 않는다.

Elite는 **2종**만 사용하며 단순 HP 배수형이 아니다. 해당 Stage에서 일반형을 소개하기 전에 그 Type의 Elite를 먼저 공개하지 않는다.

| Elite | Prototype 행동 |
| --- | --- |
| 광폭 돌진병 | 강화된 Runner 전진 → 특정 거리에서 잠깐 준비 → 명확한 Telegraph → Wall 방향 급가속. 반응 시간이 있어야 하며 순간이동처럼 도달하지 않음. 집중 Target/미사일 위험 타겟 판단 검증 |
| 중장 방패병 | 강한 개인 방패 + 바로 뒤/주변 일부 일반 적에게 부분 보호. 먼저 제거하면 뒤 Horde 처리 효율 상승. 고위력/관통/집중화력 판단 검증, 일반 Shield와 즉시 시각 구별 |

최종 Boss는 **공성 거인 1종**이다. 복잡한 Raid 대신 Stage 1의 판단을 종합 시험한다. 일반 Enemy가 함께 등장할 수 있고, HP만 늘려 오래 때리는 구조를 피한다. High-roll은 일부 Pattern을 무시하고 본체를 빠르게 녹일 수 있다.

| Boss 단계/Pattern 방향 | 전투 판단 |
| --- | --- |
| 접근 | 천천히 Wall로 접근, 좌우 Soft Lane 일반 적 지속 Spawn. Boss/Runner/Horde 사이 우선순위 판단 |
| 공성 공격 준비 | 중간 전장에서 멈춤, 큰 Telegraph와 약점 노출. 약점에 일정량 공격하면 공성 취소·잠깐 Stagger·추가 공격 기회. 실패하면 Wall 큰 피해 |
| 증원 호출 | HP가 일정 수준 이하일 때 좌우 Grunt 대량·Runner 중심 증원. Shield/Elite를 동시에 과도하게 넣지 않음 |
| 최후 돌진 | 낮은 HP에서 Wall 직접 전진. 이동속도·Spawn Pressure 증가 가능, Wall 도달 후 강한 반복 공격으로 마지막 DPS Check |

약점은 **강제 면역 Phase가 아니다**. 준비 중 본체를 압도적 화력으로 먼저 죽일 수 있다. M7은 Charge 중 본체에 들어간 누적 피해를 Interrupt Threshold로 사용한다. 접근/Charge/증원/최후 돌진과 첫 수치는 §3.9에 명시하며 최종 밸런스는 사용자 Playtest로 결정한다. Boss 처치만 Stage Clear이며 Wall HP0이면 실패한다. 강한 Build는20분 전에도 종료하고 약한 Build는20분 이후에도 전투를 계속한다. 목표 전체 Run은 약19~21분 전후다.

### 1.17.1 Stage 1 전투 리듬

Boss 포함 **약20분 전후**, 20:00 강제 종료가 아니다. 큰 리듬은 고정하되 Lane 비율·Runner/Shield 비중·Elite 종류·Horde 형태를 약간 Randomize한다. 정확한 패턴 암기 대신 ‘이 시간쯤 위험하다’는 학습을 허용한다. 아래 분 단위 창은 **Prototype Tuning 첫안**이다.

| 시간 창 | 전투 리듬 |
| --- | --- |
| 0~3분 | Grunt 중심·Runner 극소수. 처음부터 먼 적은 많이 보이되 실제 Wall 압박은 낮음. 느린 단발 감각 학습 |
| 3~5분 | Grunt/Runner 증가, 첫 실제 위기. 첫 Elite는 광폭 돌진병 우선 |
| 5~6분 | 첫 완화. Spawn을 멈추지 않고 Pressure 감소, 잔여 적 정리·성장 체감·다음 공세 준비 |
| 6~9분 | Shield 소수 소개 후 Grunt 사이 혼합, 화력 흡수로 전선 압박 |
| 9~11분 | 첫 복합 공세. 예: Left Grunt 대량 / Center Shield / Right Runner. Lane 역할은 Run마다 변경 가능 |
| 11~12분 | 두 번째 짧은 완화. 성장 Build의 화력 차이 체감 |
| 12~15분 | Grunt 대폭·Runner 증가·Shield 혼합·추가 Elite. 중장 방패병 사용 가능 |
| 15~18분 | 핵심 판타지: 개조·수류탄·미사일·드론 등 화력이 커져도 Spawn이 빠르게 전장을 다시 채움. ‘내가 이렇게 센데 왜 아직 위험하지?’ |
| 18~19분 | Boss 직전 최대 공세: Grunt 대량·Runner 다수·Shield·Elite 1종 가능. Stage 1 요소만 사용. 짧은 정리 후 Boss 진입 가능 |
| 19분 이후 | 공성 거인. Pattern을 읽도록 직전보다 일반 Spawn 잠시 완화, 최후 Phase에서 다시 Pressure 증가 가능 |

### 1.17.2 Elite / Boss 보상 역할

Elite Encounter는 약5회 전후 첫안이며 4~5분 / 8~9분 / 12~13분 / 16분 / 18분대의 창에서 약간 Randomize한다. 초 단위 고정 Spawn은 피한다. 두 Elite를 반복 사용해도 주변 Horde가 변해 다른 전투 감각을 준다. 중장 방패병은 앞선 등장 허용 구간을 지킨다.

유물 해금 계정 기준 첫 경제안: **첫 Elite 유물 기회 보장**, 이후 약30~35%. 한 Run에 약1~2개를 자주 경험하는 목표이며 운이 나쁘면 보장1개만, 좋으면 빠르게2개도 가능하다. 기본2개 보유 뒤 새 유물 기회에서는 기존 둘 유지/새 유물 포기 또는 기존 하나 교체가 가능하다. 후반 전설로 Build를 바꿀 수 있다. 수치는 §3 Tuning이며 실제 Meta 해금 UX는 보류다.

Core는 Elite 처치 시 약3% Roll 첫안이다. 대부분 Run에는 없고 가끔 터지는 High-roll을 목표로 한다. **한 번 획득 후 추가 Roll 없음**, 선택창 없이 현재 유효한 Core 하나 Random Grant. 큰 시각/사운드 Feedback 방향이다. 유물과 Core Roll의 상호 배타/동시 지급·처리 순서는 미정이다.

특별 Item이 없어도 Elite 처치는 큰 XP·Run 보너스·Meta 계산 가산 등의 보상 후보로 의미가 있어야 한다. 매 Elite마다 유물/Core를 강제하지 않는다. 구체 보상 선택·수치는 미정이다.

**Elite = 현재 Run을 더 강하게 / Boss = 다음 Run과 계정을 더 강하게.** Boss는 Run 종료 시점이므로 Run 유물보다 Gold·Credits·Stage Clear 기록·첫 클리어 보상·작전 기록·희귀 영구 재화·다음 콘텐츠 해금 중심의 장기 보상 방향이다. 실제 Boss Meta 지급/저장은 1차 Prototype에 구현하지 않는다.

### 1.18 Stage 진행과 Challenge — Future / Not in Prototype

완성형 진행 원칙은 **Stage 1 클리어 직후 Stage 2 즉시 도전 가능**이다. 현재 Prototype은 Stage 1만 만들며 Stage 2의 구체 Enemy/Boss/Director를 설계하지 않는다. 이전 Stage별 원거리병·Boss 세부 배치는 v0.6 확정 설계로 승계하지 않는다. 장기 방향은 Stage 추가에 따라 새로운 Enemy Type/Boss/전투 문제가 점진 증가한다는 수준으로 유지한다. Gold 연구 총합·전투력으로 입장을 막거나 Stage 1 장기 파밍을 강제하지 않는다. 실력이나 좋은 Run이면 곧바로 진행할 수 있다. 새 적·조합·위험 적 비율·Elite·Boss·기본 수치 상승이 함께 난도를 높인다.

충분히 성장하면 과거 Stage 기본 난도가 쉬워지는 것은 보상이다. 실시간 Meta 대응 Scaling으로 이를 지우지 않는다. 다만 물량·빠른 적·Shield·Ranged·Elite 행동·Boss·후반 밀도로 완전 AFK 승리가 일반화되지 않게 한다. 고성장 Player의 목표는 높은 Stage/Challenge/Endless로 이동한다.

Stage 클리어 후 **해당 Stage의 Challenge Modifier**를 해금한다. 고정 Hard/Nightmare 대신 불리한 조건을 직접 조합한다. Spawn/밀도, 적 HP/공격, 이동속도, Elite 증가, Wall HP 감소, Boss 강화가 초기 후보다. 각 조건에 Challenge Point를 부여하여 총점이 난이도·보상·기록 점수에 반영된다. 값은 미정이다.

장기 행동형 후보: 원거리 공격 방식 강화, Elite 새 행동, Boss 추가 Pattern, 특정 적 Type 추가, 특정 Lane 압박. 적 공개 제한과의 상세 관계는 후속 설계하며 미래 적을 먼저 공개하는 것으로 자동 해석하지 않는다. Challenge는 다음 Stage 입장의 필수 파밍 과정이 아니다. 높은 Challenge의 Gold/Credits/기록/희귀 보상/해금 연결 상세는 미정이다.

### 1.19 Endless Defense — Future / Not in Prototype

**Stage 1 클리어 후 Endless Mode 방향**을 추가한다. 시간 제한 없이 Wall 파괴까지 진행한다. 시간이 지날수록 적 수·Spawn 밀도·Elite·복합 조합이 늘고, Boss 재등장·Boss 2마리 동시·더 극단적인 Boss/Elite/Horde 조합을 허용한다. 정규 Stage의 밸런스 제한을 점차 풀 수 있다.

**Endless Enemy Pool = 계정이 정규 Stage에서 이미 만나본 Enemy Type**. 미래 Stage 적을 선공개하지 않으며 정규 Stage 진행으로 Pool을 넓힌다. 새 Boss의 공개 범위·정확한 곡선은 미정이다. Build 한계, Gold 성장 고점, 성능 Stress Test, 친구 간 생존시간 기록 경쟁이 용도다. 이번 작업에서 Stress Test나 Backend/친구 기록을 구현하지 않는다.

### 1.20 점진적 시스템·콘텐츠 해금 — Future / Not in Prototype

첫 Run은 제한적이다. 느린 소총, 일부 공용 강화, 관통/점사, 특수무기 없음, 유물 제한/잠금, 코어·시너지 잠금, 고급 전설/초월/Overclock 다수 잠금이 초기 예시다. 첫 클리어 확률이 낮아도 되지만 시스템적으로 불가능하게 막지 않는다. 약한 이유는 인위적 공격력 -80% 같은 디버프가 아니라 **성장 옵션이 적기 때문**이다.

첫 Run 종료 후 특수무기 시스템·수류탄·슬롯1을 여는 것이 방향 예시다. 이후 미사일·드론·두 번째 슬롯을 해금한다. 계정 해금은 사용 가능한 Pool만 정하며 Run 획득은 §1.3의 Lv8/14 이후 낮은 확률 카드 규칙을 따른다. 한 무기만 해금됐더라도 Lv5 자동 지급을 복원하지 않는다. 정확한 N번째 Run에 고정하지 않고 작전 기록/숙련 Point/주요 Event 중심으로 진행한다. 초반 Gold 연구 메뉴도 일부만 공개하는 방향이다. 숙련 후 유물·추가 개조·미사일·슬롯2·드론을 순차 개방한다. Stage 1 첫 클리어는 다음 Stage/Challenge/Endless/Core System 등을 여는 큰 Event 방향이다. 계정 해금, Run 보유 한도, Character 획득 이벤트를 구분한다. Prototype 테스트에서는 콘텐츠를 Developer 상태로 미리 열어둘 수 있으며 완성형 해금 UX를 먼저 만들지 않는다.

무기 내부도 점진 해금한다. 예: 수류탄 Lv3은 처음 집속탄/고폭탄만, 전술탄은 나중에; Overclock은 전체 목표5종 중 처음 약2종만. 미사일·드론도 같은 철학이다. 무기 사용·누적 처치·무기 Level·특정 행동·Stage·Challenge·작전 기록으로 개방한다. 잠긴 트리와 이번 Run에서 다른 분기를 골라 잠긴 트리는 서로 다른 잠금이다.

유물도 처음 약3종에서 진행·작전 기록으로 약10종까지 확장한다. 전설 유물은 후반 해금 방향이다. 최초 Pool 구성·수치는 미정/Prototype 방향이다.

### 1.21 작전 기록과 Marine 숙련도 — Future / Not in Prototype

**작전 기록에서 획득한 숙련 Point 총합 = Marine 숙련도**. 별도 단순 Mastery XP Bar를 만들지 않는 방향이다. 생존 / 무기 / Build / Challenge 기록으로 구성하고 난이도에 따라 Point를 다르게 지급한다.

모든 기록을 완료해야 핵심 시스템이 열리게 하지 않는다. 예를 들어 가능한 Point80 중 약40 전후에서 핵심 시스템을 열 수 있는 여유는 방향 예시이며 확정 요구량이 아니다. 싫은 Build·Challenge 일부를 건너뛰어도 핵심 해금이 가능해야 한다.

특정 기록은 Point 외에 콘텐츠를 직접 해금한다. 예: 수류탄 누적 처치→전술탄, 미사일 Lv20 최초 달성→새 Overclock, 드론 요격 기록→드론 성장. 단순 처치 숫자 숙제가 아니라 **아직 경험하지 않은 재미있는 Build와 행동을 시도하게 하는 장치**다. 개별 조건과 요구량은 미정이다.

### 1.22 Meta 역할과 Gold 연구 — Future / Not in Prototype

**M11 적용 경계:** 아래 장기 설계를 보존하되 Gold 통화·Marine 연구 11종·Credits Reroll·Stage 1 보상/저장은 §1.26·§3.13의 현재 범위로 승격한다. 다른 Meta 사용처와 해금·숙련·경제 확장은 Future다.

| 경로 | 역할 |
| --- | --- |
| Gold | 캐릭터 자체의 영구 전투력 성장 |
| Credits | 모든 해금 담당이 아님. 일부 선택형 콘텐츠·Weapon Variant·Reroll·추가 해금 |
| 작전 기록/숙련도 | 실제 플레이를 통한 핵심 시스템과 다수 콘텐츠 해금 |
| 특정 Challenge/조건 | 고급 콘텐츠 직접 해금 가능 |
| 희귀 영구 재화 | 이름 미정. 신규 캐릭터/Awakening/대형 시스템·확장 용도 후보 |

Gold는 미세한 +2%에 머무르지 않는다. 오래 플레이한 Marine이 매우 강해져도 된다. **매 단계 체감 + 돌파에서 큰 상승 + MAX까지 매우 비쌈**이 원칙이다. 과거 Stage는 쉬워지고 높은 Stage/Challenge/Endless가 고점을 받아준다.

| 연구 구조 | 항목 | 돌파 |
| --- | --- | --- |
| 20단계 장기 주력 | 기본무기 화력, 기본무기 공격속도, 특수무기 피해, 성벽 최대 HP | Lv5/10/15/20 실제 상승폭 확대 |
| 약10단계 고가 특수 | 치명타 확률, **치명타 피해량**, 특수무기 공격 주기 감소, 정예·보스 피해, 성벽 피해 감소, XP 획득량 | Lv5/10 큰 돌파 |
| 약5단계 초고가 | Marine 기본무기 사거리 | Lv5 큰 최종 돌파 방향 |

치명타 피해 Gold 연구는 영구 기본 배율을 강화한다. Run 공용 강화에 치명타 피해 카드를 추가하는 뜻은 아니다. 속도·주기 최소값, 피해 감소 수학적 상한 등 폭주 방지는 별도 설계한다.

한 단계 비용 관계는 **20단계 주력 < 10단계 고가 << 5단계 사거리**다. 후반 가격은 가파르게 증가한다. 주력 Lv15~20, 특수 연구 후반, 사거리 Lv4→5는 장기 목표다. 실제 증가율·MAX·가격은 아래 Prototype Tuning이며 확정 밸런스가 아니다.

### 1.23 한국어 실시간 개발자 밸런스 패널 — Prototype Development Tool / Not Final Game Feature

게임은 `/`, 개발 패널은 별도 `/dev` 페이지다. 같은 브라우저·같은 origin에서 두 창을 동시에 열어 값을 바꾸며 플레이한다. Header/Battlefield/Bottom에 대형 개발 메뉴를 넣지 않고 정식 게임 UI와 분리한다. Backend/DB/WebSocket Server를 추가하지 않는다.

주요 Label·상태·오류는 한국어 우선이다. 모든 조절 항목에 값의 의미와 증감 효과를 설명하는 짧은 Tooltip, 현재값·코드 기본값·변경됨 표시, 되돌리기, 적용 시점 Badge를 제공한다. 숫자 직접 입력과 Toggle을 사용하며 검색은 한국어 이름·설명·분류·개발 항목명에 적용한다. 접을 수 있는 Category로 전체 게임/적·물량/기본무기/특수무기(수류탄·미사일·드론)/성장·레벨업/희귀도·랜덤/유물/코어/시너지/보스/프리셋·저장을 구분한다.

기본 Prototype 설정→중앙 Runtime Balance Store→게임 시스템의 흐름을 사용한다. 패널은 Runtime Override만 변경하고 BroadcastChannel로 같은 origin의 실행 중인 게임에 전달한다. 게임 연결됨/연결 대기 중과 현재 X1/X2/X4 개발 배속을 표시한다. 개별 숫자 변경으로 게임 내 배속 UI나 Stage Clock 소유권을 바꾸지 않는다.

안전한 수치는 이후 계산/공격/생성부터 현재 Runtime 값을 읽는다. 적 기본/최대 체력·방패 체력·생성 시 성장 배율은 **다음 적 생성부터**, 기존 적의 HP/MaxHP를 소급 변경하지 않는다. 카드 Weight·희귀도·XP 곡선·후보 수는 **다음 Level-Up/Offer부터**, 이미 열린 후보는 유지한다. 이미 날아가는 Projectile이나 예약된 Event를 억지로 다시 만들지 않는다. 초기 수·보유 한도·정예 등장 창·시작 성벽 체력은 **다음 Run부터**다.

전체 Reset은 Override를 지우고 코드 기본값으로 되돌린다. 이름 있는 Preset 저장/불러오기/삭제, JSON Export/Import와 개발용 localStorage 지속 저장을 지원한다. Import는 허용 필드·숫자/boolean·범위·정수·희귀도 합계 등 기본 validation을 통과해야 반영한다. Production에서는 `/dev`와 통신·Override 저장 로딩을 비활성화하고 코드 기본값만 사용한다.

### 1.24 대규모 Horde 성능 — Prototype Technical Requirement

대규모 Horde는 게임의 핵심이다. 성능 문제의 첫 해결책으로 Enemy 수를 줄이지 않는다. **같은 Enemy 수에서 Gameplay 결과를 유지하면서 중복 작업을 제거**한다. 이는 Gameplay 방향을 바꾸는 설계가 아닌 Prototype 기술 요구사항이다.

- **Simulation과 Rendering 분리:** movement·wall attack·Boss·Damage의 기존 sub-step 정밀도와 순서를 유지하고, Enemy 위치/Scale 등 visual transform은 실제 browser/Phaser Frame의 마지막 상태로 최대 1회 갱신한다. 개발 X2/X4에서도 같은 Frame의 반복 전체 Render를 피한다.
- **변경된 표현만 갱신:** Damage Event는 실제 바뀐 HP/Shield와 사망을 처리한다. Focus 변경은 이전/새 Focus 표시만 갱신하며 전체 Horde redraw를 만들지 않는다.
- **Targeting/State allocation:** 같은 상태의 readonly snapshot과 ID 색인을 재사용한다. 생성·사망·순서·상태 변화 시 필요한 데이터를 갱신하며 input snapshot의 immutable ownership을 유지한다. Attack/retarget Event에서 후보를 평가하고 in-flight Missile의 반복 전체 탐색을 줄인다. 기존 3 Soft Lane·fixed bin을 활용할 수 있으나 Target 순서·Random draw·실제 피해 결과는 보존한다.
- **VFX와 Damage 분리:** Damage는 모든 대상에게 동일하게 적용한다. 한 Frame에 과도한 Flash/Impact만 제한하거나 자주 사용하는 단순 Graphic을 재사용할 수 있다. 상한은 Prototype Technical Tuning이며 무기 화력을 줄이는 규칙이 아니다.
- **Gameplay Balance 유지:** 초기 Enemy 수·Active Cap 700·Spawn Batch/Interval·HP/Level Scaling·이동속도·Combat Tempo·XP·Gauss·Grenade·Missile·Drone·Relic·Core·Synergy·Boss의 수치와 효과를 변경하지 않는다. Pause/Level-Up 시간 정지도 유지한다.
- **개발 관찰:** `/dev`의 읽기 전용 성능 정보는 Prototype Development Tool이다. FPS·Enemy 수·Special Projectile/Unit 수·Combat VFX 수·Frame simulation sub-step 수를 표시한다. Production 노출, 복잡한 Profiler Dashboard, 자동 밸런스 판단은 추가하지 않는다.

우선 목표는 정상 X1에서의 대규모 Horde다. X2/X4는 개발용 Stress 상태이며 X4 + 700 Enemy를 정식 FPS 기준으로 강제하지 않는다. 실제 끊김·쾌감·최종 실기기 성능은 사용자 직접 Playtest로 판단한다.

### 1.25 M10 — 다연장 Hunter Weapon

**확정 목표 설계:** 기본 단발 미사일을 폐기한다. Lv1부터 **3발을 짧은 시간차로 발사하는 Salvo**로 위험 표적을 사냥한다. 수류탄은 공간/Horde 삭제, 드론은 전장에 지속하는 안정적 화력, 미사일은 짧은 일제사격으로 다수 위험 표적 또는 강적을 빠르게 사냥한다. AoE 폭발 경쟁으로 역할을 바꾸지 않는다.

- 기본 미사일은 더 빠르게 비행하고 **최소 1회 자동 재유도**한다. 목표 사망/무효 시 현재 위치에서 거리·위험도를 고려해 새 표적을 고르고 남은 수명 안에서 비행한다. 재유도 순간이동은 하지 않는다.
- **Damage Reservation:** Enemy ID별 비행 중 예상 피해를 단순 합산한다. 발사 시 추가, 목표 변경·명중·소멸 시 해제한다. `현재 유효 체력 - 예약 피해`가 남은 적을 우선하여 약한 적의 명백한 과잉 피해를 줄인다. 정밀 미래 전투 예측은 하지 않는다.
- Elite/Boss/높은 HP Shield에는 여러 발 집중 가능하다. Focus 우선도는 높게 유지하되 이미 충분히 예약된 낮은 HP Focus에는 추가로 낭비하지 않는다.
- **Saturation:** 발수와 동시 표적 수 증가. Lv10 미사일 스웜은 여러 Lane에 분산, 미사일 살보는 강한 하나/소수 표적 집중. 모두 예약 피해를 고려한다.
- **Hunter Killer:** 기본 3발을 유지하며 Elite/Boss/Shield/성벽 앞 위험 표적 우선도·강적 피해를 높인다. Lv10 킬 체인은 처치가 강화된 다음 사냥으로 연결되고, 전술 사냥꾼은 동일 강적 연속 명중 압박을 상한까지 증가시킨다.
- **Special Tracking:** 기본 낭비 방지보다 강한 다중 재유도·긴 수명·처치 후 연쇄 사냥. Lv10 연쇄 포식자는 처치 후 같은 미사일이 강화되어 연결되고, 불사조 미사일은 적중 후에도 조건에 맞게 표적을 다시 찾아 제한된 횟수만큼 지속 사냥한다.
- **Lv15 긴급 재지정:** 기본 재유도 해금 역할을 대체한다. 재유도 횟수를 크게 늘리고 재유도 때 일시 가속·제한된 수명 회복을 제공한다. 재유도 때문에 피해를 깎지 않으며 무한 수명은 금지한다.
- **Lv20:** 사냥 본능 폭주=강적 집중 피해/추적, 전장 사냥망=발수·동시 표적 확대, 불멸 유도체=장시간 다중 재유도/반복 사냥. 현재 구현 Pool 3종이며 나머지 목표 Pool은 Future로 보존한다.

정확한 피해·간격·수명·횟수·배율은 **Prototype Tuning**이다. 존재감과 최종 밸런스는 사용자 Playtest로 결정한다.

### 1.26 M11 — Meta Hub / Run 밖 영구 성장

게임 시작은 **Meta Hub → 출격 → Combat → 자연 종료 Result → 메인 또는 다시 하기**다. Marine·Gold·Credits·출격·영구 연구·저장 관리만 제공한다. 기능 없는 미래 메뉴나 Final Art는 만들지 않는다. Gold와 Credits는 Account 공유, Gold 연구는 `characters.marine`에 둔다.

성벽 파괴 또는 공성 거인 처치로 자연 종료한 Run은 Reward를 정확히 한 번 저장한다. Result 재렌더·버튼 반복·Scene 재호출로 중복 지급하지 않는다. 수동 Restart·브라우저 종료·개발 강제 종료는 보상이나 완료 Run 수를 올리지 않는다. Result는 생존시간·Kill·Elite Kill·Boss Kill·획득/총 Gold·Credits와 `[다시 하기] [메인으로]`를 표시한다. 저장 오류는 성공으로 처리하지 않고 사용자에게 표시한다.

**Save v1:** localStorage `horde-defense:meta:v1`, JSON `kind: "horde-meta"`. `account`는 Gold/Credits/Reroll Level, `characters.marine.research`는 연구 Level, `progress`는 완료 Run 수·Stage 1 Clear 여부/횟수다. `activeRunId`와 `lastSettlement`는 보상 1회 지급을 구분한다. 한 브라우저 계정에 활성 Run은 하나이며 새 출격은 이전 미완료 Run을 보상 없이 대체한다. 없는 알려진 필드는 기본값을 채우고, 잘못된 종류/버전/숫자/연구 Level은 거절한다. 손상 Save를 자동 덮어쓰지 않는다.

저장 관리에서 JSON Export/Import와 확인 후 초기화를 제공한다. Meta JSON과 개발 Balance JSON·storage namespace는 구분한다. Meta Import는 기존 진행을 교체하고 활성 Run/정산 영수증은 다시 사용하지 않는다. Balance Reset은 Meta를 지우지 않으며 Meta Reset도 개발 Balance를 지우지 않는다. Backend·Account 인증·클라우드 동기화는 이번 범위가 아니다.

연구는 정상 게임에서 Run 밖에 구매한다. 잔액 확인→Gold 차감→연구 Level 증가→저장을 하나의 처리로 묶고 MAX 초과/음수 재화를 막는다. UI는 기본무기·특수무기·방어·성장 분류, 현재 Level/MAX·효과·다음 효과/비용·돌파 표시와 구매 버튼을 제공한다. **M11 Meta 기능 검증을 위해 연구 전체 11종을 노출하며 실제 점진 해금은 M12**다.

출격 시 연구와 Reroll Level을 readonly Run Snapshot으로 만든다. `/dev`에서 저장을 바꾸어도 진행 중 Run을 소급 재계산하지 않는다. Base/Runtime Balance → Meta → Run Growth → Temporary/Relic의 층을 유지하고 Meta를 코드 기본값에 합치지 않는다.

**Reroll:** 기본 0회, Credits로 I/II/III를 순서대로 해금하여 새 Run당 1/2/3회. 비용은 추가 구매 비용 50/150/400이다. 일반 Level-Up 카드에만 `[새로고침 N]`을 표시하며 사용 시 1회를 소비하고 현재 Build에서 새 Offer를 만든다. XP·Character Level·선택권을 추가 지급하지 않고 Reroll 자체로 대성공을 발동하지 않는다. 일반 Offer에 포함된 Acquisition Card는 다시 뽑힐 수 있지만 Lv3 Tree/Lv6 Branch/Lv15/Lv20·Relic·교체·Core 등의 특수 선택에는 사용하지 않는다. 직전 카드 배제·원하는 카드 보장 없이 일부 중복도 허용한다.

`/dev`의 **메타 진행**은 Gold/Credits·Marine 연구·Reroll Level을 읽고 Gold +1000/Credits +100/확인 후 Meta Reset을 제공한다. Production에서는 이 개발 지급 도구를 사용할 수 없다. 일반 Meta Hub·Save·Reward·연구는 Production 게임 기능이다.

## 2. Prototype Scope — Stage 1 Gameplay Loop

**아래는 1차 Prototype 전체 목표이며 M4 구현 완료 목록이 아니다.** 장기 전체 Pool과 실제 첫 구현 Pool을 구분한다. Marine 고정, Stage 1 하나로 핵심 재미를 검증한다.

### 2.1 반드시 구현할 핵심

| 영역 | 1차 Prototype 범위 |
| --- | --- |
| Battlefield/Combat | Portrait·Wall·3 Soft Lane·fake perspective/progress01 접근, Marine 고정, 자동사격, Tap 집중/빈 전장 Tap 자동 복귀, **중거리 Range 밖 기본무기 발사 금지** |
| 기본무기 | 느린 단발 Gauss·초기 Grunt 1-shot 방향, 관통/도탄/점사/다중탄/폭발탄/고위력 단발 6종, 기본 최대3종, 반복 Level 성장 |
| Level-Up | XP·Character Level·3 Card Choose1, 공격력/공속/치명 확률, 개조 획득/성장, 일반/희귀/유니크/전설, 투자 가중치, 강한 RNG, Great Success |
| 특수무기 | 수류탄=공간/Horde, 미사일=위험 Target, 드론=지속 플랫폼 3종. 기본 최대2종, 첫 Lv8/두 번째 Lv14+첫 보유 조건의 일반 Pool 획득 카드 구조를 해금 테스트 상태로 검증 |
| 특수무기 성장 | Lv3/Lv6/Lv10/Lv15/Lv20 전부 시험. 전용 선택/잔여 Level Queue와 각 역할 차이 검증 |
| Enemy | 일반 Grunt/Runner/Shield의 Stage 1 역할, 방패HP→본체HP, Elite 광폭 돌진병/중장 방패병 |
| Stage | 약20분 Stage1 Director, Pressure/Relaxation, Lane Composition 변화, 후반 Horde 폭증 |
| Boss | 공성 거인 1종, 접근·공성 준비·약점·증원·최후 돌진 |

모든 개조의 Lv1~20 세부 밸런스를 문서로 완벽히 확정할 필요는 없다. 역할 차이가 실제 플레이에 나타나는 것이 우선이다. 무한 숙련·전체 게임 설계는 유지하되 첫 단계에서 모든 후반 수치를 완성하지 않는다.

### 2.2 대표 콘텐츠부터 구현

| 영역 | 전체 설계 유지 | 첫 구현 방향/우선 후보 |
| --- | --- | --- |
| Lv15 초월 | 무기별 큰 후보 Pool 방향 | M5 무기당3개, 실제9종은 §2.5 |
| Lv20 Overclock | 무기당 정확히5종 목표 Pool | M5 무기당3개, 나머지2개씩은 Future. 목록은 §2.5 |
| Relic | 약10종 | 약5~6종: 고속 장전 장치, 충격 탄약, 정밀 조준기, 과충전 축전기, 탄약 복제기, 전설 증원 병력 우선 |
| Core | 5종 | 약3종: 무장 확장, 개조 확장, 품질 개방 우선. Run1/유효Pool 랜덤 즉시 지급/소급 품질 원칙 포함 |
| Synergy | 6종 | 약3종: 포화 소거 작전(Horde), 중력 살상지대(Space Control), 추적 섬멸망(Dangerous Target) 우선 |

위 수량은 첫 구현 방향이며 전체 Pool을 축소 확정하는 것이 아니다. 우선 후보 외 콘텐츠는 §4로 보류한다. Core나 시너지 후보는 **실제 구현되어 효과가 있는 항목만** 사용한다. 약3종 구현과 완성형 계정의 초기 약2종 해금은 다른 개념이다.

개발 테스트를 위해 콘텐츠를 열어둘 수 있다. 실제 작전 기록/해금 UX·Meta 경제가 완성될 때까지 전투 검증을 막지 않는다. Run 사거리 카드 세부 성장이나 신규 장기 UI처럼 이번 필수 목록에 명시되지 않은 확정 설계는 임의로 필수 범위를 늘리지 않고 후속 범위 결정 대상으로 남긴다. 기존 스팀팩/필살기 원칙은 유지하되 별도 전면 재설계를 자동 추가하지 않는다.

### 2.3 성공 판단 — 여섯 질문

1. **적이 많이 몰려오는 것이 재미있는가?**
2. **적을 대량으로 삭제하는 것이 시원한가?**
3. **Run 초반과 후반의 화력 차이가 확실하게 느껴지는가?**
4. **Build마다 플레이 느낌이 실제로 달라지는가?**
5. **강한 Build인데도 후반이 긴장되는가?**
6. **한 판이 끝났을 때 한 판 더 해보고 싶은가?**

Meta 콘텐츠 양이나 UI 완성도는 현재 성공 기준이 아니다.

### 2.4 개발 원칙

**구현 → 직접 플레이 → 재미/문제 확인 → 기획 수정 → GDD 기록 → 구현 수정**을 반복한다. 사거리·Grunt 수·밀도·특수무기 Cycle·Elite 횟수·Lv20 도달 속도·실제 Stage 길이·Boss HP/시간·유물/Core 확률·향후 경제 수치는 Playtest로 결정한다. 확정된 기획 변경은 반드시 GDD에도 반영한다. 문서만으로 완벽한 밸런스를 고정하려 하지 않는다.

### 2.5 M5 Prototype Scope — 당시 구현 경계 / Historical

수류탄은 밀집 공간을 자동 투척/AoE로 처리하고, 유도 미사일은 위험 표적을 눈에 보이는 유도 투사체로 사냥하며, 드론은 전장에 지속하는 독립 유닛이다. 모두 Marine 기본 Range 밖을 공격한다. 기존 Primitive/VFX를 재사용하며 새 Asset을 생성하지 않는다.

개발 테스트에서3종과 실제 후보를 모두 해금한다. 시작은 두 슬롯 **Unlocked / Empty**, Character Lv5는3종 중1종, Lv10은 미보유2종 중1종을 선택한다. 중복/세 번째 획득은 없고 획득은 Weapon Lv1이다. 두 획득은 일반 레벨업 선택을 소비하지 않는다. 완성형 점진 해금과 무장 확장 Core는 Future다.

보유한 특수무기만 일반 Pool에 들어간다. 일반 성장+1, 독립6% 대성공이면 총+2; Character Level별 M4 희귀도 확률과 별도의 누적 quality를 적용한다. Lv3 Tree3개, Lv6 A/B, Lv10은 선택 경로의 Completion 자동 완성, Lv15 초월3개, Lv20 Overclock3개 선택이다. 특별 선택 자체에는 희귀도/대성공이 없다. Lv20 뒤에도 숙련 성장한다.

특별 Queue는 획득/성장/선택과 잔여 Level/quality를 보존한다. Lv14+2는 **Lv15 선택→Lv16**, Lv19+2는 **Lv20 선택→Lv21**이다. Scene은 특수 Queue→기존 유물→일반 레벨업 순서로 처리하며 기존 Card Selection을 재사용한다. 모든 선택 중 전투는 Pause다.

| 무기 | Lv15 실제3종 | Lv20 실제3종 | Lv20 Future2종 |
| --- | --- | --- | --- |
| 수류탄 | Smart Fuse(스마트 신관), Aftershock Core(여진 코어), Magnetic Primer(자기 프라이머) | 전술 핵탄두, 자동 유탄 난사 장치, 삼중 투척 시스템 | 영구 연쇄 반응, 궤도 폭격 호출 |
| 미사일 | Emergency Retargeting(긴급 재지정), Weakpoint Lock(약점 고정), Threat Relay(위협 릴레이) | 사냥 본능 폭주, 전장 사냥망, 불멸 유도체 | 처형 연쇄, 표적 삭제 명령 |
| 드론 | Forward Deployment(전진 배치), Combat Link(전투 연결), Target Painter(표적 도색) | 무인 전투군, 전투 순양기, 완전 동기화 | 자율 전투 AI, 요격 지휘체계 |

§1.4~1.6의 Main Tree3종×Sub Branch2종과18개 Lv10 Completion을 연결한다. Lv4~5/7~9/11~14/16~19와20 이후는 quality 기반 피해·주기·반경 숙련을 누적하고 큰 행동 변화는 Milestone에 집중한다. 최종 무기별 전체 성장표가 확정됐다는 뜻은 아니다. 전체 목표 Overclock5종과 큰 Lv15 Pool은 보존한다.

하단 슬롯은 획득 순서대로 무기/Level/Tree/Branch/Completion/초월/Overclock을 소유하며 작은 Badge와 Tap/Click 상세를 제공한다. 공용3종은 Header, 기본무기 전용 성장은 Gauss에 남긴다. Stage1에 Ranged Enemy가 없으므로 드론 Projectile Interception은 구현하지 않는다. 신규 Relic/Core/명명 Synergy/Boss/경제/점진 Unlock UX는 이번 범위 밖이다.

기능 correctness와 `npm run check`만 검증한다. 장시간 자동 Simulation의 최종 Level/평균 DPS/생존시간/자동 Clear 결과로 난이도나 재미를 판정하지 않는다. Horde·최종 수치·모바일 성능·성장 체감은 사용자 직접 Playtest로 결정한다.

### 2.6 M6 Prototype Scope — 당시 구현 경계 / Historical

후속 사용자 요청으로 원래의 M4 Horde 보존 조건을 변경한다: 초기 적은80명보다 적게, 시간 경과에 따른 공급 증가는 훨씬 크게 한다. M3 Enemy 이동속도1.5배와 M5 특수무기3종/성장 경로는 유지한다. 정상 Combat Tempo만 M5 X1 대비1.5배로 올리고 Stage Clock을 분리해 정상 X1 약20분을 유지한다. Developer X1/X2/X4는 계속 제공하는 개발 도구다.

- 생성 Character Level HP 강화, XP 요구량 완화, 수류탄 기본 피해65/실제 X1 Cycle5.2초/반경110.
- 무레벨·무패널티·중복 없는 Relic6종, 기본 최대2, 세 번째 선택 시 교체/포기. 첫 Elite 기회 보장/이후32%.
- 무레벨 Core3종, Elite3%/Run 최대1/유효 Pool 랜덤 즉시 지급. 무장2→3, 개조3→4, 일반 성장 희귀도 과거/미래1단계 상승.
- 품질 개방은 선택 이력의 희귀도와 실제 Level 증가량을 사용해 실제 quality를 재계산한다. 특별 획득/분기/초월/Overclock은 제외한다.
- 세 Synergy는 지정 개조 각Rank1 + 두 특수무기 정확한 Lv10 Completion으로 자동 활성화하고 Run 동안 유지한다. 별도 카드와 Lv15/20 요구 없음.
- Header 공용/Relic/Core/Synergy, Bottom 무기별 성장/Stimpack/Ultimate. 무장 확장 시 세 번째 Special Slot 동적 추가. 기존 상세 UI 재사용.
- 같은 Elite의 Core와 Relic은 동시 획득 가능. Core 효과 → 필요한 Special Event Queue → Relic 선택 → 일반 Level-Up 순서.
- Legacy Lv1~5 Relic/여러 Core/선택형 Synergy/Marine Magic의 충돌 연결은 새 Marine Runtime에서 제외하고 재사용 자산은 보존한다.

전체10 Relic/5 Core/6 Synergy, 공성 거인 Boss, Gold/Credits/작전 기록/점진 Unlock UX, Challenge/Endless/Stage2+, 신규 Character/Awakening/Final Art는 이번 완성 범위가 아니다. 평범한 Run과 시스템 중첩으로 터지는 High-roll Run을 모두 허용한다.
### 2.7 M7 Prototype Scope — 승계한 게임 구현 범위

사용자 Playtest에서 특수무기가 너무 일찍 전투를 지배하고 개조 획득/성장이 지나치게 자주 나와 특정 개조가 빠르게 강해진다는 피드백을 받았다. 특수무기와 개조를 매 Run 완성하는 구조 대신 RNG에 따른 Build 차이를 강화한다. 효과 자체의 대규모 Nerf 대신 등장 방식과 빈도를 바꾼다.

- Lv5/Lv10 고정 특수무기 획득을 제거하고 일반3장 안의 낮은 확률 Acquisition Category로 교체한다. 첫 Lv8/두 번째 Lv14+첫 보유, 최대2종, 무장 Core만3종. Hard Pity 없음.
- Acquisition은 일반 선택1회를 소비하고 Weapon Lv1만 지급한다. 한 Offer 최대1장, Rarity/Great Success/품질 개방 비적용. 보유 무기의 기존 성장 frequency와 Lv3/6/10/15/20/잔여 Queue는 유지한다.
- Basic Mod 신규/보유 성장 Category를 분리하고 한 Offer 합계 최대1장. 기본3슬롯/Core4슬롯, Range의 희소성·Rare 이상·최대5단계·슬롯 미사용 유지. 개조 효과는 대규모 하향하지 않는다.
- Stage19:00에 공성 거인1종. 접근→공성 Charge·약점 Interrupt→Stagger/Vulnerable, HP 증원, 낮은 HP 최후 돌진을 Primitive/Scale/Tint/Outline으로 표시한다. Boss HP·상태·약점·Charge Telegraph를 작은 HUD에 표시한다.
- Boss도 logical progress와 기존 공격범위를 사용한다. Gauss는 Range를 우회하지 않고 Focus 지정 가능. 다른 무기의 기존 작전범위 유지. 강제 면역 없이 본체 피해가 항상 가능하다.
- 20:00 자동 Clear를 제거한다. Boss 처치→Stage Clear/Result/Boss Kill 기록, Wall HP0→실패. Boss Kill은 현재 Run 결과 기록이며 영구 저장·Meta 보상은 구현하지 않는다.
- Boss 전후 Horde를 완화하고 Final에서 다시 강화한다. 초기36/Active cap700/정상Tempo1.5/기존Enemy속도방향/HPScaling/XP/Grenade/Relic6/Core3/Synergy3는 유지한다.
- Header/Bottom 소유권 유지. 특수슬롯은 시작 시 Unlocked/Empty, 일반 획득 카드 선택 순서대로 채우며 무장 Core는3번째 슬롯을 연다.

Gold/Credits/희귀영구재화/Operation Records/점진 Account Unlock/Challenge/Endless/Stage2+/신규Character/Awakening/Final Art/전체 Relic·Core·Synergy 확장은 보류한다. 장시간 자동 Run·밸런스 분석은 하지 않는다.

### 2.8 M8 Prototype Scope — 개발 도구

M7 콘텐츠·기본 수치를 유지하며 한국어 `/dev` 페이지, 중앙 Runtime Store, BroadcastChannel 연결·상태 확인, Search·Category·Tooltip·숫자/Toggle·현재/기본값·변경 표시·개별/전체 Reset, Preset·JSON Import/Export·개발용 localStorage를 구현한다. Production의 DEV 분기에서 패널 import를 제거한다.

주요 연결 대상은 Combat Tempo/Marine Range/Boss 시각, 초기 적 수·11개 Horde Phase의 생성 간격/묶음/cap/적 비중, 적·정예 체력/속도/Charge/등장 창과 HP 선형·제곱 성장, Gauss 피해/주기/치명타/카드 증가량/6개조 계수, 특수무기 획득 Level·weight·capacity, 수류탄/미사일/드론의 피해·주기·대표 계수, XP·대성공·카드 수·희귀도4구간, 유물·코어 Drop/한도/대표 효과/후보 토글, 시너지3종 토글·대표 배율, Boss HP/패턴/증원/공급이다.

내부 모든 구현 상수를 노출하지 않는다. 현재 단일 코어 보유 구조를 유지하므로 Run 최대 코어 수는0~1이다. 새 콘텐츠/Enemy/Stage2+/Challenge/Endless/경제/작전 기록/Character/Awakening/FinalArt/자동AI밸런스판단/복잡한 통계 Dashboard를 추가하지 않는다. 수치의 재미는 사용자 Playtest 영역이다.

### 2.9 M9 Prototype Scope — Horde 성능

Frame별 Enemy transform pass, Damage/Focus의 상태 표시 분리, readonly Enemy snapshot·필요 시 생성하는 ID 색인, Shield의 Lane 후보 계산, Special Weapon Event 중심 Targeting, 제한된 전투 VFX 재사용, `/dev` 읽기 전용 성능 지표를 다룬다. 대규모 엔진 재작성·전체 Object Pool Framework·게임 콘텐츠 추가·밸런스 변경은 하지 않는다.

movement·wall attack·targeting·Shield Protection·Special Weapon·Boss·Pause/Level-Up·Damage/XP/Kill·개발 성능 표시의 짧은 기능 회귀와 TypeScript/build 및 `npm run check`로 확인한다. 20분 자동 Run, 평균 FPS Benchmark 표, 기기별 장시간 Stress Test, 자동 난이도 분석은 하지 않는다. 구현·확인된 범위와 남은 확인은 §5 및 M9 구현 기록에 구분한다.

### 2.10 M10 Prototype Scope — 미사일 전용 개편

시간차 Salvo, 발사 시점의 위험 표적 선정, 기본 재유도, 비행 미사일 Damage Reservation, 기존 3계열/Lv10/Lv15/Lv20의 역할 조정, Primitive 미사일 표현, `/dev` 한국어 조절 항목과 Tooltip을 연결한다. 새 Asset·다른 무기 밸런스·새 콘텐츠는 추가하지 않는다.

M9의 Frame당 Enemy Render, readonly snapshot/ID index 재사용, VFX 상한/Graphics 재사용을 유지한다. 전체 표적 탐색은 발사/재유도 이벤트에서만 수행하고 매 비행 Frame마다 Missile×Enemy 전체 탐색을 하지 않는다. 예약은 단순 Map이며 예측 AI/전용 물리 엔진을 추가하지 않는다.

최소 확인은 3발과 발사 간격, 사망 표적 재유도, 약한 적 분산/강적 집중, 예약 해제, 3계열 및 Lv10/15/20, Dev Panel 연결과 `npm run check`다. 장시간 자동 Run/DPS 분석/난이도 판단은 하지 않는다.

### 2.11 M11 Prototype Scope — Meta Foundation

Meta Hub·Save v1·자연 종료 정산·11종 연구·Credits Reroll·Run 시작 Snapshot·Result 왕복·Save Export/Import/Reset·DEV Meta 도구를 포함한다. 승계 문서의 영구 연구/보상/저장 제외 문구는 이 범위에서 대체한다. 무기·Horde·Enemy·Boss 기본값을 다시 조정하지 않으며 작전 기록·숙련·실제 점진 해금·Challenge·Endless·Stage 2+·신규 Character·Awakening·희귀 재화·Variant·Final Art·Ranking/Backend는 구현하지 않는다.

최소 확인은 Save/default/지속/JSON/reset·보상 1회·수동 Restart 무보상·연구 구매/MAX/잔액·Meta 피해/속도/사거리/치명/방어/XP·Reroll 구매/Run 사용 경계 및 `npm run check`다. 100 Run 경제 분석·평균 MAX 시간·최종 Level 분석·장시간 Balance Simulation을 하지 않는다. 성장 체감과 경제 속도는 사용자 Playtest가 결정한다.

## 3. Prototype Tuning

아래는 **첫 시험 목표이며 최종 확정 수치가 아니다.** Future Economy 숫자는 설계 기록이며 1차 Prototype 구현 의무가 아니다. 장기/Future 수치를 현재 데이터나 테스트 기대값으로 자동 적용하지 않는다. M3 화면 규칙은 유지하며 M4/M5 당시 Tuning은 역사 기록이다. 미사일 최신 변경 수치는 §3.12 M10을 우선한다. 그 외는 §3.9 M7 및 승계한 M6 수치를 유지한다.

| 항목 | 첫 시험 방향 |
| --- | --- |
| 공식 Stage 길이 | 최종 Boss 포함 약20분 전후; 강제 20:00 종료 아님 |
| 평균 종료 Character Level | v0.4의 Lv40~50 첫안, 20분 구조에서 재검토 |
| Character Lv5 도달 | v0.4의 약45~60초 첫안, 20분/점진 해금에 맞춰 재검토 |
| Character Lv10 도달 | v0.4의 약2~3분 첫안, 재검토 |
| 투자 가중치 | 기본 개조 성장 내부 선택은 최대×1.4. 다른 성장의 기존 최대×2 유지. `base weight × investment bonus` |
| 대성공 | 대상 카드 선택 후 6%, 총 +2 Level |
| Run 사거리 카드 | 약5단계 첫 방향; 증가율·낮은 가중치 수치 미정 |
| 해금 Pool | 유물 처음 약3종→전체 약10종, Overclock 무기당 처음 약2종→전체5종 |
| Meta Reroll | 약 1→2→3회 확보 방향, 상세 비용/총량 미정 |

### 3.1 일반 레벨업 카드 희귀도 확률

**Character Level** 기준이며 카드 종류 추첨과 별개다. 유물·코어 드롭, 무기 최초 획득·분기·초월·Overclock 이벤트에 자동 적용하지 않는다.

| Character Level | 일반 | 희귀 | 유니크 | 전설 |
| --- | --- | --- | --- | --- |
| Lv1~9 | 78% | 20% | 1.9% | 0.1% |
| Lv10~19 | 68% | 27% | 4.7% | 0.3% |
| Lv20~29 | 58% | 33% | 8.4% | 0.6% |
| Lv30+ | 50% | 36% | 13% | 1% |

사거리 카드에는 일반 등급을 허용하지 않는다. M4에서는 일반 가중치를0으로 놓고 나머지 세 등급을 재정규화한다. 이미 보유한 전설 개조는 전설 가중치를0으로 놓고 남은 등급을 재정규화하여 동일 전설의 재획득을 막는다. 품질 개방 보유 시 일반 성장에 +1단계를 적용하되 특별 선택은 제외한다.

성능 첫 방향은 일반 **1배**, 희귀 **약 1.6배**, 유니크 **약 2.4배**, 전설 **약 3배 이상 또는 행동 변화**다. 공격력·공속·치명 확률에 기계적으로 같은 배율을 적용하지 않는다. M4 공용/기본무기/사거리와 M5 특수무기 coefficient/quality의 첫안 효과와 점감은 구현 기록을 따른다. 최종 밸런스는 사용자 Playtest 대상이다.

### 3.2 Gold 첫 Prototype 수치 — Future Economy, 최종값 아님

**M11:** 아래 첫안은 역사 설계로 보존한다. 실제 적용한 연구 효과/비용/보상 공식은 §3.13이 우선한다.

아래 일반 단계와 돌파 단계의 수치는 **돌파 단계에서 일반 증가를 대체하는 가산 첫안**으로 읽으면 제시된 누적값과 일치한다. 실제 합산/곱산 공식과 적용 coefficient는 구현 전에 확정한다. 수치만 데이터에 선반영하지 않는다.

| 연구 | 첫안 증가 | MAX 첫안 |
| --- | --- | --- |
| 기본무기 화력 20단계 | 일반+10%, Lv5 +25%, Lv10 +35%, Lv15 +45%, Lv20 +60% | 누적 약+325% |
| 기본무기 공격속도 20단계 | 일반+5%, Lv5 +15%, Lv10 +20%, Lv15 +25%, Lv20 +30% | 약+170% |
| 특수무기 피해 20단계 | 화력과 유사한 강한 성장; 세부 단계 미정 | 약+325% |
| 성벽 최대 HP 20단계 | 세부 단계 미정 | 약+350% |
| 치명타 확률 약10단계 | 세부 단계 미정 | 약+40%p |
| 치명타 피해량 약10단계 | 기본 배율 강화 | 추가 약+2.1배 검토, 최종 배율 미정 |
| 특수무기 공격 주기 약10단계 | 최소 Cycle 별도 설계 | 약-60% |
| 정예·보스 피해 약10단계 | 세부 단계 미정 | 약+210% |
| 성벽 피해 감소 약10단계 | 100% 감소에 접근하지 않도록 수학적 상한 필요 | 약-45% |
| XP 획득 약10단계 | 일반+10%, Lv5 +20%, Lv10 +30% | 누적 약+130% |
| Marine 사거리 약5단계 | Lv1~4 각각+10%, Lv5 +20% | 누적 약+60% |

Gold 사거리 MAX만으로 항상 전장 전체 공격이 되지는 않는다. Gold 연구 가격표·최소 Cycle·피해 감소 공식은 미정이다. 단계 수가 적은 특수 연구는 단계당 효과와 가격이 크다.

### 3.3 과거 15분 재조정 및 기타 시험 항목

과거 15분 기준의 **정예 약5회 / 첫 정예 유물 보장 / 이후 유물35% / 코어5%**는 역사적 논의 수치일 뿐 v0.5 확정값도 현 코드 설명도 아니다. v0.6에서는 새 20분 첫안을 아래 §3.4에 별도로 기록하며 과거 값 자체를 자동 승계하지 않는다.

Elite 횟수와 유물/코어 드롭률의 첫안은 §3.4를 따른다. 시너지 배율·지속시간·cooldown, Enemy 스탯, Boss 상세 수치, Challenge Point, Endless 상승 곡선은 미정/Playtest Tuning이다. 숙련 Point80 중 핵심 약40의 예시는 유연한 해금을 설명하며 확정 요구량이 아니다.

### 3.4 Stage 1 / 보상 첫안

| 항목 | Prototype Tuning |
| --- | --- |
| 전체 Stage / Boss | Boss 포함 약20분, Boss전 약1분 전후부터 시험 |
| Elite | 약5회, 약4~5/8~9/12~13/16/18분대 창 내 Randomize |
| 유물 | 해금 계정 기준 첫 Elite 기회 보장, 이후 약30~35%; Run 평균 약1~2개 자주 경험 목표 |
| Core | Elite당 약3% Roll, 획득 후 추가 Roll 없음. 대부분 Run에는 없는 High-roll 목표 |

고정 초 Spawn·정확한 HP/피해/약점 임계·배율·Stage 길이·확률은 최종 확정하지 않는다. 일반 Spawn을 멈추지 않는 완화 구간과 후반 물량 증가의 체감을 함께 검증한다.

### 3.5 Future Economy — 획득과 성장 속도 시험안

**경제를 1차 Prototype에 구현한다는 뜻이 아니다.** 미래 경제 첫안도 사용자 확정 논의로 기록한다.

| Run 결과 | Gold 첫안 | Credits 첫안 |
| --- | --- | --- |
| 초반 실패 | 약100~250 | 0~5 |
| 10분 이상 생존 | 약300~500 | 5~10 |
| Boss 근처 | 약500~800 | 10~20 |
| Stage1 Clear | 약900~1300 | 25~40 |

Stage/Challenge/Endless 상승으로 수입 증가, 기록/Challenge/Endless 별도 Credits 보상 가능. 첫 실패 뒤에도 초기 연구 한두 개를 시도할 수 있는 체감을 목표로 한다. 낮은 보상과 연구 가격이 이 목표를 충족하는지 Playtest로 조정한다. 실패=0 Gold 구조는 금지한다.

기본무기 화력 20단계 **예시 비용**:

| Level | 약 Gold 비용 |
| --- | --- |
| 1 / 2 / 3 / 4 / 5 | 120 / 180 / 260 / 380 / 650 |
| 6 / 7 / 8 / 9 / 10 | 850 / 1100 / 1400 / 1800 / 3000 |
| 11~14 | 4000~8000 범위 |
| 15 | 12000 |
| 16~19 | 16000~35000 범위 |
| 20 | 60000+ |

초기 저렴, 중반 증가, Lv5/10/15/20 돌파 가격 상승, 후반 급상승. 첫3~5 Run에 여러 초기 연구 체감, 집중 시 약5~10 Run 내 첫 Lv5 돌파, Lv10부터 장기 목표다. Stage1 반복으로도 성장하되 높은 Stage/Challenge 수입이 후반을 가속한다. 가격표와 속도 목표는 실제 경제에서 함께 검증하며 최종값이 아니다.

| Credits 용도 | 경제 첫안 |
| --- | --- |
| Reroll I / II / III | Run당1/2/3회, 각각 약50/150/400 Credits; 업그레이드별 표기이며 구매·누적 비용 상세 미정 |
| 작은 Unlock | 약50~150 |
| 중형 Unlock | 약200~500 |
| 대형 Unlock | 약700~1500+ |

기본 Reroll0과 High-Variance 유지. 원하는 Build를 보장할 정도로 과다 지급하지 않는다. Run 희귀 효과로 +1 등은 가능하다. 정확한 콘텐츠 가격대 배치·획득식은 미정이다.

### 3.6 M4 — Horde + Weapon Growth / Historical Tuning

**확정 구현 범위:** 공용 공격력/공격속도/치명 확률3종, 관통/도탄/점사/다중탄/폭발탄/고위력6종 중 최대3종, 상한 없는 반복 Level, 별도 사거리 카드, 종류와 분리된 희귀도, 투자 가중치, 대성공6%, 대표 전설3종, M3 Owner HUD 연결. 자연 조합은 별도 시너지 카드 없이 동작한다. Marine Magic은 계속 제외하고 자산을 보존한다.

**플레이 피드백:** M3와 M4 첫 튜닝이 너무 쉬움. 우선 난이도 축은 Enemy Count다. M4 첫안에서 공급량을 초반40~50%/중반약60%/후반약80% 늘린 뒤, 사용자가 요청한 **현재 물량 약2.5배** 추가 패스를 반영한다. 이동속도는 M3의 M2 대비1.5배를 그대로 유지한다. HP·Shield·Elite 행동으로 추가 난이도를 만들지 않는다. Grunt 중심,5~6분/11~12분 완화 유지.

- 최신 초기80명, 첫안32명의2.5배. 선두3명은 그대로이고 추가 물량은 먼 위치에 배치한다.
- 최신 batch 평균은 첫안의약2.5배, cap도2.5배. 초반cap175→250, 후반최대700. cap은 구현 제한/시험값이며 최종 성능 보증이 아니다. 정확한 구간 표와 실제 active 측정은 [M4 기록](../prototype-m4-horde-weapon-growth.md).
- XP `ceil(8+4(L−1)+.35(L−1)²)`. 적 XP는 유지한다.20분 성장 속도는 실제 자동 검사와 사용자 플레이로 평가한다.
- `rank / quality / legendary` 분리. rarity가 Level을 대신하지 않는다. 공용3종과 개조는 반복 성장하고 안전 한계에서 효과 없는 카드는 제외한다.
- 사거리5Level, type weight .25, 일반 없음. 희귀/유니크/전설당 최소 progress 감소 .03/.045/.06, 기본 .55에서 하한 .25. 형태 개조 슬롯 미사용.
- type weight 공용1/개조1.3에 `min(2,1+.1×rank)` 투자 배율. 희귀도 표는 §3.1, 투자 가중치는 rarity에 영향 없음.
- 대성공 독립6%로 총+2Level. 사거리MAX는 실제 증가분만 적용/표시한다.
- 전설 관통은 끝점 충격파, 점사는 추가 마무리탄, 폭발탄은 처치 후 최대2곳 한 단계 재폭발. 다른3종의 별도 전설 행동은 후속이다.
- Gauss 시간차 점사와 동시 다중탄을 구분한다. 기본 Cycle800ms, 내부 발사 간격과100ms recovery 하한을 둔다. 관통/도탄/다중탄/폭발의 검색·대상 수를 제한하고 Lv11+에는 피해/효율 숙련을 지속한다.

**Future / 미정:** 최종 증가율/XP/밀도/모바일 성능, 나머지 전설 행동, 특수무기별 coefficient. 특수무기3종·새 유물/코어·명명 시너지·Boss·Meta는 이번 구현에 포함하지 않는다. GDD 전체 목표가 M4 완료 목록은 아니다.

### 3.7 M5 — 특수무기 / 개발용 배속 / 생성 HP / Historical Tuning

| 무기 | 기본 피해 / Cycle | 기본 표현 | 공용 공격력 / 공속 / 치명 coefficient |
| --- | --- | --- | --- |
| 수류탄 | 100 / 3600ms | 반경125, 투척720ms | .8 / .55 / .8 |
| 유도 미사일 | 150 / 2700ms | 속도440 논리단위/s, 수명6000ms | 1 / .7 / 1 |
| 드론 | 24 / 900ms | 지속1기 | .75 / .85 / .9 |

치명피해1.75배 유지. 특수 일반 카드 quality는 일반/희귀/유니크/전설당 `1/1.6/2.4/3.2`씩 누적한다. 기본 피해에 `1+.11×quality`, 기본 Cycle 분모에 최대 `.45`까지 `.012×quality`, 수류탄 기본 반경에 최대 `.3`까지 `.008×quality`를 적용한다. 공용 피해/공속/치명은 위 coefficient로 각 무기 strength에 반영하며 기본 Cycle 하한180ms, 치명확률은 점감한다. 선택별 행동 배율과 정확한 공식은 [M5 기록](../prototype-m5-special-weapons.md)에 둔다.

개발용 버튼은 Pause 바로 왼쪽 `X1→X2→X4→X1`, 시작/재시작X1이다. 게임 진행/전투 delta만 배속하고 실제 입력·UI 시간은 유지한다. Phaser 전역 timeScale을 쓰지 않는다. 최종 게임의 영구 성장 시스템이 아니다.

추가 요청의 Character Level 생성 HP: `x=max(0,L−1)`, `M=1+.015x+.0005x²`. Lv1/10/20/40/60 배율은 **1/1.1755/1.4655/2.3455/3.6255**다. 일반/정예 본체HP·maxHP와 ShieldHP·maxShieldHP에 생성 시 적용하며 기존 적을 소급 수정하지 않는다. 본체는 기존 시간HP×1→1.1 위에 곱하고, Shield는 Level 배율만 새로 적용한다. 계수는 data/config Prototype Tuning이다.

M4 초기80명/후반 cap700/Spawn 간격·물량과 M3 이동속도1.5배는 유지한다. Level HP 추가 이외의 임의 밀도/속도/난이도 조정은 없다. 자동 밸런스 결론 없이 사용자 직접 Playtest를 기다린다.

### 3.8 M6 — 당시 Prototype Tuning / Historical

#### 직접 Playtest 피드백과 이번 범위

사용자는 M5도 너무 쉽고, X2/X4 전투 속도감이 X1보다 재미있으며, 수류탄이 너무 강하고 자주 발사되고, Level-Up 선택이 전투를 자주 끊고, 후반 적이 너무 쉽게 죽는다고 평가했다. 원 요청은 M4 Horde 유지였으나, 이후 사용자가 초기 적을80명보다 줄이고 시간이 흐를수록 공급을 훨씬 더 늘리도록 변경했다. 이 후속 요청을 우선하며 정상 Combat Tempo 상향, 생성 HP 곡선 강화, XP 성장 완화, 수류탄 약화를 함께 반영한다. 평범한 Run과 여러 시스템이 겹쳐 강해지는 High-roll Run을 함께 허용한다.

#### Run Clock과 Combat Tempo

```text
runDelta = 실제 frame delta × Developer Speed (1 / 2 / 4)
combatDelta = runDelta × Normal Combat Tempo (1.5)
```

Stage 경과 시간은 runDelta만 사용한다. 정상 X1에서 일시정지·선택 시간을 제외한 Stage 목표는 실제 약20분이며 Combat Tempo가 종료 시간을 줄이지 않는다. Enemy 이동/공격, Spawn 진행, Gauss/특수무기 Cycle, 투사체, 드론, 전투 효과와 지속시간은 combatDelta를 사용한다. CombatScene.update가 runBalance.combatTempo를 한 번 곱하고, advanceWorld가 소비한 combat step÷tempo를 Stage에 전달한다. Stage 종료까지 남은 시간도 combat 단위로 변환해 정확한 종료 경계를 유지한다. 각 시스템 내부에 다시1.5를 곱하지 않는다. Phaser 전투 Flash/지연 효과도 `Scene.time.timeScale = Developer Speed × Combat Tempo`로 맞춘다. 네이티브 DOM 입력·Gesture·UI 시간은 실제 시간을 유지한다.

Pause 왼쪽 **X1→X2→X4→X1**과 재시작X1을 유지한다. X1은 새 정상 전투, X2/X4는 Stage Clock까지 빨라지는 **Development Tool / Not Final Feature**다. 초기 물량 감소/후반 공급 강화는 후속 사용자 요청을 따르며 정확한 수치는 아래 Horde 기록을 따른다. M3 이동속도1.5배 설정은 유지하고 새로운 정상 Tempo가 체감 이동을 더 빠르게 만든다.

#### Horde — 후속 요청 반영

원 명세의 M4 물량 보존보다 나중에 주어진 **초기 적 감소 + 시간이 흐를수록 훨씬 강한 공급 증가** 요청을 우선했다. 시작 적은 **80→36명**, 선두3명과 위치/적 조합/최대 cap700은 유지한다. 이전 REGROUP/SECOND BREATHER/FINAL HOLD의 공급 급감은 제거하고 모든 구간을 pressure로 이어간다. 정상 X1의 실제 Stage 시간에 맞춘 공급은 다음과 같다.

| Stage 분 | 평균 batch | 내부 interval ms | Active cap |
| --- | --- | --- | --- |
| 0 | 3 | 1800 | 175 |
| 3 | 8 | 1400 | 250 |
| 5 | 12 | 1300 | 250 |
| 6 | 18 | 1200 | 325 |
| 7.5 | 24 | 1100 | 375 |
| 9 | 32 | 1000 | 425 |
| 11 | 40 | 950 | 425 |
| 12 | 48 | 850 | 500 |
| 15 | 64 | 700 | 600 |
| 18 | 84 | 600 | 700 |
| 19 | 96 | 550 | 700 |

내부 interval은 combat time이며 정상 X1 실제 간격은 표의 값÷1.5다. 기존 batch±2/interval±12% 변동은 유지한다. Director는 combat clock으로 진행하므로 config의 Phase `atMs = 목표 Stage ms ×1.5`로 두어 마지막19분 구간이12분40초에 일찍 도착하지 않게 한다. Lane specialization은 실제9분. Elite 창은 기존 combat-clock 일정이다. 자동 결과로 물량을 낮춘 것이 아닌 사용자의 후속 방향을 반영한 시험값이다.
#### Enemy HP와 XP

`x=max(0, CharacterLevel−1)`.

| 항목 | M5 | M6 |
| --- | --- | --- |
| 생성 HP 배율 | `1+.015x+.0005x²` | `1+.020x+.0008x²` |
| 다음 Level XP | `ceil(8+4x+.35x²)` | `ceil(8+5x+.50x²)` |

새 HP 배율은 Lv1 **1.0000**, Lv10 **1.2448**, Lv20 **1.6688**, Lv40 **2.9968**, Lv60 **4.9648**이다. Grunt/Runner/Shield 본체와 방패/Elite에 생성 당시 Character Level을 적용한다. 이미 생성된 적은 Level-Up 때 HP가 늘지 않는다. 기존 시간 기반 본체 HP 배율은 유지한다. 플레이어 성장에1:1로 따라붙는 적응형 HP 시스템이 아니다.

초반 Grunt1-shot과 빠른 초기 성장 방향을 유지하면서 중반 선택 중단과 후반 즉사 문제를 완화한다. Lv5/10 무기 획득과 Lv15/20 성장 경로는 유지한다. 특정 최종 Character Level은 목표로 잡지 않는다.

#### 수류탄 변경

| 기본 Lv1 항목 | M5 정상 X1 | M6 내부 config | M6 정상 X1 체감 |
| --- | --- | --- | --- |
| 피해 | 100 | 65 | 65 |
| Cycle | 3600ms | 7800ms | **5200ms** |
| 반경 | 125 | 110 | 110 |

`7800 / 1.5 = 5200ms`. 이는 공용 공속·무기 quality·Relic·분기 효과가 없는 기본 반복 주기다. 획득 직후 첫 공격은 기존처럼 빠르게 시작한다. 공간 공격/다수 Grunt 처리/Impact 역할과 Lv3/6/10/15/20 성장을 유지한다. 미사일·드론에 별도 대규모 Nerf는 하지 않는다.

#### Relic — 무레벨6종

기본 최대2개, 동일 Relic 중복 없음, 획득 즉시 완성, 패널티 없음. 첫 Elite 처치는 획득 기회 보장, 이후 **32%**. 미보유 유효 후보 최대3개 중1개 선택이다. 이미2개면 새 후보 선택 후 기존 하나 교체 또는 새 Relic 포기한다. Prototype에서는6종을 모두 해금한다.

| Relic | 실제 연결 / 첫 수치 |
| --- | --- |
| 고속 장전 장치 | 모든 특수무기 공격 Cycle ×.8, 즉20% 감소 |
| 충격 탄약 | 모든 공격 적중 시12% 확률로 progress .025 밀치기, Elite는 그25%인 .00625 |
| 정밀 조준기 | 공용 Critical Chance +12%p |
| 과충전 축전기 | Attack Action 시작 시8% 확률로 피해×2, Burst/Multishot 전체에 같은 판정 결과 |
| 탄약 복제기 | Basic Attack 전체를8% 확률로1회 반복, 복제는 복제를 발동하지 않음 |
| 전설 증원 병력 | Marine +1, 현재 Gauss/기본무기 개조를 사용한 독립 Auto Fire. 특수무기 복제 없음 |

#### Core — 즉시 지급3종

Elite 처치 시 **3%**, Run 최대1개, 무레벨. 유효 Pool에서 랜덤1개를 즉시 지급하며 Core 선택3장을 띄우지 않는다. 획득 후 추가 Core Roll은 없다. 같은 Elite에서 Relic과 동시 발생할 수 있으며 **Core 효과 → 필요한 Special Event Queue → Relic 선택 → 일반 Level-Up** 순서로 진행한다.

| Core | 실제 규칙 변경 |
| --- | --- |
| 무장 확장 | 특수무기2→3, FIFO 획득 이벤트1회 추가. 기존2개 보유 시 남은 마지막 무기를 Lv1로 지급. Lv5 전 획득하면 첫 무기를 일찍 얻고 이후 Lv5/10 이벤트로 총3개. 하단 세 번째 슬롯 동적 추가 |
| 개조 확장 | 기본무기 형태 개조3→4. 보유 Rank 유지, 이후 일반 후보에서 새 네 번째 개조 등장 가능 |
| 품질 개방 | 일반→희귀→유니크→전설, 전설 유지. 과거/미래 일반 성장에 실제 효과 소급 |

##### 품질 개방의 소급

일반 성장의 원래/현재 희귀도와 실제 Level 증가량을 보존하여 공용 강화, 기본무기 개조, 사거리, 특수무기 일반 Level 성장의 quality에 증가분을1회 반영한다. 특수무기 이력은 이미 적용된 Level과 선택 Queue에 남은 Level을 구분하여 양쪽 quality를 갱신한다. 대성공의 +2 Level도 보존한다. 표시 Label만 올리지 않는다. 이후 일반 카드도 같은1단계 상승을 적용한다. 내부 `EPIC`은 화면의 유니크다.

Relic/Core와 Lv5/10 무기 획득, Lv3 Tree, Lv6 Branch, Lv15 초월, Lv20 Overclock에는 적용하지 않는다. 트리 선택과 이미 얻은 무기 Level을 다시 지급하지 않는다. 전설 행동은 현재 보유 Set에 반영하며 동일 행동을 중복 추가하지 않는다.

#### Synergy — 조건 완성 시 자동3종

기본 개조 각각 Rank1 이상 + 두 특수무기의 정확한 분기 Lv10 Completion이 조건이다. **별도 카드 없음, Lv15/20 불필요, 한 번 활성화되면 Run 동안 유지**한다. 아래 시간은 전투 시간이다.

| Synergy | 조건 | 행동 / 첫 수치 |
| --- | --- | --- |
| 포화 소거 작전 | 점사+다중탄 / 수류탄 집속탄A 융단 폭격 / 미사일 포화A 미사일 스웜 | 1800ms 안에 서로 다른 적8명 적중 → 3500ms Saturation. Gauss 점사+2발, 자탄+4개, 미사일+3발. 활성 중 재갱신 없음 |
| 중력 살상지대 | 관통+폭발탄 / 수류탄 전술탄A 특이점 / 드론 건십A 개틀링 건십 | 실제 특이점 영역을 Kill Zone으로 표시. 내부 적에 Gauss 관통/폭발·드론 피해×1.45, 건십이 내부 적 우선 공격. 특이점 수명과 함께 종료 |
| 추적 섬멸망 | 점사+고위력 / 미사일 헌터B 전술 사냥꾼 / 드론 편대B 울프팩 | 최고 위험 적에 고정 Hunt Mark. Gauss/미사일/드론 집중 및 표적 피해×1.4. 죽거나 사라지면 다음 위험 표적으로1회 전이, 살아 있는 동안 점수 변동으로 왕복하지 않음 |

Gauss는 기본 성장의 최대8발에 Saturation +2발을 허용하는10발 안전 상한을 사용한다. 포화 시 Burst 내부 간격을 기존 Attack Cycle에 맞춰 압축하고100ms 회복 구간을 보존하여 추가 탄환 때문에 다음 Cycle이 늘어나지 않게 한다. 수동 Focus가 Hunt보다 우선하며 Gauss Range는 우회하지 않는다. Saturation 상태, Kill Zone 영역, Hunt Mark를 전장에 표시한다. Hunt Mark는 실제 렌더링된 적 공격 슬롯을 따라가며, 기본/증원 Marine은 성벽 위에서 보이도록 배치한다. 목표 체감은 일반 강화 여러 번 < Synergy < 강력한 Relic이며 적정 세기는 자동 Simulation으로 판정하지 않는다.


### 3.9 M7 — 승계한 Prototype 기본값

공용 강화 카드 하나의 base weight1.0을 기준으로 한다. 아래 값은 최종 등장 확률(%)이 아니라 현재 유효 Pool에서 정규화하는 상대 weight다. 무기/개조 개수로 Category 전체 등장 weight가 늘어나지 않는다.

| Category / 항목 | M7 첫값과 규칙 |
| --- | --- |
| 첫 Special Acquisition |0.30, Character Lv8 이상, 보유0종 |
| 두 번째 / Core 허용 추가 Acquisition |0.20, Character Lv14 이상, 이미1종 이상 보유, 현재 capacity 미만 |
| 신규 Basic Mod Category |0.45, 미보유 개조와 빈 슬롯이 있을 때만 |
| 보유 Basic Mod Growth Category |0.35, 보유 개조가 있을 때만 |
| Mod Investment Bias |내부 개조 선택 `min(1.4, 1+.1×rank)`; Category weight 자체는 고정 |
| 보유 Special Growth |기존 `1.3×min(2,1+.1×(WeaponLevel−1))` 유지 |
| Range |별도weight0.25, Rare 이상, 최대5, Mod Offer 제한·Slot 미사용 |
| 한 Offer 제한 |Special Acquisition≤1, 신규+보유 Basic Mod 합계≤1 |

무장 확장 Core는 capacity3과 기존 예외 획득 Queue1회를 유지한다. 아직 무기가 적다면 미보유 무기1종을 먼저 얻고 이후 일반 Acquisition이 남은 슬롯을 낮은 확률로 채운다. 기존2종이면 남은 무기1종을 획득한다. Lv5/10 지급을 재생성하지 않는다. 세 번째 일반 Acquisition도 Core로 capacity3이 열린 경우에만 가능하다.

| Boss 항목 | 첫값 / 동작 |
| --- | --- |
| HP |30,000 고정 Prototype 값, 일반 적 Character Level Scaling 미적용 |
| 등장 |Stage18:50 공급 완화,19:00 공성 거인1회 |
| 접근 |중앙 Soft Lane 부근에서 progress0 출발, .025/combat second, offset.5 + .12×sin(progress×2π)로 완만한 좌우 이동 |
| 공성 Charge |progress .60에서 정지,6000combat ms(정상X1 약4초) Telegraph |
| Weakpoint |Charge 중 누적 본체 피해1800이면 공성 취소; 본체는 항상 피해를 받음 |
| 실패 |Wall1800피해, 다음6000combat ms Charge 반복 |
| 중단 성공 |3000combat ms Stagger, 받는 피해×1.5, 끝나면 공성 재개 |
| 증원 |HP≤65%에서 한 번, Grunt24+Runner8, cap이 차면 남은 증원 대기 |
| 최후 돌진 |HP≤25%, 복잡한Charge 종료·.09/combat second로 Wall 접근 |
| 최후 Wall 공격 |도착 후1800combat ms마다1000피해, 첫 공격도 도착 후1주기 |
| 일반 Horde |경고/일반Boss Phase batch8·1400combat ms, Final batch32·700combat ms, cap700 |
| Elite |18:50 공급 완화부터 새 Elite 억제, 기존 전장 적은 유지 |
| 저항 |Boss는 약한 밀치기·중력 끌어당김·Shield 보호 aura 대상에서 제외; 강제 무적은 없음 |

Boss 일반/최후 Horde 전환 전 구간은 M6 공급을 유지한다. 정상 Combat Tempo1.5와 Stage Clock은 계속 분리하고, Boss 등장은 Stage time/전투Pattern은 combat time을 소비한다.20분에서 시간이나 simulation을 자르지 않는다. 약19~21분은 목표 방향이며 난이도·HP·등장감·획득시점·성장감·최종Level·평균DPS를 자동 Simulation으로 판정하지 않는다. 사용자 직접 Playtest 후 조정한다.

### 3.10 M8 Runtime Override — 기본값을 바꾸지 않는 시험 도구

M7 기본값은 §3.9와 소스 data에 남는다. Runtime Store는 기존 설정 export를 안정된 객체로 유지해 시스템이 최신 숫자를 읽게 하고, 개발 패널 설정은 별도 Override로 저장한다. 일반 게임 코드에 `if (devMode)` 조건을 흩뿌리거나 새로운 밸런스 아키텍처를 만들지 않는다.

| 적용 시점 | 대표 항목 / 경계 |
| --- | --- |
| 즉시 적용 |Combat Tempo, 살아 있는 일반/정예 이동 배율, 다음 Drop 판정·시너지 켜기/끄기 |
| 다음 적 생성부터 |Phase Spawn 간격/batch/cap/비중, Grunt/Runner/Shield/Elite/Boss 기본HP·방패HP, CharacterLevel HP 공식, 생성 시 시간 성장·속도 배율 |
| 다음 공격부터 |Gauss/특수무기 피해·주기·대표 계수·새 투사체, Boss 다음 Charge/취약 시간·반복 공격 간격. 이미 예약된 동작 보존 |
| 다음 레벨업부터 |XP의 다음 Level 기준, 아직 열지 않은 Offer의 Weight·희귀도·대성공·카드 증가량·카드 수. 현재 Offer의 후보·증가량·대성공 확률/레벨 요구XP 보존 |
| 다음 Run부터 |초기 적 수, 기본 개조/특수무기/유물 한도, 시작 성벽HP, 정예 등장 창 |

11개 Horde Phase는 각각 접을 수 있는 분류로 표시한다. Spawn 간격·batch는 Runtime 값이 바뀐 뒤 다음 Spawn 계산에서 사용하며 이미 예약한 생성 타이머를 취소하지 않는다. 유물 보유 한도는 다음 Run부터 적용한다.

특수무기 기본 Cycle 입력은 **현재 정상 Combat Tempo에서 개발 배속 X1일 때 실제 초**로 표시하고 내부 combat ms로 환산한다. 예: 기본 수류탄5.2초는7800combat ms÷1.5다. 기본값 표시는 코드 기본 Tempo를 기준으로 한다. 희귀도는 기존1000분율과%를 함께 표시하고 구간별 합계1000(100%)을 검증한다. 합계가 잠시 맞지 않는 다중 수정은 입력 대기 상태로 두고 함께 적용한다.

JSON은 `{ "version": 1, "overrides": { "gauss.damagePerRound": 12 } }` 형태의 dot-path key와 number/boolean이다. Export/Preset은 코드 기본값과 다른 **적용된 Override만** 보존한다. Import/Preset 불러오기는 현재 Override 전체를 교체하며 잘못된 설정은 부분 적용하지 않는다. 전체 Reset은 Override 저장을 삭제하되 이름 붙여 저장한 Preset은 유지한다.

같은 origin의 BroadcastChannel과 개발용 localStorage만 사용한다. Production은 Vite `import.meta.env.DEV` 분기 밖으로 패널을 노출하지 않고 저장된 Override도 읽지 않는다. 마음에 드는 JSON을 사용자가 별도로 확정하기 전에는 GDD나 소스 기본값을 변경하지 않는다.

### 3.11 M9 Prototype Technical Tuning — Gameplay 수치와 분리

순간 전투 VFX는 **Frame당 최대 16개 Object, 동시에 활성 최대 64개**이며 치명타 Text도 포함한다. 일반 Impact 대상 표시는 **Frame당 최대 96개**로 제한한다. 이 상한은 표현과 재사용 Object 수만 제어한다. 보이지 않은 효과도 실제 Damage·Kill·XP·표식·무기 주기·위치 결과에 영향을 주지 않는다. Flash Graphics는 기존 표시 시간을 유지한 뒤 숨겨 재사용하며 Enemy/Projectile 전체에 새로운 Pool 구조를 도입하지 않는다.

`/dev` 성능 표시는 실제 Frame FPS, 살아 있는 Enemy 수, 화면에 활성인 특수 Projectile/Unit 수, 활성 Combat VFX 수, 해당 Frame simulation sub-step 수를 읽기 전용으로 전달한다. Combat VFX 수는 활성 순간 Flash 그룹·치명타 Label 수이며 개별 도형·HUD·지속 지면 Graphic 수는 포함하지 않는다. 상태 메시지는 약 1초 간격이며 DEV에서만 동작한다. 해당 정보는 코드/GDD 기본값이나 Runtime Override를 수정하지 않는다.

### 3.12 M10 Missile Salvo — Prototype Tuning

최종 밸런스 확정값이 아니다. 성장/유물 효과가 없는 기본 상태이며 raw는 simulation 시간이다. Combat Tempo 1.5가 단 한 번 적용되므로 기본 X1 실시간은 raw/1.5다.

| 항목 | 첫 Prototype 값 |
| --- | --- |
| 기본 발수 | 3 |
| 발당 피해 | 90 (기존 단발150 대체) |
| 발사 간격 | raw270ms → X1 약0.18초 |
| Salvo 주기 | raw4500ms → X1 약3초 |
| 이동속도 | 680 논리단위/전투초 |
| 기본 수명 | raw6000ms → X1 약4초 |
| 기본 자동 재유도 | 1회 |
| Damage Reservation | 기본 ON, /dev에서 OFF 가능 |
| 포화 Lv3/Lv6/Lv10 추가 발수 | +1/+2/+4 → 기본 합계4/5/7 |

성장/공용 공격속도/유물은 기존 무기 스탯 경로에 적용한다. Salvo가 끝나기 전에 새 Salvo를 무제한 적재하지 않는다. 각 성장/초월/Overclock의 상세 시험값과 적용 시점은 [M10 구현 기록](../prototype-m10-missile-salvo.md)에 적는다.

`/dev` 미사일 항목: 기본 일제사격 수, 발사 간격, Salvo 주기, 발당 피해, 속도, 기본 재유도 횟수, 수명, 과잉 피해 예약 ON/OFF, 포화 추가 발수, Hunter 강적 피해, Tracking 재유도 대표값. 모든 항목에 한국어 설명과 적용 시점을 표시한다. 패널은 Prototype Development Tool이며 Production에는 노출하지 않는다.

### 3.13 M11 Meta — Prototype 효과·비용·보상

모든 수치는 첫 Prototype Tuning이며 경제 적절성이나 MAX 소요 시간을 확정한 것이 아니다. 돌파 단계의 증가량은 해당 단계의 일반 증가량을 **대체**한다.

| 연구 | MAX | 일반 Level 증가 | 돌파 증가 | MAX 누적 효과 | 비용 배율 |
| --- | --- | --- | --- | --- | --- |
| 기본무기 화력 | 20 | +10% | Lv5/10/15/20: +25/35/45/60% | +325% (×4.25) | ×1 |
| 기본무기 공격속도 | 20 | +5% | +15/20/25/30% | +170% (Rate ×2.7) | ×1.25 |
| 특수무기 피해 | 20 | +10% | +25/35/45/60% | +325% (×4.25) | ×1.2 |
| 성벽 최대 HP | 20 | +10% | +30/40/50/70% | +350% (×4.5) | ×1.1 |
| 치명타 확률 | 10 | +3%p | Lv5 +6%p, Lv10 +10%p | +40%p | ×3 |
| 치명타 피해 | 10 | +0.15배 | Lv5 +0.35배, Lv10 +0.55배 | 기존 배율에 +2.1 | ×3 |
| 특수무기 주기 감소 | 10 | -4% | Lv5 -10%, Lv10 -18% | -60% (Cycle ×0.4) | ×3.5 |
| 정예·Boss 피해 | 10 | +15% | Lv5 +35%, Lv10 +55% | +210% (×3.1) | ×3.5 |
| 성벽 피해 감소 | 10 | -4% | Lv5 -5%, Lv10 -8% | -45% (피격 ×0.55) | ×3 |
| XP 획득 | 10 | +10% | Lv5 +20%, Lv10 +30% | +130% (×2.3) | ×3 |
| 기본무기 사거리 | 5 | +10% | Lv5 +20% | 기본 coverage +60% | 별도 표 |

20단계 기본 비용: **120, 180, 260, 380, 650, 850, 1100, 1400, 1800, 3000, 4000, 5000, 6500, 8000, 12000, 16000, 21000, 27000, 35000, 60000 Gold**. 연구별 배율을 곱해 반올림한다. 10단계 연구는 이 표의 첫 10개 비용×해당 배율이다. 사거리 비용은 **2000/5000/12000/30000/80000 Gold**다. Credits Reroll I/II/III 추가 비용은 **50/150/400**이다.

기본무기 Rate는 `Runtime Cycle / (Meta Rate × Run Rate)`이며 기존 Burst/Recovery 최소 Cycle을 유지한다. 특수 Cycle은 기존 Run 계산 결과×Meta Cycle로 합성하고 최소 Cycle 및 미사일 Salvo 대기 상한을 유지한다. 치명 확률은 기존 확률에 Meta %p를 더해 최대 1, 피해 배율은 기존 Critical Multiplier에 Meta Bonus를 더한다. 기본무기 화력/속도는 증원·복제 Gauss에도 적용한다. 특수 피해/주기는 Grenade/Missile/Drone에 적용한다.

사거리는 `기본 coverage = 1 - Runtime minProgress`, `Meta coverage = 기본 coverage × rangeMultiplier`, 이후 기존 Run Range 개선과 최소 progress 제한을 적용한다. 기본 .55에서 Meta MAX는 coverage .45×1.6=.72, minProgress 약 **.28**이며 Meta만으로 전체 전장 사격이 되지 않는다. 정예·Boss 피해는 실제 해당 대상의 Primary direct/관통/도탄/폭발·Special·Ultimate에 한 번만 곱한다. 미사일 예약 피해에도 같은 배율을 반영한다. Ultimate는 기본무기/특수무기 피해 연구 배율을 받지 않고 정예·Boss 연구만 받는다.

보상은 자연 종료한 `RunSummary.elapsedMs`의 Stage 시간과 실제 Kill 기록으로 계산한다. `m = min(elapsedMs / 60000, 20)`이며 개발 X2/X4를 별도 Reward 배율로 사용하지 않는다.

```text
Gold = 100 + floor(25 × m)
       + min(100, floor(0.02 × Kill))
       + min(100, 10 × EliteKill)
       + (Clear이면 400)
Credits = floor(m / 2) + min(5, EliteKill) + (Clear이면 20)
```

실패에도 Gold와 조건에 맞는 소량 Credits를 지급한다. Kill 기여와 생존시간 기여에 상한을 두며 자동 Run으로 목표 보상 범위에 억지로 맞추지 않는다. Boss 처치 Clear는 Stage 1 Clear 여부/횟수와 완료 Run 수를 갱신한다. Stage 2를 추가하지 않는다.

## 4. Future / Not in Prototype 및 미정

**M11 이후 범위 구분:** 아래 승계 문서 중 Gold Meta 연구 11종·Gold/Credits 지급·Credits Reroll·localStorage 저장은 더 이상 미구현 항목이 아니다. 현재 규칙은 §1.26·§2.11·§3.13을 따른다. 나머지 장기 경제 사용처·작전 기록·숙련·계정 해금·신규 콘텐츠 설계는 삭제하지 않고 Future로 보존한다.

### 4.0 보류 범위와 추가 확정 장기 방향

**1차 Prototype에서 구현하지 않음:** Gold Meta 연구 전체, Credits Economy, 실제 작전 기록, 실제 점진 Content Unlock UX, Challenge, Endless, Stage2+, 신규 Character, Awakening, Weapon Variant, Build Preset, Cosmetic, 친구 기록/Ranking, 장기 Account Economy, 전체 Relic10/Core5/Synergy6, 모든 Lv15/Lv20 후보, 완성형 Tutorial/Onboarding. 설계는 보존하고 개발 테스트 해금으로 우선 전투 재미를 검증한다.

**Stage2+는 Future Content만** 기록한다. Stage가 추가되며 새 Enemy Type/Boss/전투 문제가 증가한다는 장기 방향을 유지하되 구체 Enemy/Boss/Director와 이전 원거리병·Boss 세부안을 확정 설계로 넣지 않는다.

#### 작전 기록 — 자동 달성과 직접 해금

생존/무기/Build/Challenge 중심. **완료 버튼 없이 조건 충족 시 자동 달성**, Run 종료 화면에서 보상 정리. 초기 예시는 첫 작전 종료, 5분 생존, Character Lv10 최초, 첫 Elite 처치, 개조2종 동시, 수류탄 다수 동시 처치, 수류탄 Lv10, 첫 유물, 한 Run 유물2개다. 자연스러운 Tutorial 역할을 한다.

직접 해금 후보: 관통 다중 처치→도탄, 점사 성장→다중탄, Elite 관련 기본무기 기록→고위력 단발, 수류탄 누적 처치→전술탄, 수류탄 특정 Lv10→새 Overclock, 미사일 Lv20 최초→미사일 Overclock, 드론 요격→요격 성장. 정확한 조건·숫자는 미정이다.

Build 기록 후보: 개조3종, 특수무기2종 모두Lv10, 최초Lv15 초월, 최초Lv20 Overclock, 전설 카드2개 이상, 유물2개, 첫 시너지, 시너지+Overclock 동시, 첫 Core. 깊이 있는 Build를 경험하도록 유도한다.

HUD에 숙제 목록을 상시 노출하거나 진행 숫자 Popup을 반복하지 않는다. 메인 화면은 전체 진행 정도, 달성 순간은 짧은 **작전 기록 완료**, 상세 보상은 Run 종료 화면이다. 소수 비밀 기록은 가능하나 핵심 해금을 Secret Record에 걸지 않는다.

#### 경제 역할 확장

Gold는 실패 Run에서도 지급한다. 생존시간/Kill/Elite/Boss/Challenge로 계산 가능하며 실제 공식은 미정이다. Credits는 선택권·콘텐츠 확장이 주 역할이지 직접 공격력+5% 구매가 주 역할이 아니다. Reroll, 일부 개조/유물, Variant, 내부 특수무기 콘텐츠/Overclock, Preset/Cosmetic/편의 기능이 사용 후보다.

**플레이 조건/작전 기록 + 필요하면 Credits** 형태를 우선한다. 예: 도탄 기록 해금, 다중탄 숙련+Credits, 고위력 단발 Elite조건+Credits, 고급 유물 발견+Credits, 내부 Variant/Overclock 사용기록+Credits. 수류탄/미사일/드론 자체를 Credits Grind만으로 잠그지 않는다.

희귀 영구 재화는 이름 미정인 성취형 보상이다. Stage 최초 Clear, 주요 Boss 첫 처치, 높은 Challenge 최초, 주요 기록, Endless 기록, 큰 숙련 Milestone 등 명확히 보이는 조건을 사용한다. 반복 Random Drop 중심이나 Gold/Credits 직접 교환을 지향하지 않는다. 신규 Character/Awakening/큰 Account Expansion 용도다.

#### 신규 Character / 계정 공유 / Awakening

현재는 Marine만 구현한다. Future Character는 단순 Marine 스탯 Variant가 아니라 기본 공격·사거리·개조·특수무기·보조 기술·필살기·시너지 상당 부분이 다르다. 중거리 Marine, 근거리/화염형, 장거리 저격형, 상태이상/광역 제어 Mage가 예시다. Marine에서 분리할 Frost Nova/Chain Lightning은 Mage용으로 활용 가능하다.

**추천안, 최종 구현 전 재검토 가능:** 계정 공유는 Credits·희귀 영구 재화·Stage/Challenge/Endless·일부 시스템 해금. Character별은 Gold 연구 트리·작전 기록/숙련·전용 무기/개조·일부 유물/시너지 해금·Awakening. **Gold 통화는 계정 공유, Gold 연구는 Character별**을 우선 추천한다.

Awakening은 단순 공격력+50%가 아니라 캐릭터 기본 규칙 하나를 바꾼다. I/II/III 단계형 방향, Marine의 새 연쇄 행동이나 집중 Target 기반 특수 강화가 예시다. 숙련·Stage Progress·특정 기록·희귀 재화를 조합하는 조건 방향이며 정확한 효과/비용은 미정이다. 현재 Prototype 제외다.

아래 미정 사항은 보존하되 전체가 1차 Prototype 의무는 아니다.


- **전투/성장:** 기본 사거리·논리 거리 판정 상세, Run 사거리 단계·희귀도 조건부 분포·가중치·대성공 적용 여부, Gold/Run 합성, XP식·20분 성장 속도, 초기 소총·적 수치.
- **기존 v0.4 상세:** 기본 개조6종의 행동 성장표·무한 숙련, 독립 전설 Pool·호환, 무기 coefficient·점감, 특수무기 분기 수치·Lv11~14·Lv15 Pool·Overclock 상세, 드론 요격 배치.
- **새 코어:** 이중 초월 대상/소급 UX, 품질 개방의 과거 카드 이력·효과 재계산·전설 중복/행동 처리, 무장 확장과 계정 잠금, 유효 코어가 없을 때 처리. Run1개와 즉시 랜덤 지급은 확정이다.
- **유물/시너지:** 초기10종의 상세 수치·일반 후보 효과·등장률·초기 해금3종, 교체 UX, 저항 수치, 추가 Marine 타겟. 시너지6종 조건/효과 방향은 기록하되 요구 개조 Level·표식/구역/노드 판단과 수치는 미정이다.
- **Stage/모드:** 새 적의 상세 행동, Boss Pattern 수치, Elite/보상 첫안 재조정, Challenge Point/보상/Type 공개 경계, Endless 곡선·Boss 공개 정책·기록 방식.
- **Meta:** 해금 순서와 실제 기록 목록·Point·요구량, Gold 가격/합성식/안전 상한, Credits 상세 사용처, 희귀 영구 재화명·경제·저장, Awakening 조건.
- **UI/선택:** 해금 후보 부족 대응, 단일 후보 자동 처리 범위, 여러 특별 이벤트 우선순위, Header/Safe Area/Popup·현재 빌드 상세, Reroll 획득·적용 화면·재등장 규칙.
- **미래:** 비밀 진화·발견/Codex·친구 기록/공유·Final Art는 자동 구현하거나 일괄 확정하지 않는다.

### 4.1 계승한 v0.4→v0.5 변경 기록

| v0.4 또는 이전 방향 | v0.5 우선 규칙 |
| --- | --- |
| 약15분 Stage | 최종 Boss 포함 약20분 전후, 보상/정예 수치 재조정 |
| 현재 전장 전체 기본 사격, 목표 사거리 미정 | Marine 중거리, 캐릭터/Gold/Run 3층 사거리 |
| 시너지 연결 후보, 현재 카드 선택 | 특정 기본 Build+특수 A/B Lv10의 3중 조건 자동 활성, 초기6종 |
| 코어4후보·Run1 시험 방향·선택 UI | 초기5종, Run1 확정, 유효Pool 랜덤 즉시 지급, 품질 소급 |
| 트리 전부 공개/랜덤3 | 전체 해금 상태의 규칙; 계정 잠금 후보 제외, 후보 부족 상세 미정 |
| Mastery 장기 후보 | 작전 기록 숙련 Point 총합, 별도 단순 XP Bar 없음 |
| 중간 영구 전투력·소수 단계 | 강력한 Gold Meta, 20/10/5단계와 실제 돌파 상승 |
| 해금 역할 미상세 | Gold/Credits/작전 기록/Challenge/희귀 영구 재화 분리 |
| Stage/Challenge 장기 아이디어 | Stage별 Type 공개, Stage2 즉시 도전, 조합형 Challenge |
| Endless 미상세 | Stage1 이후 방향, 이미 만난 정규 Stage Type만 등장 |
| 치명 피해 Run 카드 없음 | 유지. 별도로 치명 피해 Gold 영구 연구 추가 |

기본 개조6종·3슬롯, 무한 공용/숙련 성장, 독립 희귀도·전설, 특수무기 트리 및 전체 Overclock5종, 대성공, 유물 무레벨/무패널티, High-Variance, Portrait, 스팀팩·고유 Gesture, Reroll 기본0 방향은 유지한다. M11 Credits 연구로 Run당 최대3회 해금한다. v0.4/v0.5를 포함한 과거 버전은 역사 문서로 보존하며 상충 시 최신 v0.15를 우선한다.

## 5. Current Implementation Gap

최신 기반은 M10의 [PR25](https://github.com/cij5484/game/pull/25) merge `f6f831a`이며 M11 branch는 `codex/prototype-m11-meta-foundation`이다. 실제 변경과 검증은 [M11 기록](../prototype-m11-meta-foundation.md)에 적는다. **M11 통합 `npm run check`: 59파일/416테스트·TypeScript·Vite build 통과.** 아래 M10 이하 결과를 현재 검증으로 재사용하지 않는다.

| 영역 | M11 현재 구현 범위 / 남은 확인 |
| --- | --- |
| Hub/Result | Marine·재화·연구·저장 관리·출격, Result 보상/잔액·다시 하기/메인 흐름. Scene/Hub/Result 자동 테스트로 자연 정산·무보상 재시작·왕복 확인. 브라우저는 Hub/구매/새로고침 저장/출격 확인, 전체 Run 플레이는 미실시 |
| Save/Reward | Meta v1 분리 namespace·검증·Export/Import/Reset, 활성 Run ID/정산 영수증으로 1회 지급 |
| 연구/공식 | 11종 20/10/5 Level·돌파·비용·Run 시작 Snapshot, 기본/특수/치명/정예Boss/사거리/방어/XP 합성 |
| Reroll | Credits 50/150/400 순차 구매, Run 0~3회·일반 Offer 전용·중복 카드 허용 |
| DEV | Meta 상태·재화 지급·확인 후 Reset, Balance 저장과 분리·다음 Run 적용 |
| 보존/Future | M10 미사일·M9 성능·기존 Stage 1 유지. 작전 기록/숙련/실제 점진 해금은 M12, 기타 장기 콘텐츠는 Future |
| 검증 | 전투 공식 집중 6파일/73테스트 통과. Save/UI/Run 통합·전체 check 결과는 M11 기록의 최종 확인을 따름 |

### 5.5 Historical M10 Implementation Gap

최신 기반은 M9의 PR24 merge `0bcc4fb`이며 M10 branch는 `codex/prototype-m10-missile-salvo`다. 현재 목표는 미사일의 Salvo·예약·추적과 기존 성장 연결이다. 실제 변경과 실행한 검증은 [M10 구현 기록](../prototype-m10-missile-salvo.md)에 적는다. **M10 통합 `npm run check`: 52파일/390테스트·TypeScript·Vite build 통과**, 기존 Phaser chunk 경고 유지. Salvo/Reservation/성장 및 Dev Panel 기능은 구현됐으며 실제 존재감·밸런스·실기기 성능 평가는 남아 있다. 아래 M9 이하 통과 숫자는 **역사 검증 기록**이며 M10 결과로 재사용하지 않는다. 실기기 존재감과 밸런스는 사용자 확인 항목이다.

### 5.4 Historical M9 Implementation Gap

최신 기반은 M8의 [PR23](https://github.com/cij5484/game/pull/23) merge `7d1cae9`다. 현재 branch는 `codex/prototype-m9-horde-performance`. 최신 구현/검증은 [M9 기록](../prototype-m9-horde-performance.md)을 따른다. **M9 통합 `npm run check`: 51파일/373테스트·TypeScript·Vite build 통과.** 기존 Phaser 500kB 초과 chunk 경고는 남는다. M8의 50파일/358테스트를 현재 결과로 재사용하지 않는다.

| 영역 | M9 범위 / 남은 Gap |
| --- | --- |
| Rendering | simulation sub-step과 Frame Enemy transform 분리, Damage 상태만·이전/새 Focus 표시만 갱신, 숨긴 debug label 갱신 생략 |
| State/Targeting | 상태 변경 시 readonly snapshot 갱신, 이벤트 ID 색인 재사용, Missile 캐시 ID 검증·필요 시 재색인, Drone/Grenade 공격 이벤트 평가 |
| Shield/Impact | 같은 Lane의 Shield 후보 정렬·검색, 변경된 보호 상태만 복사, 충격 유물이 없을 때 불필요 배열 복사 생략 |
| VFX | 단순 Flash Graphics 재사용·활성/Frame 상한, Damage와 분리. 전체 Enemy/Projectile Pool은 추가하지 않음 |
| 개발 도구 | DEV 전용 읽기 성능: FPS·Enemy·특수 Unit·Combat VFX·simulation sub-step, 약 1초 전달 |
| 게임/기본값 | 초기 수·cap 700·HP·속도·Spawn·Tempo·성장/weight·무기·Boss 포함 기존 Gameplay 유지 |
| 검증/체감 | 통합 51파일/373테스트·TypeScript/build 통과. 700 Enemy/X4/64ms의 한 Frame 호출 17,500→700회는 기능 fixture이며 FPS Benchmark가 아님. 브라우저 /dev 5개 지표·Pause sub-step 0·Override 0 확인. 실제 끊김과 실기기 평가는 사용자 Playtest |

### 5.3 Historical M8 Implementation Gap

최신 기반은 M7 `60f19c0`의 PR22 merge `9fa09f4`다. 현재 branch는 `codex/prototype-m8-dev-balance-panel`. 최신 구현/검증은 [M8 기록](../prototype-m8-dev-balance-panel.md)을 따른다. **M8 통합 npm run check는50파일/358테스트·TypeScript·Vite build 통과**이며 기존 Phaser500kB 초과 chunk 경고는 남는다. 브라우저에서243개 항목·게임 연결/Override 확인 응답·Reset/Preset/새로고침 유지·JSON 검증·Search/Tooltip·X1초 표시·Production차단을 확인했다. M7의46파일/342테스트·이전 UI fixture를 현재 검증으로 재사용하지 않는다.

| 영역 | M8 범위 / 남은 Gap |
| --- | --- |
| 개발 도구 |별도/dev·한국어 검색/분류/Tooltip·현재/기본값·변경 표시·개별/전체Reset·숫자/Toggle |
| Runtime |기존 data 기본값→중앙 Override→실제 시스템, BroadcastChannel 같은origin 실시간 전달·연결 상태 |
| 저장 |개발용localStorage, 이름 있는Preset 저장/불러오기/삭제, version1 JSON Import/Export·검증 |
| 적용 경계 |기존Enemy HP 보존·다음Spawn, 열린Offer/현재XP 보존·다음Level, 초기조건·다음Run |
| Production |DEV 밖에서 패널·통신·Override 로딩 비활성, 코드 기본값 유지 |
| 게임/기본값 |M7 Boss/RandomAcquisition/BasicMod/M6 High-roll 및 수치 유지. 새 콘텐츠 없음 |
| 검증 |통합50파일/358테스트·TypeScript/build 통과. 두창243항목·값전달·Reset/Preset/JSON/Search/Tooltip·Production차단 확인, 다음Spawn HP·열린Offer/현재XP 보존 등 기능검증. 자동밸런스판단 없음 |

### 5.2 Historical M7 Implementation Gap

최신 기반은 M6 `4b06c39`의 PR21 merge `544aa1f`다. 작업 branch는 `codex/prototype-m7-boss-acquisition`. 최신 구현/검증은 [M7 기록](../prototype-m7-boss-acquisition.md)을 따른다. **M7 통합 npm.cmd run check는46파일/342테스트·TypeScript·Vite build 통과**이며 기존500kB 초과 bundle 경고는 남는다. M6의43파일/323테스트를 현재 검증으로 재사용하지 않는다.

| 영역 | M7 실제 범위 / 남은 Gap |
| --- | --- |
| 획득 |Lv8/14 조건의 일반 Pool Acquisition, 최대2/Core3, 선택1회 소비, 한 Offer1장, Rarity/GreatSuccess/품질 미적용, 보장 없음 |
| 기본 개조 |신규.45/보유.35 Category, 한 Offer 합계1장, 내부 투자상한1.4, Slot3/Core4, Range 별도 |
| Boss/Stage |공성 거인19분, 접근/Charge/약점/Stagger/증원/최후돌진. Boss처치만Clear/Wall0실패/20분초과 계속 |
| HUD/Result |기존 Header/Bottom 소유권, Empty Special Slot, 신규무장 카드, Boss HP·Phase·Telegraph·약점·Stagger, Run Boss Kill 기록 |
| M6 유지 |초기36, cap700, CombatTempo1.5, 기존Enemy이동속도/HPScaling/XP/Grenade/6Relic/3Core/3Synergy. Boss 전후 공급만 §3.9로 교체 |
| Future |Gold/Credits/영구보상/작전기록/AccountUnlock/Stage2+/Challenge/Endless/새Character/Awakening/FinalArt/추가 Pool 제외 |
| 검증/체감 |기능 correctness·통합46파일/342테스트·TypeScript·build 통과. 390×844 짧은 UI fixture로 실제Boss Charge 표현·Lv8 획득 카드·Empty Slot 확인. 전체Boss Run Playtest와 구분. 난이도·재미·획득시점·성장감·실기기 성능은 사용자Playtest |

### 5.0 Historical M6 Implementation Gap

최신 기반은 M5 PR20 merge `4bee754` 이후 `codex/prototype-m6-highroll-tempo`다. **M6 통합 npm run check는43파일/323테스트·TypeScript·Vite build를 통과**했고 기존500kB 초과 bundle 경고는 유지한다. 역사적 검증을 최신 결과로 바꾸지 않는다. 구현 기록은 [M6](../prototype-m6-highroll-tempo.md), 당시 M5 상태는 아래 §5.1에 보존한다.

| 영역 | M6 실제 범위 / 남은 Gap |
| --- | --- |
| 시간/전투 | 정상 Combat Tempo1.5와 Stage Clock 분리, X1 실제 약20분. Developer X2/X4 유지 |
| Horde/Enemy | 후속 요청으로 초기80→36/공급 batch3→96·interval1800→550ms/후반cap700. 기존 속도1.5와 생성HP `1+.020x+.0008x²` 유지. 기존 적은 소급 변화 없음 |
| 성장/수류탄 | XP `ceil(8+5x+.50x²)`, 수류탄65/7800 combat ms/반경110, 정상X1 주기5.2초 |
| Relic | 무레벨6종/최대2/중복금지/교체 또는 포기/첫Elite 보장·이후32%. 전체10종과 점진 해금은 Future |
| Core |3종/Run1개/Elite3%/즉시 랜덤 지급. 무장3슬롯·개조4종·품질 소급. 유물 확장/이중 초월은 Future |
| Synergy |3개 Lv10 조합 자동 활성/Run 유지, Saturation 출력 증가·Kill Zone 집중·Hunt Mark 전이. 나머지3개는 Future |
| HUD | Header Global Build와 상세, Bottom 무기별 성장 유지, 세 번째 Special Slot 동적 추가 |
| Legacy/Magic | 충돌하는 Legacy 보상/선택형 시너지와 Marine Magic은 현재 Marine Runtime 제외. 자산/역사 테스트 보존 |
| Boss/Meta | Boss 없는20분 임시 종료. 공성 거인/경제/계정 성장/Stage2+/새캐릭터/Final Art 제외 |
| 검증/체감 | 통합43파일/323테스트·TypeScript/build 통과. localhost 기본 전투/HUD/성장/Pause/배속 확인,360×780 임시 UI fixture로 Header/3슬롯/유물 선택·교체 확인 후 제거. 자연 희귀 Core/전체 Synergy Run 시각 검증은 하지 않았으며 동작은 단위/통합 테스트로 확인. 난이도/체감은 사용자 Playtest |

### 5.1 Historical M5 Implementation Gap

현재 gameplay 기반: M1 `d15b41d` → M2 `a656b12` → M3 `0f408dd` → M4 `e54a4f7` (PR19 main `68b9922`). M5는 `codex/prototype-m5-special-weapons`의 특수무기 구현이며 commit/push까지만 한다. 현재 검증은 [M5 구현 기록](../prototype-m5-special-weapons.md), 역사 기록은 [M1](../prototype-m1-combat-foundation.md)/[M2](../prototype-m2-stage1-core.md)/[M3](../prototype-m3-layout-build-hud.md)/[M4](../prototype-m4-horde-weapon-growth.md)를 따른다. 역사적 `0489ef9` 검증 결과를 최신 결과로 바꾸지 않는다.

| 영역 | 현재 실제 상태 / 남은 Gap |
| --- | --- |
| M1 기본 전투 | Range .55,800ms 단발 피해10. M4 성장으로 Range/Cycle/행동 변경 가능 |
| M2 적/Director | 물리 방패/두Elite 행동/20분 임시 종료 유지. M4 count/batch/cap과 M3 speed1.5배 그대로. M5 생성 시 Character Level HP 배율 추가 |
| Marine Loadout | Magic 사용/표시/성장/전투 hooks 분리, 코드/데이터/테스트 보존. 기본 스팀팩/V 유지 |
| M3 화면 | 독립 Header/Battlefield/Bottom,mask,Level/XP/시간 상단,Wall/무장 하단 유지 |
| M4 기본무기 | 6종 중 최대3종,반복Level,quality,사거리5Level,대표전설3종 구현. 나머지 전설 행동/최종 성장표는 후속 |
| M4 공용/후보 | 공용3종 무한Level,종류→별도희귀도,투자가중치,독립6%대성공,무효카드 제외,초과XP/밀린선택 보존 |
| M4 Build HUD | 공용 Header,개조/사거리/전설/Level Gauss,기존 카드/상세/Pause/결과 화면 연결 |
| Legacy 성장 | Marine MAX5 개조/분기/처형/선택형시너지 보장/자동Evolution 연결 제거. 자산 보존. 스팀팩 성장은 현재 후보에서 제외 |
| M5 특수무기 | 3종 자동 전투, Lv5/10 최대2종 획득, 독립WeaponLevel,3Tree/2Branch/Lv10자동완성/Lv15·20각3후보/Queue/OwnerHUD 구현. 완성형 해금/남은Overclock2종씩/요격은 Future |
| M5 개발 도구 | X1/X2/X4 전투 배속과 생성HP곡선 구현. 실제 입력 시간은 유지하고 재시작X1 |
| 유물/코어 | Legacy 보상체계 유지.4개조/공명 코어만 충돌 방지 제외. 최종 무레벨 유물/교체/신규Core5종/품질소급 미구현 |
| 시너지/진화 | 자연 조합만 M4 연결. 최종3중 조건 자동활성/명명시너지/새 진화 미구현 |
| Boss/Stage | Boss 없이20분 임시clear.공성거인/최종Boss종료/새보상확률 미구현 |
| Future | Gold/Credits/작전기록/숙련/점진해금/RerollMeta/희귀재화/Challenge/Endless/Stage2+/새캐릭터/Awakening/친구기록 미구현 |
| 성능/표현 | M5 장시간 자동밸런스Simulation 금지. 실기기 후반최대700대상 성능/입력감/밀도 최종평가는 사용자Playtest. Final Art/완성Tutorial 미구현 |

#### 5.1.1 v0.7 대비 변경 / 보존

- M3 쉬움 피드백에 Enemy Count 중심 압박 강화. 최신 추가 요청으로 M4 첫안 물량의약2.5배, HP/속도는 유지.
- Legacy 유한 Marine 성장에서 공용3/개조6/Range/quality/전설/대성공으로 전환. 자연 조합은 선택형 시너지가 아니다.
- Header/Battlefield/Bottom 소유 규칙은 유지하고 실제 성장 상태와 연결한다.
- v0.7 전체 목표와 Future 설계를 계승한다. 역사 원본 v0.7은 수정하지 않는다.
- 당시 M4는 별도 branch commit/push 후 STOP이었다. 이후 사용자 요청으로 PR19 merge했으며 현재 M5 전달 규칙은 아래 §5.2를 따른다.

#### 5.1.2 v0.8 대비 변경 / 보존

- v0.8 전체 목표/트리/미래 경제·해금·Stage 설계를 계승하고 원본은 수정하지 않는다.
- M5 범위는 실제 특수3종과 성장/Queue/HUD, 추가 요청의 개발배속·생성HP다. 기존 M4 Horde/성장과 M3 속도/HUD 소유 규칙을 유지한다.
- 최종 `npm run check`: 40개 파일/292개 테스트, TypeScript와 Vite build 통과. 기존500kB chunk 경고가 남는다. 438×974 브라우저에서 배속 순환, Lv5/10 획득과 일반 선택 보존, 대성공의 Lv3 Queue, 수류탄/드론 Owner HUD와 지속 드론/상세를 확인했다. 모든 분기·Lv15/20 브라우저 순회는 하지 않았으며 기능 테스트 범위와 구분한다.
- 자동 밸런스 분석 없이 직접 Playtest를 기다린다. M5 branch commit/push 후 STOP하며 main merge나 다음 Milestone은 별도 요청이 필요하다.
