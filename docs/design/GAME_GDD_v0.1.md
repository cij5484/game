# GAME GDD v0.1

> Status: **Pre-production / Prototype planning**
>
> This document is the current **source of truth** for the game concept discussed in ChatGPT.
> Any future changes should update this document rather than relying on scattered chat history.

---

## 1. Game Vision

**Mobile web-based 2D Horde Defense + Roguelite Build game**

The player character stands fixed on a wall at the bottom of the screen. Large groups of enemies approach from the far top area toward the wall.

The battlefield uses **3 Soft Lanes** (left / center / right). Enemies are not locked to rigid rails; they can spread, overlap, and slightly shift within each lane.

A completed stage is designed as an approximately **15-minute Run**, with **resume support** for interrupted mobile sessions.

The core fantasy is:

> Start relatively weak, build a strong loadout during the Run, then wipe out huge hordes of enemies in the late game.

---

## 2. Core Pillars

1. **Touch Combat**
   - The screen itself acts as the controller.
   - Avoid excessive on-screen buttons.

2. **Build Strategy**
   - Character, Magic, Module, upgrades, Evolutions, and hidden recipes produce different builds each Run.

3. **Horde Fantasy**
   - Large quantities of enemies.
   - Strong late-game crowd-clearing satisfaction.

4. **Power Escalation**
   - The player's power should look and feel dramatically different between the beginning and end of a Run.

5. **Discovery**
   - Hidden Evolutions, Synergies, and Secret Evolutions.

6. **Friend Competition**
   - Primarily intended for 5–6 friends.
   - Stage score, Challenge, character-specific records, and build comparison.

---

## 3. Battlefield & Camera

- Player and wall are at the **bottom**.
- Enemies spawn from the **far top** and move downward.
- Battlefield is divided into **3 Soft Lanes**.
- Use 2D sprites with **fake perspective**:
  - Far enemies appear smaller.
  - Enemies grow visually as they approach the wall.

---

## 4. Input System

| Input | Action |
|---|---|
| Tap empty space | Primary attack using Smart Auto Target |
| Tap enemy | Primary attack manually targeted at that enemy |
| Draw gesture | Cast assigned Magic |
| Two-finger tap | Secondary Ability |
| BURST button | Trigger Rhythm Burst |

### Targeting
- No persistent target lock by default.
- Enemy tap affects the next attack target.
- Tapping empty space returns to Smart Auto Target.

### Input Buffer
Primary attacks use a **1-command input buffer**.
Repeated tapping does not increase DPS beyond the weapon's designed fire rate.

---

## 5. Prototype Character — StarCraft Marine

> Private study-only prototype character.

### Primary Attack — Gauss Rifle
- One tap triggers a **3-round burst**.
- Weapon Fire Rate determines actual attack speed.
- Faster tapping must not directly increase DPS.
- 1 buffered attack command allowed.

### Secondary Ability — Stimpack
Initial design:

1. **Boost**
2. **Crash**
   - 1 second: primary attack unavailable
3. **Recovery**
   - 2 seconds: attack speed gradually returns to normal

Exact Boost duration and values are tuning parameters.

---

## 6. Primary Weapon Build Directions

Each character Primary Attack has approximately **3 Build Identities**.

Marine Gauss Rifle prototype:

### RAPID
- Burst count
- Attack cycle
- Fire rate
- Sustained DPS

### PENETRATION
- Piercing
- Armor bypass
- Linear damage
- Strong against dense / armored targets

### RICOCHET
- Bouncing projectiles
- Spread damage
- Strong against dispersed hordes

### Rules
- No hard class choice at the start.
- Level-up choices naturally bias the build.
- Hybrid builds remain possible.
- High-tier upgrades require deeper specialization.
- Prefer **Behavior Upgrades** over pure stat increases.

---

## 7. Magic System

### Active Slots
- Start with **1 Magic slot**.
- Unlock permanently:
  - 1 → 2 → **MAX 3**
