# Mac handoff — 2026-09-18

M5 `0ca568c7b0296dc123b99cc3171fe5b5de8beb22` is merged via [PR20](https://github.com/cij5484/game/pull/20), main `4bee754`. M6 uses `codex/prototype-m6-highroll-tempo`: commit/push only, no main merge or automatic next milestone.

## Setup

```sh
git fetch origin
git switch codex/prototype-m6-highroll-tempo
git pull --ff-only
npm ci
npm run dev -- --host 0.0.0.0
```

Preserve uncommitted work before switching/pulling. Never reset or force-push to synchronize.

## Current implementation / design

Current Source of Truth: [GAME_GDD_v0.10.md](docs/design/GAME_GDD_v0.10.md). It inherits the complete v0.9 target design, including all10Relic/5Core/6Synergy future pools. v0.9 and prior records remain unchanged. Read [M6 implementation/tuning](docs/prototype-m6-highroll-tempo.md) for exact values and the latest verification status.

- Normal combat tempo1.5 has one delta owner, separate from Stage/run time. X1 remains approximately20real minutes excluding pauses. Developer X1/X2/X4 cycles and restartX1 remain; developer speed may accelerate Stage time. Phaser combat flashes use Scene.time.timeScale=developerSpeed×combatTempo; native DOM input/Gesture/UI clocks stay real-time.
- Enemy spawn-only Character Level HP: `1+.020x+.0008x²`; XP: `ceil(8+5x+.50x²)`, `x=L−1`. Existing enemy HP does not change on level-up. M3 base movement1.5 is preserved. A later user request supersedes the original M4 Horde-preservation requirement: initial80→36, mean batch3→96/interval1800→550combat ms, late cap700. Phase boundaries stay at actual X1 Stage minutes0/3/5/6/7.5/9/11/12/15/18/19 via phase atMs×tempo, with no late relief drop. Exact values are in the M6 record.
- Grenade base65damage/radius110/internal7800ms = normalX1 actual5.2s. M5 special trees, Lv3/6/10/15/20, remaining-growth Queue and weapon ownership remain.
- Relics6, no level/duplicates/penalties, capacity2 and replace/skip. FirstElite reward opportunity guaranteed, later32%. Loader cycles×.8, impact12%/push.025 with elite25% effect, precision+12%p, capacitor8% action×2, replicator8% once/no recursion, reinforcement+1 independent Gauss Marine without copying specials.
- Cores3, Elite3% and run maximum1, immediate random valid result. Armament adds one FIFO acquisition and capacity3; modification allows4traits; quality promotes original/current rarity history and actual effects of past/future normal growth, including already-applied and queued special growth. Special choices are excluded.
- Synergy3 automatically latch at exact Lv10 recipes plus both required mods atRank1. Saturation8distinct victims/1800combat ms→3500ms: burst+2/submunitions+4/missiles+3. KillZone1.45×Gauss/drone and zone targeting. Hunt1.4×marked target and stable danger mark until death/disappearance; manual focus and Gauss range remain. Saturation allows8base+2rounds (cap10), compressing intra-burst intervals to fit the existing cycle with100ms recovery. Hunt marker follows the rendered enemy attack slot, and Marine units remain visible above the wall.
- Header owns common upgrades/Relic/Core/Synergy; Bottom owns Gauss/mods, special-specific growth, Stimpack and Ultimate. Third special slot follows armament. Tap/Click uses existing Build Detail.
- New Marine runtime excludes Legacy relic/core/selected-synergy rewards and Marine Magic hooks; reusable legacy code/data/tests stay. No Boss/Gold/Credits/operation records/progressive unlock UX/Challenge/Endless/Stage2+/new character/Awakening/Final Art.
- **M6 integrated `npm run check`:43files/323tests, TypeScript and Vite build passed.** Existing >500kB bundle warning remains. Localhost browser checked basic HUD/autoattack/normal growth/pause/X1→X2→X4→X1. A separate360×780 temporary UI fixture checked6Header badges/details,3special slots and Relic choice/replacement, then was removed. This does not claim a natural rare-Core/full-Synergy-run visual test; unit/integration tests cover that logic. M5's40files/292tests belongs to its historical record, not M6. No long balance runs, final-level/DPS/survival/auto-clear conclusions or excessive benchmarks. User playtest owns difficulty, pace, growth feel and real-device performance.
## Historical Milestone 12 snapshot (not current gameplay)


- Current gameplay implementation baseline (merged into main): 0489ef9cdfcf39870e53178f82e531d8bac4931d.
- Historical verification record: the handoff added in 0ce3ca0, referencing gameplay commit 2d6d9fd, reported npm run check with 29 test files / 144 tests passed, TypeScript and production build passed, and a bundle-size warning. This is not verification of the current baseline; tests/build were not rerun for this documentation correction.
- Portrait full-bleed combat, five-minute run, traits/relics/cores/synergies/evolution, gesture magic, Stimpack, ultimate, Korean HUD, pause/restart.
- Opening: 48 Grunts, 6 replacements per 1800ms, initial cap72, late cap180. Spawn-time speed starts at65% of base and grows to102% over300s. HP grows to110%.
- Basic upgrades: damage, attack speed, critical chance only. Critical damage fixed1.75x. Weapon trait draw weights2x.
- Circle tolerances: closure0.22, radial error0.18. Z alignment and negative fixtures retained. Real-device gesture reliability needs playtesting.
- Desktop secondary input: simultaneous left/right mouse buttons. Mobile: two-finger tap. Pause icon top right; restart resets the run.

Current design source: docs/design/GAME_GDD_v0.10.md (target design; only the documented M1/M2/M3/M4/M5/M6 subset is implemented). Read its Prototype Scope, Future / Not in Prototype and Current Implementation Gap before continuing. The Milestone12 state above is historical; do not treat it as current gameplay or current verification. Read README.md and the code for current behavior. GDD v0.9 and earlier remain unchanged as historical records. Gameplay tuning lives in src/game/data/. Mobile performance, pacing and gesture feel remain user playtest items.
