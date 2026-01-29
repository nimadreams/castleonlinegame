import Phaser from "phaser";
import { SpinePlugin } from "@esotericsoftware/spine-phaser-v3";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { BattleScene } from "./scenes/BattleScene";

export function createGame(): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "app",
    width: 1280,
    height: 720,
    backgroundColor: "#0f172a",
    scale: {
      mode: Phaser.Scale.RESIZE
    },
    scene: [BootScene, MenuScene, BattleScene],
    plugins: {
      scene: [
        {
          key: "SpinePlugin",
          plugin: SpinePlugin,
          mapping: "spine"
        }
      ]
    }
  };

  return new Phaser.Game(config);
}
