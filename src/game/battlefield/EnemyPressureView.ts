import Phaser from "phaser";
import type { EnemyState } from "../enemies/enemySimulation";
import type { EnemyKind } from "../model/types";
import { laneCenterX, laneX } from "./lanes";
import { perspectiveScale } from "./perspective";
import { battlefieldLayout } from "./layout";

// Visual layout only, in logical reference units.
const field = { left: 80, width: 1120, farY: 160, wallY: 550, enemySize: 48 };
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

    this.hud.add(text(640, 32, "ENEMY PRESSURE · 공용 성벽 방어"));
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
      text(640, 692, "플레이어 공격 없음 · 다시 시작: 새로고침", 18),
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
      "적 이동과 공용 성벽 HP를 표시하는 전장",
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
    (visual.getAt(0) as Phaser.GameObjects.Rectangle).setStrokeStyle(
      enemy.phase === "attacking" ? 4 : 0,
      0xff665f,
    );
  }

  renderWall(hp: number, maxHp: number): void {
    this.hpText.setText(`WALL HP ${hp} / ${maxHp}`);
    this.hpFill.setDisplaySize(480 * (hp / maxHp), 12);
    this.failure.setVisible(hp <= 0);
  }
}
