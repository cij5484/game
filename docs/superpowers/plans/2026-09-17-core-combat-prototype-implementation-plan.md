# Core Combat Prototype Implementation Plan

> **For agentic workers:** Execute this plan task-by-task. Do not skip review gates. Prefer TDD for pure game logic, frequent commits, and small diffs.

**Goal:** Build a ~5-minute mobile-web graybox prototype that validates the game's core combat loop, touch input, build progression, horde feel, and mobile performance.

**Architecture:** Use Phaser primarily for rendering, scene lifecycle, and browser input. Keep core gameplay rules in small TypeScript modules that can be tested without Phaser. Avoid heavy per-enemy physics in the first prototype; use lightweight Soft-Lane movement and simple geometric queries so horde scale remains feasible.

**Tech Stack:** Phaser 3, TypeScript (strict), Vite, Vitest, ESLint, Prettier. Add Playwright only when browser-level interaction testing becomes useful near the playtest milestone.

**Spec:** `docs/design/PROTOTYPE_TECHNICAL_SPEC_v0.1.md`  
**Game Design:** `docs/design/GAME_GDD_v0.1.md`

## Global Constraints

- Mobile web first; landscape combat layout.
- Android Chrome is the first mobile target; iPhone Safari must be tested early.
- Prototype length: about 5 minutes.
- Prototype character: Marine only.
- Primary: 3-round Gauss Rifle burst.
- Secondary: Stimpack; after effect = 1 second primary lockout + 2 second gradual recovery.
- 3 Soft Lanes.
- Empty-space tap = Smart Auto Target primary attack.
- Enemy tap = that enemy receives the next primary attack.
- 1-command primary input buffer; tap speed must not increase DPS.
- Prototype Magic count: 2.
- Prototype enemies: Grunt, Runner, Shield.
- One shared Wall HP pool.
- Level-up pauses combat and offers 3 choices.
- Prototype Module count: 1–2.
- Prototype Evolution count: exactly 1.
- Prototype Burst count: exactly 1.
- No backend, login, online ranking, permanent economy, final art, or final audio.
- Tunable balance values must be separated from gameplay logic.
- Do not optimize speculatively; profile first, then optimize measured bottlenecks.
- Stop after the prototype review gate. Do not continue into production automatically.

---

# File Structure

Create this structure unless the repository already has a clearly better equivalent:

```text
.
├─ docs/
│  └─ design/
│     ├─ GAME_GDD_v0.1.md
│     └─ PROTOTYPE_TECHNICAL_SPEC_v0.1.md
├─ src/
│  ├─ main.ts
│  ├─ game/
│  │  ├─ createGame.ts
│  │  ├─ scenes/
│  │  │  └─ CombatScene.ts
│  │  ├─ data/
│  │  │  ├─ balance.ts
│  │  │  ├─ enemies.ts
│  │  │  ├─ weapons.ts
│  │  │  ├─ magic.ts
│  │  │  └─ upgrades.ts
│  │  ├─ model/
│  │  │  ├─ types.ts
│  │  │  └─ runState.ts
│  │  ├─ battlefield/
│  │  │  ├─ lanes.ts
│  │  │  └─ perspective.ts
│  │  ├─ combat/
│  │  │  ├─ targeting.ts
│  │  │  ├─ gaussRifle.ts
│  │  │  ├─ stimpack.ts
│  │  │  ├─ damage.ts
│  │  │  └─ burst.ts
│  │  ├─ input/
│  │  │  ├─ pointerClassifier.ts
│  │  │  ├─ gestureRecognizer.ts
│  │  │  └─ touchController.ts
│  │  ├─ enemies/
│  │  │  ├─ enemySimulation.ts
│  │  │  └─ enemyFactory.ts
│  │  ├─ progression/
│  │  │  ├─ xp.ts
│  │  │  ├─ upgradeRoll.ts
│  │  │  ├─ modules.ts
│  │  │  └─ evolution.ts
│  │  ├─ waves/
│  │  │  └─ prototypeWave.ts
│  │  └─ debug/
│  │     └─ debugControls.ts
│  └─ style.css
├─ tests/
│  ├─ battlefield/
│  ├─ combat/
│  ├─ input/
│  ├─ enemies/
│  └─ progression/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
└─ README.md
```

