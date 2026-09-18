import Phaser from "phaser";
import { EnemyPressureView } from "../battlefield/EnemyPressureView";
import {
  marineConfig,
  gaussRifleBalance,
  stimpackBalance,
} from "../data/balance";
import { SpecialWeapons } from "../combat/specialWeapons";
import { GaussRifle } from "../combat/gaussRifle";
import { Stimpack } from "../combat/stimpack";
import { SpawnDirector } from "../waves/spawnDirector";
import { shieldProtection } from "../combat/damage";
import { eliteBalance } from "../data/elite";
import { recognizeGesture } from "../input/gestureRecognizer";
import { recognizeUltimateGesture } from "../input/ultimateGesture";
import type { Point } from "../input/gestureRecognizer";
import { bindTapInput } from "../input/tapInput";
import { TargetFocus } from "../combat/targeting";
import { primaryAttack } from "../combat/primaryAttack";
import { MarineProgression } from "../progression/marineProgression";
import {
  getMarineStats,
  deriveMarineWeaponConfig,
  marineGrowthBalance,
} from "../data/marineGrowth";
import { LevelUpView } from "../ui/LevelUpView";
import { PrototypeRelics, PrototypeCores } from "../progression/highroll";
import { prototypeRelics } from "../data/highroll";
import { PrototypeSynergies } from "../combat/prototypeSynergies";
import { prototypeSynergyDefinitions } from "../data/prototypeSynergies";
import {
  startAction,
  precisionBonus,
  applyImpact,
} from "../combat/actionRelics";
import type { MarineGrowthState } from "../data/marineGrowth";
import { BuildBar } from "../ui/BuildBar";
import { marineBuildSummary, highrollBuildSummary } from "../ui/buildSummary";
import { PauseView } from "../ui/PauseView";
import { enemyConfigs } from "../data/enemies";
import { createPrototypeEnemy } from "../enemies/enemyFactory";
import { advanceEnemy } from "../enemies/enemySimulation";
import type { EnemyState } from "../enemies/enemySimulation";
import { advanceWallAttack } from "../enemies/wallAttack";
import { advanceRun, clearRun, createRunState } from "../model/runState";
import { createSiegeBoss, advanceSiegeBoss } from "../enemies/siegeBoss";
import { siegeBossBalance } from "../data/boss";
import type { EnemyKind } from "../model/types";
import { Burst } from "../combat/burst";
import { suppressiveBarrage } from "../combat/barrage";
import { burstBalance } from "../data/burst";
import { BurstView } from "../ui/BurstView";
import { ResultView } from "../ui/ResultView";
import { runBalance } from "../data/run";
import { enemyScalingBalance } from "../data/enemyScaling";

interface PrimaryAction {
  growth: MarineGrowthState;
  damageMultiplier: number;
  criticalChanceBonus: number;
  reinforcement: boolean;
}
interface CopiedAttack {
  rifle: GaussRifle;
  action: PrimaryAction;
  rounds: number;
}