- Active Magic remains capped at 3.

### Gesture Slots
Example:
- `○` = Magic Slot A
- `Z` = Magic Slot B
- `│` = Magic Slot C

The gesture is tied to the slot, not permanently to one spell.

### Casting Types
1. **Instant Cast**
   - Gesture completes → spell immediately activates
2. **Targeted Cast**
   - Gesture completes → tap location to place spell

### Growth
Each Magic has approximately **2 upgrade directions**.
Mixing is allowed early/mid Run, but top-tier upgrades require specialization.

Prototype Magic candidates:
- Frost Nova
- Chain Lightning
- Meteor

Prototype implements only **2 Magic spells initially**.

---

## 8. Level Up System

- Enemy kills grant XP.
- On level up, combat **pauses completely**.
- Player chooses **1 of 3** upgrades.
- New unrelated Magic does not randomly appear during the Run.
- Level-up mainly upgrades the pre-selected loadout.

### Weighted Random
Upgrade candidates use weighted RNG rather than fully random selection.

### Build Bias
Selections can slightly increase the appearance chance of related upgrades without guaranteeing them.

### Reroll Meta Progression
- Initial: **0**
- Unlock:
  - 0 → 1 → 2 → **MAX 3 per Run**

---

## 9. Module System

Modules are **Run-only passive items**.

### Acquisition
- Not obtained from the normal level-up screen.
- Dropped by **Elite / Unique enemies**.
- After a drop, present **2–3 candidates** and choose one.

### Capacity
- Maximum **3 Module types per Run**.

### Growth
Each Module can grow:
- Lv.1
- Lv.2
- Lv.3 MAX

Later levels should preferably add Behavior changes, not only bigger numbers.

Example:
**Penetration Module**
- Lv.1: Pierce +1
- Lv.2: Improved damage retention after piercing
- Lv.3: Additional special effect after final pierce

Run ends → equipped Module effects reset.
Discovery information remains permanently in the Codex.

---

## 10. Evolution / Synergy / Secret Evolution

### Evolution
Relatively discoverable combination, e.g.
- Weapon or Magic + specific Module

### Synergy
Special interaction between different abilities.

### Secret Evolution
Rare final combination with harder conditions.

### Recipe Philosophy
- Recipes exist from the beginning.
- The player may discover one before obtaining hints.
- Progression reveals hints gradually.
- Hints improve discoverability; they do not unlock permission to evolve.

### Hint Sources
- New character unlocks
- New weapon unlocks
- New Magic unlocks
- Module discovery
- Stage progress
- Challenges
- Near-miss Runs

### Near Miss
If a Run almost satisfies a hidden recipe, provide a vague hint afterward.

### Codex
Once a recipe is discovered, its exact requirements are permanently recorded.
The player must still satisfy the recipe again in every new Run.

---

## 11. Burst System

### Gauge
Built through good play such as:
- Hits
- Kills
- Consecutive hits
- Elite kills

Not simply raw tap count.

### Activation
- Gauge at 100% → `READY`
- Does **not** auto-trigger
- Player manually presses the **BURST button**

### Rhythm Burst
- Combat enters extreme slow motion rather than full pause.
- Short **2–4 second** rhythm/timing interaction.
- Accuracy affects Ultimate strength.
- Complete failure should still provide a reduced effect rather than wasting the entire gauge.

### Build Interaction
Burst has a character-specific base form.
Current Run build can transform its final behavior/visuals.

---

## 12. Wall System

- No separate player HP in the initial design.
- **Wall HP** is the primary defeat condition.
- One shared Wall HP pool for all 3 lanes.

Enemies reaching the wall can:
- Basic attack
- Charge
- Self-destruct
- Siege
- Ranged attack from distance

Wall HP = 0 → Run failure.

---

## 13. Enemy Design Principles

Enemies must create different decisions, not merely have different HP values.