Responsibility rule: `CombatScene.ts` orchestrates; it must not become the home for weapon math, targeting rules, gesture recognition, XP formulas, or enemy behavior.

---

# Task 1: Repository Foundation + Quality Gates

**Files:**
- Create/modify: `package.json`
- Create/modify: `tsconfig.json`
- Create/modify: `vite.config.ts`
- Create: `src/main.ts`
- Create: `src/game/createGame.ts`
- Create: `src/game/scenes/CombatScene.ts`
- Create: `src/style.css`
- Create: `tests/smoke.test.ts`
- Create: `README.md`
- Copy: `docs/design/GAME_GDD_v0.1.md`
- Copy: `docs/design/PROTOTYPE_TECHNICAL_SPEC_v0.1.md`

**Interfaces:**
- Produces: `createGame(parent: HTMLElement): Phaser.Game`

- [ ] **Step 1: Initialize the project**

Run:

```bash
npm create vite@latest . -- --template vanilla-ts
npm install phaser
npm install -D vitest eslint prettier
```

If the directory is not empty, do not overwrite user files; initialize carefully and preserve docs.

- [ ] **Step 2: Enable strict TypeScript**

Ensure `tsconfig.json` contains strict checking:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

Preserve Vite-required defaults.

- [ ] **Step 3: Add test scripts**

Ensure `package.json` scripts include:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "npm run test && npm run build"
  }
}
```

- [ ] **Step 4: Write a failing smoke test**

Create `tests/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { PROTOTYPE_NAME } from '../src/game/createGame'

describe('prototype foundation', () => {
  it('exports the prototype name', () => {
    expect(PROTOTYPE_NAME).toBe('Horde Defense Prototype')
  })
})
```

- [ ] **Step 5: Run the test and confirm failure**

Run:

```bash
npm test
```

Expected: FAIL because `PROTOTYPE_NAME` does not exist yet.

- [ ] **Step 6: Add minimal Phaser bootstrap**

`src/game/createGame.ts` must export:

```ts
import Phaser from 'phaser'
import { CombatScene } from './scenes/CombatScene'

export const PROTOTYPE_NAME = 'Horde Defense Prototype'

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#111111',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720
    },
    scene: [CombatScene]
  })
}
```

`CombatScene.ts` should render only a placeholder text and simple rectangle.

- [ ] **Step 7: Run checks**

```bash
npm run check
```

Expected: tests pass and production build succeeds.

- [ ] **Step 8: Verify LAN development access**

Run:

```bash
npm run dev -- --host 0.0.0.0
```

Confirm desktop browser loads the scene. Record the LAN URL in `README.md` and state that physical-device testing should use the local machine IP on the same Wi-Fi.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "chore: initialize Phaser prototype"
```

**Review gate:** stop and verify project boots, tests run, build passes, and docs are inside the repo.

---

# Task 2: Core Types + Data-Driven Balance

**Files:**
- Create: `src/game/model/types.ts`
- Create: `src/game/data/balance.ts`
- Create: `src/game/data/enemies.ts`
- Create: `src/game/data/weapons.ts`
- Create: `src/game/data/magic.ts`
- Test: `tests/data/balance.test.ts`

**Interfaces:**
- Produces:
  - `LaneId = 'left' | 'center' | 'right'`
  - `EnemyKind = 'grunt' | 'runner' | 'shield'`
  - typed configs for Marine, Gauss Rifle, Stimpack, enemies, Magic

- [ ] **Step 1: Write a failing balance-data test**

```ts
import { describe, expect, it } from 'vitest'
import { gaussRifleBalance, stimpackBalance } from '../../src/game/data/balance'

describe('prototype balance data', () => {
  it('keeps attack cadence and stim recovery in data', () => {
    expect(gaussRifleBalance.roundsPerBurst).toBe(3)
    expect(gaussRifleBalance.maxBufferedCommands).toBe(1)
    expect(stimpackBalance.crashMs).toBe(1000)
    expect(stimpackBalance.recoveryMs).toBe(2000)
  })
})
```

- [ ] **Step 2: Run and confirm failure**