export class CombatScene extends Phaser.Scene {
  get developerStatus() {
    return {
      speed: this.gameSpeed,
      level: this.progression.level,
      ...(import.meta.env.DEV
        ? {
            performance: {
              fps: this.game?.loop.actualFps ?? 0,
              enemies: this.enemies.length,
              specialUnits: this.specialWeapons.activeUnitCount,
              combatVfx: this.view?.combatVfxCount ?? 0,
              substeps: this.frameSubsteps,
            },
          }
        : {}),
    };
  }
  private wallMaxHp = runBalance.wallMaxHp;
  private run = createRunState(this.wallMaxHp);
  private result!: ResultView;
  private resultShown = false;
  private kills = 0;
  private bossSpawned = false;
  private bossKilled = false;
  private bossReinforcements: EnemyKind[] = [];
  private view!: EnemyPressureView;
  private enemies: {
    state: EnemyState;
    attackElapsedMs: number;
    visual: Phaser.GameObjects.Container;
  }[] = [];
  private frameSubsteps = 0;
  private inFrame = false;
  private snapshotSource: typeof this.enemies | undefined;
  private stateSnapshot: readonly EnemyState[] | undefined;
  private lookupSource: typeof this.enemies | undefined;
  private enemyById = new Map<number, (typeof this.enemies)[number]>();
  private get states(): readonly EnemyState[] {
    if (
      !this.stateSnapshot ||
      this.snapshotSource !== this.enemies ||
      this.stateSnapshot.length !== this.enemies.length
    ) {
      this.snapshotSource = this.enemies;
      this.stateSnapshot = this.enemies.map((entry) => entry.state);
    }
    return this.stateSnapshot;
  }
  private get entriesById() {
    if (
      this.lookupSource !== this.enemies ||
      this.enemyById.size !== this.enemies.length
    ) {
      this.lookupSource = this.enemies;
      this.enemyById = new Map(
        this.enemies.map((entry) => [entry.state.id, entry]),
      );
    }
    return this.enemyById;
  }
  private renderEnemies(): void {
    for (const entry of this.enemies)
      this.view.renderEnemy(entry.visual, entry.state, false);
  }
  private director = new SpawnDirector();
  private specialWeapons = new SpecialWeapons();
  private nextEnemyId = 0;
  private rifle = new GaussRifle(gaussRifleBalance);
  private stimpack = new Stimpack(stimpackBalance);
  private progression = new MarineProgression();
  private choices!: LevelUpView;
  private relics = new PrototypeRelics();
  private synergies = new PrototypeSynergies();
  private companion: GaussRifle | null = null;
  private primaryActions = new Map<GaussRifle, PrimaryAction>();
  private copiedAttacks: CopiedAttack[] = [];
  private cores = new PrototypeCores();
  private buildBar!: BuildBar;
  private shotIndex = 0;
  private focus = new TargetFocus();
  private pauseUi!: PauseView;
  private manualPaused = false;
  private gameSpeed: 1 | 2 | 4 = 1;
  private cancelInput = () => {};
  private evolutions = new Set<string>();
  private notices: string[] = [];
  private burst = new Burst();
  private burstUi!: BurstView;
  private ultimateRemainingMs = 0;
  private get choosing(): boolean {
    return (
      this.ultimateRemainingMs === 0 &&
      (this.progression.special.pending ||
        this.progression.pendingChoices > 0 ||
        this.relics.pending)
    );
  }

