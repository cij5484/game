import Phaser from "phaser";
import { EnemyPressureView } from "../battlefield/EnemyPressureView";
import {
  marineConfig,
  gaussRifleBalance,
  stimpackBalance,
} from "../data/balance";
import { GaussRifle } from "../combat/gaussRifle";
import { Stimpack } from "../combat/stimpack";
import { SpawnDirector } from "../waves/spawnDirector";
import { shieldProtection } from "../combat/damage";
import { eliteBalance } from "../data/elite";
import { recognizeGesture } from "../input/gestureRecognizer";
import { recognizeUltimateGesture } from "../input/ultimateGesture";
import type { Point } from "../input/gestureRecognizer";
import { bindTapInput } from "../input/tapInput";
import { resolveAttackTarget, TargetFocus } from "../combat/targeting";
import { deriveWeaponConfig, primaryAttack } from "../combat/primaryAttack";
import { Progression } from "../progression/progression";
import { LevelUpView } from "../ui/LevelUpView";
import { Relics } from "../progression/relics";
import { Cores } from "../progression/cores";
import { coreEffects } from "../data/cores";
import { BuildBar } from "../ui/BuildBar";
import { buildSummary } from "../ui/buildSummary";
import { relicBalance } from "../data/relics";
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
  private progression = new Progression(Math.random, [
    "gauss-rifle",
    "stimpack",
  ]);
  private choices!: LevelUpView;
  private relics = new Relics(Math.random, ["time-gear", "frost-resonator"]);
  private relicCombat = new RelicCombat();
  private cores = new Cores();
  private buildBar!: BuildBar;
  private shotIndex = 0;
  private focus = new TargetFocus();
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
    this.progression = new Progression(Math.random, [
      "gauss-rifle",
      "stimpack",
    ]);
    this.relics = new Relics(Math.random, ["time-gear", "frost-resonator"]);
    this.relicCombat = new RelicCombat();
    this.cores = new Cores();
    this.shotIndex = 0;
    this.focus = new TargetFocus();
    this.echoRounds = [];
    this.synergies = new Set();
    this.manualPaused = false;
    this.evolutions = new Set();
    this.notices = [];
    this.burst = new Burst();
    this.ultimateRemainingMs = 0;
    this.time.paused = false;
    this.choices = new LevelUpView();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.choices.destroy(),
    );
    this.view = new EnemyPressureView(this);
    this.burstUi = new BurstView({
      inspect: (entries) => this.pauseUi.inspect(entries),
      stim: () => {
        this.activateStim();
      },
      hint: () => {
        if (this.canUseAbility) this.burstUi.showHint();
      },
    });
    this.pauseUi = new PauseView(
      (paused) => {
        this.manualPaused = paused;
        this.cancelInput();
        this.time.paused = paused;
        this.renderBurst();
        this.renderAbilities();
      },
      () => this.scene.restart(),
    );
    const resizeBurst = () => {
      this.burstUi.resize(this.scale.width, this.scale.height);
      this.pauseUi.resize(this.scale.width, this.scale.height);
      this.buildBar.resize(this.scale.width, this.scale.height);
    };
    this.buildBar = new BuildBar((entries) => this.pauseUi.inspect(entries));
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
        if (kind === "secondary") this.activateStim();
        else this.focusAt(x, y);
      },
      (points, displayPoints) => this.handleGesture(points, displayPoints),
      (x, y) => this.view.isBattlefieldPoint(x, y),
    );
    this.cancelInput = unbindInput.cancel;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unbindInput.destroy);
    this.view.renderStimpack(
      this.stimpack.phase,
      this.stimpack.attackSpeedMultiplier,
    );
    this.renderAbilities();
    this.renderProgression();
    this.renderBurst();
    this.refreshBuild();
  }

  private get canUseAbility(): boolean {
    return (
      this.run.status === "running" && !this.manualPaused && !this.choosing
    );
  }

  private focusAt(x: number, y: number): void {
    if (!this.canUseAbility) return;
    this.focus.set(this.view.pickEnemy(x, y, this.enemies));
    this.view.setFocus(this.focus.targetId);
    for (const entry of this.enemies)
      this.view.renderEnemy(entry.visual, entry.state, false);
  }

  private activateStim(): boolean {
    if (!this.canUseAbility || !this.stimpack.activate()) return false;
    const effect = this.relicCombat.onStim();
    this.run = {
      ...this.run,
      wallHp: Math.max(1, this.run.wallHp - effect.wallCost),
    };

    this.renderBurst();
    this.renderAbilities();
    return true;
  }

  private handleGesture(
    points: readonly Point[],
    displayPoints: readonly Point[],
  ): void {
    if (!this.canUseAbility) return;
    if (recognizeUltimateGesture(points, this.burst.ready)) {
      this.view.showGesture(displayPoints, "V · 억제 사격");
      this.activateUltimate();
      return;
    }
    // Legacy Mage recognition remains available for debug; it never casts for Marine.
    const gesture = recognizeGesture(points);
    this.view.showGesture(
      displayPoints,
      `${gesture.kind} · ${gesture.reason}`,
      gesture.kind === "unknown",
    );
    // Circle/Z remain recognized for debug only; Marine owns V and Stimpack.
  }

  private activateUltimate(): boolean {
    if (!this.canUseAbility || !this.burst.activate()) return false;
    this.ultimateRemainingMs = burstBalance.ultimate.presentationMs;
    this.refreshProtection();
    const result = suppressiveBarrage(this.enemies.map((e) => e.state));
    this.view.showBarrage(
      result.hitIds.flatMap((id) => {
        const entry = this.enemies.find((e) => e.state.id === id);
        return entry ? [entry.visual] : [];
      }),
    );
    this.applyEnemyStates(result.enemies, false, false, false);
    this.renderBurst();
    this.renderAbilities();
    return true;
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
        visual: this.view.createEnemy(state, false),
      });
    }
  }

  update(_time: number, deltaMs: number): void {
    if (this.run.status !== "running" || this.choosing || this.manualPaused)
      return;
    let remaining = Math.max(0, deltaMs);
    do {
      const presenting = this.ultimateRemainingMs > 0;
      const step = Math.min(
        remaining,
        this.stimpack.timeToBoundaryMs,
        16,
        presenting ? this.ultimateRemainingMs : Infinity,
      );
      let consumed = step;
      if (this.stimpack.canAttack) consumed = this.advanceCombat(step);
      else consumed = this.advanceWorld(step);
      this.stimpack.advance(consumed);
      this.ultimateRemainingMs = Math.max(
        0,
        this.ultimateRemainingMs - consumed,
      );
      remaining -= consumed;
      // Ultimate visuals defer choice overlays, never combat or ability input.
      if (
        presenting &&
        this.ultimateRemainingMs === 0 &&
        this.run.status === "running"
      ) {
        if (this.choosing) this.showChoices();
        else this.flushNotices();
      }
    } while (remaining > 0 && this.run.status === "running" && !this.choosing);
    this.renderCombat();
  }

  private renderCombat(): void {
    this.finishRun();
    this.pauseUi.setBlocked(this.run.status !== "running" || this.choosing);
    this.renderBurst();
    this.view.renderStimpack(
      this.stimpack.phase,
      this.stimpack.attackSpeedMultiplier,
    );
    this.view.renderWall(this.run.wallHp, runBalance.wallMaxHp);
    this.renderAbilities();
    this.view.renderRun(this.run.elapsedMs, runBalance.durationMs);
    const settings = this.director.settings;
    this.view.renderDirector(
      `${settings.name} · ${Math.floor(this.director.elapsedMs / 1000)}s · ${settings.phase}\nACTIVE ${this.enemies.length}/${settings.maxActiveEnemies} · batch ${settings.batchSize} / ${settings.spawnIntervalMs}ms`,
    );
  }

  private renderAbilities(): void {
    this.burstUi.renderAbilities({
      phase: this.stimpack.phase,
      progress: this.stimpack.phaseProgress,
    });
  }

  private finishRun(): void {
    if (this.run.status === "running" || this.resultShown) return;
    this.resultShown = true;
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
        branches: this.progression.branches,
        activeSynergyIds: this.progression.activeSynergyIds,
        relics: this.relics.levels,
        traitLimit: this.progression.traitLimit,
        cores: this.cores.owned,
        evolutions: this.evolutions,
      },
      () => this.scene.restart(),
    );
  }

  private advanceCombat(deltaMs: number): number {
    // Keep a ready weapon ready while waiting for range/focus; world movement still advances.
    if (
      this.rifle.timeToEventMs === 0 &&
      !this.focus.resolve(
        this.enemies.map((entry) => entry.state),
        marineConfig.primaryMinProgress01,
      )
    )
      return this.advanceWorld(deltaMs);
    const speed = this.relicCombat.primaryModifiersFor(
      this.run.wallHp / runBalance.wallMaxHp,
      this.stimpack.phase === "boost",
    ).attackSpeedMultiplier;
    const untilRound = this.stimpack.realTimeFor(
      this.rifle.timeToEventMs / speed,
    );
    const step = Math.min(deltaMs, untilRound);
    const consumed = this.advanceWorld(step);
    // Delayed strikes or echoes can open a choice before the firing endpoint.
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
      !(
        this.stimpack.phase === "boost" &&
        consumed === this.stimpack.timeToBoundaryMs
      )
    ) {
      if (
        this.focus.resolve(
          this.enemies.map((entry) => entry.state),
          marineConfig.primaryMinProgress01,
        )
      )
        this.rifle.advance(0, () => this.firePrimary());
    }
    return consumed;
  }

  private refreshProtection(): void {
    const states = shieldProtection(this.enemies.map((e) => e.state));
    this.enemies.forEach((entry, i) => {
      entry.state = states[i]!;
    });
  }

  private firePrimary(): void | boolean {
    this.refreshProtection();
    const target = this.focus.resolve(
      this.enemies.map((entry) => entry.state),
      marineConfig.primaryMinProgress01,
    );
    this.view.setFocus(this.focus.targetId);
    if (target) {
      this.shotIndex++;
      if (this.shotIndex % relicBalance.echoCycleShots === 0)
        this.relicCombat.onVolley({
          targetId: target.id,
          ranks: this.progression.ranks,
          branches: this.progression.branches,
          activeSynergyIds: this.progression.activeSynergyIds,
          baseDamage:
            gaussRifleBalance.damagePerRound *
            marineConfig.baseStats.damageMultiplier,
          rounds: relicBalance.echoCycleShots,
        });
      const result = primaryAttack(
        target,
        this.enemies.map((entry) => entry.state),
        this.progression.ranks,
        gaussRifleBalance.damagePerRound *
          marineConfig.baseStats.damageMultiplier *
          this.stimpack.primaryDamageMultiplier,
        this.relicCombat.primaryModifiersFor(
          this.run.wallHp / runBalance.wallMaxHp,
          this.stimpack.phase === "boost",
        ),
        [...this.evolutions],
        {
          branches: this.progression.branches,
          activeSynergyIds: this.progression.activeSynergyIds,
          minTargetProgress01: marineConfig.primaryMinProgress01,
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

      this.applyEnemyStates(relicResult.enemies);
      if (this.choosing) return false;
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
    _magicKill = false,
    allowRelicEnergy = true,
  ): void {
    const byId = new Map(states.map((enemy) => [enemy.id, enemy]));
    let buildChanged = false;
    let xp = 0;
    let nearWallKills = 0;
    let hits = 0;
    let kills = 0;
    let eliteKills = 0;
    for (const entry of this.enemies) {
      const oldHp = entry.state.hp;
      const oldShield = entry.state.shieldHp ?? 0;
      entry.state = byId.get(entry.state.id)!;
      if (entry.state.hp < oldHp || (entry.state.shieldHp ?? 0) < oldShield)
        hits++;
      if (entry.state.hp <= 0) {
        kills++;
        xp += enemyConfigs[entry.state.kind].xpOnKill;
        if (entry.state.progress01 >= relicBalance.nearWallProgress)
          nearWallKills++;
        if (entry.state.elite) {
          const core = this.cores.tryDrop();
          if (core) {
            if (core.id === "tactical-expansion")
              this.progression.expandTraitLimit();
            if (core.id === "relic-expansion") {
              this.relics.expandCapacity();
              this.relics.reward();
            }
            if (core.id === "choice-expansion")
              this.progression.expandChoices();
            this.notices.push(`${core.title}\n${core.description}`);
            buildChanged = true;
          }
          this.relics.reward();
          eliteKills++;
        }
        entry.visual.destroy();
      } else this.view.renderEnemy(entry.visual, entry.state, false);
    }
    this.enemies = this.enemies.filter((entry) => entry.state.hp > 0);
    this.refreshProtection();
    this.focus.resolve(this.enemies.map((e) => e.state));
    this.view.setFocus(this.focus.targetId);
    this.kills += kills;
    const reward = this.relicCombat.onKills(kills, {
      frost: false,
      boost: this.stimpack.phase === "boost",
      magic: false,
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
    for (const recipe of activeSynergies(
      this.progression.ranks,
      this.progression.activeSynergyIds,
    )) {
      if (!this.synergies.has(recipe.id))
        this.notices.push(
          `${display.synergy} 활성화 · ${recipe.symbol} ${recipe.title}`,
        );
      this.synergies.add(recipe.id);
    }
    this.relicCombat.setLevels(this.relics.levels);
    this.rifle.setConfig(deriveWeaponConfig(this.progression.ranks));

    this.stimpack.setUpgrades(
      this.progression.ranks,
      this.progression.branches,
    );
    const summary = buildSummary(
      this.progression.ranks,
      this.relics.levels,
      this.cores.owned,
      this.evolutions,
      this.progression.branches,
      this.progression.activeSynergyIds,
    );
    this.buildBar.render(summary);
    this.burstUi.renderBuild(summary);
    this.pauseUi.setBuildDetails(summary);
  }

  private showStatusImpacts(
    kind: "lightning" | "frost" | "emergency",
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
    if (!due.length) return;
    this.refreshProtection();
    for (const pending of due) {
      this.echoRounds.splice(this.echoRounds.indexOf(pending), 1);
      const candidates = this.enemies
        .map((e) => e.state)
        .filter((e) => e.id !== pending.volley.targetId);
      const target = resolveAttackTarget(
        null,
        candidates,
        marineConfig.primaryMinProgress01,
      );
      if (!target) continue;
      const result = primaryAttack(
        target,
        this.enemies.map((e) => e.state),
        pending.volley.ranks,
        pending.volley.baseDamage,
        { damageMultiplier: pending.volley.damageMultiplier },
        [],
        {
          branches: pending.volley.branches ?? {},
          activeSynergyIds: pending.volley.activeSynergyIds ?? new Set(),
          minTargetProgress01: marineConfig.primaryMinProgress01,
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
      );
      this.refreshProtection();
      for (const entry of this.enemies) {
        const config = enemyConfigs[entry.state.kind];
        const movement = advanceEnemy(entry.state, step, config, 1);
        entry.state = movement.enemy;
        const attack = advanceWallAttack(
          entry.attackElapsedMs,
          movement.wallTimeMs,
          entry.state.elite
            ? {
                ...config,
                wallAttackDamage:
                  eliteBalance[entry.state.kind as "runner" | "shield"]
                    .wallDamage,
              }
            : config,
        );
        entry.attackElapsedMs = attack.elapsedMs;
        this.takeWallDamage(attack.damage);
        this.view.renderEnemy(entry.visual, entry.state, false);
        if (this.run.status !== "running") break;
      }
      const echoes = this.relicCombat.advance(step);
      for (const volley of echoes) {
        for (let i = 0; i < volley.rounds && this.echoRounds.length < 24; i++)
          this.echoRounds.push({
            dueMs: this.run.elapsedMs + step + i * 40,
            volley,
          });
      }
      this.director.advance(step);

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
