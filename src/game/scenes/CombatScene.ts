import Phaser from "phaser";
import { EnemyPressureView } from "../battlefield/EnemyPressureView";
import {
  enemyPressureBalance,
  marineConfig,
  gaussRifleBalance,
  stimpackBalance,
} from "../data/balance";
import { GaussRifle } from "../combat/gaussRifle";
import { Stimpack } from "../combat/stimpack";
import { SpawnDirector } from "../waves/spawnDirector";
import { Magic } from "../combat/magic";
import { recognizeGesture } from "../input/gestureRecognizer";
import { bindTapInput } from "../input/tapInput";
import { resolveAttackTarget } from "../combat/targeting";
import { deriveWeaponConfig, primaryAttack } from "../combat/primaryAttack";
import { Progression } from "../progression/progression";
import { LevelUpView } from "../ui/LevelUpView";
import { Modules } from "../progression/modules";
import { eligibleEvolutions } from "../progression/evolution";
import { enemyConfigs } from "../data/enemies";
import { createPrototypeEnemy } from "../enemies/enemyFactory";
import { advanceEnemy } from "../enemies/enemySimulation";
import type { EnemyState } from "../enemies/enemySimulation";
import { advanceWallAttack } from "../enemies/wallAttack";
import { applyWallDamage, createRunState } from "../model/runState";
import { Burst } from "../combat/burst";
import { suppressiveBarrage } from "../combat/barrage";
import { burstBalance } from "../data/burst";
import { BurstView } from "../ui/BurstView";

export class CombatScene extends Phaser.Scene {
  private run = createRunState(enemyPressureBalance.wallMaxHp);
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
  private modules = new Modules();
  private evolutions = new Set<string>();
  private evolutionNotice = "";
  private burst = new Burst();
  private burstUi!: BurstView;
  private ultimateRemainingMs = 0;
  private get choosing(): boolean {
    return (
      this.ultimateRemainingMs === 0 &&
      (this.progression.pendingChoices > 0 || this.modules.pendingRewards > 0)
    );
  }