```bash
npm test -- tests/data/balance.test.ts
```

- [ ] **Step 3: Implement typed data**

Create explicit interfaces and export balance constants. Use temporary values for unapproved tuning numbers, clearly labeled as `prototype tuning value`, but never bury them in combat code.

Example:

```ts
export const gaussRifleBalance = {
  roundsPerBurst: 3,
  roundIntervalMs: 110,
  burstRecoveryMs: 380,
  maxBufferedCommands: 1,
  damagePerRound: 10
} as const
```

Stimpack must include exactly:

```ts
crashMs: 1000,
recoveryMs: 2000
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/data/balance.test.ts
```

- [ ] **Step 5: Run full check and commit**

```bash
npm run check
git add src/game/model src/game/data tests/data
git commit -m "feat: add typed prototype balance data"
```

---

# Task 3: Soft-Lane Geometry + Fake Perspective

**Files:**
- Create: `src/game/battlefield/lanes.ts`
- Create: `src/game/battlefield/perspective.ts`
- Test: `tests/battlefield/lanes.test.ts`
- Test: `tests/battlefield/perspective.test.ts`
- Modify: `src/game/scenes/CombatScene.ts`

**Interfaces:**
- Produces:
  - `laneCenterX(lane: LaneId, width: number): number`
  - `laneX(lane: LaneId, width: number, offset01: number): number`
  - `perspectiveScale(progress01: number): number`

- [ ] **Step 1: Write failing lane tests**

```ts
import { describe, expect, it } from 'vitest'
import { laneCenterX } from '../../src/game/battlefield/lanes'

describe('soft lanes', () => {
  it('orders lane centers from left to right', () => {
    const left = laneCenterX('left', 1280)
    const center = laneCenterX('center', 1280)
    const right = laneCenterX('right', 1280)
    expect(left).toBeLessThan(center)
    expect(center).toBeLessThan(right)
  })
})
```

- [ ] **Step 2: Write failing perspective test**

```ts
import { describe, expect, it } from 'vitest'
import { perspectiveScale } from '../../src/game/battlefield/perspective'

describe('fake perspective', () => {
  it('makes near enemies larger than far enemies', () => {
    expect(perspectiveScale(1)).toBeGreaterThan(perspectiveScale(0))
  })
})
```

- [ ] **Step 3: Run and confirm failures**

```bash
npm test -- tests/battlefield
```

- [ ] **Step 4: Implement minimal geometry**

Use normalized progress where:
- `0` = far spawn
- `1` = wall

Keep lane movement mathematical and lightweight.

- [ ] **Step 5: Render lane debug guides**

In `CombatScene.ts`, draw 3 translucent lane regions and far/near markers. No gameplay yet.

- [ ] **Step 6: Run checks and commit**

```bash
npm run check
git add src/game/battlefield src/game/scenes tests/battlefield
git commit -m "feat: add soft-lane battlefield geometry"
```

---

# Task 4: Enemy Simulation + Wall Damage

**Files:**
- Create: `src/game/enemies/enemySimulation.ts`
- Create: `src/game/enemies/enemyFactory.ts`
- Create: `src/game/model/runState.ts`
- Test: `tests/enemies/enemySimulation.test.ts`
- Modify: `src/game/scenes/CombatScene.ts`

**Interfaces:**
- Produces:
  - `EnemyState`
  - `advanceEnemy(enemy, deltaMs, config): EnemyState`
  - `createPrototypeEnemy(kind, lane, id): EnemyState`
  - `RunState.wallHp`

- [ ] **Step 1: Write a failing movement test**

Test that a Grunt's `progress01` increases with positive delta and never exceeds 1.

- [ ] **Step 2: Write a failing wall-attack test**

Test that an enemy at attack range reduces Wall HP according to its attack interval and damage data.

- [ ] **Step 3: Run and confirm failures**

```bash
npm test -- tests/enemies
```

- [ ] **Step 4: Implement pure enemy simulation**

Do not add Arcade Physics bodies. Represent prototype enemies with lightweight state and render them from that state.

Enemy kinds:
- Grunt: baseline
- Runner: faster, lower HP
- Shield: slower, higher effective durability

- [ ] **Step 5: Render placeholder enemies**

