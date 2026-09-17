import Phaser from "phaser";
import { EnemyPressureView } from "../battlefield/EnemyPressureView";
import {
  marineConfig,
  gaussRifleBalance,
  stimpackBalance,
} from "../data/balance";
import { GaussRifle, type AttackCommand } from "../combat/gaussRifle";
import { Stimpack } from "../combat/stimpack";
import { SpawnDirector } from "../waves/spawnDirector";
import { Magic } from "../combat/magic";
import { recognizeGesture } from "../input/gestureRecognizer";
import { bindTapInput } from "../input/tapInput";
import { resolveAttackTarget } from "../combat/targeting";
import { deriveWeaponConfig, primaryAttack } from "../combat/primaryAttack";
import { Progression } from "../progression/progression";
import { LevelUpView } from "../ui/LevelUpView";
import { Relics } from "../progression/relics";
import { Cores } from "../progression/cores";
import { coreEffects } from "../data/cores";
import { BuildBar } from "../ui/BuildBar";
import { buildSummary } from "../ui/buildSummary";
import { relicBalance } from "../data/relics";
import {
  WeaponHeat,
  tickTraitStatuses,
  propagateTraitDeaths,
  traitCombatBalance,
} from "../combat/traitCombat";
import { RelicCombat, type EchoVolley } from "../combat/relicCombat";
import { activeSynergies } from "../progression/synergy";
import { display } from "../data/display";
import { PauseView } from "../ui/PauseView";
import { eligibleEvolutions } from "../progression/evolution";
import { enemyConfigs } from "../data/enemies";
import { createPrototypeEnemy } from "../enemies/enemyFactory";
import { advanceEnemy } from "../enemies/enemySimulation";
import type { EnemyState } from "../enemies/enemySimulation";
import { advanceWallAttack } from "../enemies/wallAttack";
import { advanceRun, createRunState } from "../model/runState";
import { Burst } from "../combat/burst";
import { suppressiveBarrage } from "../combat/barrage";
import { burstBalance } from "../data/burst";
import { BurstView } from "../ui/BurstView";
import { ResultView } from "../ui/ResultView";
import { runBalance } from "../data/run";

export class CombatScene extends Phaser.Scene {
  private run = createRunState(runBalance.wallMaxHp);
  private result!: ResultView;
  private resultShown = false;
  private kills = 0;
  private view!: EnemyPressureView;
  private enemies: {
    state: EnemyState;
    attackElapsedMs: number;
    visual: Phaser.GameObjects.Container;
  }[] = [];
  private director = new SpawnDirector();
  private nextEnemyId = 0;
  private rifle = new GaussRifle(gaussRifleBalance);
  private stimpack = new Stimpack(stimpackBalance);
  private magic = new Magic();
  private progression = new Progression();
  private choices!: LevelUpView;
  private relics = new Relics();
  private relicCombat = new RelicCombat();
  private cores = new Cores();
  private buildBar!: BuildBar;
  private shotIndex = 0;
  private heat = new WeaponHeat();
  private echoRounds: { dueMs: number; volley: EchoVolley }[] = [];
  private synergies = new Set<string>();
  private pauseUi!: PauseView;
  private manualPaused = false;
  private cancelInput = () => {};
  private evolutions = new Set<string>();
  private notices: string[] = [];
  private burst = new Burst();
  private burstUi!: BurstView;
  private ultimateRemainingMs = 0;
  private get choosing(): boolean {
    return (
      this.ultimateRemainingMs === 0 &&
      (this.progression.pendingChoices > 0 || this.relics.pendingRewards > 0)
    );
  }