Potential enemy roles:
- Grunt
- Runner
- Shield
- Bomber
- Ranged
- Tank
- Summoner
- Flying

### Smart Auto Target
Should be reasonably useful but not perfect.
Manual enemy targeting must remain strategically valuable.

### Elite / Unique
- More than simple HP multipliers.
- May use modifiers or unique behavior.
- Main source of Modules and special rewards.

Prototype enemy count:
- Grunt
- Runner
- Shield

---

## 14. Stage Structure

**1 Stage = approximately 15-minute Run**

A Stage contains multiple encounter phases, e.g.
- Basic waves
- Pressure
- Elite
- Mixed enemies
- Unique / Elite
- Large Horde
- Boss

Stage identity must come from gameplay problems and enemy compositions, not only background art.

Before starting the Stage, show:
- Enemy types
- Approximate prevalence

Do **not** reveal exact wave order and counts.

---

## 15. Replay Structure

If Stage 2 is too difficult, the player can replay Stage 1 using:
- Different character
- Different Primary Weapon Variant
- Different Magic
- Different build
- Evolution hunting
- Mastery goals
- Challenge Modifiers

Earlier stages should remain useful without becoming pure repetitive grinding.

---

## 16. Meta Progression

### Reset every Run
- Level
- XP
- Run upgrades
- Modules
- Evolution state
- Temporary build state

### Permanent
- Characters
- Weapon Variants
- Magic unlocks
- Magic Slot count
- Reroll count
- Recipe discoveries / hints
- Character Mastery
- Currency
- Stage progress
- Challenge unlocks

---

## 17. Character Weapon Family

Each character owns a thematic **Weapon Family**.

Marine example:
- C-14 Gauss Rifle
- Heavy Gauss Rifle
- Pulse Rifle
- Rail Rifle

Weapon Variants are permanently unlocked but should be **sidegrades / different playstyles**, not simple strict upgrades.

Every Run still begins the selected Variant at its Run-level baseline.

---

## 18. Currency

### Gold
Used for small permanent character stat growth.

### Credits
Used for general unlocks:
- Weapon Variants
- Magic
- Reroll upgrades
- General progression

### Core
Rare currency for major unlocks:
- Characters
- Magic Slots
- High-value progression systems

Currencies should have clearly separated purposes.

---

## 19. Character Mastery

Gold upgrades permanent character stats.

Each stat:
- **5 levels MAX**
- Initial tuning target can be around 5% per step where appropriate
- High-impact stats may use smaller increments

Later Mastery levels become **very expensive**.

Purpose:
- Give visible long-term growth.
- Keep early characters relevant.
- Do not replace build strategy with raw stat power.

---

## 20. Awakening

If all character Mastery categories reach MAX:

> **Awakening becomes available**

Awakening should be expensive.

Reward should emphasize:
- New unique mechanic
- Secondary Ability variation
- Burst variation
- Visual / presentation upgrade

Avoid making Awakening only a large raw-stat increase.

---

## 21. Challenge Modifier

After clearing a Stage, players can manually combine difficulty modifiers.

Examples:
- Enemy movement speed increase
- Enemy HP increase
- More Elites
- Reduced Wall HP
- Increased Magic cooldown
- Enemy information partially hidden
- More enemy density

Each modifier has **Challenge Points**.

More Challenge Points:
- Higher difficulty
- Higher reward multiplier
- Higher score multiplier

Initial plan:
- No separate Hard / Nightmare modes required.
- Challenge Modifiers provide scalable difficulty.

---

## 22. Scoring & Friend Competition

Primary target group:
- 5–6 friends

Potential ranking dimensions:
- Stage score
- Personal best
- Character-specific ranking
- Challenge Point records
- Clear time
- Wall HP remaining
- Elite / Boss performance
- Burst performance

Build Summary should be stored with records.

Future candidate:
- **Ghost Challenge**
  - Compare current Run score progression against a friend's best Run.

