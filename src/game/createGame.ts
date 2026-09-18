import Phaser from "phaser";
import { CombatScene } from "./scenes/CombatScene";

export const PROTOTYPE_NAME = "Horde Defense Prototype";

export function createGame(
  parent: HTMLElement,
  onMain?: (error?: string) => void,
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#111111",
    scale: {
      mode: Phaser.Scale.RESIZE,
    },
    scene: [CombatScene],
    callbacks: {
      preBoot: (game) => {
        if (onMain) game.registry.set("onMain", onMain);
      },
    },
  });
}
