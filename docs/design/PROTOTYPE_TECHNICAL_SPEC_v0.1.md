# Prototype Technical Spec v0.1

## Version notice — historical implementation notes

**Current design source of truth: [GAME_GDD_v0.3.md](GAME_GDD_v0.3.md).** v0.3 is a target architecture, not an implemented change. Current verified code differences are recorded in its [Current Implementation Gap](GAME_GDD_v0.3.md#18-current-implementation-gap). This technical document contains historical passes and superseded tuning; its older “Current” labels are scoped to their original pass and must not override v0.3. GDD v0.1/v0.2 remain preserved.

Traits have three slots, expandable to four, and Lv1–5. Upgrade kind and rarity are independent: 기본 강화/무기 특성/마법 강화/보조 기술 강화 versus 일반/희귀/유니크/전설. Only 무기 특성 consumes weapon-trait slots. Rapid is removed; COMMON 기본 강화 attack-speed shortens round/recovery intervals while preserving three-round bursts. Base crit chance5%/multiplier1.75 are independent of the critical trait. Every trait level stores its own rarity: RARE at1/2/4 and EPIC at3/5. Korean rarity labels are 일반/희귀/유니크/전설; investment affects weights, without a guaranteed invested candidate slot.

Player text is Korean-first; English IDs and data-owned content remain. Top Build Bar uses compact owned group/trait/relic/core icons and levels; pause shows detail. Bottom wall HUD presents HP/XP/time plus persistent Stim/Frost/Chain/Burst status in four slots. Desktop mouse chord/two-finger 스팀팩, safe-area, Portrait/Full-Bleed and logical coordinates remain. Circle/Z stabilization preserves coalesced and pointer-up samples, raises drawing timeout to5000ms while keeping Tap300ms, and supports Z alignment without changing Circle PCA/thresholds. Focused gesture checks pass38/38; this does not establish the cause of a real-device report. Selection and Pause stop gameplay/rhythm/effect clocks.

> Project phase: Pre-production → Graybox Prototype  
> Historical implementation reference only. Future design decisions follow `GAME_GDD_v0.3.md`; consult the current code for implemented behavior.
> Implementation environment: Codex app  
> Prototype stack: Phaser + TypeScript + Vite  
> Goal: validate combat fun and mobile viability before final art/audio or backend work.

---

## 1. Prototype Goal

Build a ~5 minute mobile-web graybox prototype that proves or disproves these assumptions:

1. Tap-based primary attack is satisfying.
2. Auto target + manual enemy tap is intuitive.
3. Gesture Magic is usable under pressure.
4. 3 Soft Lanes produce meaningful threat decisions.
5. Level-up choices change play feel.
6. Horde combat feels satisfying.
7. Mobile browser performance is viable.

This prototype is disposable in content but should keep clean code boundaries.

---

## 2. Non-Goals

Do NOT implement yet:

- Login
- Friend system
- Online ranking
- Backend / database
- Stage select
- Multiple characters
- Multiple permanent weapon variants
- Gold / Credits / Core economy
- Character Mastery
- Awakening
- Challenge Modifier
- Full Codex
- Full recipe hint system
- Final UI
- Final art
- Final audio
- PWA install flow
- Production save/cloud sync

These remain in the GDD but are outside Prototype v0.1.

---

## 3. Runtime Target

Primary target:

- Mobile browser, **Portrait orientation**
- Android Chrome first
- iPhone Safari test early, not at the end

Secondary target:

- Desktop Chrome for development/debugging

Prototype must remain usable with touch input.

---

## 4. Scene Layout

Single combat scene.

HUD anchor: small owned-build icons and levels at the top; no large text panel or empty slots. Group general upgrades, traits, relics and cores visually; pause exposes full details. Lower wall contains HP/XP/time and four aligned Stim/Frost/Chain/Burst status slots. Display 스팀팩 phase duration/progress, magic cooldown progress and Burst readiness. Ready ring, color and Korean status labels must clearly distinguish immediately available abilities from cooldown/charging states. Only the ready Burst slot is a cast button; spell gesture indicators are informational. Keep battlefield and HUD roots separate.
Milestone 8 presentation: map visual spawn depth to the top of the viewport while keeping progress-based simulation and logical spell distances invariant. Arrived enemies occupy stable per-lane visual attack slots (four columns, multiple rows), released on removal. Picking uses rendered positions; slots never change wall damage or gameplay coordinates.

**Global presentation requirement:** Mobile Portrait with Full-Bleed Presentation. Support 9:16, 9:19.5, 9:20 and portrait tablet ratios through Phaser Scale Manager. A 720×1280 logical presentation reference fits a bounded playfield; full-viewport environment absorbs additional space instead of black letterboxing. Enemy progress, travel duration and combat rules remain independent of viewport dimensions and visual scale. Keep HUD and battlefield roots separate so future safe-area insets can be applied independently.

### Screen regions

Top:

- Far spawn area

Middle:

- Enemy battlefield
- Left / Center / Right Soft Lanes

Bottom:

- Wall
- Marine
- Minimal HUD

### Fake perspective

Enemies:

- Spawn smaller at far top
- Visually scale up as they approach the wall

Gameplay logic should not depend on rendered scale.

---

## 5. Soft Lane Model

Three logical lanes:

- `left`
- `center`
- `right`

Enemies own:

- lane id
- longitudinal progress toward wall
- small lateral offset inside lane

Rules:

- Enemies may vary slightly inside the lane.
- No complex pathfinding.
- No rigid tile movement.
- No enemy-to-enemy physical collision required for Prototype v0.1 unless later proven necessary.

Goal:

- Give PvZ-like readability without rail-like movement.

---

## 6. Character Model

Prototype character:

- Marine

Character data should be defined through general character data, not hardcoded throughout combat systems.

Required fields conceptually include:

- id
- primary attack id
- secondary ability id
- base stats
- burst id

Prototype only needs one character but architecture should allow additional characters later.

---

## 7. Primary Attack — Gauss Rifle

Behavior:

- One valid tap command requests one 3-round burst.
- Actual fire cadence is controlled by weapon data, not tap speed.
- Player cannot increase DPS by tapping faster.

Input buffer:

- Maximum 1 queued primary attack command.
- Additional taps while one command is buffered are ignored.

Target behavior:

- Empty-space tap → Smart Auto Target
- Enemy tap → next attack targets that enemy
- No persistent lock

Implementation should separate:

- input command
- target resolution
- weapon firing
- visual projectile/tracer

This allows future hitscan/projectile variants.

---

## 8. Smart Auto Target

Prototype target logic should be simple and deterministic.

Initial priority suggestion:

1. Valid alive enemy
2. Prefer closer-to-wall enemies
3. Small threat weighting may be added later if needed

Do not over-engineer tactical AI in the first implementation.

Manual tap on an enemy always overrides auto targeting for that attack command.

Enemy touch hit area may be larger than the visible sprite.

---

## 9. Secondary Ability — Stimpack

Prototype phases:

1. Boost
2. Crash
3. Recovery

Current fixed post-effect design:

- Crash: 1 second primary attack unavailable
- Recovery: 2 seconds gradual attack-speed recovery

Boost duration and multiplier remain balance data.

Secondary activation input:

- Two-finger tap; desktop left+right mouse chord also activates (120ms join/300ms release).

If two-finger input proves unreliable on target mobile browsers, treat that as a design finding and compare alternatives rather than forcing it.

---

## 10. Gesture Input

Prototype implements 2 spell gestures only.

Current gesture bindings:

- Circle-like gesture
- Z-like gesture

Gesture system requirements:

- Distinguish tap vs gesture using movement distance and input duration.
- Do not require pixel-perfect drawing.
- Recognizer should tolerate rough finger input.
- Reject very short/noisy paths.
- Track recognition confidence for debug display.

### 제스처 안정화

3초 동안 정상적인 원/Z를 그려도 기존 2,500ms 입력 제한 때문에 인식기까지 전달되지 않는 경우를 테스트에서 재현했습니다. **그리기만 최대 5,000ms로 확대**했고 Tap의 300ms 제한은 유지합니다. 브라우저가 묶어서 전달한 중간점(coalesced events)과 손을 뗄 때의 마지막 점을 보존합니다.

원의 PCA 정렬·인식 임계값은 유지하고 기존 정상 원의 다양한 크기·시작점·방향 fixture를 보강했습니다. Z는 ±20도 정렬과 ±4 sample 범위의 순서 정렬로 느슨한 획을 수용합니다. N·역Z·미완성Z·L·V·C·낙서·너무 작은 링은 거절합니다. 관련 집중 테스트 **38/38 통과**이며, 실제 휴대폰에서 보고된 인식 문제의 원인을 확정한 것은 아닙니다.

Debug의 `samples`는 필터를 통과해 인식기에 들어온 점 수이며 브라우저의 전체 pointer 이벤트 수가 아닙니다. `pathLength`는 CSS px 기준입니다. 실제 Android/iPhone에서 느린 입력·빈도 차이·다중 터치 사용감은 별도 확인이 필요합니다.

Prototype Magic candidates:

- Frost Nova
- Chain Lightning

Meteor can wait because targeted-cast adds another input mode.

---

## 11. Magic

Prototype Magic count:

- 2

Each Magic contains:

- cooldown
- effect type
- visual placeholder
- upgrade hooks

Suggested prototype roles:

### Frost Nova

- Crowd control
- Instant cast
- Applies global movement-only slow, including enemies spawned during its duration

### Chain Lightning

- Multi-target damage
- Demonstrates target chaining and horde payoff

Cooldown values belong in balance data.

- 서리장: 전역 이동속도 ×0.5, 7초, 대기 30초. 신규 적도 느려지고 성벽 공격·spawn·Primary·다른 대기는 느려지지 않습니다. 감속 +6%p×5(최저 이동배율 0.25), 지속 +0.8초×5, 서리 tag 6 이후 파쇄 즉시 피해 30.
- 서리 균열: 서리 중 기본 피해 +15%×3. 빙결 파편: 서리 중 처치 지점 반경 130에 피해 35×3, 한 판정 최대 8중심·한 세대·대상 중복 피해 없음.
- 연쇄 번개: 연결 반경 360, 최대 30명, 각 피해 75, 대기 24초. 대상 +2×5 / 피해 +18×5 / 거리 +40×4. 번개 tag 6 이후 분기 폭풍은 미적중 3명에게 60% 피해.
- 처치 연쇄: 번개 처치당 추가 연결 +2×3, 한 시전 추가 대상 상한 12. 낙뢰 충격: 6번째 연결 적중마다 반경 150의 미적중 적에게 번개 피해 50%×2, 재귀·중복 타격 없음.
- 공용 치명 피해 강화와 마법 대기시간 강화 카드는 없습니다. 강화 획득으로 이미 진행 중인 마법 대기를 초기화하지 않습니다. 빈 전장 시전도 대기를 소모합니다.

Magic.setUpgrades preserves existing cooldowns; new casts use the base spell cooldown. Relic refunds remain separate from upgrade cards. Frost death bursts process at most8dead centers, radius130, one tier; chain kill extensions cap12, and every sixth chain hit can strike unhit targets within150. Root transaction applies deaths/XP/relic hooks once.

---

## 12. Enemy Types

Prototype enemy count: 3

### Grunt

- Baseline enemy
- Walks to wall
- Basic wall attack

### Runner

- Fast
- Lower durability
- Tests threat prioritization

### Shield

- Slower
- Higher effective durability against normal primary fire
- Tests build / Magic decision making

Keep enemy behaviors intentionally simple.

---

## 13. Wall

Prototype:

- One shared Wall HP pool
- Wall takes damage from enemies that reach attack range
- Wall HP reaches 0 → Run ends

No separate player HP.

HUD:

- clear Wall HP display
- no lane-specific wall HP

---

## 14. XP / Weapon Trait choices

### 강화 종류와 희귀도

강화 카드의 **종류**와 **희귀도**는 독립된 축입니다. 종류는 효과가 작동하는 계통을, 희귀도는 일반·희귀·유니크·전설 등급을 뜻합니다. 희귀도 이름인 “일반”을 강화 종류 이름으로 사용하지 않습니다.

| 공식 강화 종류 | 현재 범위 | 무기 특성 슬롯 |
| --- | --- | --- |
| 기본 강화 | 기본 공격력·공격속도·치명 확률 3종 | 사용하지 않음 |
| 무기 특성 | 8종 특성과 전설 행동 강화 3종 | 8종 신규 획득만 사용: 기본 3칸, 코어로 4칸. 전설 강화는 추가 슬롯 없음 |
| 마법 강화 | 서리장·연쇄 번개 강화 | 사용하지 않음 |
| 보조 기술 강화 | 스팀팩 지속·공격속도 배율·회복 강화 | 사용하지 않음 |

전설 행동 강화인 폭주 연쇄·공성 관통포·연쇄 폭풍탄은 무기 특성 종류로 표시하되 추가 슬롯을 사용하지 않습니다. 카드 짧은 효과는 유지하고 상세 설명·일시정지에서 “전설 강화 · 추가 슬롯 없음”을 안내합니다.

**필살기 강화는 미래 분류이며 현재 강화 카드에는 없습니다.** 유물·코어는 별도 보상 계통입니다. 공식 용어는 기본 공격 / 보조 기술 / 마법 / 필살기 / 강화 카드 / 기본 강화 / 무기 특성 / 마법 강화 / 보조 기술 강화 / 유물 / 코어 / 시너지 / 진화 / 비밀 진화입니다. 스팀팩은 보조 기술의 현재 콘텐츠 이름입니다. 비밀 진화는 미래 설계이며 현재는 초관통 가우스 진화만 구현합니다.

카드는 중앙에 가로로 정렬한 정사각형을 유지합니다. 시각적 우선순위는 **큰 아이콘 → 이름 → 짧은 효과 → 종류 배지 + 희귀도 텍스트 → 현재/다음 레벨**입니다. 종류 배지는 계통을 설명하고 희귀도 텍스트는 별도로 표시합니다. 전체 효과 설명은 aria/title에 보존합니다.


XP Grunt/Runner1, Shield3; threshold=8+6(L−1)+2(L−1)^2. Preserve overflow/queued choices. Eight traits (penetration, ricochet, multishot, explosive, critical, split, heavy, execution), Lv1–5. Default capacity3, expandTraitLimit() raises it to4 once. General stats/Stim/Magic remain eligible at capacity. Trait rarity comes from explicit level data, never a global level-to-rarity formula. Offer up to3distinct non-MAX eligible cards, no reroll.

COMMON basic stats are exactly three: primary-damage+.15/rank, attack-speed+.06/rank, crit-chance+.05/rank, max5each. Crit damage and generic magic cooldown cards are removed. Critical baseline is .05 chance with fixed1.75 damage multiplier without a trait; critical trait adds on-crit splash/echo fromLv1/3. Attack speed affects both intervals while three-round bursts remain. Split children cannot recurse; heavy adds direct damage/pushback and high-level splash; execution reads spawn maxHp (fallback base/eliteHP), not current HP or unscaled species HP.

Legendary rapid-overdrive requires attack-speed4; siege-lance penetration4; ricochet-cascade ricochet4. Legacy frost-shatter/storm-fork require six magic tag ranks. growOwnedTraits() increments owned non-MAX traits only and invalidates cached offers.

## 15. Build Bias

Weight = card weight × rarity weight(10/4/1/.25) × min(1.6,1+.08×tag ranks) × rarity modifier × trait multiplier(2 for the eight weapon trait IDs,1 otherwise). Legendary behavior cards keep their own rarity weight. No invested-slot guarantee. Progression.setRarityModifiers accepts per-rarity multipliers, invalidates cached choices, and zero-weight cards are excluded. Sample without replacement after capacity/ability/prerequisite/MAX filters. Luck core and relic multipliers combine in Scene.

## 16. Relics

정예는 Grunt 기반 HP ×4(기본 120, 생성 시점 HP 성장 배율 추가), 첫 60초/이후 40초에 등장합니다. 처치 유물 선택은 레벨업과 별개로 전투를 멈춥니다. 유물 **8종**, 기본 한도 **3종**, 유물 확장 코어로 **4종**. 각 Lv1~5, 같은 유물 재획득 시 강화, MAX 제외, 한도가 차면 새 종류 제외. 최대 3개 후보를 보여주며 교체 UI는 없습니다.

| 유물 | Lv1→Lv5 누적 성장과 행동 |
| --- | --- |
| 공성 증폭기 | 방패 명중 번개 환급 60→120ms(발당 240→480ms 상한), Lv3 마법 후 방어 무시 3발→7발, Lv4 방패 피해 ×1.5→2, Lv5 마법마다 성벽 120 회복 |
| 테슬라 코일 | 명중 12→6발마다 전격 1→5명 / 피해 12→30 / 거리 240, Lv3 치명 충전 +2, Lv4 번개 후 다음 명중 전격, Lv5 전격 적중 시 두 마법 −400ms |
| 얼음 심장 | 서리 지속 +0.5→3초, Lv3 서리 중 처치마다 서리 대기 −60→120ms(판정당 600ms 상한) |
| 자극 회로 | 스팀팩 사용 시 두 마법 대기 −0.3→1.5초, Lv3 강화 중 처치당 성벽 +2→5 |
| 최후의 보루 | 성벽 30% 이하에서 마법마다 성벽 +60→200, 기본 피해 +10→50% |
| 광전사 인장 | 스팀팩 사용 시 성벽 40→100 소모(최소 1 유지), 강화 중 기본 피해 +20→100% |
| 시간 톱니 | 서로 다른 마법을 번갈아 쓰면 이전 마법 대기 −0.3→1.8초, Lv3 성벽 +30→80 |
| 행운 동전 | 마법 처치 XP +10→50%, 희귀 이상 선택 가중치 +5→25% |

유물은 성공한 시전·실제 명중·확정 처치에 연결합니다. 전격/서리 파편은 무한 재귀하지 않으며 회복은 성벽 최대치, 대기는 0을 경계로 제한합니다. **관통 Lv4 + 공성 증폭기 Lv3 → 초관통 가우스**(추가 관통 3명, 폭 ×1.6, 청록 tracer). 모든 유물 MAX 도달은 보장하지 않습니다.

코어는 정예 처치 시 **8% 별도 추첨**, 한 Run 최대 **2개**, 종류 중복 없음입니다. 보유 한도를 소비하지 않는 Run 전용 효과이며 레벨은 없습니다. 레벨업 일반 후보에도 섞이지 않습니다.

| 코어 | 효과 |
| --- | --- |
| 전술 확장 코어 | 특성 한도 3→4 |
| 유물 확장 코어 | 유물 한도 3→4 |
| 행운 코어 | 희귀 ×1.5 / 유니크 ×2 / 전설 ×3 후보 가중치 |
| 과부하 코어 | 보유 특성 즉시 +1, Lv5 상한; 성장 가능한 특성이 있을 때만 등장 |
| 공명 코어 | 활성 시너지의 관통 폭발 피해·추가 도탄·탄막 효과 ×1.5; 정수 대상 수는 올림 |

Relics.expandCapacity() raises3→4. Only successful casts, confirmed kills and landed rounds trigger combat hooks. Clamp wall healing/costs and cooldown refunds; no recursive arcs or duplicate kill rewards. Cores.tryDrop owns the8%/max2/unique constraints; Scene applies the five effects without consuming relic or trait capacity.

## 17. Elite Enemy

Prototype requires at least one Elite encounter.

Elite can reuse an existing enemy with:

- higher HP
- one clearly visible modifier
- Relic reward on death

Avoid building a full Elite modifier framework before the basic reward loop is proven.

---

## 18. Synergy / Evolution

RecipeRequirements contains optional traits/relics/magic/upgrades rank maps, evaluated by shared meetsRecipeRequirements. No Marine-specific condition logic.

- 심층 폭발: penetration1 + explosive1; explosions along pierced hits.
- 살상 도탄: ricochet1 + critical1; critical propagation and+2bounces.
- 탄막 폭풍: attack-speed3 + multishot1; every fourth round adds2full-damage simultaneous rays.
- 초관통 가우스 (Hyper Gauss): penetration4 + siege-amplifier3; extra3pierces, width×1.6, cyan tracer width8, once per Run with brief Korean notification.

No recursive effect loops. Distance/angle calculations use combatGeometry, never perspective scale or visual crowd offsets.

---

## 19. Burst

Prototype includes 1 Burst.

Requirements:

- Gauge accumulation from combat performance
- Manual BURST button
- Extreme slow motion, not full pause
- Short 2–4 second timing interaction
- Several timing grades
- Ultimate effect scales with timing performance
- Minimum effect even with poor timing

Do not build a full music-synced rhythm engine.

Current implementation: gauge100, credit0.02 per confirmed hit/0.08 per kill/+6 per Elite kill. Normal credit allowance is capped at3 and refills at0.45 per gameplay second; Elite bonuses bypass this limit. Ultimate kills do not recharge the gauge. Manual READY activation only. Rhythm uses real time3000ms, beats at500/1000/1500/2000/2500ms, PERFECT within70ms and GOOD within150ms. Battlefield simulation uses timeScale0.08; rhythm time is independent. Every tap consumes one beat, and omitted beats become MISS. Score scales a single Marine barrage from24 to60 targets and60 to140 damage; even all MISS retains the minimum. Keep its gauge/button within the integrated lower-wall HUD.

---

## 20. Horde Stress Test

Current normal-run tuning: initial48 Grunts at progress.08–.30. Thirteen encounter starts0/30/38/60/90/98/135/165/173/210/218/255/285seconds. Caps72/78/84/90/96/105/115/125/135/145/155/170/180. Interval(ms)/batch:1800/6,2000/5,1700/6,1600/7,1800/5,1500/7,1350/9,1550/8,1200/12,1400/10,1050/16,850/20,800/24. Relief windows last8seconds; retain one Elite slot and discard blocked-spawn backlog. Elite first60s/then40s. Spawn-time linear growth ends at HP×1.10/speed×0.65→1.02 over300s; factory stores maxHp and speedMultiplier. Frost multiplies the stored speed and does not reset growth. Base Grunt/Runner/Shield progress/s .032/.08/.025. Mobile180-enemy performance remains unmeasured.

This is a separate prototype test mode or debug mode.

Purpose:
Find real performance limits on actual devices.

Test progressively:

- enemy count
- animation
- targeting
- damage events
- death events
- Magic effects
- Burst effects

Record:

- FPS
- frame-time spikes
- memory growth
- input responsiveness

Do not guess final budgets before measurement.

---

## 21. Performance Architecture Candidates

Use only as needed after profiling:

- Object pooling
- Sprite atlas
- Hitscan for high-rate weapons
- Reduced update frequency for distant enemies
- Simple lane-based movement
- Limited VFX lifetime/count
- Avoid unnecessary per-enemy physics
- Minimize expensive target scans
- Avoid creating/destroying large quantities of short-lived objects

Rule:
Measure first, optimize actual bottlenecks second.

---

## 22. Data-Driven Balance

Tunable values must not be scattered across gameplay code.

Separate data categories conceptually:

- characters
- weapons
- secondary abilities
- magic
- enemies
- upgrades
- relics
- evolution recipes
- wave timings
- score/reward values later

For Prototype v0.1, JSON or typed TS data modules are acceptable.
Choose the simplest form that preserves clear separation.

---

## 23. Debug / Tuning Support

Do not build a full admin GUI yet.

Prototype should expose enough debug capability to:

- Spawn chosen enemy type
- Spawn multiple enemies
- Change game speed
- Grant XP / force level-up
- Grant Relic
- Fill Burst gauge
- Toggle debug hit areas
- Display FPS

Later:

- dedicated `/dev/balance`
- spawn console
- wave editor
- DPS analyzer
- recipe tester

---

## 24. Save / Resume

Full production save system is out of scope.

However, architecture should keep Run state conceptually separable from permanent Meta state.

Prototype may initially skip persistence entirely.

Resume support becomes required for Vertical Slice / production stage.

---

## 25. Proposed Code Boundaries

Exact filenames are Codex's implementation decision, but responsibilities should stay separated.

Conceptual modules:

- Input
- Gesture recognition
- Combat commands
- Targeting
- Character
- Weapon
- Magic
- Enemy
- Lane movement
- Wall
- XP / level-up
- Relic
- Evolution
- Burst
- Balance data
- Debug tools

Avoid one giant `GameScene` containing all game rules.

---

## 26. Art Strategy

Prototype art:

- geometric placeholders
- labels
- simple colors / outlines
- no final StarCraft Marine sprite production yet

Only after combat prototype passes:

- define art direction
- define sprite size
- animation frame counts
- sprite-sheet / atlas pipeline
- VFX style
- final asset production

---

## 27. Audio Strategy

Prototype:

- temporary SFX only if useful for feel testing

No final music / sound design production yet.

Important eventual categories:

- primary fire
- hit
- enemy death
- Magic
- Elite
- Evolution
- Burst
- wall hit
- clear/fail

---

## 28. Original roadmap (historical numbering)

### Milestone 0 — Foundation

- Phaser + TypeScript + Vite
- portrait full-bleed canvas
- basic game loop
- mobile test page

### Milestone 1 — Battlefield

- wall
- Marine placeholder
- 3 Soft Lanes
- one enemy moving to wall

### Milestone 2 — Primary Combat

- tap input
- auto target
- enemy manual target
- Gauss 3-round burst
- fire-rate limiting
- one-command input buffer

### Milestone 3 — Enemy Pressure

- Grunt
- Runner
- Shield
- Wall HP
- loss condition

### Milestone 4 — Secondary + Gesture

- Stimpack
- tap-vs-gesture distinction
- 2 Magic spells

### Milestone 5 — Progression

- XP
- pause-on-level
- 3 upgrade choices
- minimal build branches

### Milestone 6 — Relic + Elite + Evolution

- Elite encounter
- Relic reward
- Relic leveling
- one Evolution

### Milestone 7 — Burst

- gauge
- manual activation
- time dilation
- short timing sequence
- Ultimate payoff

### Milestone 8 — 5-Minute Playtest Build

- basic pacing
- complete start-to-fail/finish loop
- real-device testing

### Milestone 9 — Horde Stress Test

- controlled high-enemy scenarios
- performance measurements
- documented budgets

Repository milestone numbering supersedes this original roadmap. Stop after each requested work item for user playtest. Do not auto-start another milestone.

Do not continue into production automatically.

---

## 29. Prototype Review Gate

At the user playtest review gate, answer:

1. Is tap combat satisfying?
2. Is auto/manual targeting intuitive?
3. Is gesture Magic fun under pressure?
4. Does Stimpack add a meaningful timing decision?
5. Do Soft Lanes improve battlefield readability?
6. Do level-up choices visibly change the build?
7. Is the Evolution payoff exciting?
8. Does Burst improve pacing?
9. Is horde clearing satisfying?
10. Is mobile performance acceptable?

Possible outcomes:

### PASS

Proceed to Vertical Slice design.

### REVISE

Change core combat and repeat focused prototype tests.

### FAIL

Stop production investment and redesign the concept.

---

## 30. Engine Migration Principle

Prototype is Phaser-first.

If production later moves to Godot:
Reusable:

- GDD
- balance data concepts
- content definitions
- assets
- animation source
- audio
- gameplay formulas
- recipe design

Likely reimplemented:

- rendering
- scene graph
- input
- collision
- Phaser-specific systems
- UI integration

Do not slow the Phaser prototype by over-engineering for a hypothetical Godot migration.

---

## 31. Codex Working Rules

When implementation begins:

- Work in small milestones.
- Do not implement future systems early.
- Prefer tests for pure game logic.
- Keep balance values external to gameplay logic.
- Verify on real mobile devices early.
- Report tradeoffs and unexpected technical risks.
- Do not silently expand scope.
- Do not refactor unrelated areas.
- Commit/checkpoint after coherent milestones.
- Preserve a clear path to throw away or rebuild prototype-specific code if the game design changes.

---

## Status

Current pass verification: `npm.cmd run check` passes29files/143tests, TypeScript and Vite production build. Focused gesture checks pass38/38. Existing500kB bundle warning remains (1291.06kB, gzip348.35kB). These checks do not establish real-device gesture reliability or180-enemy mobile performance.

Historical pass note: implementation at that time followed GDD v0.2. New target design is GDD v0.3; no v0.3 gameplay work is included in this documentation pass.


### 추가 플레이테스트 조정

초기 48마리로 시작하고 스폰 상한은 72→180마리로 점진 증가합니다. 체력은 5분간 최대 +10%, 속도는 기본값의 65%에서 102%까지 선형 증가합니다. 일시정지의 `다시 시작하기`는 현재 런을 초기화합니다. ○ 제스처는 열린 끝점 비율 0.14→0.22, 반지름 오차 0.14→0.18로 완화했으며 크기·회전량·방향 일관성과 Z 기준은 유지합니다. 기존 Gesture 테스트에 약 82%만 그린 원을 추가했습니다. 실제 기기 인식률과 밸런스는 재평가 대상입니다.

추가 조정 검증: `npm.cmd run check` 29개 파일 / 144개 테스트 및 TypeScript·빌드 통과. 브라우저에서 일시정지 → 다시 시작하기 후 5:00 / 1레벨 / 성벽 12000 초기화를 확인했습니다. 기존 번들 크기 경고는 유지됩니다.
