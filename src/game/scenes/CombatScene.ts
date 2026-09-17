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
import { bindTapInput } from "../input/tapInput";
import { resolveAttackTarget } from "../combat/targeting";
import { applyPrimaryDamage } from "../combat/damage";
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

  create(): void {
    this.run = createRunState(enemyPressureBalance.wallMaxHp);
    this.enemies = [];
    this.director = new SpawnDirector();
    this.nextEnemyId = 0;
    this.rifle = new GaussRifle(gaussRifleBalance);
    this.stimpack = new Stimpack(stimpackBalance);
    this.view = new EnemyPressureView(this);
    this.spawnBatch();
    this.view.renderWall(this.run.wallHp, enemyPressureBalance.wallMaxHp);
    const unbindInput = bindTapInput(this.game.canvas, (kind, x, y) => {
      if (this.run.status === "failed") return;
      if (kind === "secondary") this.stimpack.activate();
      else if (this.stimpack.canAttack)
        this.rifle.request({
          manualTargetId: this.view.pickEnemy(x, y, this.enemies),
        });
      this.update(0, 0);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unbindInput);
    this.view.renderStimpack(
      this.stimpack.phase,
      this.stimpack.attackSpeedMultiplier,
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
    if (this.run.status === "failed") return;
    let remaining = Math.max(0, deltaMs);
    do {
      const step = Math.min(remaining, this.stimpack.timeToBoundaryMs);
      if (this.stimpack.canAttack) this.advanceCombat(step);
      else this.advanceWorld(step);
      this.stimpack.advance(step);
      remaining -= step;
    } while (remaining > 0 && this.run.status === "running");
    this.view.renderStimpack(
      this.stimpack.phase,
      this.stimpack.attackSpeedMultiplier,
    );
    this.view.renderWall(this.run.wallHp, enemyPressureBalance.wallMaxHp);
    const settings = this.director.settings;
    this.view.renderDirector(
      `DIRECTOR ${Math.floor(this.director.elapsedMs / 1000)}s · ${settings.phase} · stage ${settings.stage + 1}\nACTIVE ${this.enemies.length}/${settings.maxActiveEnemies} · batch ${settings.batchSize} / ${settings.spawnIntervalMs}ms`,
    );
  }

  private advanceCombat(deltaMs: number): void {
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
          const entry = this.enemies.find(
            (entry) => entry.state.id === target.id,
          )!;
          this.view.showShot(entry.visual);
          entry.state = applyPrimaryDamage(
            target,
            gaussRifleBalance.damagePerRound *
              marineConfig.baseStats.damageMultiplier,
          );
          if (entry.state.hp <= 0) {
            entry.visual.destroy();
            this.enemies = this.enemies.filter((enemy) => enemy !== entry);
          } else this.view.renderEnemy(entry.visual, entry.state);
        }
      },
      !(
        this.stimpack.phase === "boost" &&
        deltaMs === this.stimpack.timeToBoundaryMs
      ),
    );
    if (this.run.status === "running")
      this.advanceWorld(Math.max(0, deltaMs) - elapsed);
    this.view.renderWall(this.run.wallHp, enemyPressureBalance.wallMaxHp);
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
      remaining -= step;
      if (this.run.status === "running" && this.director.timeToSpawnMs <= 0) {
        this.spawnBatch();
      }
    }
    this.view.renderWall(this.run.wallHp, enemyPressureBalance.wallMaxHp);
  }
}
