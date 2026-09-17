# Prototype Technical Spec v0.1

## Current implementation — Weapon Trait / Relic overhaul

Current source of truth: [GAME_GDD_v0.2.md](GAME_GDD_v0.2.md); GDD v0.1 is a preserved historical document. Current Run remains five gameplay minutes, Wall HP12000,300s clear/HP0 failure. Magic/Burst tuning is unchanged. Initial65 and caps90→160 remain, while sustained spawn intervals/batches increase substantially as listed below.

Six Weapon Traits (rapid/penetration/ricochet/multishot/explosive/critical), each Lv1–5. Default type limit2. Elite-death special drop 전술 확장 코어 has prototype chance3%, raises the run-only limit to3 once, and consumes no Relic slot. Filter inactive traits at capacity, MAX cards, unmet prerequisites and unequipped abilities before weighted sampling. Level-up (up to3) and Relic (1–2) choices use centered, horizontally arranged square cards. Show a symbol, Korean name, short effect, rarity and current→next level; retain the full description in aria/title. Symbols can later be replaced by images. COMMON/RARE/EPIC/LEGENDARY weights10/4/1/0.25; tag bias+8% per invested rank capped1.6. Existing invested-tag candidate slot remains. Trait rows replace prior levels with cumulative effects; see data/traits.ts and the six complete level tables in GDDv0.2.

Player text is Korean-first, internal IDs remain English. Content definitions hold names/descriptions; common display text is data, not scattered Scene literals. No i18n framework. Two redesigned Relics grow Lv1–5, three-type capacity; old PEN/STORM effects are removed. Recipes accept traits/relics/magic requirements. Hyper Gauss now requires penetration4 + siege-core3.

Desktop left+right mouse chord (120ms join/300ms release) supplements unchanged two-finger Stimpack. Circle recognizer structure/thresholds are unchanged. A small top-right Pause icon with a Korean accessible name stops gameplay/rhythm/effect clocks until Resume; no buffered input leakage. Portrait/Full-Bleed and separated logical/pixel coordinates remain mandatory.

> Project phase: Pre-production → Graybox Prototype  
> Source of truth for implementation details: this file + `GAME_GDD_v0.2.md`
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

HUD anchor: keep the top available for distant battlefield except the small top-right Pause icon. Trait ownership is shown in choice summaries/results, not added to the crowded wall HUD. Integrate Wall HP into the lower wall, with compact non-interactive magic cooldown indicators and temporary Secondary Ability feedback. Preserve separate battlefield/HUD roots for future safe-area handling; do not reserve blank panels for unimplemented systems.

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

Recommended initial gestures:

- Circle-like gesture
- Z-like gesture

Gesture system requirements:

- Distinguish tap vs gesture using movement distance and input duration.
- Do not require pixel-perfect drawing.
- Recognizer should tolerate rough finger input.
- Reject very short/noisy paths.
- Track recognition confidence for debug display.

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

Current tuning: Frost Nova has 30000ms cooldown, 7000ms duration and movement multiplier0.5. Its global timer applies to new spawns and does not slow Wall attacks, spawn, Primary or other cooldowns. Upgrade ranks add slow strength0.04/duration600ms; Frost Shatter deals30 to current enemies. Chain Lightning has 24000ms cooldown, damage75, 30 distinct targets and logical hop radius360; upgrades add targets2/damage12/radius40 per rank. Upgrades preserve running cooldowns.

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

XP Grunt/Runner1, Shield3. At level L, threshold=8+6(L−1)+2(L−1)^2. Preserve overflow/queued choices; pause completely until selection. Six Traits are independently Lv1–5, at most2types unless the separate expansion drop unlocks3. Offer up to three distinct applicable non-MAX cards; never fill with invalid traits when slots are full. No Reroll. Current type/level/rank data are run-only.

Existing fragmented Primary upgrades are replaced by cumulative trait levels. Three Legendary capstones remain eligible at corresponding trait Lv4 (Ricochet forks retain at least80% damage, preserving traitLv5 retention100%); advanced Magic requires six tag ranks. Stim/Magic cards still target equipped abilities. The complete behavior tables are in GDDv0.2 and data/traits.ts.

## 15. Build Bias

Per-card weight × rarity weight × min(1.6,1+0.08×invested tag ranks). Eligible invested tags can fill the existing build-related slot. Sampling is without replacement and never bypasses trait capacity/prerequisites. No complex adaptive RNG.

## 16. Relics

Elite death queues a separate paused reward. Two types currently: siege-core/tesla-coil. Maximum3types, each Lv1→5. Same type upgrades; MAX excluded; full capacity restricts new types instead of replacing owned ones. An exhausted pool skips empty dialogs. Reset each Run.

Siege Core: Lv1 shield hits refund Lightning60ms (cap240/round); Lv2 refund120(cap480); Lv3 magic primes3armor-bypass primary rounds; Lv4 five rounds/×1.5Shield damage; Lv5 seven rounds/×2 and120Wall heal per successful magic. Later levels retain prior effects.

Tesla Coil: every12/10/10/10/6 landed rounds arcs1/2/3/4/5targets at12/16/20/24/30damage, radius240. Lv3 critical rounds gain+2charge (3total), Lv4 Lightning primes next landed round, Lv5 landed arcs refund400ms both magics. A multi-target round counts once; arcs never recursively charge themselves.

RelicCombat reads modifiers before primary damage, processes fired rounds before removing dead states, and returns final enemy states/arc IDs/cooldown refunds. Apply deaths/XP once. Only successful casts trigger empowerment/healing. Clamp healing to Wall max and cooldowns to zero.

---

## 17. Elite Enemy

Prototype requires at least one Elite encounter.

Elite can reuse an existing enemy with:

- higher HP
- one clearly visible modifier
- Relic reward on death

Avoid building a full Elite modifier framework before the basic reward loop is proven.

---

## 18. Synergy / Evolution

RecipeRequirements contains optional traits/relics/magic rank maps, evaluated by shared meetsRecipeRequirements. No Marine-specific condition logic.

- 심층 폭발: penetration1 + explosive1; explosions along pierced hits.
- 살상 도탄: ricochet1 + critical1; critical propagation and+2bounces.
- 탄막 폭풍: rapid1 + multishot1; every fourth round adds2full-damage simultaneous rays.
- 초관통 가우스 (Hyper Gauss): penetration4 + siege-core3; extra3pierces, width×1.6, cyan tracer width8, once per Run with brief Korean notification.

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

Current normal-run tuning: initial65 Grunts distributed over progress0.08–0.45. Twelve encounters raise caps90→110–135→150–160 with one reserved Elite slot, four relief windows and no blocked-spawn backlog. Interval(ms)/batch by encounter:900/14,1200/10,850/16,800/18,1200/12,750/20,700/22,1100/14,650/24,1000/16,600/26,500/30. Stage timings/type weights remain unchanged; final45s uses batch30/500ms; first Elite60s, then40s intervals. Grunt progress/s is0.032; Runner/Shield stay0.08/0.025. All values live in horde/enemy/elite data. Screen ratio must not change these logical pacing values;160-enemy mobile performance is not yet established.

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

Current implementation follows GDD v0.2; user playtest determines fun, readability and mobile viability before merge.