Use circles/rectangles with labels `G`, `R`, `S`.

- [ ] **Step 6: Add one shared Wall HP bar**

When HP reaches 0, stop spawning and show a simple `RUN FAILED` overlay.

- [ ] **Step 7: Check and commit**

```bash
npm run check
git add src/game/enemies src/game/model src/game/scenes tests/enemies
git commit -m "feat: add enemy movement and wall pressure"
```

---

# Task 5: Targeting System

**Files:**
- Create: `src/game/combat/targeting.ts`
- Test: `tests/combat/targeting.test.ts`
- Modify: `src/game/scenes/CombatScene.ts`

**Interfaces:**
- Produces:
  - `selectAutoTarget(enemies): EnemyState | null`
  - `resolveAttackTarget(manualTargetId, enemies): EnemyState | null`

- [ ] **Step 1: Write failing auto-target test**

Given multiple alive enemies, nearest-to-wall enemy should be selected in the initial prototype.

- [ ] **Step 2: Write failing manual override test**

If a valid enemy id is manually selected, it must override the auto target for that command only.

- [ ] **Step 3: Run and confirm failures**

```bash
npm test -- tests/combat/targeting.test.ts
```

- [ ] **Step 4: Implement deterministic target selection**

Do not add threat weighting yet.

- [ ] **Step 5: Add oversized touch hit areas for enemy placeholders**

Visible sprite and touch hit area are allowed to differ.

- [ ] **Step 6: Check and commit**

```bash
npm run check
git add src/game/combat/targeting.ts src/game/scenes/CombatScene.ts tests/combat/targeting.test.ts
git commit -m "feat: add auto and manual targeting"
```

---

# Task 6: Gauss Rifle Fire Cycle + 1-Command Buffer

**Files:**
- Create: `src/game/combat/gaussRifle.ts`
- Test: `tests/combat/gaussRifle.test.ts`
- Modify: `src/game/scenes/CombatScene.ts`

**Interfaces:**
- Produces a pure weapon state machine with:
  - idle
  - firing burst
  - burst recovery
  - one queued command maximum

- [ ] **Step 1: Write failing burst-count test**

One accepted attack command must emit exactly 3 round events at the configured interval.

- [ ] **Step 2: Write failing anti-mash test**

Submit many commands during a burst and assert that only one future burst becomes queued.

- [ ] **Step 3: Write failing target-capture test**

A manual target selected for a command must be used by that command; subsequent auto command returns to auto targeting.

- [ ] **Step 4: Run failures**

```bash
npm test -- tests/combat/gaussRifle.test.ts
```

- [ ] **Step 5: Implement weapon state machine**

Weapon math remains independent of Phaser rendering.

- [ ] **Step 6: Integrate simple hitscan visual**

On each round:
- apply damage immediately
- draw a short-lived tracer line
- do not create a full physics projectile

This is deliberate because the prototype aims at large hordes.

- [ ] **Step 7: Verify tap speed does not change DPS**

Add a deterministic unit test comparing normal tapping and spam tapping over the same simulated time window.

- [ ] **Step 8: Check and commit**

```bash
npm run check
git add src/game/combat/gaussRifle.ts src/game/scenes/CombatScene.ts tests/combat/gaussRifle.test.ts
git commit -m "feat: add rate-limited Marine burst fire"
```

**Review gate:** test on desktop. Confirm input spam cannot exceed the weapon's designed cadence.

---

# Task 7: Touch Classification + Real Mobile Primary Attack

**Files:**
- Create: `src/game/input/pointerClassifier.ts`
- Create: `src/game/input/touchController.ts`
- Test: `tests/input/pointerClassifier.test.ts`
- Modify: `src/game/scenes/CombatScene.ts`

**Interfaces:**
- Produces:
  - `classifyPointerPath(points, durationMs): 'tap' | 'gesture' | 'noise'`
  - touch controller events for empty tap, enemy tap, gesture start/end, two-finger tap

- [ ] **Step 1: Write failing pointer classification tests**

Cases:
- short movement + short duration => tap
- meaningful movement => gesture
- tiny accidental jitter => tap
- path too small but abnormal => noise only if necessary

- [ ] **Step 2: Run and confirm failure**

