# Mac handoff — 2026-09-18

M6 `4b06c39e82683cd809fbb2bec544424cd5aa1187` is merged via [PR21](https://github.com/cij5484/game/pull/21), main `544aa1f`. M7 uses `codex/prototype-m7-boss-acquisition`: **commit/push only, no M7 main merge or automatic next milestone**.

## Setup

```sh
git fetch origin
git switch codex/prototype-m7-boss-acquisition
git pull --ff-only
npm ci
npm run dev -- --host 0.0.0.0
```

Preserve uncommitted work before switching/pulling. Never reset or force-push to synchronize.

## Current implementation / design

Current Source of Truth: [GAME_GDD_v0.11.md](docs/design/GAME_GDD_v0.11.md). It inherits the complete v0.10 design and future pools, and replaces fixed acquisition and timed clear rules. v0.10 remains unchanged. Read [M7 implementation/tuning](docs/prototype-m7-boss-acquisition.md) for exact values and verification status.

- No Lv5/Lv10 special weapon grants. Normal Level-Up offers can include one acquisition card: first Lv8+ with Category weight.30; later Lv14+ with one weapon owned, weight.20. Base capacity2/Core3, no pity, consumes one normal choice, always Weapon Lv1, no rarity/Great Success/quality promotion.
- New basic modification Category.45 and owned-growth Category.35; at most one combined modification card per offer. Internal investment bias cap1.4. Mod slots3/Core4. Range remains separate/Rare+/max5/weight.25. Existing special growth weights and milestone Queue remain.
- Boss supply relief18:50, spawn19:00, HP30,000. Approach.025 progress/combat sec→charge at.60 for6000combat ms.1800 accumulated damage interrupts into3000ms vulnerability×1.5; failure hits Wall1800. Reinforcement at65%HP:24Grunts+8Runners once, queued if cap full. Final at25%HP: speed.09 and1000Wall damage every1800ms after arrival.
- Warning/Boss Horde8 per1400combat ms, final32 per700ms, cap700. Suppress new elites from warning. Preserve M6 tuning before warning. Boss remains targetable and body-damageable, respects Gauss range and existing special ranges; resists weak knockback/gravity pull and cannot receive shield aura protection.
- Boss kill is the only Stage Clear; Wall0 is failure and stays failed. Stage time continues beyond20min. Result records Boss Kill for the current run only; no meta currency/persistence.
- Preserve normal combat tempo1.5 with separate Stage clock, developer X1/X2/X4, initial Horde36, prewarning M6 supply, base enemy movement direction, spawn-only HP scaling `1+.020x+.0008x²`, XP `ceil(8+5x+.50x²)`, grenade65/radius110/cycle7800combat ms, Relics6/Cores3/Synergies3. Do not undo M6 tuning based on automatic balance results.
- Header owns common growth/Relic/Core/Synergy; Bottom owns Gauss/mods/special growth/Stimpack/Ultimate. Special slots start Unlocked/Empty, fill in acquisition order; armament opens slot3. Primitive Boss silhouette/HP/phase/weakpoint/telegraph/stagger only, no new art.
- No Gold/Credits/operation records/progressive unlock/Challenge/Endless/Stage2+/new characters/Awakening/Final Art or additional Relic/Core/Synergy pool expansion.

**M7 integrated `npm.cmd run check`:46files/342tests, TypeScript and Vite build passed.** Existing >500kB bundle warning remains. A390×844 short isolated UI fixture checked actual Boss Charge rendering, Lv8 acquisition without rarity, and actual game empty slots; no browser errors, temporary preview removed. This is not a full Boss run/playtest. Do not report M6's43files/323tests or old browser checks as M7 verification. No long automatic balance runs, final-level/DPS/survival/auto-clear conclusions. User playtest owns difficulty, acquisition timing, growth feel, Boss HP/length and real-device performance.

## Historical Milestone 12 snapshot (not current gameplay)


- Historical gameplay baseline (merged into main at that milestone): 0489ef9cdfcf39870e53178f82e531d8bac4931d.
- Historical verification record: the handoff added in 0ce3ca0, referencing gameplay commit 2d6d9fd, reported npm run check with 29 test files / 144 tests passed, TypeScript and production build passed, and a bundle-size warning. This is not verification of the current baseline; tests/build were not rerun for this documentation correction.
- Portrait full-bleed combat, five-minute run, traits/relics/cores/synergies/evolution, gesture magic, Stimpack, ultimate, Korean HUD, pause/restart.
- Opening: 48 Grunts, 6 replacements per 1800ms, initial cap72, late cap180. Spawn-time speed starts at65% of base and grows to102% over300s. HP grows to110%.
- Basic upgrades: damage, attack speed, critical chance only. Critical damage fixed1.75x. Weapon trait draw weights2x.
- Circle tolerances: closure0.22, radial error0.18. Z alignment and negative fixtures retained. Real-device gesture reliability needs playtesting.
- Desktop secondary input: simultaneous left/right mouse buttons. Mobile: two-finger tap. Pause icon top right; restart resets the run.

Current design source: docs/design/GAME_GDD_v0.11.md. Read its Prototype Scope, Future / Not in Prototype and Current Implementation Gap before continuing. Historical snapshots are not current gameplay or verification. Gameplay tuning lives in src/game/data/.