Server / ranking is **not part of Prototype v0.1**.

---

## 23. Result Screen

Both Clear and Failure should provide useful progression.

Possible summary:
- Total Score
- Clear / survival time
- Wall HP
- Kills
- Elite / Unique kills
- Burst performance
- Evolutions
- Secret Evolutions
- Gold / Credits / Core
- New record
- New Codex discoveries
- Recipe hints

Failure should still grant partial rewards based on progress.

---

## 24. Horde Fantasy & Performance

This is an official Core Requirement.

Desired late-game feeling:
- Screen filled with enemies
- Large chain kills
- Strong VFX and combat escalation
- Huge visual difference from early Run

Do not assume every visible enemy must be a fully expensive simulation object.

Potential optimization techniques:
- Object Pooling
- Sprite Atlas
- Hitscan where appropriate
- Simplified Soft-Lane AI
- Lower-frequency updates for distant enemies
- Target-search optimization
- VFX budget
- Limited off-screen processing

### Engineering Rule
Do not over-optimize before measurement.

Run a dedicated **Horde Stress Test** on actual mobile hardware and establish:
- Active Enemy Budget
- Visual Crowd Budget
- Projectile Budget
- VFX Budget
- FPS target
- Memory target

---

# Prototype v0.1 Scope

Goal: **validate core combat fun**, not build the full game.

| Item | Prototype |
|---|---|
| Character | Marine 1 |
| Primary | Gauss Rifle |
| Secondary | Stimpack |
| Magic | 2 |
| Enemy | 3 types |
| Soft Lane | 3 |
| Wall HP | Yes |
| Auto / Manual target | Yes |
| Input Buffer | Yes |
| Basic Level Up | Yes |
| Module | 1–2 |
| Evolution | 1 |
| Burst | 1 |
| Playtime | ~5 minutes |
| Art | Graybox / Placeholder |
| Audio | Temporary |
| Server | No |
| Ranking | No |

Separate engineering task:
- **Horde Stress Test**

---

# Prototype Success Criteria

A technically functioning build is **not enough**.

The prototype succeeds only if playtesting suggests:

1. Tap attack feels satisfying.
2. Auto / Manual target switching feels natural.
3. Gesture casting feels useful rather than annoying.
4. Soft Lanes create meaningful threat decisions.
5. Level-up choices visibly alter combat.
6. Late prototype combat produces meaningful power escalation.
7. Horde clearing is satisfying.
8. A 5-minute Run creates desire to replay.
9. Mobile performance is viable on real devices.

If these fail, revise game design **before investing in final art/audio**.

---

# Technical Direction

Prototype stack:

- **Phaser**
- **TypeScript**
- **Vite**

Principles:
- Mobile web first
- Data-driven balance values
- Separate game rules/data from Phaser-specific rendering/input where practical
- No backend during first prototype
- Real mobile testing early
- Future production engine decision after prototype validation:
  - Continue Phaser, or
  - Rebuild production version in Godot if justified

---

# Development Workflow

Primary implementation environment:
- **Codex app**

ChatGPT role:
- Game design
- GDD / technical planning
- Architecture review
- Balance-design review
- Asset specifications
- Image / sprite asset generation when requested

Codex role:
- Repository
- Git workflow
- Implementation
- Tests
- Refactoring
- Debugging
- Builds
- Performance profiling

No large "build the whole game" task.
Implementation should proceed through small reviewed milestones.

---

# Data / Balance Tooling Principle

All tunable values must be separated from gameplay logic from the beginning.

Later internal tools may include:
- Balance Editor
- Enemy Spawn Console
- Run Control
- Time Scale Control
- DPS analyzer
- Wave editor
- Recipe tester

Do not build the full editor during the earliest prototype.
Create GUI tooling once repeated tuning makes it valuable.

---

## Current Status

**Game Design v0.1 approved in principle.**

Next design artifact:
> **Prototype Technical Spec**
