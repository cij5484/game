import Phaser from "phaser";
import type { EnemyState } from "../enemies/enemySimulation";
import type { EnemyKind } from "../model/types";
import { laneCenterX, laneX } from "./lanes";
import { perspectiveScale } from "./perspective";
import { battlefieldLayout } from "./layout";
import { attackSlotPosition } from "./crowdSpacing";
import { modules, type ModuleLevels } from "../data/modules";
import { evolutionRecipes } from "../data/evolutions";

// Visual layout only, in logical reference units.
const field = { left: 36, width: 648, farY: 105, wallY: 1160, enemySize: 56 };
// View/input tuning only; never used for movement, targeting priority or damage.
const combatVisual = {
  touchPadding: 10,
  minimumTouchSize: 44,
  flashMs: 75,
  marineX: 360,
  marineY: 1145,
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
  private readonly xpText: Phaser.GameObjects.Text;
  private readonly xpFill: Phaser.GameObjects.Rectangle;
  private readonly moduleText: Phaser.GameObjects.Text;
  private readonly failure: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly debug: Phaser.GameObjects.Container;
  private readonly directorText: Phaser.GameObjects.Text;
  private readonly debugStim: Phaser.GameObjects.Text;
  private debugVisible = false;
  private readonly enemyLabels = new Set<Phaser.GameObjects.Text>();
  private readonly attackSlots = new Map<
    number,
    { lane: EnemyState["lane"]; slot: number }
  >();
  private readonly magicText: Phaser.GameObjects.Text;
  private readonly gesturePath: Phaser.GameObjects.Graphics;
  private readonly gestureText: Phaser.GameObjects.Text;
  private farY = field.farY;

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
    this.hpText = text(135, 1215, "", 18);
    this.hpFill = scene.add
      .rectangle(24, 1232, 210, 7, 0x77d7a0)
      .setOrigin(0, 0.5);
    this.hud.add([
      this.hpText,
      scene.add.rectangle(129, 1232, 210, 7, 0x34443d),
      this.hpFill,
    ]);
    this.xpText = text(365, 1215, "", 18);
    this.xpFill = scene.add
      .rectangle(250, 1232, 220, 7, 0x9dc7ff)
      .setOrigin(0, 0.5);
    this.hud.add([
      this.xpText,
      scene.add.rectangle(360, 1232, 220, 7, 0x263c50),
      this.xpFill,
    ]);

    this.moduleText = text(250, 1189, "", 18);
    this.hud.add(this.moduleText);
    this.stimText = text(360, 1105, "", 20).setVisible(false);
    this.hud.add(this.stimText);
    this.magicText = text(250, 1258, "", 18);
    this.hud.add(this.magicText);
    this.gesturePath = scene.add.graphics().setDepth(3).setVisible(false);
    this.gestureText = text(360, 290, "", 18);
    this.debug.add(this.gestureText);
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
    const farGuide = scene.add.rectangle(
      360,
      field.farY,
      field.width,
      2,
      0x90a4ae,
    );
    const farLabel = text(360, field.farY + 28, "FAR", 20);
    this.debug.add([farGuide, farLabel]);
    const masonry = scene.add.graphics();
    masonry.fillStyle(0x5c727e).fillRect(0, field.wallY + 14, 720, 106);
    masonry.fillStyle(0x93a7af).fillRect(0, field.wallY + 14, 720, 8);
    masonry.lineStyle(2, 0x344953, 0.8);
    for (let row = 0; row < 3; row++) {
      const y = field.wallY + 22 + row * 28;
      masonry.lineBetween(0, y, 720, y);
      for (let x = (row % 2) * 45; x < 720; x += 90)
        masonry.lineBetween(x, y, x, y + 28);
    }
    this.world.add(masonry);
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
      this.farY = 28 - layout.y / layout.scale;
      farGuide.setY(this.farY);
      farLabel.setY(this.farY + 28);
      const wall = layout.y + (field.wallY + 40) * layout.scale;
      environment.clear();
      environment.fillGradientStyle(0x172b3b, 0x172b3b, 0x42534b, 0x42534b);
      environment.fillRect(0, 0, width, height);
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
      this.hud.setPosition(layout.x, layout.y).setScale(layout.scale);
      this.debug.setPosition(layout.x, layout.y).setScale(layout.scale);
    };
    resize();
    if (import.meta.env.DEV) {
      const toggle = (event: KeyboardEvent) => {
        if (event.code !== "KeyD" || event.repeat) return;
        this.debugVisible = !this.debugVisible;
        this.debug.setVisible(this.debugVisible);
        this.gesturePath.setVisible(this.debugVisible);
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
    if (enemy.elite) {
      visual.add(
        this.scene.add
          .text(0, -60, "◆ ELITE", {
            fontFamily: "sans-serif",
            fontSize: "24px",
            color: "#ffe18b",
          })
          .setOrigin(0.5),
      );
    }
    label.setVisible(this.debugVisible);
    this.enemyLabels.add(label);
    visual.once("destroy", () => {
      this.enemyLabels.delete(label);
      this.attackSlots.delete(enemy.id);
    });
    this.world.add(visual);
    this.renderEnemy(visual, enemy);
    return visual;
  }

  renderEnemy(visual: Phaser.GameObjects.Container, enemy: EnemyState): void {
    let x = field.left + laneX(enemy.lane, field.width, enemy.offset01);
    let y = this.farY + (field.wallY - this.farY) * enemy.progress01;
    if (enemy.phase === "attacking") {
      if (!this.attackSlots.has(enemy.id)) {
        const occupied = new Set(
          [...this.attackSlots.values()]
            .filter((entry) => entry.lane === enemy.lane)
            .map((entry) => entry.slot),
        );
        let slot = 0;
        while (occupied.has(slot)) slot++;
        this.attackSlots.set(enemy.id, { lane: enemy.lane, slot });
      }
      const offset = attackSlotPosition(
        this.attackSlots.get(enemy.id)!.slot,
        field.width / 3,
      );
      x = field.left + laneCenterX(enemy.lane, field.width) + offset.x;
      y = field.wallY + offset.y;
    }
    visual
      .setPosition(x, y)
      .setScale(perspectiveScale(enemy.progress01) * (enemy.elite ? 1.15 : 1));
    (visual.getAt(1) as Phaser.GameObjects.Text).setText(
      `${enemy.kind[0]!.toUpperCase()} ${enemy.hp} · ${enemy.progress01.toFixed(2)}`,
    );
    (visual.getAt(0) as Phaser.GameObjects.Rectangle)
      .setFillStyle(
        enemy.frozenMs > 0
          ? 0xb2f7ff
          : enemy.elite
            ? 0xe8bd50
            : colors[enemy.kind],
      )
      .setStrokeStyle(
        enemy.elite ? 5 : enemy.phase === "attacking" ? 4 : 0,
        enemy.elite ? 0xffedb5 : 0xff665f,
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
    this.hpText.setText(`HP ${hp} / ${maxHp}`);
    this.hpFill.setDisplaySize(210 * (hp / maxHp), 7);
    this.failure.setVisible(hp <= 0);
  }

  renderProgression(level: number, xp: number, threshold: number): void {
    this.xpText.setText(`Lv.${level} · XP ${xp}/${threshold}`);
    this.xpFill.setDisplaySize(220 * Math.min(1, xp / threshold), 7);
  }

  showPrimary(
    targets: readonly Phaser.GameObjects.Container[],
    ricochetIds: readonly number[],
    hitIds: readonly number[],
    evolved = false,
    splashIds: readonly number[] = [],
  ): void {
    if (!targets.length) return;
    this.showShot(targets[0]!);
    if (targets.length < 2 && !evolved) return;
    const effect = this.scene.add.graphics();
    this.world.add(effect);
    const evolution = evolutionRecipes[0]!;
    if (evolved) {
      effect.lineStyle(
        evolution.effects.tracerWidth,
        evolution.effects.tracerColor,
        0.9,
      );
      effect.lineBetween(
        combatVisual.marineX,
        combatVisual.marineY,
        targets[0]!.x,
        targets[0]!.y,
      );
    }
    let previous = targets[0]!;
    for (let index = 1; index < targets.length; index++) {
      const target = targets[index]!;
      effect.lineStyle(
        evolved ? evolution.effects.tracerWidth : 3,
        ricochetIds.includes(hitIds[index]!) ? 0xffab6b : 0x85eaff,
      );
      effect.lineBetween(previous.x, previous.y, target.x, target.y);
      effect.strokeCircle(target.x, target.y, 12);
      if (splashIds.includes(hitIds[index]!))
        effect.strokeCircle(target.x, target.y, 28);
      previous = target;
    }
    this.scene.time.delayedCall(120, () => effect.destroy());
  }

  renderModules(levels: ModuleLevels): void {
    this.moduleText.setText(
      Object.entries(levels)
        .map(
          ([id, level]) =>
            `${modules[id as keyof typeof modules].shortLabel} Lv${level}`,
        )
        .join("  ·  "),
    );
  }

  showEvolution(title: string): void {
    const notice = this.scene.add
      .text(360, 580, `EVOLUTION\n${title}`, {
        fontFamily: "sans-serif",
        fontSize: "38px",
        color: "#b9ffff",
        align: "center",
        backgroundColor: "#162b36dd",
        padding: { x: 20, y: 14 },
      })
      .setOrigin(0.5);
    this.hud.add(notice);
    this.scene.time.delayedCall(2200, () => notice.destroy());
  }

  renderDirector(status: string): void {
    this.directorText.setText(status);
  }

  renderMagic(frostMs: number, chainMs: number): void {
    const remaining = (ms: number) =>
      ms > 0 ? `${(ms / 1000).toFixed(1)}s` : "Ready";
    this.magicText.setText(
      `○ FROST ${remaining(frostMs)}  ·  Z CHAIN ${remaining(chainMs)}`,
    );
  }

  showMagic(
    kind: "frost-nova" | "chain-lightning",
    targets: readonly Phaser.GameObjects.Container[],
  ): void {
    const effect = this.scene.add.graphics();
    this.world.add(effect);
    if (kind === "frost-nova") {
      effect.lineStyle(4, 0xb2f7ff, 0.9);
      for (const target of targets)
        effect.strokeCircle(target.x, target.y, 42 * target.scaleX);
    } else {
      effect.lineStyle(4, 0xe0c3ff, 1);
      let previous = { x: combatVisual.marineX, y: combatVisual.marineY };
      for (const target of targets) {
        const midX = (previous.x + target.x) / 2 + 14;
        const midY = (previous.y + target.y) / 2;
        effect.lineBetween(previous.x, previous.y, midX, midY);
        effect.lineBetween(midX, midY, target.x, target.y);
        previous = target;
      }
    }
    this.scene.time.delayedCall(300, () => effect.destroy());
  }

  showBarrage(targets: readonly Phaser.GameObjects.Container[]): void {
    // Snapshot positions before damage removes the sprites.
    const points = targets.map((target) => ({ x: target.x, y: target.y }));
    const effect = this.scene.add.graphics();
    this.world.add(effect);
    let pulse = 0;
    const draw = () => {
      effect.clear().lineStyle(4, 0xffe7a0, 0.85);
      for (const [index, point] of points.entries()) {
        if (index % 3 !== pulse % 3) continue;
        effect.lineBetween(
          combatVisual.marineX,
          combatVisual.marineY,
          point.x,
          point.y,
        );
        effect.strokeCircle(point.x, point.y, 20 + pulse * 3);
      }
      effect
        .fillStyle(0xffffff)
        .fillCircle(combatVisual.marineX, combatVisual.marineY, 16);
      pulse++;
    };
    draw();
    this.scene.time.addEvent({ delay: 80, repeat: 5, callback: draw });
    this.scene.time.delayedCall(600, () => effect.destroy());
  }

  showGesture(
    points: readonly { x: number; y: number }[],
    result: string,
  ): void {
    this.gestureText.setText(result);
    this.gesturePath.clear().lineStyle(3, 0xeeee77, 0.8);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      this.gesturePath.lineBetween(a.x, a.y, b.x, b.y);
    }
  }
}