```bash
npm test -- tests/input/pointerClassifier.test.ts
```

- [ ] **Step 3: Implement configurable thresholds**

Thresholds belong in balance/input config, not literals buried in event handlers.

- [ ] **Step 4: Integrate empty-space and enemy taps**

- [ ] **Step 5: Physical-device test**

Run:

```bash
npm run dev -- --host 0.0.0.0
```

Test on actual Android phone:
- empty tap fires
- enemy tap fires at selected enemy
- rapid tapping does not boost DPS
- page does not scroll during combat

Then test on iPhone Safari if available:
- same behaviors
- note any browser gesture conflicts

Record findings in `docs/design/mobile-input-notes.md`.

- [ ] **Step 6: Commit**

```bash
git add src/game/input src/game/scenes tests/input docs/design/mobile-input-notes.md
git commit -m "feat: integrate mobile touch combat input"
```

---

# Task 8: Stimpack State Machine

**Files:**
- Create: `src/game/combat/stimpack.ts`
- Test: `tests/combat/stimpack.test.ts`
- Modify: `src/game/scenes/CombatScene.ts`

**Interfaces:**
- Produces Stimpack phases:
  - inactive
  - boost
  - crash
  - recovery

- [ ] **Step 1: Write failing crash test**

After Boost ends, primary attack must be unavailable for exactly `1000ms` according to current design data.

- [ ] **Step 2: Write failing recovery test**

After crash, attack-speed multiplier must interpolate back to normal over exactly `2000ms`.

- [ ] **Step 3: Run failures**

```bash
npm test -- tests/combat/stimpack.test.ts
```

- [ ] **Step 4: Implement state machine**

- [ ] **Step 5: Connect two-finger tap**

If two-finger input is unreliable on either target browser, record the failure instead of hiding it.

- [ ] **Step 6: Commit**

```bash
npm run check
git add src/game/combat/stimpack.ts src/game/scenes tests/combat/stimpack.test.ts
git commit -m "feat: add Stimpack boost crash and recovery"
```

---

# Task 9: Gesture Recognizer + Two Prototype Magic Spells

**Files:**
- Create: `src/game/input/gestureRecognizer.ts`
- Create: `src/game/combat/damage.ts`
- Modify/create: `src/game/data/magic.ts`
- Test: `tests/input/gestureRecognizer.test.ts`
- Test: `tests/combat/magic.test.ts`
- Modify: `src/game/scenes/CombatScene.ts`

**Interfaces:**
- Produces:
  - `recognizeGesture(points): { kind: 'circle' | 'z' | 'unknown'; confidence: number }`
  - Frost Nova effect
  - Chain Lightning effect

- [ ] **Step 1: Write gesture fixture tests**

Include several rough point paths for:
- circle
- Z
- unknown scribble

- [ ] **Step 2: Run and confirm failure**

```bash
npm test -- tests/input/gestureRecognizer.test.ts
```

- [ ] **Step 3: Implement tolerant recognizer**

Do not use ML. Use normalized paths, bounding-box features, direction changes, and distance thresholds sufficient for two prototype gestures.

- [ ] **Step 4: Write Frost Nova behavior test**

Enemies in range receive the configured slow/freeze state; enemies outside do not.

- [ ] **Step 5: Write Chain Lightning behavior test**

Spell hits a starting target and chains to up to configured additional nearby targets without duplicating a target.

- [ ] **Step 6: Implement Magic effects**

Keep them as gameplay functions independent of graphics.

- [ ] **Step 7: Integrate placeholder VFX**

- [ ] **Step 8: Physical-device test**

Test drawing gestures while enemies are approaching. Record:
- recognition errors
- hand occlusion issues
- accidental taps
- whether gesture usage feels too slow under pressure

- [ ] **Step 9: Commit**

```bash
npm run check
git add src/game/input src/game/combat src/game/data src/game/scenes tests/input tests/combat
git commit -m "feat: add gesture casting and prototype magic"
```

**Review gate:** if gestures feel annoying or unreliable, stop and revise input design before progression work.

---

# Task 10: XP + Pause-on-Level + Upgrade Choice