  create(): void {
    this.run = createRunState(runBalance.wallMaxHp);
    this.kills = 0;
    this.resultShown = false;
    this.result = new ResultView();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.result.destroy(),
    );
    this.enemies = [];
    this.director = new SpawnDirector();
    this.nextEnemyId = 0;
    this.rifle = new GaussRifle(gaussRifleBalance);
    this.stimpack = new Stimpack(stimpackBalance);
    this.magic = new Magic();
    this.progression = new Progression();
    this.relics = new Relics();
    this.relicCombat = new RelicCombat();
    this.cores = new Cores();
    this.shotIndex = 0;
    this.heat = new WeaponHeat();
    this.echoRounds = [];
    this.synergies = new Set();
    this.manualPaused = false;
    this.evolutions = new Set();
    this.notices = [];
    this.burst = new Burst();
    this.ultimateRemainingMs = 0;
    this.time.timeScale = 1;
    this.time.paused = false;
    this.choices = new LevelUpView();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.choices.destroy(),
    );
    this.view = new EnemyPressureView(this);
    this.burstUi = new BurstView(
      () => {
        if (
          this.run.status !== "running" ||
          this.manualPaused ||
          this.choosing ||
          this.ultimateRemainingMs > 0
        )
          return;
        if (this.burst.activate()) this.time.timeScale = burstBalance.timeScale;
        this.renderBurst();
      },
      () => this.rhythmTap(),
    );
    this.pauseUi = new PauseView(
      (paused) => {
        this.manualPaused = paused;
        this.cancelInput();
        this.time.paused = paused;
        this.renderBurst();
      },
      () => this.scene.restart(),
    );
    const resizeBurst = () => {
      this.burstUi.resize(this.scale.width, this.scale.height);
      this.pauseUi.resize(this.scale.width, this.scale.height);
    };
    this.buildBar = new BuildBar();
    resizeBurst();
    this.scale.on(Phaser.Scale.Events.RESIZE, resizeBurst);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, resizeBurst);
      this.burstUi.destroy();
      this.pauseUi.destroy();
      this.buildBar.destroy();
    });
    this.spawnBatch();
    this.view.renderWall(this.run.wallHp, runBalance.wallMaxHp);
    const unbindInput = bindTapInput(
      this.game.canvas,
      (kind, x, y) => {
        if (this.run.status !== "running" || this.choosing || this.manualPaused)
          return;
        if (this.burst.phase === "rhythm") {
          if (kind === "primary") this.rhythmTap();
          return;
        }
        if (this.ultimateRemainingMs > 0) return;
        if (kind === "secondary") {
          if (this.stimpack.activate()) {
            const effect = this.relicCombat.onStim();
            this.run = {
              ...this.run,
              wallHp: Math.max(1, this.run.wallHp - effect.wallCost),
            };
            this.magic.refundCooldowns(effect.cooldownRefunds);
          }
        } else if (this.stimpack.canAttack)
          this.rifle.request({
            manualTargetId: this.view.pickEnemy(x, y, this.enemies),
          });
        this.update(0, 0);
      },
      (points, displayPoints) => {
        if (
          this.run.status !== "running" ||
          this.manualPaused ||
          this.choosing ||
          this.burst.phase === "rhythm" ||
          this.ultimateRemainingMs > 0
        )
          return;
        const gesture = recognizeGesture(points);
        const debugGesture = `${gesture.kind} · ○ ${gesture.circleScore.toFixed(2)} / Z ${gesture.zScore.toFixed(2)}\n${gesture.reason} · samples ${gesture.metrics?.samples ?? points.length} · length ${(gesture.metrics?.pathLength ?? 0).toFixed(0)}px`;
        this.view.showGesture(
          displayPoints,
          debugGesture,
          gesture.kind === "unknown",
        );
        if (gesture.kind === "unknown") return;
        const id = gesture.kind === "circle" ? "frost-nova" : "chain-lightning";
        const result = this.magic.cast(
          id,
          this.enemies.map((entry) => entry.state),
        );
        if (!result) {
          this.view.showGesture(
            displayPoints,
            `${debugGesture}\ncooldown blocked`,
          );
          return;
        }
        this.heat.cool(result.heatCooling);
        this.showStatusImpacts("fire", result.thermalShockIds);
        this.view.showMagic(
          id,
          result.hitIds.map(
            (id) => this.enemies.find((entry) => entry.state.id === id)!.visual,
          ),
        );
        this.view.showImpacts(
          "lightning",
          result.strikeIds.map(
            (id) => this.enemies.find((e) => e.state.id === id)!.visual,
          ),
        );
        const relicCast = this.relicCombat.onMagic(
          id,
          this.run.wallHp / runBalance.wallMaxHp,
        );
        this.run = {
          ...this.run,
          wallHp: Math.min(
            runBalance.wallMaxHp,
            this.run.wallHp + relicCast.wallHealing,
          ),
        };
        this.magic.refundCooldowns(relicCast.cooldownRefunds);
        this.applyEnemyStates(result.enemies, true, true);
        this.renderMagic();
      },
    );
    this.cancelInput = unbindInput.cancel;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unbindInput.destroy);
    this.view.renderStimpack(
      this.stimpack.phase,
      this.stimpack.attackSpeedMultiplier,
    );
    this.renderMagic();
    this.renderProgression();
    this.renderBurst();
    this.refreshBuild();
  }

  private rhythmTap(): void {
    if (this.run.status !== "running" || this.choosing || this.manualPaused)
      return;
    this.burst.tap();
    this.renderBurst();
  }

  private renderBurst(): void {
    this.burstUi.render(
      this.burst,
      this.run.status !== "running" || this.choosing || this.manualPaused,
      this.ultimateRemainingMs > 0,
    );
  }

  private spawnBatch(): void {
    for (const spawn of this.director.spawn(this.enemies.length)) {
      const state = {
        ...createPrototypeEnemy(
          spawn.kind,
          spawn.lane,
          this.nextEnemyId++,
          spawn.offset01,
          spawn.elite,
          this.run.elapsedMs,
        ),
        progress01: spawn.progress01,
      };
      this.enemies.push({
        state,
        attackElapsedMs: 0,
        visual: this.view.createEnemy(state, this.magic.frostRemainingMs > 0),
      });
    }
  }

  update(_time: number, deltaMs: number): void {
    if (this.run.status !== "running" || this.choosing || this.manualPaused)
      return;
    if (this.burst.phase === "rhythm") {
      const step = Math.min(
        Math.max(0, deltaMs),
        burstBalance.rhythmMs - this.burst.elapsedMs,
      );
      const consumed = this.advanceWorld(step * burstBalance.timeScale);
      this.stimpack.advance(consumed);
      const result = this.burst.advance(consumed / burstBalance.timeScale);
      if (result && this.run.status === "running") {
        this.time.timeScale = 1;
        this.ultimateRemainingMs = burstBalance.ultimate.presentationMs;
        const barrage = suppressiveBarrage(
          this.enemies.map((entry) => entry.state),
          result.score,
        );
        this.view.showBarrage(
          barrage.hitIds.map(
            (id) => this.enemies.find((entry) => entry.state.id === id)!.visual,
          ),
        );
        this.applyEnemyStates(barrage.enemies, false, false, false);
      }
      if (this.run.wallHp <= 0) this.time.timeScale = 1;
      this.renderCombat();
      return;
    }
    if (this.ultimateRemainingMs > 0) {
      const step = Math.min(Math.max(0, deltaMs), this.ultimateRemainingMs);
      const consumed = this.advanceWorld(step);
      this.stimpack.advance(consumed);
      this.ultimateRemainingMs -= consumed;
      if (this.choosing && this.run.status === "running") this.showChoices();
      else if (this.ultimateRemainingMs === 0) this.flushNotices();
      this.renderCombat();
      return;
    }
    let remaining = Math.max(0, deltaMs);
    do {
      const step = Math.min(
        remaining,
        this.stimpack.timeToBoundaryMs,
        16,
        this.heat.locked ? this.heat.remainingLockMs : Infinity,
      );
      let consumed = step;
      if (this.stimpack.canAttack && !this.heat.locked)
        consumed = this.advanceCombat(step);
      else consumed = this.advanceWorld(step);
      this.stimpack.advance(consumed);
      remaining -= consumed;
    } while (remaining > 0 && this.run.status === "running" && !this.choosing);
    this.renderCombat();
  }

  private renderCombat(): void {
    this.buildBar.renderHeat(
      !!this.progression.ranks.overheat,
      this.heat.ratio,
      this.heat.locked,
    );
    this.finishRun();
    this.pauseUi.setBlocked(this.run.status !== "running" || this.choosing);
    this.renderBurst();
    this.view.renderStimpack(
      this.stimpack.phase,
      this.stimpack.attackSpeedMultiplier,
    );
    this.view.renderWall(this.run.wallHp, runBalance.wallMaxHp);
    this.renderMagic();
    this.view.renderRun(this.run.elapsedMs, runBalance.durationMs);
    const settings = this.director.settings;
    this.view.renderDirector(
      `${settings.name} · ${Math.floor(this.director.elapsedMs / 1000)}s · ${settings.phase}\nACTIVE ${this.enemies.length}/${settings.maxActiveEnemies} · batch ${settings.batchSize} / ${settings.spawnIntervalMs}ms`,
    );
  }

  private renderMagic(): void {
    this.view.renderMagic(
      this.magic.remaining("frost-nova"),
      this.magic.remaining("chain-lightning"),
      this.magic.frostRemainingMs,
    );
    this.burstUi.renderAbilities(
      { phase: this.stimpack.phase, progress: this.stimpack.phaseProgress },
      {
        frostProgress: this.magic.readyProgress("frost-nova"),
        chainProgress: this.magic.readyProgress("chain-lightning"),
        frostActive: this.magic.frostRemainingMs > 0,
      },
    );
  }

  private finishRun(): void {
    if (this.run.status === "running" || this.resultShown) return;
    this.resultShown = true;
    this.time.timeScale = 1;
    this.time.paused = true;
    this.choices.hide();
    this.result.show(
      {
        status: this.run.status,
        elapsedMs: this.run.elapsedMs,
        kills: this.kills,
        level: this.progression.level,
        wallHp: this.run.wallHp,
        ranks: this.progression.ranks,
        relics: this.relics.levels,
        traitLimit: this.progression.traitLimit,
        cores: this.cores.owned,
        evolutions: this.evolutions,
      },
      () => this.scene.restart(),
    );
  }

  private advanceCombat(deltaMs: number): number {
    const speed = this.relicCombat.primaryModifiersFor(
      this.run.wallHp / runBalance.wallMaxHp,
      this.stimpack.phase === "boost",
    ).attackSpeedMultiplier;
    const untilRound = this.stimpack.realTimeFor(
      this.rifle.timeToEventMs / speed,
    );
    const step = Math.min(deltaMs, untilRound);
    const consumed = this.advanceWorld(step);
    // Advance clocks without crossing the firing endpoint. DoT/echo can open a choice here.
    const weaponElapsed =
      consumed === untilRound
        ? this.rifle.timeToEventMs
        : Math.min(
            this.rifle.timeToEventMs,
            this.stimpack.weaponTimeFor(consumed) * speed,
          );
    this.rifle.advance(weaponElapsed, () => {}, false);
    if (
      !this.choosing &&
      this.run.status === "running" &&
      !this.heat.locked &&
      !(
        this.stimpack.phase === "boost" &&
        consumed === this.stimpack.timeToBoundaryMs
      )
    ) {
      this.rifle.advance(0, (command, _offset, firstInBurst) =>
        this.firePrimary(command, firstInBurst),
      );
    }
    return consumed;
  }

  private firePrimary(
    command: AttackCommand,
    firstInBurst: boolean,
  ): void | boolean {
    this.shotIndex++;
    const target = resolveAttackTarget(
      command.manualTargetId,
      this.enemies.map((entry) => entry.state),
    );
    if (target) {
      const heatRatio = this.heat.ratio;
      const heatDamage = this.heat.damageMultiplier(this.progression.ranks);
      this.heat.fire(
        this.progression.ranks,
        !!this.progression.ranks.multishot &&
          heatRatio >= traitCombatBalance.highHeatRatio,
      );
      if (firstInBurst)
        this.relicCombat.onVolley({
          targetId: target.id,
          ranks: this.progression.ranks,
          baseDamage:
            gaussRifleBalance.damagePerRound *
            marineConfig.baseStats.damageMultiplier,
          rounds: gaussRifleBalance.roundsPerBurst,
        });
      const result = primaryAttack(
        target,
        this.enemies.map((entry) => entry.state),
        this.progression.ranks,
        gaussRifleBalance.damagePerRound *
          marineConfig.baseStats.damageMultiplier *
          this.magic.primaryDamageMultiplier *
          heatDamage,
        this.relicCombat.primaryModifiersFor(
          this.run.wallHp / runBalance.wallMaxHp,
          this.stimpack.phase === "boost",
        ),
        [...this.evolutions],
        {
          heatRatio,
          shotIndex: this.shotIndex,
          random: Math.random,
          synergyMultiplier: coreEffects(this.cores.owned).synergyMultiplier,
        },
      );
      this.view.showPrimary(
        [...result.hitIds, ...result.splashIds].map(
          (id) => this.enemies.find((entry) => entry.state.id === id)!.visual,
        ),
        result.ricochetIds,
        [...result.hitIds, ...result.splashIds],
        this.evolutions.size > 0,
        result.splashIds,
        result.shotTargetIds,
        result.criticalIds,
        result.explosionIds,
      );
      this.showStatusImpacts("fire", result.burnIds);
      this.showStatusImpacts("suppression", result.suppressionIds);
      const relicResult = this.relicCombat.afterPrimary(
        result.enemies,
        result.hitIds,
        result.criticalIds.length > 0,
      );
      if (relicResult.hitIds.length)
        this.view.showMagic(
          "chain-lightning",
          relicResult.hitIds.map(
            (id) => this.enemies.find((entry) => entry.state.id === id)!.visual,
          ),
        );
      this.magic.refundCooldowns(relicResult.cooldownRefunds);
      const frost = this.relicCombat.onPrimaryFrost(
        relicResult.enemies,
        result.hitIds,
        this.magic.frostRemainingMs > 0,
      );
      this.showStatusImpacts("frost", frost.shatterIds);
      this.applyEnemyStates(frost.enemies);
      if (this.choosing || this.heat.locked) return false;
    } else
      this.relicCombat.afterPrimary(
        this.enemies.map((entry) => entry.state),
        [],
        false,
      );
  }

  private applyEnemyStates(
    states: readonly EnemyState[],
    chargeBurst = true,
    magicKill = false,
    allowRelicEnergy = true,
  ): void {
    const frostBurst = this.magic.afterDeaths(
      states,
      states.filter((e) => e.hp <= 0).map((e) => e.id),
    );
    this.view.showImpacts(
      "frost",
      frostBurst.centerIds.map(
        (id) => this.enemies.find((e) => e.state.id === id)!.visual,
      ),
    );
    const propagated = propagateTraitDeaths(
      frostBurst.enemies,
      frostBurst.enemies.filter((e) => e.hp <= 0),
      this.progression.ranks,
    );
    this.showStatusImpacts("fire", propagated.burnIds);
    const byId = new Map(propagated.enemies.map((enemy) => [enemy.id, enemy]));
    let buildChanged = false;
    let xp = 0;
    let nearWallKills = 0;
    let hits = 0;
    let kills = 0;
    let eliteKills = 0;
    for (const entry of this.enemies) {
      const oldHp = entry.state.hp;
      entry.state = byId.get(entry.state.id)!;
      if (entry.state.hp < oldHp) hits++;
      if (entry.state.hp <= 0) {
        kills++;
        xp += enemyConfigs[entry.state.kind].xpOnKill;
        if (entry.state.progress01 >= relicBalance.nearWallProgress)
          nearWallKills++;
        if (entry.state.elite) {
          const core = this.cores.tryDrop(this.progression.traitLevels);
          if (core) {
            if (core.id === "tactical-expansion")
              this.progression.expandTraitLimit();
            if (core.id === "relic-expansion") this.relics.expandCapacity();
            if (core.id === "overload") this.progression.growOwnedTraits();
            this.notices.push(`${core.title}\n${core.description}`);
            buildChanged = true;
          }
          this.relics.reward();
          eliteKills++;
        }
        entry.visual.destroy();
      } else
        this.view.renderEnemy(
          entry.visual,
          entry.state,
          this.magic.frostRemainingMs > 0,
        );
    }
    this.enemies = this.enemies.filter((entry) => entry.state.hp > 0);
    this.kills += kills;
    const reward = this.relicCombat.onKills(kills, {
      frost: this.magic.frostRemainingMs > 0,
      boost: this.stimpack.phase === "boost",
      magic: magicKill,
      nearWallKills,
    });
    this.run = {
      ...this.run,
      wallHp: Math.min(
        runBalance.wallMaxHp,
        this.run.wallHp + reward.wallHealing,
      ),
    };
    this.stimpack.extendBoost(
      reward.boostExtensionMs,
      reward.boostExtensionCapMs,
      reward.recoveryCostRatio,
    );
    if (allowRelicEnergy)
      this.burst.credit({ hits: reward.energy / burstBalance.charge.hits });
    if (buildChanged) this.refreshBuild();
    this.progression.gainXp(xp);
    if (chargeBurst) this.burst.credit({ hits, kills, eliteKills });
    this.renderProgression();
    if (this.choosing) this.showChoices();
    else if (this.ultimateRemainingMs === 0) this.flushNotices();
    this.renderBurst();
  }

  private renderProgression(): void {
    this.view.renderProgression(
      this.progression.level,
      this.progression.xp,
      this.progression.threshold,
    );
    this.pauseUi.setBlocked(this.run.status !== "running" || this.choosing);
  }

  private showChoices(): void {
    this.cancelInput();
    const relicOffer = this.relics.offer();
    if (relicOffer.length) {
      this.time.paused = true;
      this.choices.showRelics(relicOffer, this.relics.levels, (id) => {
        if (this.relics.choose(id)) this.applyBuildChoice();
      });
      return;
    }
    const offered = this.progression.offer();
    if (!offered.length) {
      this.time.paused = false;
      this.choices.hide();
      this.flushNotices();
      return;
    }
    this.time.paused = true;
    this.choices.show(
      this.progression.level,
      offered,
      this.progression.ranks,
      (id) => {
        if (!this.progression.choose(id)) return;
        this.applyBuildChoice();
      },
      this.progression.traitLimit,
    );
  }

  private flushNotices(): void {
    if (!this.notices.length) return;
    this.view.showNotice(this.notices.join("\n\n"));
    this.notices = [];
  }

  private applyBuildChoice(): void {
    this.refreshBuild();
    this.renderProgression();
    this.showChoices();
  }

  private refreshBuild(): void {
    for (const recipe of eligibleEvolutions(
      this.progression.traitLevels,
      this.relics.levels,
      this.evolutions,
      this.progression.ranks,
    )) {
      this.evolutions.add(recipe.id);
      this.notices.push(`${display.evolution}\n${recipe.title}`);
    }
    for (const recipe of activeSynergies(this.progression.ranks)) {
      if (!this.synergies.has(recipe.id))
        this.notices.push(
          `${display.synergy} 활성화 · ${recipe.symbol} ${recipe.title}`,
        );
      this.synergies.add(recipe.id);
    }
    this.relicCombat.setLevels(this.relics.levels);
    const core = coreEffects(this.cores.owned);
    this.progression.setRarityModifiers(core.rarityModifiers);
    this.magic.setSynergyMultiplier(core.synergyMultiplier);
    this.rifle.setConfig(deriveWeaponConfig(this.progression.ranks));
    this.magic.setUpgrades(this.progression.ranks);
    this.stimpack.setUpgrades(this.progression.ranks);
    const summary = buildSummary(
      this.progression.ranks,
      this.relics.levels,
      this.cores.owned,
      this.evolutions,
    );
    this.buildBar.render(summary);
    this.pauseUi.setBuildDetails(summary);
  }

  private showStatusImpacts(
    kind: "fire" | "frost" | "suppression" | "emergency",
    ids: readonly number[],
  ): void {
    this.view.showImpacts(
      kind,
      ids.slice(0, 12).flatMap((id) => {
        const entry = this.enemies.find((e) => e.state.id === id);
        return entry ? [entry.visual] : [];
      }),
    );
  }

  private takeWallDamage(damage: number): void {
    if (damage <= 0 || this.run.status !== "running") return;
    const result = this.relicCombat.onWallDamage(
      this.run.wallHp,
      runBalance.wallMaxHp,
      damage,
    );
    this.run = {
      ...this.run,
      wallHp: result.wallHp,
      status: result.wallHp > 0 ? "running" : "failed",
    };
    if (!result.event) return;
    this.magic.refundCooldowns(result.cooldownRefunds);
    const pushed = this.enemies
      .filter(
        (e) =>
          e.state.hp > 0 && e.state.progress01 >= relicBalance.nearWallProgress,
      )
      .sort((a, b) => b.state.progress01 - a.state.progress01)
      .slice(0, 24);
    for (const entry of pushed) {
      entry.state = {
        ...entry.state,
        progress01: Math.max(
          0,
          entry.state.progress01 -
            result.pushback * (entry.state.elite ? 0.5 : 1),
        ),
        phase: "moving",
      };
      entry.attackElapsedMs = 0;
    }
    this.showStatusImpacts(
      "emergency",
      pushed.map((e) => e.state.id),
    );
    this.view.showNotice(
      result.event === "emergency"
        ? "긴급 회수 장치 · 치명 피해 방어!"
        : "최후의 보루 · 비상 방어 발동!",
    );
  }

  private fireEchoes(): void {
    // Each round is a single primary transaction. It cannot enter relic hooks or queue another echo.
    const due = this.echoRounds
      .filter((e) => e.dueMs <= this.run.elapsedMs)
      .slice(0, 6);
    for (const pending of due) {
      this.echoRounds.splice(this.echoRounds.indexOf(pending), 1);
      const candidates = this.enemies
        .map((e) => e.state)
        .filter((e) => e.id !== pending.volley.targetId);
      const target = resolveAttackTarget(null, candidates);
      if (!target) continue;
      const result = primaryAttack(
        target,
        this.enemies.map((e) => e.state),
        pending.volley.ranks,
        pending.volley.baseDamage,
        { damageMultiplier: pending.volley.damageMultiplier },
        [],
        {
          isEcho: true,
          shotIndex: this.shotIndex,
          random: Math.random,
          synergyMultiplier: coreEffects(this.cores.owned).synergyMultiplier,
        },
      );
      this.view.showPrimary(
        [...result.hitIds, ...result.splashIds].flatMap((id) => {
          const enemy = this.enemies.find((e) => e.state.id === id);
          return enemy ? [enemy.visual] : [];
        }),
        result.ricochetIds,
        [...result.hitIds, ...result.splashIds],
        false,
        result.splashIds,
        result.shotTargetIds,
        result.criticalIds,
        result.explosionIds,
        true,
      );
      this.showStatusImpacts("fire", result.burnIds);
      this.applyEnemyStates(result.enemies, false);
      if (this.choosing || this.run.status !== "running") break;
    }
  }

  private advanceWorld(deltaMs: number): number {
    // New enemies receive only time after their spawn boundary.
    let remaining = Math.max(0, deltaMs);
    while (remaining > 0 && this.run.status === "running") {
      const step = Math.min(
        remaining,
        16,
        this.director.timeToSpawnMs,
        runBalance.durationMs - this.run.elapsedMs,
        this.magic.frostRemainingMs > 0
          ? this.magic.frostRemainingMs
          : Infinity,
      );
      for (const entry of this.enemies) {
        const config = enemyConfigs[entry.state.kind];
        const movement = advanceEnemy(
          entry.state,
          step,
          config,
          this.magic.movementMultiplier,
        );
        entry.state = movement.enemy;
        const delay = Math.min(
          movement.wallTimeMs,
          entry.state.suppressionAttackDelayMs ?? 0,
        );
        if (delay > 0) entry.state.suppressionAttackDelayMs! -= delay;
        const attack = advanceWallAttack(
          entry.attackElapsedMs,
          movement.wallTimeMs - delay,
          config,
        );
        entry.attackElapsedMs = attack.elapsedMs;
        this.takeWallDamage(attack.damage);
        this.view.renderEnemy(
          entry.visual,
          entry.state,
          this.magic.frostRemainingMs > step,
        );
        if (this.run.status !== "running") break;
      }
      this.heat.tick(step, this.progression.ranks);
      const echoes = this.relicCombat.advance(step);
      for (const volley of echoes) {
        for (let i = 0; i < volley.rounds && this.echoRounds.length < 24; i++)
          this.echoRounds.push({
            dueMs: this.run.elapsedMs + step + i * 40,
            volley,
          });
      }
      const statuses = tickTraitStatuses(
        this.enemies.map((e) => e.state),
        step,
      );
      if (statuses.hitIds.length)
        this.applyEnemyStates(statuses.enemies, false);
      else
        this.enemies.forEach((entry, i) => {
          entry.state = statuses.enemies[i]!;
        });
      this.director.advance(step);
      this.magic.advance(step);
      this.burst.advanceCharge(step);
      this.run = advanceRun(this.run, step, runBalance.durationMs);
      remaining -= step;
      if (this.run.status === "running" && !this.choosing) this.fireEchoes();
      if (this.choosing) break;
      if (this.run.status === "running" && this.director.timeToSpawnMs <= 0) {
        this.spawnBatch();
      }
    }
    this.view.renderWall(this.run.wallHp, runBalance.wallMaxHp);
    return Math.max(0, deltaMs) - remaining;
  }
}
