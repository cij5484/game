import type { SynergyVisual } from "../combat/prototypeSynergies";
import { combatGeometry } from "./combatGeometry";
import type { SpecialVisual, SpecialEffect } from "../combat/specialWeapons";
import Phaser from "phaser";
import type { EnemyState } from "../enemies/enemySimulation";
import type { EnemyKind } from "../model/types";
import { laneCenterX, laneX } from "./lanes";
import { perspectiveScale } from "./perspective";
import {
  battlefieldLayout,
  battlefieldPoint,
  containsPoint,
  readSafeArea,
} from "./layout";
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
const field = { left: 36, width: 648, farY: 0, wallY: 900, enemySize: 56 };
// View/input tuning only; never used for movement, targeting priority or damage.
const combatVisual = {
  touchPadding: 10,
  minimumTouchSize: 44,
  flashMs: 75,
  marineX: 360,
};
const colors: Record<EnemyKind, number> = {
  grunt: 0x6cb2e8,
  runner: 0xffc66d,
  shield: 0xb69cff,
};

export class EnemyPressureView {
  private readonly world: Phaser.GameObjects.Container;
  private readonly highrollGraphics: Phaser.GameObjects.Graphics;
  private readonly reinforcement: Phaser.GameObjects.Rectangle;
  private readonly specialGraphics: Phaser.GameObjects.Graphics;
  private readonly hud: Phaser.GameObjects.Container;
  private readonly header: Phaser.GameObjects.Container;
  private layout!: ReturnType<typeof battlefieldLayout>;
  private wallY = 900;
  private marineY = 922;
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
  private focusId: number | null = null;

