import Phaser from "phaser";
import { laneCenterX, laneX } from "../battlefield/lanes";
import { perspectiveScale } from "../battlefield/perspective";

const debugLayout = {
  farY01: 0.24,
  nearY01: 0.78,
  placeholderSize: 40,
} as const;

export class CombatScene extends Phaser.Scene {
  create(): void {
    const { width, height } = this.scale;
    const farY = height * debugLayout.farY01;
    const nearY = height * debugLayout.nearY01;
    const textStyle = {
      fontFamily: "sans-serif",
      fontSize: "22px",
      color: "#ffffff",
    };
    const label = (x: number, y: number, text: string) =>
      this.add.text(x, y, text, textStyle).setOrigin(0.5);

    label(width / 2, 32, "SOFT LANES / 원근 표현 확인");
    label(width / 2, 65, "정적 샘플 · 좌표와 시각 크기는 독립");

    for (const [lane, title, color] of [
      ["left", "좌 / LEFT", 0x5c9ed6],
      ["center", "중 / CENTER", 0x72baa5],
      ["right", "우 / RIGHT", 0xd7ab65],
    ] as const) {
      const centerX = laneCenterX(lane, width);
      this.add.rectangle(
        centerX,
        (farY + nearY) / 2,
        width / 3 - 16,
        nearY - farY + 60,
        color,
        0.12,
      );
      this.add.rectangle(
        centerX,
        (farY + nearY) / 2,
        1,
        nearY - farY,
        color,
        0.4,
      );
      label(centerX, 112, title);

      for (const [progress, offset] of [
        [0, 0.3],
        [0.5, 0.5],
        [1, 0.7],
      ] as const) {
        // Position uses logical coordinates only; scale affects the shape alone.
        const x = laneX(lane, width, offset);
        const y = farY + (nearY - farY) * progress;
        const scale = perspectiveScale(progress);
        this.add
          .rectangle(
            x,
            y,
            debugLayout.placeholderSize,
            debugLayout.placeholderSize,
            color,
          )
          .setScale(scale);
        this.add.circle(x, y, 3, 0xffffff);
        label(
          centerX,
          y + 43,
          `진행 ${progress} · 가로 ${offset} · 크기 ${scale.toFixed(2)}`,
        );
      }
    }

    for (const [y, title] of [
      [farY - 38, "FAR · 원거리 / 진행 0"],
      [nearY + 85, "NEAR · 성벽 쪽 / 진행 1"],
    ] as const) {
      this.add.rectangle(width / 2, y, width, 2, 0xffffff, 0.25);
      label(width / 2, y + 18, title);
    }
  }
}