  create(): void {
    this.run = createRunState(enemyPressureBalance.wallMaxHp);
    this.enemies = [];
    this.director = new SpawnDirector();
    this.nextEnemyId = 0;
    this.rifle = new GaussRifle(gaussRifleBalance);
    this.stimpack = new Stimpack(stimpackBalance);
    this.magic = new Magic();
    this.progression = new Progression();
    this.modules = new Modules();
    this.evolutions = new Set();
    this.evolutionNotice = "";
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
          this.run.status === "failed" ||
          this.choosing ||
          this.ultimateRemainingMs > 0
        )
          return;
        if (this.burst.activate()) this.time.timeScale = burstBalance.timeScale;
        this.renderBurst();
      },
      () => this.rhythmTap(),
    );
    const resizeBurst = () =>
      this.burstUi.resize(this.scale.width, this.scale.height);
    resizeBurst();
    this.scale.on(Phaser.Scale.Events.RESIZE, resizeBurst);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, resizeBurst);
      this.burstUi.destroy();
    });
    this.spawnBatch();
    this.view.renderWall(this.run.wallHp, enemyPressureBalance.wallMaxHp);
    const unbindInput = bindTapInput(
      this.game.canvas,
      (kind, x, y) => {
        if (this.run.status === "failed" || this.choosing) return;
        if (this.burst.phase === "rhythm") {
          if (kind === "primary") this.rhythmTap();
          return;
        }
        if (this.ultimateRemainingMs > 0) return;
        if (kind === "secondary") this.stimpack.activate();
        else if (this.stimpack.canAttack)
          this.rifle.request({
            manualTargetId: this.view.pickEnemy(x, y, this.enemies),
          });
        this.update(0, 0);
      },
      (points, displayPoints) => {
        if (
          this.run.status === "failed" ||
          this.choosing ||
          this.burst.phase === "rhythm" ||
          this.ultimateRemainingMs > 0
        )
          return;
        const gesture = recognizeGesture(points);
        this.view.showGesture(
          displayPoints,
          `${gesture.kind} · ○ ${gesture.circleScore.toFixed(2)} / Z ${gesture.zScore.toFixed(2)}\n${gesture.reason}`,
        );
        if (gesture.kind === "unknown") return;
        const id = gesture.kind === "circle" ? "frost-nova" : "chain-lightning";
        const result = this.magic.cast(
          id,
          this.enemies.map((entry) => entry.state),
        );
        if (!result) return;
        this.view.showMagic(
          id,
          result.hitIds.map(
            (id) => this.enemies.find((entry) => entry.state.id === id)!.visual,
          ),
        );
        this.applyEnemyStates(result.enemies);
        this.renderMagic();
      },
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unbindInput);
    this.view.renderStimpack(
      this.stimpack.phase,
      this.stimpack.attackSpeedMultiplier,
    );
    this.renderMagic();
    this.renderProgression();
    this.renderBurst();
  }

  private rhythmTap(): void {
    if (this.run.status === "failed" || this.choosing) return;
    this.burst.tap();
    this.renderBurst();
  }

  private renderBurst(): void {
    this.burstUi.render(
      this.burst,
      this.run.status === "failed" || this.choosing,
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
        ),
        progress01: spawn.progress01,
      };
      this.enemies.push({
        state,
        attackElapsedMs: 0,
        visual: this.view.createEnemy(state),
      });
    }
  }

  update(_time: number, deltaMs: number): void {
    if (this.run.status === "failed" || this.choosing) return;
    if (this.burst.phase === "rhythm") {
      const step = Math.min(
        Math.max(0, deltaMs),
        burstBalance.rhythmMs - this.burst.elapsedMs,
      );
      this.advanceWorld(step * burstBalance.timeScale);
      this.stimpack.advance(step * burstBalance.timeScale);
      const result = this.burst.advance(step);
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
        this.applyEnemyStates(barrage.enemies, false);
      }
      if (this.run.wallHp <= 0) this.time.timeScale = 1;
      this.renderCombat();
      return;
    }
    if (this.ultimateRemainingMs > 0) {
      const step = Math.min(Math.max(0, deltaMs), this.ultimateRemainingMs);
      this.advanceWorld(step);
      this.stimpack.advance(step);
      this.ultimateRemainingMs -= step;
      if (this.choosing && this.run.status === "running") this.showChoices();
      this.renderCombat();
      return;
    }
    let remaining = Math.max(0, deltaMs);
    do {
      const step = Math.min(remaining, this.stimpack.timeToBoundaryMs);
      let consumed = step;
      if (this.stimpack.canAttack) consumed = this.advanceCombat(step);
      else this.advanceWorld(step);
      this.stimpack.advance(consumed);
      remaining -= consumed;
    } while (remaining > 0 && this.run.status === "running" && !this.choosing);
    this.renderCombat();
  }

  private renderCombat(): void {
    this.renderBurst();
    this.view.renderStimpack(
      this.stimpack.phase,
      this.stimpack.attackSpeedMultiplier,
    );
    this.view.renderWall(this.run.wallHp, enemyPressureBalance.wallMaxHp);
    this.renderMagic();
    const settings = this.director.settings;
    this.view.renderDirector(
      `DIRECTOR ${Math.floor(this.director.elapsedMs / 1000)}s · ${settings.phase} · stage ${settings.stage + 1}\nACTIVE ${this.enemies.length}/${settings.maxActiveEnemies} · batch ${settings.batchSize} / ${settings.spawnIntervalMs}ms`,
    );
  }

  private renderMagic(): void {
    this.view.renderMagic(
      this.magic.remaining("frost-nova"),
      this.magic.remaining("chain-lightning"),
    );
  }

  private advanceCombat(deltaMs: number): number {
    let elapsed = 0;
    this.rifle.advance(
      this.stimpack.weaponTimeFor(deltaMs),
      (command, weaponOffsetMs) => {
        const offsetMs = this.stimpack.realTimeFor(weaponOffsetMs);
        this.advanceWorld(offsetMs - elapsed);
        elapsed = offsetMs;
        if (this.run.status === "failed") return false;
        const target = resolveAttackTarget(
          command.manualTargetId,
          this.enemies.map((entry) => entry.state),
        );
        if (target) {
          const result = primaryAttack(
            target,
            this.enemies.map((entry) => entry.state),
            this.progression.ranks,
            gaussRifleBalance.damagePerRound *
              marineConfig.baseStats.damageMultiplier,
            this.modules.levels,
            [...this.evolutions],
          );
          this.view.showPrimary(
            [...result.hitIds, ...result.splashIds].map(
              (id) =>
                this.enemies.find((entry) => entry.state.id === id)!.visual,
            ),
            result.ricochetIds,
            [...result.hitIds, ...result.splashIds],
            this.evolutions.size > 0,
            result.splashIds,
          );
          this.applyEnemyStates(result.enemies);
          if (this.choosing) return false;
        }
      },
      !(
        this.stimpack.phase === "boost" &&
        deltaMs === this.stimpack.timeToBoundaryMs
      ),
    );
    if (this.choosing || this.run.status === "failed") return elapsed;
    if (this.run.status === "running")
      this.advanceWorld(Math.max(0, deltaMs) - elapsed);
    this.view.renderWall(this.run.wallHp, enemyPressureBalance.wallMaxHp);
    return deltaMs;
  }

  private applyEnemyStates(
    states: readonly EnemyState[],
    chargeBurst = true,
  ): void {
    let xp = 0;
    let hits = 0;
    let kills = 0;
    let eliteKills = 0;
    for (const entry of this.enemies) {
      const oldHp = entry.state.hp;
      entry.state = states.find((enemy) => enemy.id === entry.state.id)!;
      if (entry.state.hp < oldHp) hits++;
      if (entry.state.hp <= 0) {
        kills++;
        xp += enemyConfigs[entry.state.kind].xpOnKill;
        if (entry.state.elite) {
          this.modules.reward();
          eliteKills++;
        }
        entry.visual.destroy();
      } else this.view.renderEnemy(entry.visual, entry.state);
    }
    this.enemies = this.enemies.filter((entry) => entry.state.hp > 0);
    this.progression.gainXp(xp);
    if (chargeBurst) this.burst.credit({ hits, kills, eliteKills });
    this.renderProgression();
    if (this.choosing) this.showChoices();
    this.renderBurst();
  }

  private renderProgression(): void {
    this.view.renderProgression(
      this.progression.level,
      this.progression.xp,
      this.progression.threshold,
    );
    this.view.renderModules(this.modules.levels);
  }

  private showChoices(): void {
    const moduleOffer = this.modules.offer();
    if (moduleOffer.length) {
      this.time.paused = true;
      this.choices.showModules(moduleOffer, this.modules.levels, (id) => {
        if (this.modules.choose(id)) this.applyBuildChoice();
      });
      return;
    }
    const offered = this.progression.offer();
    if (!offered.length) {
      this.time.paused = false;
      this.choices.hide();
      if (this.evolutionNotice) {
        this.view.showEvolution(this.evolutionNotice);
        this.evolutionNotice = "";
      }
      return;
    }
    this.time.paused = true;
    this.choices.show(this.progression.level, offered, (id) => {
      if (!this.progression.choose(id)) return;
      this.applyBuildChoice();
    });
  }

  private applyBuildChoice(): void {
    for (const recipe of eligibleEvolutions(
      this.progression.ranks,
      this.modules.levels,
      this.evolutions,
    )) {
      this.evolutions.add(recipe.id);
      this.evolutionNotice = recipe.title;
    }
    this.rifle.setConfig(deriveWeaponConfig(this.progression.ranks));
    this.magic.setUpgrades(this.progression.ranks);
    this.renderProgression();
    this.showChoices();
  }

  private advanceWorld(deltaMs: number): void {
    // New enemies receive only time after their spawn boundary.
    let remaining = Math.max(0, deltaMs);
    while (remaining > 0 && this.run.status === "running") {
      const step = Math.min(remaining, this.director.timeToSpawnMs);
      for (const entry of this.enemies) {
        const config = enemyConfigs[entry.state.kind];
        const movement = advanceEnemy(entry.state, step, config);
        entry.state = movement.enemy;
        const attack = advanceWallAttack(
          entry.attackElapsedMs,
          movement.wallTimeMs,
          config,
        );
        entry.attackElapsedMs = attack.elapsedMs;
        this.run = applyWallDamage(this.run, attack.damage);
        this.view.renderEnemy(entry.visual, entry.state);
        if (this.run.status === "failed") break;
      }
      this.director.advance(step);
      this.magic.advance(step);
      remaining -= step;
      if (this.run.status === "running" && this.director.timeToSpawnMs <= 0) {
        this.spawnBatch();
      }
    }
    this.view.renderWall(this.run.wallHp, enemyPressureBalance.wallMaxHp);
  }
}
