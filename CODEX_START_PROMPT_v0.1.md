# Codex Start Prompt — Prototype v0.1

You are starting a new mobile-web game prototype.

## Read first

Before editing code, read these files completely:

1. `docs/design/GAME_GDD_v0.1.md`
2. `docs/design/PROTOTYPE_TECHNICAL_SPEC_v0.1.md`
3. `docs/superpowers/plans/2026-09-17-core-combat-prototype-implementation-plan.md`

Treat the GDD as the game-design source of truth, the Technical Spec as the prototype scope source of truth, and the Implementation Plan as the execution order.

## Working mode

This project is a **graybox prototype**, not production.

Primary goal:
> Determine whether the core combat is fun and whether a large-horde mobile-web implementation is technically viable.

Do not add features merely because they seem useful.

Do not implement:
- backend
- login
- rankings
- permanent currencies/economy
- multiple characters
- final art/audio
- PWA install flow
- Challenge Modifier
- Awakening
- full Codex
- production save system

unless a later approved plan explicitly adds them.

## Engineering rules

- Stack: Phaser + TypeScript + Vite.
- TypeScript strict mode.
- Keep tunable balance values outside gameplay logic.
- Keep Phaser scene orchestration separate from pure game rules where practical.
- Avoid a giant `CombatScene`.
- Prefer pure TypeScript functions/state machines for targeting, weapon cadence, Stimpack, XP, Modules, Evolution, Burst, and gesture classification so they can be unit tested.
- Do not use heavy per-enemy physics unless a measured need appears.
- Do not prematurely optimize. Measure first.
- Use real mobile-device testing early.
- Use small commits after coherent tasks.
- Do not silently expand scope.

## Execution

Start with **Task 1 only** from the implementation plan.

For Task 1:
1. Inspect the current directory and existing Git state.
2. If this is not yet a repository, initialize Git.
3. Set up Phaser + TypeScript + Vite and the test/build scripts exactly as required by the plan.
4. Copy/preserve the design documents in `docs/design/`.
5. Run the tests and production build.
6. Start the Vite dev server with LAN access long enough to confirm the app boots.
7. Commit Task 1 as a single coherent commit.

Then STOP and report:

- files created/changed
- commands run
- test result
- build result
- commit hash
- any deviation from the plan and why
- exact next task you recommend

Do **not** begin Task 2 until I approve Task 1.
