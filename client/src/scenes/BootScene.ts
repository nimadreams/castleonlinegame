import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload(): void {
    this.load.setPath("assets/svg");
    this.load.svg("recruit_v1", "recruit_v1.svg");
    this.load.svg("armored_knight_v1", "armored_knight_v1.svg");
    this.load.svg("longbowman_v1", "longbowman_v1.svg");
    this.load.svg("cavalry_v1", "cavalry_v1.svg");
    this.load.svg("musketeer_v1", "musketeer_v1.svg");
    this.load.svg("castle_player", "castle_player.svg");
    this.load.svg("castle_enemy", "castle_enemy.svg");
    this.load.svg("star", "star.svg");

    this.load.setPath("assets/spine");
    this.load.spineJson("recruit_spine", "recruit.json");
    this.load.spineAtlas("recruit_atlas", "recruit.atlas");
  }

  create(): void {
    this.scene.start("Menu");
  }
}
