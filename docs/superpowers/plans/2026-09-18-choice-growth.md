# Choice Growth Implementation Plan

**Goal:** Replace click-driven attacks and expanding upgrade lists with autonomous combat and permanent A/B growth choices.
**Spec:** `docs/superpowers/specs/2026-09-18-choice-growth.md` (user-approved implementation request).
**Baseline:** HEAD49e74e0561d21eb81cefa6e9f41415b18a62ce51, clean named branch codex/milestone-12-combat-depth. No resets, main merge or next milestone.
**Constraints:** Preserve current Horde/Enemy/gesture Magic recognition tuning, basic stats3 and critical multiplier1.75. Trait slots3/core4, relic types8/slots3/core4. Reference official sources before behavioral implementation.

- [x] Research six games and compare ultimate gesture candidates; record adopted design principles before code.
- [x] Traits worker owns traits/primary/enemy statuses: pool5, levels1/2 then chosen branch3/4/5; remove four traits, old secondary status module and obsolete legendary cards. Branch data and behavior tests.
- [x] Ability worker owns compressed5level Frost/Lightning/Stim tracks and runtime. Two branches each; delayed thunderstorm drains on simulation time. Both icon/gesture inputs call the same Scene cast API.
- [x] Ultimate worker owns readiness-gated recognizer, fixed barrage, gauge state; remove rhythm timeScale/grades/beat scheduling, update own tests and GDD.
- [x] Main owns automatic rifle + focus targeting: uniform200ms cadence preserves old3/600ms average; no attack input queue. Target taps alter priority only, blank tap clears, death clears. Tests no-input firing and unchanged DPS under focus taps.
- [x] Main owns progression/card state: ordinary UpgradeId identifies 11 tracks (5trait+3basic+3ability). ChoiceId distinguishes A/B and synergy cards. Lv3 A/B offered as a pair, chosen branch permanent, branch4/5 follow it; no fallback auto-selection. Guaranteed one eligible unselected synergy card next level, fair rotation when declined; no trait slot.
- [x] Main migrates five surviving synergy recipes, explicit activation set, cores: tactical/relic/resonance/choice-expansion; remove luck and overload, extra relic choice at expansion. Rework Echo snapshot to keep branch selections and selected synergies without recursion.
- [x] Main integrates scene, native44px+ ability buttons, ultimate hint (never activates), target indicator, compact branch names in build/pause/result, no obsolete heat/status/rhythm UI.
- [x] Tests enforce branch choice boundaries, candidate caps, active vs unlocked, automatic/input cooldown parity, ultimate readiness/gesture collision, scene clocks/secondary budget. Stress300 enemies; run full tests/tsc/build and browser smoke.
- [x] Update GDD to current source of truth, review diff, commit/push current branch only and report requested21points. User playtest determines subsequent work.

## Interface contracts
`data/growth.ts`: GrowthBranch='a'|'b'; GrowthBranches=Partial<Record<string,GrowthBranch>>.
Traits export `traitLevel(id,level,branch?)`; effects clamp unresolvedLv3+ toLv2. Primary context `{branches?,activeSynergyIds?}` defaults no synergy.
Ability definitions mirror traits via `abilityLevel`, `getAbilityEffects`; Magic/Stim.setUpgrades(ranks,branches). Magic.advance(dt) then drainStrikes(enemies); primaryDamageMultiplier includes selected growth.
Scene simulation advances actual consumed time to rifle event, pauses at choices; fixed cooldown clocks shared across input routes. Relic echoes carry branch snapshot, never call relic primary hooks.

## Verification and review

- 34 test files / 215 tests passed; strict TypeScript and production Vite build passed.
- Regression fixes: fractional recovery firing endpoint, selected concentrated-fire + bullet-storm damage, splash-budget-excluded false chain kills, ultimate presentation phase boundaries/control lock, hint geometry matched to recognizer.
- Browser: no-input level-up; Frost/Stim icon activation and shared disabled cooldown states; Lightning icon kills and opens choices; Ultimate icon shows V hint only. Desktop and390×844 layouts observed, console warnings/errors empty. Four-card mobile offers use2×2 layout.
- Current enemy/encounter/gesture/basic-stat tuning preserved. Vite Phaser bundle size warning remains. Actual touch gesture success, capstone reachability and late-horde mobile frame rate require user playtest.
- Integration stays on codex/milestone-12-combat-depth; no main merge or next milestone.
