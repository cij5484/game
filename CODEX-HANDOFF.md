# Mac handoff — 2026-09-18

M4 is merged into main via [PR #19](https://github.com/cij5484/game/pull/19), merge `68b9922`. M5 continues on `codex/prototype-m5-special-weapons`. Commit/push only: do not merge M5 or start another milestone without a new user request.

## Setup

```sh
git fetch origin
git switch codex/prototype-m5-special-weapons
git pull --ff-only
npm ci
npm run dev -- --host 0.0.0.0
```

Preserve uncommitted work before switching/pulling. Never reset or force-push to synchronize.

## Current implementation / design

Current Source of Truth: [GAME_GDD_v0.9.md](docs/design/GAME_GDD_v0.9.md). It inherits all v0.8 design and adds M5 scope/tuning/gaps. Target design is not a claim that all systems exist. GDD v0.8 and earlier remain unchanged.

- M1: initial range progress≥.55,800ms single-shot Gauss,damage10/GruntHP8 (`d15b41d`).
- M2: twenty-minute temporary stage end,Runner/physical shield/two Elite behaviors and Marine Legacy Magic isolation (`a656b12`,main merge `9df9878`).
- M3: independent Header/Battlefield/Bottom,combat mask,owner-grouped badges,two locked special slots,first engagement3–5s. Normal/elite speed1.5×M2 (`0f408dd`,main merge `b86b691`).
- M4: increased Horde supply with the latest user-requested extra2.5× pass (initial80,late cap700), unchanged HP/speed. Marine3common+6traits(max3types)+range5; repeatable ranks,independent rarity/quality,investment weight,6% great success,3legendary behaviors and actual HUD ownership. See [M4 record](docs/prototype-m4-horde-weapon-growth.md) for exact tuning,simulation limitations and verification.
- Marine Runtime no longer uses Legacy MAX5 traits/branches/execution/selected synergy/auto Evolution. Legacy data/code/tests stay available; base Stimpack/V and existing relic rewards remain. Conflicting tactical-expansion/resonance cores are excluded. No new relic/core architecture, named synergy, Boss or Meta.
- M5: Grenade spatial AoE, Missile danger targeting/homing, persistent Drone; all three developer-unlocked. Start with two Unlocked/Empty slots. Character Lv5/10 independently grants one unique weapon, maximum two, at Weapon Lv1. Owned-only growth uses rarity quality and6% Great Success. Lv3 main tree/Lv6 sub branch/Lv10 automatic completion/Lv15 three transcendences/Lv20 three overclocks per weapon; queued choices retain remaining levels/quality. Weapon builds belong in their own bottom slots, not Header. See [M5 record](docs/prototype-m5-special-weapons.md) for exact values,18completions,9transcendences and9overclocks.
- M5 additional requests: development-only X1/X2/X4 button immediately left of Pause, resetX1; only simulation delta is scaled, real input/UI timing is unchanged. Spawn-only Character Level HP multiplier `1+.015(L−1)+.0005(L−1)^2` applies to normal/elite body/maxHP and shield/maxShieldHP. No retroactive change. M4 Horde80/cap700 and M3 movement1.5× remain unchanged.
- Future: two remaining overclocks per weapon (full target remains five), larger transcendence pools, Drone projectile interception (no Stage1 ranged enemy), progressive unlock UX and third weapon/Core. Do not infer these are implemented.
- Latest `npm run check`:40files/292tests passed, TypeScript and Vite build passed; existing500kB chunk warning remains (JS about1.334MB). At438×974, browser checks covered speed cycling, Lv5/10 acquisition preserving normal choices, Great Success through Lv3 tree selection with remaining growth, owner badges, persistent Drone and slot-tap Pause details. Browser did not traverse all branches or Lv15/20; functional tests cover those boundaries. Existing long20-minute balance cases were replaced by short correctness checks. Do not run long balance simulations or infer difficulty/final level/DPS/survival conclusions; wait for user playtest.
- The cap700 change requires real-device late-run rendering/input/pacing assessment. Headless Scene endurance measurements do not prove mobile FPS.

## Historical Milestone 12 snapshot (not current gameplay)


- Current gameplay implementation baseline (merged into main): 0489ef9cdfcf39870e53178f82e531d8bac4931d.
- Historical verification record: the handoff added in 0ce3ca0, referencing gameplay commit 2d6d9fd, reported npm run check with 29 test files / 144 tests passed, TypeScript and production build passed, and a bundle-size warning. This is not verification of the current baseline; tests/build were not rerun for this documentation correction.
- Portrait full-bleed combat, five-minute run, traits/relics/cores/synergies/evolution, gesture magic, Stimpack, ultimate, Korean HUD, pause/restart.
- Opening: 48 Grunts, 6 replacements per 1800ms, initial cap72, late cap180. Spawn-time speed starts at65% of base and grows to102% over300s. HP grows to110%.
- Basic upgrades: damage, attack speed, critical chance only. Critical damage fixed1.75x. Weapon trait draw weights2x.
- Circle tolerances: closure0.22, radial error0.18. Z alignment and negative fixtures retained. Real-device gesture reliability needs playtesting.
- Desktop secondary input: simultaneous left/right mouse buttons. Mobile: two-finger tap. Pause icon top right; restart resets the run.

Current design source: docs/design/GAME_GDD_v0.9.md (target design; only the documented M1/M2/M3/M4/M5 subset is implemented). Read its Prototype Scope, Future / Not in Prototype and Current Implementation Gap before continuing. The Milestone12 state above is historical; do not treat it as current gameplay or current verification. Read README.md and the code for current behavior. GDD v0.8 and earlier remain unchanged as historical records. Gameplay tuning lives in src/game/data/. Mobile performance, pacing and gesture feel remain user playtest items.
