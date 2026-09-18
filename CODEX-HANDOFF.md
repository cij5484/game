# Mac handoff — 2026-09-18

M10 `4f34ee41053c210c0646864d82afb07f9b4f29a7` is merged via [PR25](https://github.com/cij5484/game/pull/25), main `f6f831a51f38912b604b479d26f8a3c236986d84`. M11 uses `codex/prototype-m11-meta-foundation`: **commit/push only, no M11 main merge or automatic next milestone**.

## Setup

```sh
git fetch origin
git switch codex/prototype-m11-meta-foundation
git pull --ff-only
npm ci
npm run dev -- --host 0.0.0.0
```

Preserve uncommitted work before switching/pulling. Never reset or force-push to synchronize.

## Current implementation / design

Current Source of Truth: [GAME_GDD_v0.15.md](docs/design/GAME_GDD_v0.15.md). It inherits full v0.14, which remains unchanged. Read [M11 implementation](docs/prototype-m11-meta-foundation.md). M11 supersedes prior Meta-excluded scope only for Hub, Gold/Credits rewards, Marine research, Reroll and local Save. Existing Stage 1 defaults, M10 missiles and M9 performance remain.

- Start at Meta Hub, launch Combat, settle natural Wall failure/Boss clear once, then Result → retry or Hub. Manual Restart and abandoned Runs earn no reward. Account currencies are shared; research is under `characters.marine`.
- Save key `horde-defense:meta:v1`, `kind:horde-meta`, version1. Account wallet/reroll level, Marine research, completedRuns/stage1Cleared/stage1ClearCount, activeRunId and lastSettlement. Validate imports/default missing fields; never silently overwrite corrupt saves. Hub Export/Import/confirmed Reset is separate from Balance JSON/storage. No backend.
- Reward uses Stage minutes `m=min(elapsedMs/60000,20)`: Gold `100+floor(25m)+min(100,floor(.02*kills))+min(100,10*eliteKills)+400 if clear`; Credits `floor(m/2)+min(5,eliteKills)+20 if clear`. Developer speed adds no separate reward multiplier.
- Eleven Marine research rows have 20/10/5 levels and breakthrough replacements; effects/cost tables live in `data/meta.ts` and GDD §3.13. Snapshot modifiers at launch, compose with Runtime defaults and Run growth, preserve minimum cycles and bounded range. Basic/reinforcement/copy Gauss, specials, criticals, Elite/Boss targets, wall HP/defense and XP receive their own modifiers without changing defaults.
- Reroll I/II/III additional costs50/150/400Credits; snapshot0~3uses per Run, consume only on normal Level-Up offers. No XP/level/extra choice/Great Success from reroll, no forced new-card guarantee. Tree/Branch/Lv15/Lv20/Relic/Core choices excluded.
- `/dev` Meta category reads wallet/research/reroll and provides Gold+1000/Credits+100/confirmed Meta Reset. DEV-only grants, separate from Balance tools, changes apply next Run. Research is fully exposed for M11 testing; operation records/mastery/progressive unlock remain M12, not automatic next work.
- **M11 integrated `npm run check`: 59 files/416 tests, TypeScript and Vite build passed.** Existing Phaser >500kB chunk warning remains. Automated Scene/Hub/Result checks cover natural settlement, restart without reward, return/retry lifecycle and snapshots. Browser checked Hub, DEV grants, research/Reroll purchase, reload persistence and combat launch on isolated127.0.0.1; existing localhost balance overrides were preserved. No full browser Run or economy simulations/time-to-MAX claims.

### Preserved M10 missile baseline

- Missile base: 3-round timed salvo, 90 damage/round, speed680, raw270ms interval and4500ms cycle (X1 .18s/3s attempo1.5), lifetime6000ms, one baseline retarget. All values are Prototype Tuning.
- Flight damage reservations prevent obvious overkill; high-HP targets may receive multiple missiles. Saturation/Hunter/Tracking and existing Lv10/15/20 behaviors build on the new salvo. No new content or assets.
- Keep M9 rendering/allocation/VFX limits; candidate scans are launch/retarget events only. User playtest judges missile feel, not automated DPS or clear simulations.

- Historical M10 `npm run check`: **52 files/390 tests, TypeScript and Vite build passed**; existing Phaser chunk warning remains. Browser verified17missile fields/X1 units; existing7user overrides preserved. Old `saturation.count.*` preset keys are rejected; re-save with additive `additionalCount.*` values. No long run/DPS/balance analysis.

### Preserved M9 performance

- M9 separates simulation substeps from the once-per-frame enemy transform pass; damage updates changed state without rendering, and focus updates the old/new target only. Reuse readonly snapshots, validated missile indices and lane shield candidates; preserve input ownership and gameplay ordering.
- Transient combat VFX: 16 objects/frame, 64 active including critical labels, 96 impact targets/frame; reuse hidden Graphics with existing timers. Damage is unaffected. No enemy-wide pool. `/dev` read-only metrics: FPS, enemies, visible special units, active transient VFX groups/labels, frame simulation substeps; DEV-only status broadcast about once/second.
- **Historical M9 npm run check: 51 files/373 tests, TypeScript and Vite build passed; existing Phaser >500kB chunk warning remains.** A one-frame 700-enemy/X4/64ms functional fixture reduced transform calls 17,500→700; this is not an FPS benchmark. Browser checked all five metrics and paused substeps 0 with zero runtime overrides. M9 kept cap700 and gameplay defaults; M10 changes only missile tuning. Real smoothness remains user playtest.

### Preserved M8 developer panel

- Open game `/` and panel `/dev` in separate windows of the same browser/profile/origin. Korean fields/search/categories/tooltips/default/current/changed/apply timing, individual/all reset, named presets, validated JSON import/export. The panel is a Prototype Development Tool / Not Final Game Feature.
- Existing data defaults register stable runtime objects; central numeric/boolean overrides reach gameplay through BroadcastChannel `game.prototype.balance.v1`. Developer localStorage persists overrides across reloads. Presets use a separate key and survive reset. No backend/server/new dependencies.
- Damage/cycles and live movement/supply read updated values. Spawn intervals/batches take effect on the next Spawn calculation; already scheduled timers remain intact. Spawn HP/shields/scaling preserve existing enemies. Current Level XP threshold and already-open offers (candidates, growth amounts and Great Success chance) stay frozen; new Level/offer reads new values. Starting caps/wallHP/initial enemies/elite windows apply next Run.
- Special cycle UI is X1 real seconds at current combatTempo; JSON stores combat ms. Rarity uses1000‰ weights with percent display and sum validation. Single core structure stays0~1; no new multi-core rule.
- Production `import.meta.env.DEV` gate removes panel/bridge imports and never loads local overrides. Runtime override does not change code defaults/GDD; a separate user instruction is required to promote a JSON as new defaults.
- **Historical M8 integrated npm run check:50files/358tests, TypeScript and Vite build passed; existing Phaser >500kB chunk warning remains.** Browser checked243fields, connected game X1/X4/Level/override acknowledgment, Grunt HP8→12/reset, presets/reload persistence, JSON valid/unknown-field rejection, search/tooltips/grenade5.2 X1seconds. Test overrides reset and test preset deleted. Production preview `/dev` shows unavailable and production build contains no Panel/Bridge assets. Integration tests cover next-spawn HP, frozen offer amount/Great Success/currentXP, zero batch/Stage clock and production guard. No automatic balance judgment or long simulations.

### Preserved M7 game baseline

- No Lv5/Lv10 special weapon grants. Normal Level-Up offers can include one acquisition card: first Lv8+ with Category weight.30; later Lv14+ with one weapon owned, weight.20. Base capacity2/Core3, no pity, consumes one normal choice, always Weapon Lv1, no rarity/Great Success/quality promotion.
- New basic modification Category.45 and owned-growth Category.35; at most one combined modification card per offer. Internal investment bias cap1.4. Mod slots3/Core4. Range remains separate/Rare+/max5/weight.25. Existing special growth weights and milestone Queue remain.
- Boss supply relief18:50, spawn19:00, HP30,000. Approach.025 progress/combat sec→charge at.60 for6000combat ms.1800 accumulated damage interrupts into3000ms vulnerability×1.5; failure hits Wall1800. Reinforcement at65%HP:24Grunts+8Runners once, queued if cap full. Final at25%HP: speed.09 and1000Wall damage every1800ms after arrival.
- Warning/Boss Horde8 per1400combat ms, final32 per700ms, cap700. Suppress new elites from warning. Preserve M6 tuning before warning. Boss remains targetable and body-damageable, respects Gauss range and existing special ranges; resists weak knockback/gravity pull and cannot receive shield aura protection.
- Boss kill is the only Stage Clear; Wall0 is failure and stays failed. Stage time continues beyond20min. M11 now settles natural Run rewards and persists completed Run/Stage 1 Clear records.
- Preserve normal combat tempo1.5 with separate Stage clock, developer X1/X2/X4, initial Horde36, prewarning M6 supply, base enemy movement direction, spawn-only HP scaling `1+.020x+.0008x²`, XP `ceil(8+5x+.50x²)`, grenade65/radius110/cycle7800combat ms, Relics6/Cores3/Synergies3. Do not undo M6 tuning based on automatic balance results.
- Header owns common growth/Relic/Core/Synergy; Bottom owns Gauss/mods/special growth/Stimpack/Ultimate. Special slots start Unlocked/Empty, fill in acquisition order; armament opens slot3. Primitive Boss silhouette/HP/phase/weakpoint/telegraph/stagger only, no new art.
- Beyond M11 Gold/Credits/research/Reroll/save, operation records/mastery/progressive unlock/Challenge/Endless/Stage2+/new characters/Awakening/Final Art and additional Relic/Core/Synergy pools remain future scope.

**Historical M7 integrated `npm.cmd run check`:46files/342tests, TypeScript and Vite build passed.** Existing >500kB bundle warning remains. A390×844 short isolated UI fixture checked actual Boss Charge rendering, Lv8 acquisition without rarity, and actual game empty slots; no browser errors, temporary preview removed. This is not a full Boss run/playtest. Do not report M6's43files/323tests or old browser checks as M7 verification. No long automatic balance runs, final-level/DPS/survival/auto-clear conclusions. User playtest owns difficulty, acquisition timing, growth feel, Boss HP/length and real-device performance.

## Historical Milestone 12 snapshot (not current gameplay)


- Historical gameplay baseline (merged into main at that milestone): 0489ef9cdfcf39870e53178f82e531d8bac4931d.
- Historical verification record: the handoff added in 0ce3ca0, referencing gameplay commit 2d6d9fd, reported npm run check with 29 test files / 144 tests passed, TypeScript and production build passed, and a bundle-size warning. This is not verification of the current baseline; tests/build were not rerun for this documentation correction.
- Portrait full-bleed combat, five-minute run, traits/relics/cores/synergies/evolution, gesture magic, Stimpack, ultimate, Korean HUD, pause/restart.
- Opening: 48 Grunts, 6 replacements per 1800ms, initial cap72, late cap180. Spawn-time speed starts at65% of base and grows to102% over300s. HP grows to110%.
- Basic upgrades: damage, attack speed, critical chance only. Critical damage fixed1.75x. Weapon trait draw weights2x.
- Circle tolerances: closure0.22, radial error0.18. Z alignment and negative fixtures retained. Real-device gesture reliability needs playtesting.
- Desktop secondary input: simultaneous left/right mouse buttons. Mobile: two-finger tap. Pause icon top right; restart resets the run.

Current design source: docs/design/GAME_GDD_v0.15.md. Read its Prototype Scope, Future / Not in Prototype and Current Implementation Gap before continuing. Historical snapshots are not current gameplay or verification. Gameplay tuning lives in src/game/data/.
