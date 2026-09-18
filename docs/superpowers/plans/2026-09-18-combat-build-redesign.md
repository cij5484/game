# Combat Build Redesign Implementation Plan

> Execute independent trait, relic and reference work in parallel; main agent owns integration and shared UX. User explicitly authorized subagents and implementation through commit/push.

**Goal:** Nine distinct traits, eight event-driven relics and twelve bounded behavior synergies.
**Architecture:** Retain data-driven level tables, pure primary damage and separate stateful combat timers. Scene is the sole orchestrator: primary → capped relic effects → death transaction. Secondary effects never reenter primary dispatch. Preserve targeting/input buffer and latest tuning.
**Tech Stack:** TypeScript, Phaser, Vitest, Vite.
**Spec:** `docs/superpowers/specs/2026-09-18-combat-build-redesign.md`

## Constraints and baseline
- Initial workspace HEAD d26c4752da8ae96f3b5373e313ee9da5c7ef0246; clean main.
- Fetched branch codex/milestone-12-combat-depth HEAD 0ce3ca0; tree identical to initial main. Continue this named branch; no reset, no main merge.
- Preserve horde, enemy, gesture, primary base stats (critical multiplier 1.75), magic tuning and Crash 1000 ms.
- Pools: 9 traits, 8 relics, level 1–5, default3/expanded4. Cores remain run-rule modifiers.
- Research official sources before implementation. No next milestone.

## Tasks and owned files
- [x] Reference worker: official six-game research in REFERENCE_UI_NOTES.md and updated GAME_GDD_v0.2.md. Verify every adopted principle against linked source; distinguish inference.
- [x] Trait worker: data/traits.ts, combat/primaryAttack.ts, combat/traitCombat.ts, enemies/enemySimulation.ts and focused tests. Test pool removals, five-level behavior, persistent statuses, bounded spread, focus and immunity, heat idle cooling/lock. Keep surviving trait numbers.
- [x] Relic worker: data/relics.ts, progression/relics.ts, combat/relicCombat.ts, combat/stimpack.ts and focused tests. Test one-shot crisis, bounded echo snapshots, frost shatter, kill extension and recovery cost, per-second salvage, lethal rescue. Expose timed effects to scene, no rendering dependencies.
- [x] Main: recipes and Hyper Gauss migration; all requirements inactive below threshold and immediately active at threshold. `activeSynergies(ranks, equippedMagic)` defaults to prototype's equipped Frost and Lightning.
- [x] Main: Magic thermal shock, Heat cooling; tests compare non-synergy and synergy output and cap 300-target waves. Scene supplies same synergy multiplier to all effects.
- [x] Main: wire timers, death propagation, attack delays, burst-start snapshots, echo damage, wall damage events into CombatScene. Preserve rifle state while overheated; simulation slices cap temporal error at16ms.
- [x] Main: remove old display IDs, render new card faces, heat bar/status marks, short synergy notices and Pause details, with dedicated synergy/evolution groups.
- [x] Main: tests for removed IDs ignored at import (prototype has no persisted run loader), current pools/capacity, core resonance, build descriptions, new recipe. Keep unrelated test expectations unchanged.
- [x] Integration: run `npm test`, `npx tsc --noEmit`, `npm run build`; inspect browser and 300-enemy bounded effect checks. Review actual diff and docs, commit, push only work branch.

## Interfaces
- Trait enemy statuses are optional fields on EnemyState; `tickTraitStatuses` handles duration/DoT, `propagateTraitDeaths` handles one bounded death tier. `WeaponHeat` owns heat/lock; primary gets heatRatio and shotIndex.
- RelicCombat accepts accepted volley snapshots, returns due echo snapshots from advance. Echoes do not invoke primary/relic hooks again. `onPrimaryFrost` returns capped damage and wave IDs, `onWallDamage` returns adjusted HP plus one event, `onKills` returns capped healing/energy/boost extension.
- Twelve recipes: deep-blast, lethal-ricochet, bullet-storm, flame-pierce, flame-bounce, focused-bombardment, execution-blast, marked-execution, suppression-pierce, heat-barrage, thermal-shock, cryo-cooling. Frost recipes require equipped spell, not arbitrary stat ranks.
