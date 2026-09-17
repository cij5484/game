import Phaser from "phaser";

export class CombatScene extends Phaser.Scene {
  create(): void {
    this.add.rectangle(640, 400, 360, 100, 0x555555);
    this.add
      .text(640, 280, "Horde Defense Prototype", {
        fontFamily: "sans-serif",
        fontSize: "40px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
  }
}
