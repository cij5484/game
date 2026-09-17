import Phaser from "phaser";
import type { EnemyState } from "../enemies/enemySimulation";
import type { EnemyKind } from "../model/types";
import { laneCenterX, laneX } from "./lanes";
import { perspectiveScale } from "./perspective";
import { battlefieldLayout } from "./layout";

// Visual layout only, in logical reference units.
const field = { left: 36, width: 648, farY: 250, wallY: 1030, enemySize: 56 };
// View/input tuning only; never used for movement, targeting priority or damage.
const combatVisual = {
  touchPadding: 10,
  minimumTouchSize: 44,
  flashMs: 75,
  marineX: 360,
  marineY: 1060,
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

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const environment = scene.add.graphics();
    this.world = scene.add.container();
    this.hud = scene.add.container().setDepth(1);
    const text = (x: number, y: number, value: string, size = 24) =>
      scene.add
        .text(x, y, value, {
          fontFamily: "sans-serif",
          fontSize: `${size}px`,
          color: "#ffffff",
        })
        .setOrigin(0.5);

    this.hud.add(text(360, 40, "MARINE · GAUSS RIFLE", 28));
    this.hpText = text(360, 86, "", 28);
    this.hpFill = scene.add
      .rectangle(120, 120, 480, 12, 0x77d7a0)
      .setOrigin(0, 0.5);
    this.hud.add([
      this.hpText,
      scene.add.rectangle(360, 120, 480, 12, 0x34443d),
      this.hpFill,
    ]);

    this.stimText = text(360, 170, "NORMAL · ×1.00", 28);
    this.hud.add(this.stimText);

    for (const [lane, title] of [
      ["left", "좌"],
      ["center", "중"],
      ["right", "우"],
    ] as const) {
      const x = field.left + laneCenterX(lane, field.width);
      this.world.add(
        scene.add.rectangle(
          x,
          (field.farY + field.wallY) / 2,
          field.width / 3 - 12,
          field.wallY - field.farY,
          0x405264,
          0.35,
        ),
      );
      this.world.add(
        scene.add.rectangle(
          x,
          (field.farY + field.wallY) / 2,
          1,
          field.wallY - field.farY,
          0xa4bccb,
          0.3,
        ),
      );
      this.world.add(text(x, 214, `${title} LANE`, 23));
    }
    this.world.add(
      scene.add.rectangle(360, field.farY, field.width, 2, 0x90a4ae),
    );
    this.world.add(text(360, field.farY + 28, "FAR", 20));
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
    this.hud.add(text(360, 1115, "NEAR / WALL", 26));
    this.hud.add(text(360, 1155, "빈 곳 탭: 자동 3점사 · 적 탭: 우선 공격", 24));
    this.hud.add(text(360, 1195, "두 손가락 탭: STIMPACK", 24));
    this.hud.add(text(360, 1237, "빨간 테두리: 성벽 공격 · 재시작: 새로고침", 21));

    this.failure = scene.add
      .container(360, 630, [
        scene.add.rectangle(0, 0, 660, 170, 0x10151c, 0.96),
        text(0, -22, "RUN FAILED", 52),
        text(0, 38, "성벽 파괴 · 시뮬레이션 정지", 24),
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
        const nearX = layout.x + (field.left + field.width * fraction) * layout.scale;
        environment.lineBetween(width / 2 + (nearX - width / 2) * 0.35, 0, nearX, wall);
      }
      environment.fillStyle(0x233a36).fillRect(0, wall, width, height - wall);
      this.world.setPosition(layout.x, layout.y).setScale(layout.scale);
      this.hud.setPosition(layout.x, layout.y).setScale(layout.scale);
    };
    resize();
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
    this.world.add(visual);
    this.renderEnemy(visual, enemy);
    return visual;
  }

  renderEnemy(visual: Phaser.GameObjects.Container, enemy: EnemyState): void {
    const x = field.left + laneX(enemy.lane, field.width, enemy.offset01);
    const y = field.farY + (field.wallY - field.farY) * enemy.progress01;
    visual.setPosition(x, y).setScale(perspectiveScale(enemy.progress01));
    (visual.getAt(1) as Phaser.GameObjects.Text).setText(
      `${enemy.kind[0]!.toUpperCase()} ${enemy.hp}`,
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
      normal: "#ffffff", boost: "#77ffb0", crash: "#ff796f", recovery: "#ffda82",
    };
    this.stimText.setText(`${phase.toUpperCase()} · ×${multiplier.toFixed(2)}`);
    this.stimText.setColor(tint[phase.toLowerCase()] ?? "#ffffff");
  }

  renderWall(hp: number, maxHp: number): void {
    this.hpText.setText(`WALL HP ${hp} / ${maxHp}`);
    this.hpFill.setDisplaySize(480 * (hp / maxHp), 12);
    this.failure.setVisible(hp <= 0);
  }
}