  setFocus(id: number | null): void {
    this.focusId = id;
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const environment = scene.add.graphics();
    this.world = scene.add.container();
    this.specialGraphics = scene.add.graphics();
    this.world.add(this.specialGraphics);
    this.highrollGraphics = scene.add.graphics();
    this.world.add(this.highrollGraphics);
    this.hud = scene.add.container().setDepth(1);
    this.header = scene.add.container().setDepth(1);
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
    this.hpText = text(360, 20, "", 23);
    this.hpFill = scene.add
      .rectangle(35, 42, 650, 8, 0x77d7a0)
      .setOrigin(0, 0.5);
    this.hud.add([
      this.hpText,
      scene.add.rectangle(360, 42, 650, 8, 0x263e36),
      this.hpFill,
    ]);
    this.xpText = text(180, 25, "", 23);
    this.xpFill = scene.add
      .rectangle(35, 48, 290, 8, 0x9dc7ff)
      .setOrigin(0, 0.5);
    this.header.add([
      this.xpText,
      scene.add.rectangle(180, 48, 290, 8, 0x263c50),
      this.xpFill,
    ]);

    this.runText = text(450, 25, "20:00", 27);
    this.header.add(this.runText);
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

    const laneGuides: Phaser.GameObjects.Rectangle[] = [];
    for (const [lane, title] of [
      ["left", "좌"],
      ["center", "중"],
      ["right", "우"],
    ] as const) {
      const x = field.left + laneCenterX(lane, field.width);
      laneGuides.push(
        scene.add.rectangle(
          x,
          (field.farY + field.wallY) / 2,
          field.width / 3 - 12,
          field.wallY - field.farY,
          0x405264,
          0.35,
        ),
      );
      laneGuides.push(
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
    this.debug.add(laneGuides);
    const farGuide = scene.add.rectangle(
      360,
      field.farY,
      field.width,
      2,
      0x90a4ae,
    );
    const farLabel = text(360, field.farY + 28, "FAR", 20);
    this.debug.add([farGuide, farLabel]);
    const marine = scene.add.rectangle(
      combatVisual.marineX,
      this.marineY,
      42,
      34,
      0x77d7a0,
    );
    this.world.add(marine);
    this.reinforcement = scene.add
      .rectangle(combatVisual.marineX + 70, this.marineY, 38, 32, 0x8adfff)
      .setVisible(false);
    this.world.add(this.reinforcement);
    const clip = scene.make.graphics({ x: 0, y: 0 });
    const mask = clip.createGeometryMask();
    this.world.setMask(mask);
    this.debug.setMask(mask);
    this.gesturePath.setMask(mask);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      mask.destroy();
      clip.destroy();
    });

    const resize = () => {
      const layout = battlefieldLayout(
        scene.scale.width,
        scene.scale.height,
        readSafeArea(),
      );
      this.layout = layout;
      const { width, height } = scene.scale;
      this.farY = 0;
      this.wallY =
        (battlefieldPoint(layout, 0.5, 1).y - layout.battlefield.y) /
        layout.scale;
      this.marineY = this.wallY + 22; // Inside the 44-unit strip reserved below the attack line.
      marine.setY(this.marineY);
      this.reinforcement.setY(this.marineY);
      for (const guide of laneGuides)
        guide.setY(this.wallY / 2).setDisplaySize(guide.width, this.wallY);
      this.stimText.setY(this.wallY - 40);
      this.magicText.setY(this.wallY - 65);
      farGuide.setY(0);
      farLabel.setY(28);
      environment.clear();
      environment
        .fillGradientStyle(0x172b3b, 0x172b3b, 0x42534b, 0x42534b)
        .fillRect(0, 0, width, height);
      environment.lineStyle(1, 0x789689, 0.2);
      for (const f of [0, 1 / 3, 2 / 3, 1]) {
        const near = battlefieldPoint(layout, f, 1);
        environment.lineBetween(
          width / 2 + (near.x - width / 2) * 0.35,
          layout.battlefield.y,
          near.x,
          near.y,
        );
      }
      environment
        .fillStyle(0x152630)
        .fillRect(0, 0, width, layout.battlefield.y);
      environment
        .fillStyle(0x304650)
        .fillRect(0, layout.bottom.y, width, height - layout.bottom.y);
      environment
        .fillStyle(0x93a7af)
        .fillRect(0, layout.bottom.y, width, 5 * layout.scale);
      environment.lineStyle(1, 0x536771, 0.5);
      for (
        let y = layout.bottom.y + 30 * layout.scale;
        y < height;
        y += 40 * layout.scale
      )
        environment.lineBetween(0, y, width, y);
      clip
        .clear()
        .fillStyle(0xffffff)
        .fillRect(
          layout.battlefield.x,
          layout.battlefield.y,
          layout.battlefield.width,
          layout.battlefield.height,
        );
      this.world
        .setPosition(layout.x, layout.battlefield.y)
        .setScale(layout.scale);
      this.debug
        .setPosition(layout.x, layout.battlefield.y)
        .setScale(layout.scale);
      this.hud.setPosition(layout.x, layout.bottom.y).setScale(layout.scale);
      this.header.setPosition(layout.x, layout.header.y).setScale(layout.scale);
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

  private specialPoint(x: number, y: number) {
    return {
      x: field.left + (x / combatGeometry.width) * field.width,
      y: (y / combatGeometry.depth) * this.wallY,
    };
  }

  renderHighroll(
    visuals: readonly SynergyVisual[],
    reinforcement: boolean,
    enemies: readonly {
      state: EnemyState;
      visual: Phaser.GameObjects.Container;
    }[],
  ): void {
    this.reinforcement.setVisible(reinforcement);
    const graphics = this.highrollGraphics.clear();
    for (const visual of visuals) {
      const point =
        (visual.kind === "hunt"
          ? enemies.find((e) => e.state.id === visual.targetId)?.visual
          : undefined) ?? this.specialPoint(visual.x, visual.y);
      const radiusX = (visual.radius * field.width) / combatGeometry.width;
      const radiusY = (visual.radius * this.wallY) / combatGeometry.depth;
      if (visual.kind === "zone") {
        graphics
          .fillStyle(0xcb86ff, 0.15)
          .fillEllipse(point.x, point.y, radiusX * 2, radiusY * 2);
        graphics
          .lineStyle(3, 0xcb86ff, 0.8)
          .strokeEllipse(point.x, point.y, radiusX * 2, radiusY * 2);
      } else if (visual.kind === "hunt") {
        graphics.lineStyle(4, 0xff657d).strokeCircle(point.x, point.y, 28);
        graphics.lineBetween(point.x - 38, point.y, point.x + 38, point.y);
        graphics.lineBetween(point.x, point.y - 38, point.x, point.y + 38);
      } else {
        graphics
          .lineStyle(5, 0xffd36f)
          .strokeRect(combatVisual.marineX - 38, this.marineY - 20, 76, 40);
      }
    }
    this.world.bringToTop(graphics);
  }

  renderSpecialWeapons(visuals: readonly SpecialVisual[]): void {
    const graphics = this.specialGraphics.clear();
    for (const visual of visuals) {
      const point = this.specialPoint(visual.x, visual.y);
      const size =
        (visual.kind === "drone" ? 18 : 10) *
        (visual.size ?? 1) *
        perspectiveScale(Math.min(1, visual.y / combatGeometry.depth));
      const color =
        visual.kind === "grenade"
          ? 0xffb35b
          : visual.kind === "missile"
            ? 0xff7d7d
            : 0x8affda;
      graphics.fillStyle(color, 0.95).lineStyle(2, 0xffffff, 0.9);
      if (visual.kind === "drone") {
        graphics.fillRect(point.x - size, point.y - size * 0.5, size * 2, size);
        graphics.lineBetween(
          point.x - size * 1.5,
          point.y,
          point.x + size * 1.5,
          point.y,
        );
        graphics
          .strokeCircle(point.x - size, point.y, size * 0.45)
          .strokeCircle(point.x + size, point.y, size * 0.45);
      } else {
        graphics.fillCircle(point.x, point.y, size * 0.55);
        if (visual.kind === "missile")
          graphics
            .lineStyle(3, color, 0.5)
            .lineBetween(point.x, point.y + size * 2, point.x, point.y);
      }
    }
    this.world.bringToTop(graphics);
  }

  showSpecialEffects(effects: readonly SpecialEffect[]): void {
    if (!effects.length) return;
    const graphics = this.scene.add.graphics();
    this.world.add(graphics);
    for (const effect of effects) {
      const p = this.specialPoint(effect.x, effect.y);
      const color =
        effect.weapon === "grenade"
          ? 0xffb35b
          : effect.weapon === "missile"
            ? 0xff7d7d
            : 0x8affda;
      graphics.lineStyle(effect.kind === "shot" ? 3 : 4, color, 0.9);
      if (effect.kind === "shot") {
        const to = this.specialPoint(
          effect.toX ?? effect.x,
          effect.toY ?? effect.y,
        );
        graphics.lineBetween(p.x, p.y, to.x, to.y).strokeCircle(to.x, to.y, 7);
      } else {
        const radius =
          ((effect.radius ?? 70) * field.width) / combatGeometry.width;
        graphics.strokeEllipse(
          p.x,
          p.y,
          radius * 2,
          (radius * 2 * this.wallY) / combatGeometry.depth,
        );
        graphics
          .fillStyle(color, 0.12)
          .fillEllipse(
            p.x,
            p.y,
            radius * 2,
            (radius * 2 * this.wallY) / combatGeometry.depth,
          );
        if (effect.kind === "pull") graphics.strokeCircle(p.x, p.y, 10);
      }
    }
    // Visual-only flash duration: simulation projectile/effect lifetime is owned by SpecialWeapons.
    this.scene.time.delayedCall(160, () => graphics.destroy());
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
    if (enemy.maxShieldHp) {
      const bar = this.scene.add
        .rectangle(-28, 33, 56, 7, 0x7deaff)
        .setOrigin(0, 0.5);
      visual.add(bar);
      visual.setData("shieldBar", bar);
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
    let y = this.farY + (this.wallY - this.farY) * enemy.progress01;
    // Gravity can move an attacker into another lane; release its old visual slot.
    if (
      enemy.phase !== "attacking" ||
      this.attackSlots.get(enemy.id)?.lane !== enemy.lane
    )
      this.attackSlots.delete(enemy.id);
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
      y = Math.max(32, this.wallY + offset.y);
    }
    visual
      .setPosition(x, y)
      .setScale(perspectiveScale(enemy.progress01) * (enemy.elite ? 1.15 : 1));
    (visual.getAt(1) as Phaser.GameObjects.Text).setText(
      `${enemy.kind[0]!.toUpperCase()} ${Math.ceil(enemy.hp)} · ${enemy.progress01.toFixed(2)}`,
    );
    const bar = visual.getData("shieldBar") as
      Phaser.GameObjects.Rectangle | undefined;
    bar?.setDisplaySize(
      56 * ((enemy.shieldHp ?? 0) / (enemy.maxShieldHp ?? 1)),
      7,
    );
    if (enemy.elite) {
      (visual.getAt(2) as Phaser.GameObjects.Text).setText(
        enemy.kind === "shield"
          ? (enemy.shieldHp ?? 0) > 0
            ? "◆ 중장 방패"
            : "◆ 방패 파괴"
          : enemy.chargePhase === "telegraph"
            ? "⚠ 돌진 준비"
            : enemy.chargePhase === "charging"
              ? "▶ 돌진"
              : "◆ 광폭 돌진병",
      );
    }
    (visual.getAt(0) as Phaser.GameObjects.Rectangle)
      .setFillStyle(
        slowed
          ? 0xb2f7ff
          : enemy.chargePhase === "telegraph"
            ? 0xff674c
            : enemy.chargePhase === "charging"
              ? 0xff3428
              : enemy.kind === "shield" && !enemy.shieldHp
                ? 0x766880
                : enemy.elite
                  ? 0xe8bd50
                  : colors[enemy.kind],
      )
      .setStrokeStyle(
        enemy.id === this.focusId
          ? 7
          : enemy.protectedBy !== undefined
            ? 4
            : enemy.elite
              ? 5
              : enemy.phase === "attacking"
                ? 4
                : 0,
        enemy.id === this.focusId
          ? 0xffffff
          : enemy.protectedBy !== undefined
            ? 0x7deaff
            : enemy.elite
              ? 0xffedb5
              : 0xff665f,
      );
  }

  isBattlefieldPoint(x: number, y: number): boolean {
    return containsPoint(this.layout.battlefield, x, y);
  }

  pickEnemy(
    x: number,
    y: number,
    enemies: readonly {
      state: EnemyState;
      visual: Phaser.GameObjects.Container;
    }[],
  ): number | null {
    if (!this.isBattlefieldPoint(x, y)) return null;
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

  showShot(
    target: Phaser.GameObjects.Container,
    echo = false,
    reinforcement = false,
  ): void {
    const effect = this.scene.add.graphics();
    effect.lineStyle(echo ? 4 : 2, echo ? 0xd3a5ff : 0xffe69a, 0.9);
    effect.lineBetween(
      combatVisual.marineX + (reinforcement ? 70 : 0),
      this.marineY,
      target.x,
      target.y,
    );
    effect
      .fillStyle(echo ? 0xd3a5ff : 0xfff4bc)
      .fillCircle(
        combatVisual.marineX + (reinforcement ? 70 : 0),
        this.marineY,
        9,
      );
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
    this.hpFill.setDisplaySize(650 * (hp / maxHp), 8);
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
    this.xpFill.setDisplaySize(290 * Math.min(1, xp / threshold), 8);
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
    reinforcement = false,
  ): void {
    if (!targets.length) return;
    for (const [index, target] of targets.entries()) {
      if (index === 0 || shotTargetIds.includes(hitIds[index]!))
        this.showShot(target, echo, reinforcement);
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
        combatVisual.marineX + (reinforcement ? 70 : 0),
        this.marineY,
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
    kind: "frost" | "lightning" | "emergency",
    targets: readonly Phaser.GameObjects.Container[],
  ): void {
    if (!targets.length) return;
    const effect = this.scene.add.graphics();
    this.world.add(effect);
    effect.lineStyle(
      5,
      kind === "emergency" ? 0x75ffc7 : kind === "frost" ? 0x93eeff : 0xffffbd,
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
    notice.setPosition(360, this.wallY * 0.5);
    this.world.add(notice);
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
      let previous = { x: combatVisual.marineX, y: this.marineY };
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
          this.marineY,
          point.x,
          point.y,
        );
        effect.strokeCircle(point.x, point.y, 20 + pulse * 3);
      }
      effect
        .fillStyle(0xffffff)
        .fillCircle(combatVisual.marineX, this.marineY, 16);
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
      trail.setMask(this.gesturePath.mask);
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
