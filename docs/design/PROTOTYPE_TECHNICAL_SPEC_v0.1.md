# Prototype Technical Spec v0.1

## Milestone 12 Combat Rebalance Pass current prototype scope

The current playable prototype is a **five-minute simulation-time Run**, separate from the future production goal of approximately 15 minutes and resume support elsewhere in this document. Level/Module selection pauses do not consume Run time; Rhythm Burst slows Run time with the battlefield to 0.08x. At 300 seconds the run clears; Wall HP 0 fails. Prototype Wall HP is 12,000. Result/Retry shows time, kills, Level, Wall HP, Primary/Stim/Magic upgrades, Modules and Evolution; no persistent rewards are implemented.

Named data-driven encounters begin with 65 Grunts; caps rise from 90 through 110–135 to 150–160, with four 15-second relief windows and a final 45-second push at 16 spawns per 650ms. Grunt movement is 0.032 progress/s (20% slower); Runner/Shield remain 0.08/0.025. Spawns blocked by capacity are dropped rather than accumulated. Elite begins at 60 seconds, then every 40 seconds when capacity permits.

The current upgrade pool has 24 types / 76 ranks, equipped-ability filtering, tag prerequisites and one build-related candidate slot. COMMON/RARE/EPIC/LEGENDARY weights are 10/4/1/0.25, multiplied by per-card weight and tag investment bias (+0.08 per rank, capped at 1.6x). These are relative weights, not fixed appearance percentages. XP requirement is `8 + 6n + 2n²` where `n = current Level - 1`; 1,000–2,500 earned XP gives approximately 10–14 choices mathematically, not a verified playtest outcome. Advanced Primary/Magic effects unlock after six ranks in their tag. Crash stays at one second. Frost Nova now applies global movement-only slow at 0.5x for 7s, including enemies spawned during the effect; cooldown is 30s. Wall attack timing and other simulation clocks are unchanged. Frost upgrades improve slow strength/duration instead of radius/freeze. Chain Lightning deals 75 damage to up to 30 distinct targets within logical hop radius360, cooldown24s.

Mobile Portrait / Full-Bleed and the lower-wall HUD remain required. `viewport-fit=cover` and `env(safe-area-inset-*)` inset the bounded playfield/HUD while the environment fills the viewport. Gameplay coordinates remain independent of device pixels. Real-device gesture reliability, safe-area fit, 160-enemy performance and combat balance still require user playtesting. Three one-rank Legendary cards unlock at six invested ranks in their tag: Rapid Overdrive relays a kill to three nearby targets at 100% damage once per round; Siege Lance keeps 100% pierce damage and adds a final-pierce radius140 shockwave; Ricochet Cascade forks from the final bounce to three unhit targets at 80% damage. Burst charges 0.02 per hit, 0.08 per kill and an extra6 per Elite. Normal credit uses an allowance capped at3, refilled by gameplay time at0.45/s; Elite credit bypasses it. Refill is not passive gauge, excess credit is discarded, and READY waits for manual activation. Even unlimited combat plus seven Elite kills yields at most180 charge in300s: a conservative one-use ceiling, with zero-use risk for low combat throughput. Current tuning is documented in README and `src/game/data/`; later production features in the original design remain future scope.



> Project phase: Pre-production → Graybox Prototype  
> Source of truth for implementation details: this file + `GAME_GDD_v0.1.md`  
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

HUD anchor: keep the top available for distant battlefield. Integrate Wall HP into the lower wall, with compact non-interactive magic cooldown indicators and temporary Secondary Ability feedback. Preserve separate battlefield/HUD roots for future safe-area handling; do not reserve blank panels for unimplemented systems.

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
- Two-finger tap

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

## 14. XP / Level Up

Enemies grant XP.

On level up:
- Full combat pause
- Present 3 upgrade choices
- Player selects one
- Resume immediately

Prototype upgrade pool should be intentionally small.

Suggested initial upgrade examples:
- Gauss burst count +1
- Gauss attack cycle improvement
- Gauss penetration +1
- Frost Nova duration/slow-strength improvement
- Chain Lightning target count +2

No Reroll in prototype.

---

## 15. Build Bias

Prototype may begin with plain weighted random.

Do not implement complex adaptive RNG until:
- basic upgrade loop works
- repeated playtest shows poor build control

Architecture should allow weights to be data-driven.

---

## 16. Module

Prototype:
- 1–2 Module types
- Maximum 3 Module type slots remains the long-term rule
- Elite kill triggers a Module reward choice

Module levels:
- Lv.1
- Lv.2
- Lv.3 MAX

Prototype can implement only one complete Module progression if needed.

Example:
- Penetration Module

---

## 17. Elite Enemy

Prototype requires at least one Elite encounter.

Elite can reuse an existing enemy with:
- higher HP
- one clearly visible modifier
- Module reward on death

Avoid building a full Elite modifier framework before the basic reward loop is proven.

---

## 18. Evolution

Prototype implements exactly 1 Evolution.

Example concept:
- Gauss Rifle reaches required upgrade state
- Penetration Module reaches required level
- Evolution becomes available or triggers according to design

The purpose is not content volume.
The purpose is to test:
- anticipation
- discovery
- payoff
- visible combat transformation

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

Current normal-run tuning: initial65 Grunts distributed over progress0.08–0.45. Twelve encounters raise caps90→110–135→150–160 with one reserved Elite slot, four relief windows and no blocked-spawn backlog. The final45s uses batch16/650ms; first Elite60s, then40s intervals. Grunt progress/s is0.032; Runner/Shield stay0.08/0.025. All values live in horde/enemy/elite data. Screen ratio must not change these logical pacing values;160-enemy mobile performance is not yet established.

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
- modules
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
- Grant Module
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
- Module
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

## 28. Development Milestones

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

### Milestone 6 — Module + Elite + Evolution
- Elite encounter
- Module reward
- Module leveling
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

STOP after Milestone 9 for prototype review.

Do not continue into production automatically.

---

## 29. Prototype Review Gate

After Milestone 9, answer:

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

**Prototype Technical Spec v0.1 ready for review.**

Next artifact after approval:
- Codex Implementation Plan / task breakdown
- repository setup instructions
- first milestone handoff prompt
