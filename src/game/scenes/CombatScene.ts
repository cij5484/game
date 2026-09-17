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
import { enemyConfigs } from "../data/enemies";
import { createPrototypeEnemy } from "../enemies/enemyFactory";
import { advanceEnemy } from "../enemies/enemySimulation";
import type { EnemyState } from "../enemies/enemySimulation";
import { advanceWallAttack } from "../enemies/wallAttack";
import { applyWallDamage, createRunState } from "../model/runState";

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
  private get choosing(): boolean {
    return this.progression.pendingChoices > 0;
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
    this.choices = new LevelUpView();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.choices.destroy(),
    );
    this.view = new EnemyPressureView(this);
    this.spawnBatch();
    this.view.renderWall(this.run.wallHp, enemyPressureBalance.wallMaxHp);
    const unbindInput = bindTapInput(
      this.game.canvas,
      (kind, x, y) => {
        if (this.run.status === "failed" || this.choosing) return;
        if (kind === "secondary") this.stimpack.activate();
        else if (this.stimpack.canAttack)
          this.rifle.request({
            manualTargetId: this.view.pickEnemy(x, y, this.enemies),
          });
        this.update(0, 0);
      },
      (points, displayPoints) => {
        if (this.run.status === "failed" || this.choosing) return;
        const gesture = recognizeGesture(points);
        this.view.showGesture(
          displayPoints,
          `${gesture.kind} ${gesture.confidence.toFixed(2)}`,
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
  }

  private spawnBatch(): void {
    for (const spawn of this.director.spawn(this.enemies.length)) {
      const state = {
        ...createPrototypeEnemy(
          spawn.kind,
          spawn.lane,
          this.nextEnemyId++,
          spawn.offset01,
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
    let remaining = Math.max(0, deltaMs);
    do {
      const step = Math.min(remaining, this.stimpack.timeToBoundaryMs);
      let consumed = step;
      if (this.stimpack.canAttack) consumed = this.advanceCombat(step);
      else this.advanceWorld(step);
      this.stimpack.advance(consumed);
      remaining -= consumed;
    } while (remaining > 0 && this.run.status === "running" && !this.choosing);
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
          );
          this.view.showPrimary(
            result.hitIds.map(
              (id) =>
                this.enemies.find((entry) => entry.state.id === id)!.visual,
            ),
            result.ricochetIds,
            result.hitIds,
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

  private applyEnemyStates(states: readonly EnemyState[]): void {
    let xp = 0;
    for (const entry of this.enemies) {
      entry.state = states.find((enemy) => enemy.id === entry.state.id)!;
      if (entry.state.hp <= 0) {
        xp += enemyConfigs[entry.state.kind].xpOnKill;
        entry.visual.destroy();
      } else this.view.renderEnemy(entry.visual, entry.state);
    }
    this.enemies = this.enemies.filter((entry) => entry.state.hp > 0);
    this.progression.gainXp(xp);
    this.renderProgression();
    if (this.choosing) this.showChoices();
  }

  private renderProgression(): void {
    this.view.renderProgression(
      this.progression.level,
      this.progression.xp,
      this.progression.threshold,
    );
  }

  private showChoices(): void {
    const offered = this.progression.offer();
    if (!offered.length) {
      this.time.paused = false;
      this.choices.hide();
      return;
    }
    this.time.paused = true;
    this.choices.show(this.progression.level, offered, (id) => {
      if (!this.progression.choose(id)) return;
      this.rifle.setConfig(deriveWeaponConfig(this.progression.ranks));
      this.magic.setUpgrades(this.progression.ranks);
      if (this.choosing) this.showChoices();
      else {
        this.choices.hide();
        this.time.paused = false;
      }
      this.renderProgression();
    });
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