**Files:**
- Create: `src/game/progression/xp.ts`
- Create: `src/game/progression/upgradeRoll.ts`
- Create/modify: `src/game/data/upgrades.ts`
- Test: `tests/progression/xp.test.ts`
- Test: `tests/progression/upgradeRoll.test.ts`
- Modify: `src/game/scenes/CombatScene.ts`

**Interfaces:**
- Produces:
  - XP progression
  - 3-choice upgrade roll
  - minimal upgrades for Gauss Rifle and Magic

- [ ] **Step 1: Write XP threshold test**
- [ ] **Step 2: Write 3-choice uniqueness test**
- [ ] **Step 3: Write maxed-upgrade exclusion test**
- [ ] **Step 4: Run failures**

```bash
npm test -- tests/progression
```

- [ ] **Step 5: Implement minimal weighted roll**

No Reroll.

- [ ] **Step 6: Implement full combat pause during choice**

- [ ] **Step 7: Add prototype upgrade effects**

At minimum:
- Gauss burst count +1
- Gauss penetration +1
- Gauss cycle improvement
- Frost Nova improvement
- Chain Lightning target count +1

- [ ] **Step 8: Check and commit**

```bash
npm run check
git add src/game/progression src/game/data/upgrades.ts src/game/scenes tests/progression
git commit -m "feat: add prototype level-up progression"
```

---

# Task 11: Elite + Module + One Evolution

**Files:**
- Create: `src/game/progression/modules.ts`
- Create: `src/game/progression/evolution.ts`
- Test: `tests/progression/modules.test.ts`
- Test: `tests/progression/evolution.test.ts`
- Modify: `src/game/scenes/CombatScene.ts`

**Interfaces:**
- Produces:
  - one Elite reward event
  - Penetration Module Lv.1–3
  - one Marine Evolution recipe

- [ ] **Step 1: Write Module leveling tests**

Same Module selected repeatedly:
- first => Lv.1
- second => Lv.2
- third => Lv.3
- further acquisition must not exceed MAX

- [ ] **Step 2: Write Evolution condition test**

Define one explicit prototype recipe in data. Example:

```ts
{
  id: 'hyper-gauss-prototype',
  weaponId: 'gauss-rifle',
  requiredWeaponUpgradeTag: 'penetration-specialized',
  moduleId: 'penetration-module',
  requiredModuleLevel: 3
}
```

The exact content is prototype-only; keep recipe data-driven.

- [ ] **Step 3: Run failures**
- [ ] **Step 4: Implement one Elite spawn**
- [ ] **Step 5: On Elite death, pause and show Module choice**
- [ ] **Step 6: Implement Evolution transformation**
- [ ] **Step 7: Make Evolution visually obvious even with graybox assets**
- [ ] **Step 8: Check and commit**

```bash
npm run check
git add src/game/progression src/game/scenes tests/progression
git commit -m "feat: add elite module reward and prototype evolution"
```

---

# Task 12: Burst Gauge + Slow-Motion Timing Sequence

**Files:**
- Create: `src/game/combat/burst.ts`
- Test: `tests/combat/burst.test.ts`
- Modify: `src/game/scenes/CombatScene.ts`

**Interfaces:**
- Produces:
  - gauge accumulation
  - ready state
  - manual activation
  - 2–4 second timing sequence
  - grading
  - reduced effect on poor performance

- [ ] **Step 1: Write gauge test**
- [ ] **Step 2: Write manual activation test**
- [ ] **Step 3: Write grading test**
- [ ] **Step 4: Write minimum-effect test**
- [ ] **Step 5: Run failures**
- [ ] **Step 6: Implement pure Burst state machine**
- [ ] **Step 7: Integrate scene time dilation**

Do not fully stop enemy simulation during Burst.

- [ ] **Step 8: Add placeholder rhythm/timing UI**
- [ ] **Step 9: Add one obvious Ultimate effect**
- [ ] **Step 10: Check and commit**

```bash
npm run check
git add src/game/combat/burst.ts src/game/scenes tests/combat/burst.test.ts
git commit -m "feat: add manual slow-motion burst sequence"
```

---

# Task 13: 5-Minute Prototype Wave + End-to-End Playtest Loop

