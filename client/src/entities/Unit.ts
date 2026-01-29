export type Team = "left" | "right";

export interface UnitStats {
  maxHp: number;
  damage: number;
  range: number;
  moveSpeed: number;
  attackSpeed: number;
}

export class Unit {
  private sprite: Phaser.GameObjects.Rectangle;
  private hp: number;
  private lastAttackAt = 0;

  constructor(
    private scene: Phaser.Scene,
    public team: Team,
    public x: number,
    private y: number,
    public stats: UnitStats
  ) {
    this.hp = stats.maxHp;
    this.sprite = scene.add.rectangle(x, y, 24, 24, team === "left" ? 0x38bdf8 : 0xf97316);
  }

  update(delta: number, target: Unit | null): void {
    if (!this.isAlive()) {
      this.sprite.setVisible(false);
      return;
    }

    if (target && Math.abs(target.x - this.x) <= this.stats.range) {
      this.tryAttack(target);
      return;
    }

    const direction = this.team === "left" ? 1 : -1;
    this.x += direction * this.stats.moveSpeed * (delta / 1000);
    this.sprite.setPosition(this.x, this.y);
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    if (!this.isAlive()) {
      this.sprite.setFillStyle(0x475569);
    }
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  private tryAttack(target: Unit): void {
    const now = this.scene.time.now;
    const cooldown = 1000 / this.stats.attackSpeed;

    if (now - this.lastAttackAt < cooldown) {
      return;
    }

    this.lastAttackAt = now;
    target.takeDamage(this.stats.damage);
  }
}
