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

- Current gameplay implementation baseline (merged into main): 0489ef9cdfcf39870e53178f82e531d8bac4931d.
- Historical verification record: the handoff added in 0ce3ca0, referencing gameplay commit 2d6d9fd, reported npm run check with 29 test files / 144 tests passed, TypeScript and production build passed, and a bundle-size warning. This is not verification of the current baseline; tests/build were not rerun for this documentation correction.
- Portrait full-bleed combat, five-minute run, traits/relics/cores/synergies/evolution, gesture magic, Stimpack, ultimate, Korean HUD, pause/restart.
- Opening: 48 Grunts, 6 replacements per 1800ms, initial cap72, late cap180. Spawn-time speed starts at65% of base and grows to102% over300s. HP grows to110%.
- Basic upgrades: damage, attack speed, critical chance only. Critical damage fixed1.75x. Weapon trait draw weights2x.
- Circle tolerances: closure0.22, radial error0.18. Z alignment and negative fixtures retained. Real-device gesture reliability needs playtesting.
- Desktop secondary input: simultaneous left/right mouse buttons. Mobile: two-finger tap. Pause icon top right; restart resets the run.

Current design source: docs/design/GAME_GDD_v0.6.md (target design, not implemented). Read its Prototype Scope, Future / Not in Prototype and Current Implementation Gap before continuing. The state above is a historical handoff snapshot; do not treat it as the latest implementation. Read README.md and the code for current behavior. GDD v0.5, v0.4 and v0.3 are preserved unchanged as historical design records. GDD v0.2 and PROTOTYPE_TECHNICAL_SPEC_v0.1.md retain historical design/implementation notes. Gameplay tuning lives in src/game/data/. Mobile performance, pacing and gesture feel remain user playtest items.
