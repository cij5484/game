# Mac handoff — 2026-09-18

M3 is merged into main via [PR #18](https://github.com/cij5484/game/pull/18), merge `b86b6915e5aea4a171f74dc7229a97516a0e2c11`. M4 continues on `codex/prototype-m4-horde-weapon-growth`. Do not merge M4 or start another milestone without a new user request.

## Setup

```sh
git fetch origin
git switch codex/prototype-m4-horde-weapon-growth
git pull --ff-only
npm ci
npm run dev -- --host 0.0.0.0
```

Preserve uncommitted work before switching/pulling. Never reset or force-push to synchronize.

## Current implementation / design

Current Design Source: [GAME_GDD_v0.8.md](docs/design/GAME_GDD_v0.8.md). Target design is not a claim that all systems exist. GDD v0.7 and earlier remain unchanged.

- M1: initial range progress≥.55,800ms single-shot Gauss,damage10/GruntHP8 (`d15b41d`).
- M2: twenty-minute temporary stage end,Runner/physical shield/two Elite behaviors and Marine Legacy Magic isolation (`a656b12`,main merge `9df9878`).
- M3: independent Header/Battlefield/Bottom,combat mask,owner-grouped badges,two locked special slots,first engagement3–5s. Normal/elite speed1.5×M2 (`0f408dd`,main merge `b86b691`).
- M4: increased Horde supply with the latest user-requested extra2.5× pass (initial80,late cap700), unchanged HP/speed. Marine3common+6traits(max3types)+range5; repeatable ranks,independent rarity/quality,investment weight,6% great success,3legendary behaviors and actual HUD ownership. See [M4 record](docs/prototype-m4-horde-weapon-growth.md) for exact tuning,simulation limitations and verification.
- Marine Runtime no longer uses Legacy MAX5 traits/branches/execution/selected synergy/auto Evolution. Legacy data/code/tests stay available; base Stimpack/V and existing relic rewards remain. Conflicting tactical-expansion/resonance cores are excluded. No new special weapons,relic/core architecture,Boss or Meta.
- The cap700 change requires real-device late-run rendering/input/pacing assessment. Headless Scene endurance measurements do not prove mobile FPS.

## Historical Milestone 12 snapshot (not current gameplay)


- Current gameplay implementation baseline (merged into main): 0489ef9cdfcf39870e53178f82e531d8bac4931d.
- Historical verification record: the handoff added in 0ce3ca0, referencing gameplay commit 2d6d9fd, reported npm run check with 29 test files / 144 tests passed, TypeScript and production build passed, and a bundle-size warning. This is not verification of the current baseline; tests/build were not rerun for this documentation correction.
- Portrait full-bleed combat, five-minute run, traits/relics/cores/synergies/evolution, gesture magic, Stimpack, ultimate, Korean HUD, pause/restart.
- Opening: 48 Grunts, 6 replacements per 1800ms, initial cap72, late cap180. Spawn-time speed starts at65% of base and grows to102% over300s. HP grows to110%.
- Basic upgrades: damage, attack speed, critical chance only. Critical damage fixed1.75x. Weapon trait draw weights2x.
- Circle tolerances: closure0.22, radial error0.18. Z alignment and negative fixtures retained. Real-device gesture reliability needs playtesting.
- Desktop secondary input: simultaneous left/right mouse buttons. Mobile: two-finger tap. Pause icon top right; restart resets the run.

Current design source: docs/design/GAME_GDD_v0.8.md (target design; only the documented M1/M2/M3/M4 subset is implemented). Read its Prototype Scope, Future / Not in Prototype and Current Implementation Gap before continuing. The state above is a historical handoff snapshot; do not treat it as the latest implementation. Read README.md and the code for current behavior. GDD v0.5, v0.4 and v0.3 are preserved unchanged as historical design records. GDD v0.2 and PROTOTYPE_TECHNICAL_SPEC_v0.1.md retain historical design/implementation notes. Gameplay tuning lives in src/game/data/. Mobile performance, pacing and gesture feel remain user playtest items.