**Files:**
- Create: `src/game/waves/prototypeWave.ts`
- Modify: `src/game/scenes/CombatScene.ts`
- Create: `docs/design/playtest-sheet-v0.1.md`
- Test: `tests/waves/prototypeWave.test.ts`

**Interfaces:**
- Produces a fixed ~5-minute prototype encounter curve.

- [ ] **Step 1: Write wave schedule test**

Assert:
- all 3 enemy types appear
- at least one Elite appears
- intensity increases over time
- schedule duration is approximately 5 minutes

- [ ] **Step 2: Implement wave data**
- [ ] **Step 3: Add simple start / finish / failure loop**
- [ ] **Step 4: Create playtest sheet**

It must ask:
1. Was tapping satisfying?
2. Was manual targeting useful?
3. Were gestures reliable?
4. Did Soft Lanes make threats readable?
5. Did level-up choices change combat?
6. Did Evolution feel rewarding?
7. Did Burst improve pacing?
8. Did you want to replay?
9. Where did your hand feel tired?
10. What felt confusing?

- [ ] **Step 5: Run full check**
- [ ] **Step 6: Test on physical Android and iPhone if available**
- [ ] **Step 7: Commit**

```bash
git add src/game/waves src/game/scenes tests/waves docs/design/playtest-sheet-v0.1.md
git commit -m "feat: assemble five-minute combat prototype"
```

---

# Task 14: Debug Controls + Horde Stress Test

**Files:**
- Create: `src/game/debug/debugControls.ts`
- Create: `docs/performance/horde-stress-test-v0.1.md`
- Modify: `src/game/scenes/CombatScene.ts`

**Interfaces:**
- Debug only:
  - spawn enemy type/count
  - fill Burst gauge
  - grant XP
  - grant Module
  - game speed 0.25x / 0.5x / 1x / 2x / 4x
  - FPS display
  - hit-area display

- [ ] **Step 1: Add debug controls behind a development-only flag**
- [ ] **Step 2: Add controlled enemy-count stress cases**

Suggested test steps:
- 25 enemies
- 50
- 100
- 150
- 200
- continue only while device remains responsive

Do not treat these as promised production budgets.

- [ ] **Step 3: Stress with increasing complexity**

For each count, test:
1. movement only
2. movement + animation placeholders
3. targeting + Gauss fire
4. damage/death churn
5. Magic
6. Burst/VFX

- [ ] **Step 4: Record real-device measurements**

Document per device:
- model
- browser
- enemy count
- average FPS
- worst visible hitch
- memory symptom if observable
- input responsiveness
- failure point

- [ ] **Step 5: Only after measurements, add the minimum necessary optimization**

Possible optimizations:
- object pooling
- reduced distant-enemy update frequency
- capped VFX
- cached target candidates
- reused geometry
- fewer short-lived allocations

Do not add all of them automatically.

- [ ] **Step 6: Re-run stress test and record before/after**
- [ ] **Step 7: Commit**

```bash
git add src/game/debug src/game/scenes docs/performance
git commit -m "perf: add horde stress test and measured budgets"
```

---

# Final Prototype Review Gate

After Task 14, STOP.

Create `docs/design/prototype-review-v0.1.md` and answer with evidence:

1. Tap combat satisfying? PASS / REVISE / FAIL
2. Auto/manual targeting intuitive? PASS / REVISE / FAIL
3. Gesture Magic usable under pressure? PASS / REVISE / FAIL
4. Stimpack creates meaningful timing? PASS / REVISE / FAIL
5. Soft Lanes readable? PASS / REVISE / FAIL
6. Level-up choices visibly alter combat? PASS / REVISE / FAIL
7. Evolution payoff satisfying? PASS / REVISE / FAIL
8. Burst improves pacing? PASS / REVISE / FAIL
9. Horde clearing satisfying? PASS / REVISE / FAIL
10. Mobile performance viable? PASS / REVISE / FAIL

Then choose exactly one:

- **PASS** → write a Vertical Slice design proposal; do not implement it yet.
- **REVISE** → identify the smallest core change and prototype it.
- **FAIL** → stop production investment and redesign the core loop.

No final art pipeline, backend, ranking, permanent economy, multi-character system, or production content starts before this review gate.