  create(): void {
    this.wallMaxHp = runBalance.wallMaxHp;
    this.run = createRunState(this.wallMaxHp);
    this.kills = 0;
    this.bossSpawned = false;
    this.bossKilled = false;
    this.bossReinforcements = [];
    this.resultShown = false;
    this.result = new ResultView();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.result.destroy(),
    );
    this.enemies = [];
    this.stateSnapshot = undefined;
    this.frameSubsteps = 0;
    this.inFrame = false;
    this.director = new SpawnDirector();
    this.specialWeapons = new SpecialWeapons();
    this.nextEnemyId = 0;
    this.rifle = new GaussRifle(gaussRifleBalance);
    this.stimpack = new Stimpack(stimpackBalance);
    this.progression = new MarineProgression();
    this.relics = new PrototypeRelics();
    this.synergies = new PrototypeSynergies();
    this.companion = null;
    this.primaryActions.clear();
    this.copiedAttacks = [];
    this.cores = new PrototypeCores();
    this.shotIndex = 0;
    this.focus = new TargetFocus();
    this.manualPaused = false;
    this.gameSpeed = 1;
    this.evolutions = new Set();
    this.notices = [];
    this.burst = new Burst();
    this.ultimateRemainingMs = 0;
    this.time.paused = false;
    this.time.timeScale = runBalance.combatTempo;
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
      (speed) => {
        this.gameSpeed = speed;
        this.time.timeScale = speed * runBalance.combatTempo;
      },
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
    this.view.renderWall(this.run.wallHp, this.wallMaxHp);
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
    const previous = this.focus.targetId;
    this.focus.set(this.view.pickEnemy(x, y, this.enemies));
    this.view.setFocus(this.focus.targetId);
    if (previous === this.focus.targetId) return;
    for (const id of [previous, this.focus.targetId]) {
      const entry = id === null ? undefined : this.entriesById.get(id);
      if (entry) this.view.renderEnemyStatus(entry.visual, entry.state);
    }
  }

  private activateStim(): boolean {
    if (!this.canUseAbility || !this.stimpack.activate()) return false;
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
    const result = suppressiveBarrage(this.states);
    this.view.showBarrage(
      result.hitIds.flatMap((id) => {
        const entry = this.entriesById.get(id);
        return entry ? [this.view.enemyVisualPoint(entry.state)] : [];
      }),
    );
    this.applyEnemyStates(
      applyImpact(this.states, result.enemies, this.relics.owned),
      false,
    );
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
          this.progression.level,
        ),
        progress01: spawn.progress01,
      };
      this.addEnemy(state);
    }
  }

  private addEnemy(state: EnemyState): void {
    this.enemies.push({
      state,
      attackElapsedMs: 0,
      visual: this.view.createEnemy(state, false, !this.inFrame),
    });
  }

  private updateBossEncounter(): void {
    if (
      this.run.elapsedMs >= siegeBossBalance.warningMs &&
      !this.director.bossPhase
    )
      this.director.bossPhase = "warning";
    if (!this.bossSpawned && this.run.elapsedMs >= siegeBossBalance.spawnMs) {
      this.bossSpawned = true;
      this.director.bossPhase = "active";
      this.addEnemy(createSiegeBoss(this.nextEnemyId++));
      this.view.showNotice("공성 거인\n공성 준비 중 집중 공격으로 중단");
    }
    // Finite reinforcement queue: a full horde delays the summons instead of dropping it.
    while (
      this.bossReinforcements.length &&
      this.enemies.length < this.director.settings.maxActiveEnemies
    ) {
      const kind = this.bossReinforcements.shift()!;
      const lane = (["left", "center", "right"] as const)[
        this.nextEnemyId % 3
      ]!;
      this.addEnemy(
        createPrototypeEnemy(
          kind,
          lane,
          this.nextEnemyId++,
          0.2 + Math.random() * 0.6,
          false,
          this.run.elapsedMs,
          this.progression.level,
        ),
      );
    }
  }

  update(_time: number, deltaMs: number): void {
    this.time.timeScale = this.gameSpeed * runBalance.combatTempo;
    this.frameSubsteps = 0;
    this.view.beginFrame();
    if (this.run.status !== "running" || this.choosing || this.manualPaused)
      return;
    this.inFrame = true;
    // Sole combat tempo owner. Stage time removes base tempo; developer speed affects both.
    let remaining =
      Math.max(0, deltaMs) * this.gameSpeed * runBalance.combatTempo;
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
    this.inFrame = false;
    this.renderEnemies();
    this.renderCombat();
  }

  private renderCombat(): void {
    this.view.renderSpecialWeapons(this.specialWeapons.visuals);
    this.view.renderHighroll(
      this.synergies.visuals,
      this.companion !== null,
      this.enemies,
    );
    this.finishRun();
    this.pauseUi.setBlocked(this.run.status !== "running" || this.choosing);
    this.renderBurst();
    this.view.renderStimpack(
      this.stimpack.phase,
      this.stimpack.attackSpeedMultiplier,
    );
    this.view.renderWall(this.run.wallHp, this.wallMaxHp);
    this.renderAbilities();
    this.view.renderRun(
      this.run.elapsedMs,
      siegeBossBalance.spawnMs,
      this.bossSpawned,
    );
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
        bossKilled: this.bossKilled,
        level: this.progression.level,
        wallHp: this.run.wallHp,
        ranks: this.progression.ranks,
        growth: this.progression.growth,
        specialWeapons: this.progression.special.weapons,
        branches: this.progression.branches,
        activeSynergyIds: this.progression.activeSynergyIds,
        relics: {},
        traitLimit: this.progression.traitLimit,
        cores: new Set(),
        highroll: highrollBuildSummary(
          this.relics.owned,
          this.cores.owned,
          this.synergies.active,
        ),
        evolutions: this.evolutions,
      },
      () => this.scene.restart(),
    );
  }

  private primaryTarget(): EnemyState | null {
    const enemies = this.states;
    const range = getMarineStats(this.progression.growth).minTargetProgress01;
    const automatic = this.focus.resolve(enemies, range);
    if (this.focus.targetId !== null) return automatic;
    const marked = enemies.find(
      (e) =>
        e.id === this.synergies.focusId && e.hp > 0 && e.progress01 >= range,
    );
    return marked ?? automatic;
  }

  private advanceCombat(deltaMs: number): number {
    const rifles = [
      this.rifle,
      ...(this.companion ? [this.companion] : []),
      ...this.copiedAttacks.map((copy) => copy.rifle),
    ];
    const target = rifles.some((rifle) => rifle.timeToEventMs === 0)
      ? this.primaryTarget()
      : null;
    const untilRound = Math.min(
      ...rifles.map((rifle) =>
        rifle.timeToEventMs === 0 && !target
          ? Infinity
          : this.stimpack.realTimeFor(rifle.timeToEventMs),
      ),
    );
    const consumed = this.advanceWorld(Math.min(deltaMs, untilRound));
    for (const rifle of rifles) {
      const elapsed = Math.min(
        rifle.timeToEventMs,
        this.stimpack.weaponTimeFor(consumed),
      );
      rifle.advance(elapsed, () => {}, false);
    }
    if (
      this.choosing ||
      this.run.status !== "running" ||
      (this.stimpack.phase === "boost" &&
        consumed === this.stimpack.timeToBoundaryMs)
    )
      return consumed;
    for (const rifle of rifles) {
      if (rifle.timeToEventMs > 0 || !this.primaryTarget()) continue;
      const copy = this.copiedAttacks.find(
        (pending) => pending.rifle === rifle,
      );
      if (!copy && rifle.startsAttack) {
        const growth = this.progression.growth;
        const config = deriveMarineWeaponConfig(growth);
        const baseRounds = config.burstRounds ?? 1;
        config.burstRounds = baseRounds + this.synergies.extraBurstRounds;
        if (config.burstRounds > baseRounds) {
          // Fit extra rounds inside the existing cycle, retaining the recovery floor.
          config.roundIntervalMs = Math.max(
            1,
            Math.min(
              config.roundIntervalMs!,
              (config.shotIntervalMs - marineGrowthBalance.minimumRecoveryMs) /
                (config.burstRounds - 1),
            ),
          );
        }
        rifle.setConfig(config);
        const roll = startAction(this.relics.owned, Math.random, {
          basic: true,
        });
        const action: PrimaryAction = {
          growth: {
            ranks: { ...growth.ranks },
            quality: { ...growth.quality },
            legendary: new Set(growth.legendary),
          },
          damageMultiplier: roll.damageMultiplier,
          criticalChanceBonus: precisionBonus(this.relics.owned),
          reinforcement: rifle === this.companion,
        };
        this.primaryActions.set(rifle, action);
        if (roll.repeat)
          this.copiedAttacks.push({
            rifle: new GaussRifle(config),
            action,
            rounds: config.burstRounds,
          });
      }
      const action = copy?.action ?? this.primaryActions.get(rifle)!;
      rifle.advance(0, () => this.firePrimary(action, !!copy));
      if (copy && --copy.rounds === 0)
        this.copiedAttacks.splice(this.copiedAttacks.indexOf(copy), 1);
      if (this.choosing || this.run.status !== "running") break;
    }
    return consumed;
  }

  private refreshProtection(): void {
    const states = shieldProtection(this.states);
    if (states === this.states) return;
    this.enemies.forEach((entry, i) => {
      entry.state = states[i]!;
    });
    this.stateSnapshot = states;
  }

  private firePrimary(action: PrimaryAction, copied: boolean): void {
    this.refreshProtection();
    const target = this.primaryTarget();
    this.view.setFocus(this.focus.targetId);
    if (!target) return;
    this.shotIndex++;
    const before = this.states;
    const result = primaryAttack(
      target,
      before,
      action.growth.ranks,
      gaussRifleBalance.damagePerRound *
        marineConfig.baseStats.damageMultiplier *
        this.stimpack.primaryDamageMultiplier,
      { damageMultiplier: action.damageMultiplier },
      [],
      {
        growth: action.growth,
        minTargetProgress01: getMarineStats(this.progression.growth)
          .minTargetProgress01,
        criticalChanceBonus: action.criticalChanceBonus,
        targetDamageMultiplier: (id) => {
          const enemy = this.entriesById.get(id)?.state;
          return (
            this.specialWeapons.gaussDamageMultiplier(id) *
            (enemy ? this.synergies.targetMultiplier(enemy) : 1)
          );
        },
        shotIndex: this.shotIndex,
        random: Math.random,
      },
    );
    this.view.showPrimary(
      [...result.hitIds, ...result.splashIds].flatMap((id) => {
        const enemy = this.entriesById.get(id);
        return enemy ? [this.view.enemyVisualPoint(enemy.state)] : [];
      }),
      result.ricochetIds,
      [...result.hitIds, ...result.splashIds],
      action.damageMultiplier > 1 || (action.growth.ranks.heavy ?? 0) > 0,
      result.splashIds,
      result.shotTargetIds,
      result.criticalIds,
      result.explosionIds,
      copied,
      action.reinforcement,
    );
    const states = applyImpact(before, result.enemies, this.relics.owned);
    // Extra Marines and copied attacks repeat only Gauss; never duplicate special-weapon actions.
    if (action.reinforcement || copied) this.applyEnemyStates(states);
    else {
      const synchronized = this.specialWeapons.onPrimary(target.id, {
        ...this.specialContext(),
        enemies: states,
      });
      this.view.showSpecialEffects(synchronized.effects);
      this.applyEnemyStates(synchronized.enemies);
    }
  }

  private applyEnemyStates(
    states: readonly EnemyState[],
    chargeBurst = true,
  ): void {
    if (states === this.states) return;
    let byId: Map<number, EnemyState> | undefined;
    let changed = false;
    let buildChanged = false;
    let xp = 0;
    let hits = 0;
    let kills = 0;
    let eliteKills = 0;
    for (const [index, entry] of this.enemies.entries()) {
      let next = states[index];
      if (next?.id !== entry.state.id) {
        byId ??= new Map(states.map((enemy) => [enemy.id, enemy]));
        next = byId.get(entry.state.id);
      }
      if (!next || next === entry.state) continue;
      changed = true;
      const oldHp = entry.state.hp;
      const oldShield = entry.state.shieldHp ?? 0;
      entry.state = next;
      if (entry.state.hp < oldHp || (entry.state.shieldHp ?? 0) < oldShield) {
        hits++;
        this.synergies.registerHits([entry.state.id]);
      }
      if (entry.state.hp <= 0) {
        kills++;
        if (entry.state.boss) {
          this.bossKilled = true;
          this.run = clearRun(this.run);
        } else xp += enemyConfigs[entry.state.kind].xpOnKill;
        if (entry.state.elite) {
          const core = this.cores.tryDrop(this.progression.validCoreIds);
          if (core) {
            this.progression.applyCore(core.id);
            this.notices.push(`${core.title}\n${core.description}`);
            buildChanged = true;
          }
          this.relics.onElite();
          eliteKills++;
        }
        entry.visual.destroy();
      }
    }
    if (!changed) return;
    if (kills)
      this.enemies = this.enemies.filter((entry) => entry.state.hp > 0);
    this.stateSnapshot = undefined;
    this.refreshProtection();
    this.focus.resolve(this.states);
    this.view.setFocus(this.focus.targetId);
    this.kills += kills;
    if (this.run.status !== "running") {
      // Input-triggered Ultimate can end a run outside update().
      this.finishRun();
      return;
    }
    this.synergies.advance(0, this.states);
    if (buildChanged) this.refreshBuild();
    this.progression.gainXp(xp);
    if (chargeBurst) this.burst.credit({ hits, kills, eliteKills });
    if (hits || kills) this.renderProgression();
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
    const specialOffer = this.progression.special.offer();
    if (specialOffer) {
      this.time.paused = true;
      this.choices.showSpecial(specialOffer, (id) => {
        if (this.progression.special.choose(id)) this.applyBuildChoice();
      });
      return;
    }
    if (this.relics.pendingReplacement) {
      this.time.paused = true;
      this.choices.showRelicReplacement(
        prototypeRelics[this.relics.pendingReplacement],
        [...this.relics.owned].map((id) => prototypeRelics[id]),
        (id) => {
          if (this.relics.replace(id)) this.applyBuildChoice();
        },
        () => {
          if (this.relics.skip()) this.applyBuildChoice();
        },
      );
      return;
    }
    const relicOffer = this.relics.offer();
    if (relicOffer.length) {
      this.time.paused = true;
      this.choices.showPrototypeRelics(relicOffer, (id) => {
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
    this.choices.showMarine(
      this.progression.level,
      offered,
      this.progression.ranks,
      (id) => {
        if (!this.progression.choose(id)) return;
        if (this.progression.lastSelection?.greatSuccess)
          this.notices.push(
            `대성공! · +${this.progression.lastSelection.levels}레벨${this.progression.lastSelection.levels < 2 ? " (최대 레벨 도달)" : ""}`,
          );
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
    if (this.relics.owned.has("reinforcement"))
      this.companion ??= new GaussRifle(
        deriveMarineWeaponConfig(this.progression.growth),
      );
    else this.companion = null;
    for (const id of this.synergies.updateBuild(
      this.progression.growth,
      this.progression.special.weapons,
    ))
      this.notices.push(
        `시너지 활성화 · ${prototypeSynergyDefinitions[id].title}`,
      );
    this.synergies.advance(0, this.states);
    this.rifle.setConfig(deriveMarineWeaponConfig(this.progression.growth));

    this.stimpack.setUpgrades(
      this.progression.ranks,
      this.progression.branches,
    );
    const summary = [
      ...marineBuildSummary(
        this.progression.growth,
        {},
        new Set(),
        this.progression.special.weapons,
      ),
      ...highrollBuildSummary(
        this.relics.owned,
        this.cores.owned,
        this.synergies.active,
      ),
    ];
    this.buildBar.render(summary);
    this.burstUi.renderBuild(summary);
    this.burstUi.renderSpecialWeapons(
      this.progression.special.weapons,
      summary,
      this.progression.special.capacity,
    );
    this.pauseUi.setBuildDetails(summary);
  }

  private takeWallDamage(damage: number): void {
    if (damage <= 0 || this.run.status !== "running") return;
    const wallHp = Math.max(0, this.run.wallHp - damage);
    this.run = {
      ...this.run,
      wallHp,
      status: wallHp > 0 ? "running" : "failed",
    };
  }

  private specialContext() {
    return {
      weapons: this.progression.special.weapons,
      growth: this.progression.growth,
      enemies: this.states,
      focusId: this.focus.targetId,
      random: Math.random,
      relics: this.relics.owned,
      synergy: this.synergies,
    };
  }

  private advanceWorld(deltaMs: number): number {
    // New enemies receive only time after their spawn boundary.
    let remaining = Math.max(0, deltaMs);
    while (remaining > 0 && this.run.status === "running") {
      this.updateBossEncounter();
      const step = Math.min(
        remaining,
        16,
        this.director.timeToSpawnMs,
        this.bossSpawned
          ? Infinity
          : (siegeBossBalance.spawnMs - this.run.elapsedMs) *
              runBalance.combatTempo,
      );
      if (step > 0) this.frameSubsteps++;
      this.refreshProtection();
      for (const entry of this.enemies) {
        if (entry.state.boss) {
          const boss = advanceSiegeBoss(entry.state, step);
          entry.state = boss.enemy;
          this.takeWallDamage(boss.wallDamage);
          if (boss.reinforcement) {
            this.bossReinforcements.push(
              ...Array<EnemyKind>(siegeBossBalance.reinforcement.grunt).fill(
                "grunt",
              ),
              ...Array<EnemyKind>(siegeBossBalance.reinforcement.runner).fill(
                "runner",
              ),
            );
            this.view.showNotice("공성 거인 · 지원군 호출");
          }
          if (entry.state.boss!.phase === "final-charge")
            this.director.bossPhase = "final";
          if (this.run.status !== "running") break;
          continue;
        }
        const config = enemyConfigs[entry.state.kind];
        const movement = advanceEnemy(
          entry.state,
          step,
          config,
          enemyScalingBalance.movementMultiplier,
        );
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
        if (this.run.status !== "running") break;
      }
      this.stateSnapshot = undefined;
      this.director.advance(step, step / runBalance.combatTempo);
      this.synergies.advance(step, this.states);

      this.burst.advanceCharge(step);
      this.run = advanceRun(this.run, step / runBalance.combatTempo);
      remaining -= step;
      if (
        this.run.status === "running" &&
        this.progression.special.weapons.length
      ) {
        const result = this.specialWeapons.advance(step, this.specialContext());
        this.view.showSpecialEffects(result.effects);
        if (result.enemies !== this.states)
          this.applyEnemyStates(result.enemies);
      }
      if (this.choosing) break;
      if (this.run.status === "running") this.updateBossEncounter();
      if (this.run.status === "running" && this.director.timeToSpawnMs <= 0) {
        this.spawnBatch();
      }
    }
    return Math.max(0, deltaMs) - remaining;
  }
}
