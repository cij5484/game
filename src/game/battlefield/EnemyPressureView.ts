import Phaser from "phaser";
import type { EnemyState } from "../enemies/enemySimulation";
import type { EnemyKind } from "../model/types";
import { laneCenterX, laneX } from "./lanes";
import { perspectiveScale } from "./perspective";
import { battlefieldLayout } from "./layout";

// Visual layout only, in logical reference units.
const field = { left: 80, width: 1120, farY: 160, wallY: 550, enemySize: 48 };
// View/input tuning only; never used for movement, targeting priority or damage.
const combatVisual = {
  touchPadding: 10,
  minimumTouchSize: 44,
  flashMs: 75,
  marineX: 640,
  marineY: 578,
};
const colors: Record<EnemyKind, number> = {
  grunt: 0x6cb2e8,
  runner: 0xffc66d,
  shield: 0xb69cff,
};

export class EnemyPressureView {
  private readonly world: Phaser.GameObjects.Container;
  private readonly hud: Phaser.GameObjects.Container;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly failure: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
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

    this.hud.add(text(640, 32, "MARINE · GAUSS RIFLE"));
    this.hpText = text(640, 69, "");
    this.hpFill = scene.add
      .rectangle(400, 102, 480, 12, 0x77d7a0)
      .setOrigin(0, 0.5);
    this.hud.add([
      this.hpText,
      scene.add.rectangle(640, 102, 480, 12, 0x34443d),
      this.hpFill,
    ]);

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
      this.world.add(text(x, 130, `${title} LANE`, 20));
    }
    this.world.add(
      scene.add.rectangle(640, field.farY, field.width, 2, 0x90a4ae),
    );
    this.world.add(text(42, field.farY, "FAR", 18));
    this.world.add(
      scene.add.rectangle(640, field.wallY + 26, field.width, 30, 0x647887),
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
    this.hud.add(text(640, 615, "NEAR / WALL · 도착 후 주기적으로 공격", 22));
    this.hud.add(
      text(
        640,
        656,
        "G: Grunt · R: Runner · S: Shield | 빨간 테두리: 성벽 공격 중",
        22,
      ),
    );
    this.hud.add(
      text(
        640,
        692,
        "빈 공간 탭: 자동 3점사 · 적 탭: 해당 적 우선 · 다시 시작: 새로고침",
        18,
      ),
    );

    this.failure = scene.add
      .container(640, 345, [
        scene.add.rectangle(0, 0, 760, 170, 0x10151c, 0.96),
        text(0, -22, "RUN FAILED", 52),
        text(0, 38, "성벽 파괴 · 시뮬레이션 정지", 24),
      ])
      .setVisible(false);
    this.hud.add(this.failure);

    const resize = () => {
      const layout = battlefieldLayout(scene.scale.width, scene.scale.height);
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
      "빈 공간 탭으로 자동 3점사, 적 탭으로 해당 적 우선 공격하는 전장",
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

  renderWall(hp: number, maxHp: number): void {
    this.hpText.setText(`WALL HP ${hp} / ${maxHp}`);
    this.hpFill.setDisplaySize(480 * (hp / maxHp), 12);
    this.failure.setVisible(hp <= 0);
  }
}
