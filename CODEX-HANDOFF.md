# Mac handoff — 2026-09-18

Continue from main after merging the Milestone 12 PR. Do not start another milestone without a new request.

## Setup

```sh
git switch main
git pull --ff-only origin main
npm ci
npm run dev -- --host 0.0.0.0
```

If the Mac checkout has uncommitted changes, preserve them before switching or pulling; do not reset or force-push.

## Current state

- Last gameplay commit: 2d6d9fd. Latest verification: npm run check, 29 test files / 144 tests passed, TypeScript and production build passed. Existing bundle-size warning remains.
- Portrait full-bleed combat, five-minute run, traits/relics/cores/synergies/evolution, gesture magic, Stimpack, ultimate, Korean HUD, pause/restart.
- Opening: 48 Grunts, 6 replacements per 1800ms, initial cap72, late cap180. Spawn-time speed starts at65% of base and grows to102% over300s. HP grows to110%.
- Basic upgrades: damage, attack speed, critical chance only. Critical damage fixed1.75x. Weapon trait draw weights2x.
- Circle tolerances: closure0.22, radial error0.18. Z alignment and negative fixtures retained. Real-device gesture reliability needs playtesting.
- Desktop secondary input: simultaneous left/right mouse buttons. Mobile: two-finger tap. Pause icon top right; restart resets the run.

Read README.md, docs/design/GAME_GDD_v0.2.md and docs/design/PROTOTYPE_TECHNICAL_SPEC_v0.1.md before continuing. Gameplay tuning lives in src/game/data/. Mobile performance, pacing and gesture feel remain user playtest items.
