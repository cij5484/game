import Phaser from "phaser";
import type { EnemyState } from "../enemies/enemySimulation";
import type { EnemyKind } from "../model/types";
import { laneCenterX, laneX } from "./lanes";
import { perspectiveScale } from "./perspective";
import { battlefieldLayout, readSafeArea } from "./layout";
import { attackSlotPosition } from "./crowdSpacing";
import {
  display,
  levelLabel,
  magicLabels,
  remainingLabel,
  stimLabels,
} from "../data/display";
import { evolutionRecipes } from "../data/evolutions";

// Visual layout only, in logical reference units.
const field = { left: 36, width: 648, farY: 105, wallY: 1080, enemySize: 56 };
// View/input tuning only; never used for movement, targeting priority or damage.
const combatVisual = {
  touchPadding: 10,
  minimumTouchSize: 44,
  flashMs: 75,
  marineX: 360,
  marineY: 1065,
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
  private readonly runText: Phaser.GameObjects.Text;
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
    this.hpText = text(165, 1122, "", 21);
    this.hpFill = scene.add
      .rectangle(35, 1143, 260, 10, 0x77d7a0)
      .setOrigin(0, 0.5);
    this.hud.add([
      this.hpText,
      scene.add.rectangle(165, 1143, 260, 10, 0x263e36),
      this.hpFill,
    ]);
    this.xpText = text(465, 1122, "", 21);
    this.xpFill = scene.add
      .rectangle(335, 1143, 260, 10, 0x9dc7ff)
      .setOrigin(0, 0.5);
    this.hud.add([
      this.xpText,
      scene.add.rectangle(465, 1143, 260, 10, 0x263c50),
      this.xpFill,
    ]);

    this.runText = text(654, 1131, "5:00", 25);
    this.hud.add(this.runText);
    this.stimText = text(360, 1040, "", 20);
    this.magicText = text(360, 1010, "", 16);
    this.debug.add([this.stimText, this.magicText]);
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
    masonry.fillStyle(0x304650).fillRect(0, field.wallY + 14, 720, 186);
    masonry.fillStyle(0x93a7af).fillRect(0, field.wallY + 14, 720, 10);
    masonry.fillStyle(0x1a2e38, 0.5).fillRect(18, 1108, 684, 48);
    masonry.lineStyle(2, 0x344953, 0.8);
    for (let row = 0; row < 4; row++) {
      const y = field.wallY + 24 + row * 44;
      masonry.lineBetween(0, y, 720, y);
      for (let x = (row % 2) * 45; x < 720; x += 90)
        masonry.lineBetween(x, y, x, y + 44);
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
    this.debug.add(
      text(360, 1130, "두 손가락 탭 / 마우스 좌우 동시 클릭: STIMPACK", 22),
    );
    this.debug.add(
      text(360, 1165, "빨간 테두리: 성벽 공격 · 결과창에서 RETRY", 20),
    );

    const resize = () => {
      const layout = battlefieldLayout(
        scene.scale.width,
        scene.scale.height,
        readSafeArea(),
      );
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
      display.battlefieldDescription,
    );
  }

  createEnemy(enemy: EnemyState, slowed = false): Phaser.GameObjects.Container {
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
          .text(0, -60, `◆ ${display.elite}`, {
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
    this.renderEnemy(visual, enemy, slowed);
    return visual;
  }

  renderEnemy(
    visual: Phaser.GameObjects.Container,
    enemy: EnemyState,
    slowed = false,
  ): void {
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
      `${enemy.kind[0]!.toUpperCase()} ${Math.ceil(enemy.hp)} · ${enemy.progress01.toFixed(2)}`,
    );
    (visual.getAt(0) as Phaser.GameObjects.Rectangle)
      .setFillStyle(
        enemy.burn
          ? 0xff984c
          : slowed
            ? 0xb2f7ff
            : (enemy.suppressionMs ?? 0) > 0
              ? 0x9da7ba
              : enemy.elite
                ? 0xe8bd50
                : colors[enemy.kind],
      )
      .setStrokeStyle(
        (enemy.markStacks ?? 0) > 0
          ? Math.min(7, 2 + enemy.markStacks!)
          : enemy.elite
            ? 5
            : enemy.phase === "attacking"
              ? 4
              : 0,
        (enemy.markStacks ?? 0) > 0
          ? 0xff6cce
          : enemy.elite
            ? 0xffedb5
            : 0xff665f,
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

  showShot(target: Phaser.GameObjects.Container, echo = false): void {
    const effect = this.scene.add.graphics();
    effect.lineStyle(echo ? 4 : 2, echo ? 0xd3a5ff : 0xffe69a, 0.9);
    effect.lineBetween(
      combatVisual.marineX,
      combatVisual.marineY,
      target.x,
      target.y,
    );
    effect
      .fillStyle(echo ? 0xd3a5ff : 0xfff4bc)
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
    this.stimText.setText(`${stimLabels[phase]} · ×${multiplier.toFixed(2)}`);
    this.stimText.setVisible(phase !== "normal");
    this.debugStim.setText(
      `STIM ${phase.toUpperCase()} ×${multiplier.toFixed(2)}`,
    );
    this.stimText.setColor(tint[phase.toLowerCase()] ?? "#ffffff");
  }

  renderWall(hp: number, maxHp: number): void {
    this.hpText.setText(`${display.wall} ${Math.ceil(hp)} / ${maxHp}`);
    this.hpFill.setDisplaySize(260 * (hp / maxHp), 10);
  }

  renderRun(elapsedMs: number, durationMs: number): void {
    const seconds = Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000));
    this.runText.setText(
      `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
    );
  }

  renderProgression(level: number, xp: number, threshold: number): void {
    this.xpText.setText(
      `${levelLabel(level)} · ${Math.floor(xp)}/${threshold}`,
    );
    this.xpFill.setDisplaySize(260 * Math.min(1, xp / threshold), 10);
  }

  showPrimary(
    targets: readonly Phaser.GameObjects.Container[],
    ricochetIds: readonly number[],
    hitIds: readonly number[],
    evolved = false,
    splashIds: readonly number[] = [],
    shotTargetIds: readonly number[] = [],
    criticalIds: readonly number[] = [],
    explosionIds: readonly number[] = [],
    echo = false,
  ): void {
    if (!targets.length) return;
    for (const [index, target] of targets.entries()) {
      if (index === 0 || shotTargetIds.includes(hitIds[index]!))
        this.showShot(target, echo);
    }
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
      if (
        !shotTargetIds.includes(hitIds[index]!) &&
        !splashIds.includes(hitIds[index]!)
      )
        effect.lineBetween(previous.x, previous.y, target.x, target.y);
      effect.strokeCircle(target.x, target.y, 12);
      if (splashIds.includes(hitIds[index]!))
        effect.strokeCircle(target.x, target.y, 28);
      previous = target;
    }
    for (const [index, target] of targets.entries()) {
      if (explosionIds.includes(hitIds[index]!)) {
        effect.lineStyle(4, 0xff9e5f, 0.95);
        effect.strokeCircle(target.x, target.y, 44 * target.scaleX);
        effect
          .fillStyle(0xffb75f, 0.2)
          .fillCircle(target.x, target.y, 40 * target.scaleX);
      }
      if (criticalIds.includes(hitIds[index]!)) {
        effect.lineStyle(4, 0xfff28d).strokeCircle(target.x, target.y, 18);
      }
    }
    if (criticalIds.length) {
      const criticalTarget =
        targets[hitIds.indexOf(criticalIds[0]!)] ?? targets[0]!;
      const label = this.scene.add
        .text(criticalTarget.x, criticalTarget.y - 35, display.critical, {
          fontFamily: "sans-serif",
          fontSize: "20px",
          color: "#fff28d",
        })
        .setOrigin(0.5);
      this.world.add(label);
      this.scene.time.delayedCall(220, () => label.destroy());
    }
    this.scene.time.delayedCall(180, () => effect.destroy());
  }

  // BuildBar owns the visible relic inventory; retained until scene integration.
  showImpacts(
    kind: "frost" | "lightning" | "fire" | "suppression" | "emergency",
    targets: readonly Phaser.GameObjects.Container[],
  ): void {
    if (!targets.length) return;
    const effect = this.scene.add.graphics();
    this.world.add(effect);
    effect.lineStyle(
      5,
      kind === "fire"
        ? 0xff984c
        : kind === "suppression"
          ? 0xbecbdf
          : kind === "emergency"
            ? 0x75ffc7
            : kind === "frost"
              ? 0x93eeff
              : 0xffffbd,
      0.9,
    );
    for (const target of targets.slice(0, 12)) {
      effect.strokeCircle(target.x, target.y, 70 * target.scaleX);
      if (kind === "lightning")
        effect.lineBetween(target.x - 12, target.y - 140, target.x, target.y);
    }
    this.scene.time.delayedCall(350, () => effect.destroy());
  }

  showNotice(title: string): void {
    const notice = this.scene.add
      .text(360, 580, title, {
        fontFamily: "sans-serif",
        fontSize: "26px",
        wordWrap: { width: 560 },
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

  renderMagic(frostMs: number, chainMs: number, fieldMs: number): void {
    const remaining = remainingLabel;
    this.magicText.setText(
      fieldMs > 0
        ? `○ ${display.slow} ${remaining(fieldMs)} · ${display.cooldown} ${Math.ceil(frostMs / 1000)}초 / Z ${remaining(chainMs)}`
        : `○ ${magicLabels["frost-nova"]} ${remaining(frostMs)} · Z ${magicLabels["chain-lightning"]} ${remaining(chainMs)}`,
    );
    this.magicText.setColor(fieldMs > 0 ? "#b2f7ff" : "#ffffff");
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
      for (const target of targets.slice(0, 12)) {
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
    rejected = false,
  ): void {
    this.gestureText.setText(result);
    this.gesturePath.clear().lineStyle(3, 0xeeee77, 0.8);
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      this.gesturePath.lineBetween(a.x, a.y, b.x, b.y);
    }
    if (rejected && !this.debugVisible) {
      const trail = this.scene.add
        .graphics()
        .setDepth(3)
        .lineStyle(2, 0xc0ced3, 0.35);
      for (let i = 1; i < points.length; i++)
        trail.lineBetween(
          points[i - 1]!.x,
          points[i - 1]!.y,
          points[i]!.x,
          points[i]!.y,
        );
      let fade = 0;
      this.scene.time.addEvent({
        delay: 70,
        repeat: 3,
        callback: () => {
          fade++;
          if (fade === 4) trail.destroy();
          else trail.setAlpha(1 - fade / 4);
        },
      });
    }
  }
}
