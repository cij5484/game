import Phaser from "phaser";
import type { EnemyState } from "../enemies/enemySimulation";
import type { EnemyKind } from "../model/types";
import { laneCenterX, laneX } from "./lanes";
import { perspectiveScale } from "./perspective";
import { battlefieldLayout } from "./layout";

// Visual layout only, in logical reference units.
const field = { left: 36, width: 648, farY: 105, wallY: 1180, enemySize: 56 };
// View/input tuning only; never used for movement, targeting priority or damage.
const combatVisual = {
  touchPadding: 10,
  minimumTouchSize: 44,
  flashMs: 75,
  marineX: 360,
  marineY: 1210,
};
const colors: Record<EnemyKind, number> = {
  grunt: 0x6cb2e8,
  runner: 0xffc66d,
  shield: 0xb69cff,
};

export class EnemyPressureView {
  private readonly world: Phaser.GameObjects.Container;
  private readonly hud: Phaser.GameObjects.Container;
  private readonly stimText: Phaser.GameObjects.Text;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly failure: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly debug: Phaser.GameObjects.Container;
  private readonly directorText: Phaser.GameObjects.Text;
  private readonly debugStim: Phaser.GameObjects.Text;
  private debugVisible = false;
  private readonly enemyLabels = new Set<Phaser.GameObjects.Text>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const environment = scene.add.graphics();
    this.world = scene.add.container();
    this.hud = scene.add.container().setDepth(1);
    this.debug = scene.add.container().setDepth(2).setVisible(false);
    const text = (x: number, y: number, value: string, size = 24) =>
      scene.add
        .text(x, y, value, {
          fontFamily: "sans-serif",
          fontSize: `${size}px`,
          color: "#ffffff",
        })
        .setOrigin(0.5);

    this.debug.add(text(360, 160, "MARINE · GAUSS RIFLE", 24));
    this.hpText = text(360, 28, "", 22);
    this.hpFill = scene.add
      .rectangle(60, 52, 600, 8, 0x77d7a0)
      .setOrigin(0, 0.5);
    this.hud.add([
      this.hpText,
      scene.add.rectangle(360, 52, 600, 8, 0x34443d),
      this.hpFill,
    ]);

    this.stimText = text(360, 80, "", 22).setVisible(false);
    this.hud.add(this.stimText);
    this.debugStim = text(360, 196, "", 22);
    this.directorText = text(360, 250, "", 20);
    this.directorText.setBackgroundColor("#13222edd");
    this.debug.add([this.debugStim, this.directorText]);

    for (const [lane, title] of [
      ["left", "좌"],
      ["center", "중"],
      ["right", "우"],
    ] as const) {
      const x = field.left + laneCenterX(lane, field.width);
      this.debug.add(
        scene.add.rectangle(
          x,
          (field.farY + field.wallY) / 2,
          field.width / 3 - 12,
          field.wallY - field.farY,
          0x405264,
          0.35,
        ),
      );
      this.debug.add(
        scene.add.rectangle(
          x,
          (field.farY + field.wallY) / 2,
          1,
          field.wallY - field.farY,
          0xa4bccb,
          0.3,
        ),
      );
      this.debug.add(text(x, 325, `${title} LANE`, 23));
    }
    this.debug.add(
      scene.add.rectangle(360, field.farY, field.width, 2, 0x90a4ae),
    );
    this.debug.add(text(360, field.farY + 28, "FAR", 20));
    this.world.add(
      scene.add.rectangle(360, field.wallY + 26, field.width, 30, 0x647887),
    );
    this.world.add(
      scene.add.rectangle(
        combatVisual.marineX,
        combatVisual.marineY,
        42,
        34,
        0x77d7a0,
      ),
    );
    this.debug.add(text(360, 1060, "NEAR / WALL", 24));
    this.debug.add(
      text(360, 1095, "빈 곳 탭: 자동 3점사 · 적 탭: 우선 공격", 22),
    );
    this.debug.add(text(360, 1130, "두 손가락 탭: STIMPACK", 22));
    this.debug.add(
      text(360, 1165, "빨간 테두리: 성벽 공격 · 재시작: 새로고침", 20),
    );

    this.failure = scene.add
      .container(360, 630, [
        scene.add.rectangle(0, 0, 500, 110, 0x10151c, 0.9),
        text(0, -16, "RUN FAILED", 36),
        text(0, 26, "성벽 파괴 · 새로고침으로 재시작", 20),
      ])
      .setVisible(false);
    this.hud.add(this.failure);

