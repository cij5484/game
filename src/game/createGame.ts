import Phaser from "phaser";
import { CombatScene } from "./scenes/CombatScene";

export const PROTOTYPE_NAME = "Horde Defense Prototype";

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#111111",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
    scene: [CombatScene],
  });
}