    const resize = () => {
      const layout = battlefieldLayout(scene.scale.width, scene.scale.height);
      // Paint the entire viewport; fitted gameplay never creates letterboxing.
      const width = scene.scale.width;
      const height = scene.scale.height;
      const horizon = layout.y + field.farY * layout.scale;
      const wall = layout.y + (field.wallY + 40) * layout.scale;
      environment.clear();
      environment.fillGradientStyle(0x172b3b, 0x172b3b, 0x42534b, 0x42534b);
      environment.fillRect(0, 0, width, height);
      environment.fillStyle(0x243e49, 0.7).fillRect(0, 0, width, horizon);
      environment.lineStyle(1, 0x789689, 0.2);
      for (const fraction of [0, 1 / 3, 2 / 3, 1]) {
        const nearX =
          layout.x + (field.left + field.width * fraction) * layout.scale;
        environment.lineBetween(
          width / 2 + (nearX - width / 2) * 0.35,
          0,
          nearX,
          wall,
        );
      }
      environment.fillStyle(0x233a36).fillRect(0, wall, width, height - wall);
      this.world.setPosition(layout.x, layout.y).setScale(layout.scale);
      this.hud.setPosition(layout.x, 0).setScale(layout.scale);
      this.debug.setPosition(layout.x, layout.y).setScale(layout.scale);
    };
    resize();
    if (import.meta.env.DEV) {
      const toggle = (event: KeyboardEvent) => {
        if (event.code !== "KeyD" || event.repeat) return;
        this.debugVisible = !this.debugVisible;
        this.debug.setVisible(this.debugVisible);
        for (const label of this.enemyLabels)
          label.setVisible(this.debugVisible);
      };
      window.addEventListener("keydown", toggle);
      scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
        window.removeEventListener("keydown", toggle),
      );
    }
    scene.scale.on(Phaser.Scale.Events.RESIZE, resize);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      scene.scale.off(Phaser.Scale.Events.RESIZE, resize),
    );
    // Separate HUD root leaves room for future safe-area/camera handling.
    scene.game.canvas.setAttribute(
      "aria-label",
      "세로 전장: 빈 공간 탭 자동 3점사, 적 탭 우선 공격, 두 손가락 탭 Stimpack",
    );
  }

  createEnemy(enemy: EnemyState): Phaser.GameObjects.Container {
    const shape = this.scene.add.rectangle(
      0,
      0,
      field.enemySize,
      field.enemySize,
      colors[enemy.kind],
    );
    const label = this.scene.add
      .text(0, -40, enemy.kind[0]!.toUpperCase(), {
        fontFamily: "sans-serif",
        fontSize: "23px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    const visual = this.scene.add.container(0, 0, [shape, label]);
    label.setVisible(this.debugVisible);
    this.enemyLabels.add(label);
    visual.once("destroy", () => this.enemyLabels.delete(label));
    this.world.add(visual);
    this.renderEnemy(visual, enemy);
    return visual;
  }

  renderEnemy(visual: Phaser.GameObjects.Container, enemy: EnemyState): void {
    const x = field.left + laneX(enemy.lane, field.width, enemy.offset01);
    const y = field.farY + (field.wallY - field.farY) * enemy.progress01;
    visual.setPosition(x, y).setScale(perspectiveScale(enemy.progress01));
    (visual.getAt(1) as Phaser.GameObjects.Text).setText(
      `${enemy.kind[0]!.toUpperCase()} ${enemy.hp} · ${enemy.progress01.toFixed(2)}`,
    );
    (visual.getAt(0) as Phaser.GameObjects.Rectangle).setStrokeStyle(
      enemy.phase === "attacking" ? 4 : 0,
      0xff665f,
    );
  }

  pickEnemy(
    x: number,
    y: number,
    enemies: readonly {
      state: EnemyState;
      visual: Phaser.GameObjects.Container;
    }[],
  ): number | null {
    let closest: number | null = null;
    let distance = Infinity;
    for (const { state, visual } of enemies) {
      if (state.hp <= 0) continue;
      const dx = x - (this.world.x + visual.x * this.world.scaleX);
      const dy = y - (this.world.y + visual.y * this.world.scaleY);
      const radius = Math.max(
        combatVisual.minimumTouchSize / 2,
        (field.enemySize * visual.scaleX * this.world.scaleX) / 2 +
          combatVisual.touchPadding,
      );
      const squared = dx * dx + dy * dy;
      if (
        Math.abs(dx) <= radius &&
        Math.abs(dy) <= radius &&
        squared < distance
      ) {
        closest = state.id;
        distance = squared;
      }
    }
    return closest;
  }

  showShot(target: Phaser.GameObjects.Container): void {
    const effect = this.scene.add.graphics();
    effect.lineStyle(2, 0xffe69a, 0.9);
    effect.lineBetween(
      combatVisual.marineX,
      combatVisual.marineY,
      target.x,
      target.y,
    );
    effect
      .fillStyle(0xfff4bc)
      .fillCircle(combatVisual.marineX, combatVisual.marineY, 9);
    effect.fillCircle(target.x, target.y, 6);
    this.world.add(effect);
    this.scene.time.delayedCall(combatVisual.flashMs, () => effect.destroy());
  }

  renderStimpack(phase: string, multiplier: number): void {
    const tint: Record<string, string> = {
      normal: "#ffffff",
      boost: "#77ffb0",
      crash: "#ff796f",
      recovery: "#ffda82",
    };
    this.stimText.setText(`${phase.toUpperCase()} · ×${multiplier.toFixed(2)}`);
    this.stimText.setVisible(phase !== "normal");
    this.debugStim.setText(
      `STIM ${phase.toUpperCase()} ×${multiplier.toFixed(2)}`,
    );
    this.stimText.setColor(tint[phase.toLowerCase()] ?? "#ffffff");
  }

  renderWall(hp: number, maxHp: number): void {
    this.hpText.setText(`WALL HP ${hp} / ${maxHp}`);
    this.hpFill.setDisplaySize(600 * (hp / maxHp), 8);
    this.failure.setVisible(hp <= 0);
  }

  renderDirector(status: string): void {
    this.directorText.setText(status);
  }
}
