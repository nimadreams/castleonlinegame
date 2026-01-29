
import Phaser from "phaser";
import { SpineManager, SpineController } from "../spine/SpineManager";
import {
  PlayerStats,
  UnitKey,
  awardRewards,
  exchangeDiamondsToGold,
  getUnitLevel,
  loadPlayerStats,
  unlockUnit,
  upgradeUnitLevel
} from "../state/PlayerStats";
import { t } from "../state/Localization";

type Team = "left" | "right";

type UnitState = "IDLE" | "WALK" | "ATTACK" | "DYING";

type UnitDefinition = {
  id: string;
  name: string;
  cost: number;
  hp: number;
  attackPower: number;
  attackRange: number;
  moveSpeed: number;
  attackSpeed: number;
  cooldown: number;
  animationKey: string;
  locked?: boolean;
};

type HitContext = {
  targetUnit?: BattleUnit;
  targetBase?: BaseStructure;
  damage: number;
  pitch: number;
};

type Layout = {
  width: number;
  height: number;
  panelHeight: number;
  panelTopY: number;
  panelCenterY: number;
  panelLeftX: number;
  panelRightX: number;
  unitTrayX: number;
  unitTrayY: number;
  unitTrayWidth: number;
  unitTrayHeight: number;
  laneY: number;
  baseWidth: number;
  baseHeight: number;
  leftBaseX: number;
  rightBaseX: number;
  baseY: number;
  unitSize: number;
  upgradeButtonX: number;
  upgradeButtonY: number;
  unitGridLeftX: number;
  unitGridTopY: number;
  unitSlotSize: number;
  unitSlotGapX: number;
  unitSlotGapY: number;
  goldTextX: number;
  goldTextY: number;
  goldBarX: number;
  goldBarY: number;
  goldBarWidth: number;
  musicButtonX: number;
  musicButtonY: number;
};

type Visual = Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle | SpineGameObject;

type UnitButton = {
  slotIndex: number;
  def: UnitDefinition | null;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  icon: Visual;
  nameText: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  lockText: Phaser.GameObjects.Text;
  overlay: Phaser.GameObjects.Graphics;
  cooldownRemaining: number;
  cooldownDuration: number;
  overlayRadius: number;
  enabled: boolean;
};

type UpgradeButton = {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  progressBg: Phaser.GameObjects.Rectangle;
  progressFill: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  enabled: boolean;
  progressWidth: number;
};

type BattleResults = {
  victory: boolean;
  reason: string;
  timeSeconds: number;
  stars: number;
  goldReward: number;
  diamondReward: number;
};

type UpgradeRow = {
  def: UnitDefinition;
  levelText: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  buttonBg: Phaser.GameObjects.Rectangle;
  buttonLabel: Phaser.GameObjects.Text;
  lockText: Phaser.GameObjects.Text;
};

const MAX_UNIT_SLOTS = 5;
const UNIT_COLUMNS = 5;
const UNIT_ROWS = 1;

const UNIT_REGISTRY: Array<UnitDefinition | null> = [
  {
    id: "recruit",
    name: "Recruit",
    cost: 20,
    hp: 100,
    attackPower: 15,
    attackRange: 20,
    moveSpeed: 120,
    attackSpeed: 1.15,
    cooldown: 900,
    animationKey: "recruit"
  },
  {
    id: "armored_knight",
    name: "Armored Knight",
    cost: 40,
    hp: 250,
    attackPower: 10,
    attackRange: 30,
    moveSpeed: 60,
    attackSpeed: 0.7,
    cooldown: 1700,
    animationKey: "armored_knight"
  },
  {
    id: "longbowman",
    name: "Longbowman",
    cost: 30,
    hp: 50,
    attackPower: 12,
    attackRange: 200,
    moveSpeed: 140,
    attackSpeed: 0.9,
    cooldown: 1400,
    animationKey: "longbowman"
  },
  {
    id: "cavalry",
    name: "Cavalry",
    cost: 60,
    hp: 180,
    attackPower: 25,
    attackRange: 40,
    moveSpeed: 220,
    attackSpeed: 1.1,
    cooldown: 2100,
    animationKey: "cavalry"
  },
  {
    id: "musketeer",
    name: "Musketeer",
    cost: 85,
    hp: 60,
    attackPower: 50,
    attackRange: 150,
    moveSpeed: 50,
    attackSpeed: 0.45,
    cooldown: 3000,
    animationKey: "musketeer"
  }
];

const UNIT_COLORS: Record<string, number> = {
  recruit: 0x22c55e,
  armored_knight: 0x1e3a8a,
  longbowman: 0xfacc15,
  cavalry: 0x38bdf8,
  musketeer: 0xa855f7
};

const ENEMY_COLORS: Record<string, number> = {
  recruit: 0xef4444,
  armored_knight: 0xb91c1c,
  longbowman: 0xf97316,
  cavalry: 0xf87171,
  musketeer: 0xfb923c
};

const UNIT_SVG_KEYS: Record<string, string> = {
  recruit: "recruit_v1",
  armored_knight: "armored_knight_v1",
  longbowman: "longbowman_v1",
  cavalry: "cavalry_v1",
  musketeer: "musketeer_v1"
};

const SPINE_ASSETS: Record<string, { data: string; atlas: string }> = {
  recruit: { data: "recruit_spine", atlas: "recruit_atlas" }
};

const BASE_SVG_KEYS = {
  player: "castle_player",
  enemy: "castle_enemy"
};

const BASE_MAX_HP = 500;
const SIEGE_OFFSET = 50;
const GOLD_START = 50;
const GOLD_RATE_START = 5;
const GOLD_UPGRADE_COST_START = 100;
const GOLD_UPGRADE_BONUS = 2;
const GOLD_MAX_START = 100;
const GOLD_CAP_BONUS = 50;
const GOLD_MAX_LEVEL = 10;
const ENEMY_SPAWN_MIN = 3000;
const ENEMY_SPAWN_MAX = 7000;

const isSprite = (visual: Visual): visual is Phaser.GameObjects.Sprite => visual instanceof Phaser.GameObjects.Sprite;
const hasDisplaySize = (visual: Visual): visual is { setDisplaySize: (width: number, height: number) => Visual } =>
  typeof (visual as { setDisplaySize?: unknown }).setDisplaySize === "function";

const setVisualSize = (visual: Visual, width: number, height: number): void => {
  if (hasDisplaySize(visual)) {
    visual.setDisplaySize(width, height);
    return;
  }

  visual.width = width;
  visual.height = height;
};

const setVisualTint = (visual: Visual, color: number): void => {
  if (typeof (visual as { setColor?: (value: number) => unknown }).setColor === "function") {
    (visual as { setColor: (value: number) => unknown }).setColor(color);
    return;
  }

  if (isSprite(visual)) {
    visual.setTint(color);
    return;
  }

  if (typeof (visual as { setFillStyle?: (value: number) => unknown }).setFillStyle === "function") {
    (visual as { setFillStyle: (value: number) => unknown }).setFillStyle(color);
  }
};

class SimpleHealthBar {
  private bg: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private width: number;
  private height: number;
  private ratio = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, fillColor: number) {
    this.width = width;
    this.height = height;
    this.bg = scene.add
      .rectangle(x, y, width, height, 0x0f172a)
      .setOrigin(0.5, 0.5)
      .setStrokeStyle(1, 0x334155)
      .setDepth(7);
    this.fill = scene.add.rectangle(x - width / 2, y, width, height, fillColor).setOrigin(0, 0.5);
    this.fill.setDepth(8);
  }

  setRatio(ratio: number): void {
    this.ratio = Phaser.Math.Clamp(ratio, 0, 1);
    this.fill.width = this.width * this.ratio;
  }

  setLayout(x: number, y: number, width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.bg.setPosition(x, y);
    this.bg.width = width;
    this.bg.height = height;
    this.fill.setPosition(x - width / 2, y);
    this.fill.height = height;
    this.setRatio(this.ratio);
  }

  setPosition(x: number, y: number): void {
    this.bg.setPosition(x, y);
    this.fill.setPosition(x - this.width / 2, y);
  }

  setAlpha(alpha: number): void {
    this.bg.setAlpha(alpha);
    this.fill.setAlpha(alpha);
  }

  setDepth(base: number): void {
    this.bg.setDepth(base);
    this.fill.setDepth(base + 1);
  }

  destroy(): void {
    this.bg.destroy();
    this.fill.destroy();
  }
}

class BaseStructure {
  public hp: number;
  public healthBar: SimpleHealthBar;
  private barOffsetY = 0;

  constructor(private scene: Phaser.Scene, public visual: Visual, public maxHp: number, barColor: number) {
    this.hp = maxHp;
    this.healthBar = new SimpleHealthBar(scene, visual.x, visual.y - this.barOffsetY, 110, 4, barColor);
  }

  setPosition(x: number, y: number): void {
    this.visual.setPosition(x, y);
    this.healthBar.setPosition(x, y - this.barOffsetY);
    const depth = 3 + Math.floor(y);
    this.visual.setDepth(depth);
    this.healthBar.setDepth(depth + 1);
  }

  setSize(width: number, height: number): void {
    setVisualSize(this.visual, width, height);
    this.barOffsetY = height * 0.55;
    this.healthBar.setLayout(this.visual.x, this.visual.y - this.barOffsetY, width * 0.6, 4);
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.healthBar.setRatio(this.hp / this.maxHp);
  }

  get leftEdge(): number {
    return this.visual.x - this.visual.displayWidth / 2;
  }

  get rightEdge(): number {
    return this.visual.x + this.visual.displayWidth / 2;
  }
}

class BattleUnit {
  public healthBar: SimpleHealthBar;
  public hp: number;
  public state: UnitState = "IDLE";
  public x: number;
  public y: number;
  public lastAttackAt = 0;
  public attackDash = 0;
  public stackOffsetY = 0;
  public chargeUsed = false;
  private attackCooldownMs: number;
  private hitFallbackMs: number;
  private bobPhase = Math.random() * Math.PI * 2;
  private deathDuration = 1500;
  private pendingHit?: HitContext;
  private pendingHitTimer?: Phaser.Time.TimerEvent;
  private deathTween?: Phaser.Tweens.Tween;
  private deathComplete = false;
  private flashTimer?: Phaser.Time.TimerEvent;
  private baseTint?: number;
  private spineBaseColor?: { r: number; g: number; b: number; a: number };

  constructor(
    private scene: Phaser.Scene,
    public team: Team,
    public def: UnitDefinition,
    public visual: Visual,
    private onHit: (context: HitContext) => void,
    private spine?: SpineController
  ) {
    this.hp = def.hp;
    this.attackCooldownMs = 1000 / Math.max(0.1, def.attackSpeed);
    this.hitFallbackMs = Math.min(420, Math.max(160, this.attackCooldownMs * 0.4));
    this.x = visual.x;
    this.y = visual.y;
    const barColor = team === "left" ? 0x22c55e : 0xf97316;
    this.healthBar = new SimpleHealthBar(scene, this.x, this.y - 14, 24, 3, barColor);
    if (visual instanceof Phaser.GameObjects.Rectangle) {
      this.baseTint = visual.fillColor;
    }
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  isExpired(): boolean {
    return this.deathComplete;
  }

  canAttack(time: number): boolean {
    return time - this.lastAttackAt >= this.attackCooldownMs;
  }

  recordAttack(time: number, context: HitContext): void {
    this.lastAttackAt = time;
    this.attackDash = 1;
    this.setState("ATTACK");
    this.spine?.playAttack();
    this.queueHit(context);
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
    this.healthBar.setRatio(this.hp / this.def.hp);
    if (amount > 0) {
      this.flashHit();
    }
    if (this.hp <= 0) {
      this.clearPendingHit();
      this.setState("DYING");
    }
  }

  setState(state: UnitState): void {
    if (this.state === "ATTACK" && this.attackDash > 0 && (state === "IDLE" || state === "WALK")) {
      return;
    }

    if (this.state === state && state !== "ATTACK") {
      return;
    }

    this.state = state;
    if (this.spine && state !== "ATTACK") {
      this.spine.setState(state);
    }

    if (state === "ATTACK") {
      this.attackDash = 1;
    }

    if (state === "DYING") {
      this.startDeathTween();
    }
  }

  handleSpineEvent(eventName: string): void {
    if (!this.pendingHit) {
      return;
    }

    const isHit = this.spine ? this.spine.isHitEvent(eventName) : eventName.toLowerCase() === "hit";
    if (isHit) {
      this.applyPendingHit();
    }
  }

  private queueHit(context: HitContext): void {
    this.clearPendingHit();
    this.pendingHit = context;
    const virtualHit = () => this.handleSpineEvent("hit");
    if (!this.spine || !this.spine.usesHitEventTimings()) {
      this.pendingHitTimer = this.scene.time.delayedCall(this.hitFallbackMs, virtualHit);
      return;
    }

    this.pendingHitTimer = this.scene.time.delayedCall(this.hitFallbackMs, virtualHit);
  }

  private applyPendingHit(): void {
    if (!this.pendingHit) {
      return;
    }

    const context = this.pendingHit;
    this.clearPendingHit();
    this.onHit(context);
  }

  private clearPendingHit(): void {
    if (this.pendingHitTimer) {
      this.pendingHitTimer.remove(false);
      this.pendingHitTimer = undefined;
    }
    this.pendingHit = undefined;
  }

  updateVisual(time: number, delta: number): boolean {
    if (this.state === "DYING") {
      this.startDeathTween();
      this.healthBar.setPosition(this.visual.x, this.visual.y - 14);
      const depth = 5 + Math.floor(this.visual.y);
      this.visual.setDepth(depth);
      this.healthBar.setDepth(depth + 1);
      return this.deathComplete;
    }

    let bob = 0;
    if (this.state === "WALK") {
      bob = Math.sin(time / 160 + this.bobPhase) * 2;
    } else if (this.state === "IDLE") {
      bob = Math.sin(time / 320 + this.bobPhase) * 1;
    }

    const dash = this.attackDash > 0 ? (this.team === "left" ? 5 : -5) * this.attackDash : 0;
    this.attackDash = Math.max(0, this.attackDash - delta * 0.01);

    const floatUp = 0;
    const alpha = 1;
    this.healthBar.setAlpha(1);
    const baseY = this.y + this.stackOffsetY;

    this.visual.setPosition(this.x + dash, baseY + bob + floatUp);
    this.visual.setAlpha(alpha);
    this.healthBar.setPosition(this.x + dash, baseY - 14 + bob + floatUp);

    const depth = 5 + Math.floor(this.visual.y);
    this.visual.setDepth(depth);
    this.healthBar.setDepth(depth + 1);

    return false;
  }

  private startDeathTween(): void {
    if (this.deathTween || this.deathComplete) {
      return;
    }

    const startY = this.visual.y;
    const angleKick = this.team === "left" ? -12 : 12;
    this.deathTween = this.scene.tweens.add({
      targets: this.visual,
      y: startY - 50,
      alpha: 0,
      angle: this.visual.angle + angleKick,
      duration: this.deathDuration,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.deathComplete = true;
        this.destroy();
      }
    });

    const barFade = { value: 1 };
    this.scene.tweens.add({
      targets: barFade,
      value: 0,
      duration: this.deathDuration * 0.8,
      ease: "Quad.easeOut",
      onUpdate: () => this.healthBar.setAlpha(barFade.value)
    });
  }

  private flashHit(): void {
    if (this.flashTimer) {
      this.flashTimer.remove(false);
    }

    this.applyFlashTint();
    this.flashTimer = this.scene.time.delayedCall(90, () => this.resetFlashTint());
  }

  private applyFlashTint(): void {
    if (this.applySpineFlash(1, 1, 1, 1)) {
      return;
    }

    setVisualTint(this.visual, 0xffffff);
  }

  private resetFlashTint(): void {
    if (this.resetSpineFlash()) {
      return;
    }

    const visual = this.visual as unknown as {
      clearTint?: () => void;
      setColor?: (value: number) => void;
      setFillStyle?: (value: number) => void;
    };

    if (typeof visual.clearTint === "function") {
      visual.clearTint();
      return;
    }

    if (typeof visual.setColor === "function") {
      visual.setColor(0xffffff);
      return;
    }

    if (typeof visual.setFillStyle === "function" && this.baseTint !== undefined) {
      visual.setFillStyle(this.baseTint);
    }
  }

  private applySpineFlash(r: number, g: number, b: number, a: number): boolean {
    const spineObject = this.visual as unknown as { skeleton?: { color?: { r: number; g: number; b: number; a: number; set?: (r: number, g: number, b: number, a: number) => void } } };
    const color = spineObject.skeleton?.color;
    if (!color) {
      return false;
    }

    if (!this.spineBaseColor) {
      this.spineBaseColor = { r: color.r, g: color.g, b: color.b, a: color.a };
    }

    if (typeof color.set === "function") {
      color.set(r, g, b, a);
    } else {
      color.r = r;
      color.g = g;
      color.b = b;
      color.a = a;
    }
    return true;
  }

  private resetSpineFlash(): boolean {
    const spineObject = this.visual as unknown as { skeleton?: { color?: { r: number; g: number; b: number; a: number; set?: (r: number, g: number, b: number, a: number) => void } } };
    const color = spineObject.skeleton?.color;
    if (!color || !this.spineBaseColor) {
      return false;
    }

    if (typeof color.set === "function") {
      color.set(this.spineBaseColor.r, this.spineBaseColor.g, this.spineBaseColor.b, this.spineBaseColor.a);
    } else {
      color.r = this.spineBaseColor.r;
      color.g = this.spineBaseColor.g;
      color.b = this.spineBaseColor.b;
      color.a = this.spineBaseColor.a;
    }
    return true;
  }

  destroy(): void {
    this.clearPendingHit();
    if (this.flashTimer) {
      this.flashTimer.remove(false);
      this.flashTimer = undefined;
    }
    if (this.deathTween) {
      this.deathTween.stop();
      this.deathTween = undefined;
    }
    this.visual.destroy();
    this.healthBar.destroy();
  }
}

class SoundFX {
  private ctx: AudioContext | null = null;
  private ready = false;
  private musicInterval: number | null = null;
  private musicEnabled = true;
  private musicPlaying = false;

  enable(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }

    if (this.ctx.state === "suspended") {
      this.ctx
        .resume()
        .then(() => {
          this.ready = true;
          if (this.musicEnabled) {
            this.startMusic();
          }
        })
        .catch(() => {
          this.ready = false;
        });
    } else {
      this.ready = true;
      if (this.musicEnabled) {
        this.startMusic();
      }
    }
  }

  toggleMusic(): boolean {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) {
      this.stopMusic();
      return false;
    }

    if (this.ready) {
      this.startMusic();
    }

    return true;
  }

  isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  private startMusic(): void {
    if (!this.ctx || !this.ready || this.musicPlaying) {
      return;
    }

    this.musicPlaying = true;
    this.scheduleMusicLoop();
    this.musicInterval = window.setInterval(() => this.scheduleMusicLoop(), 3200);
  }

  private stopMusic(): void {
    if (this.musicInterval) {
      window.clearInterval(this.musicInterval);
      this.musicInterval = null;
    }

    this.musicPlaying = false;
  }

  private scheduleMusicLoop(): void {
    if (!this.ctx || !this.ready || !this.musicEnabled) {
      return;
    }

    const melody = [196, 220, 247, 262, 247, 220, 196, 175];
    const step = 0.28;
    melody.forEach((freq, index) => {
      this.playTone(freq, 0.22, "sine", 0.04, index * step);
    });
  }

  private playTone(freq: number, duration: number, type: OscillatorType, gainValue: number, startOffset = 0): void {
    if (!this.ctx || !this.ready) {
      return;
    }

    const now = this.ctx.currentTime + startOffset;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainValue, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playSweep(startFreq: number, endFreq: number, duration: number, gainValue: number): void {
    if (!this.ctx || !this.ready) {
      return;
    }

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playNoise(duration: number, gainValue: number, filterFreq = 900): void {
    if (!this.ctx || !this.ready) {
      return;
    }

    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.6;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  playPop(pitch = 1): void {
    this.playSweep(260 * pitch, 720 * pitch, 0.12, 0.12);
  }

  playCrunch(pitch = 1): void {
    this.playNoise(0.06, 0.08, 900 * pitch);
  }

  playDing(): void {
    this.playTone(880, 0.12, "sine", 0.12);
    this.playTone(1180, 0.14, "sine", 0.12, 0.12);
  }

  playOutcome(victory: boolean): void {
    if (victory) {
      this.playTone(523, 0.18, "sine", 0.12);
      this.playTone(659, 0.18, "sine", 0.12, 0.16);
      this.playTone(784, 0.25, "sine", 0.12, 0.34);
      this.playTone(1046, 0.3, "sine", 0.14, 0.52);
    } else {
      this.playTone(392, 0.2, "sine", 0.12);
      this.playTone(311, 0.2, "sine", 0.12, 0.2);
      this.playTone(196, 0.3, "sine", 0.12, 0.42);
    }
  }
}

export class BattleScene extends Phaser.Scene {
  private layout!: Layout;
  private background!: Phaser.GameObjects.Graphics;
  private panelBg!: Phaser.GameObjects.Rectangle;
  private unitTrayBg!: Phaser.GameObjects.Rectangle;
  private goldText!: Phaser.GameObjects.Text;
  private activeUnitsText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private goldBarBg!: Phaser.GameObjects.Rectangle;
  private goldBarFill!: Phaser.GameObjects.Rectangle;
  private upgradeButton!: UpgradeButton;
  private unitButtons: UnitButton[] = [];
  private musicButton!: Phaser.GameObjects.Container;

  private playerBase!: BaseStructure;
  private enemyBase!: BaseStructure;
  private playerUnits: BattleUnit[] = [];
  private enemyUnits: BattleUnit[] = [];

  private gold = GOLD_START;
  private goldRate = GOLD_RATE_START;
  private maxGold = GOLD_MAX_START;
  private upgradeCost = GOLD_UPGRADE_COST_START;
  private upgradeLevel = 0;

  private spineManager!: SpineManager;
  private soundFX = new SoundFX();
  private playerStats: PlayerStats = loadPlayerStats();
  private battleTime = 0;

  private gameOver = false;
  private resultsOverlay?: Phaser.GameObjects.Container;
  private dimOverlay?: Phaser.GameObjects.Rectangle;
  private upgradeOverlay?: Phaser.GameObjects.Container;
  private upgradeRows: UpgradeRow[] = [];
  private upgradeCurrencyText?: Phaser.GameObjects.Text;
  private enemySpawnTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super("Battle");
  }

  create(): void {
    this.spineManager = new SpineManager(this);
    this.layout = this.computeLayout();

    this.background = this.add.graphics().setDepth(-5);
    this.panelBg = this.add.rectangle(0, 0, 10, 10, 0x0b1220).setDepth(10).setStrokeStyle(2, 0x1f2937);
    this.unitTrayBg = this.add.rectangle(0, 0, 10, 10, 0x0f1b2f).setDepth(11).setStrokeStyle(2, 0x334155);

    this.createGoldUI();
    this.createTimerUI();
    this.battleTime = 0;
    this.timerText.setText(t("ui.time", { value: "00:00" }));
    this.upgradeButton = this.createUpgradeButton();
    this.unitButtons = this.createUnitButtons();
    this.createMusicButton();

    this.playerBase = new BaseStructure(this, this.createCastle("left"), BASE_MAX_HP, 0x22c55e);
    this.enemyBase = new BaseStructure(this, this.createCastle("right"), BASE_MAX_HP, 0xf97316);

    this.applyLayout();
    this.scheduleEnemySpawn();

    this.input.once("pointerdown", () => this.soundFX.enable());
    this.scale.on("resize", this.handleResize, this);
  }

  update(time: number, delta: number): void {
    if (!this.gameOver) {
      this.updateTimer(delta);
    }

    this.updateGold(delta);
    this.updateUnitButtonCooldowns(delta);
    this.refreshButtons();

    if (!this.gameOver) {
      this.updateCombat(time, delta);
    } else {
      this.updateUnitsVisualOnly(time, delta);
    }
  }

  private computeLayout(): Layout {
    const width = Math.max(640, this.scale.width);
    const height = Math.max(360, this.scale.height);
    const panelHeight = Math.max(190, height * 0.3);
    const panelTopY = height - panelHeight;
    const panelCenterY = panelTopY + panelHeight / 2;
    const panelPadding = Math.max(16, width * 0.02);
    const panelLeftX = panelPadding;
    const panelRightX = width - panelPadding;

    const baseWidth = Math.min(360, Math.max(240, width * 0.28));
    const baseHeight = baseWidth * 0.95;
    const baseY = panelTopY - baseHeight / 2 - 8;
    const laneY = baseY + baseHeight * 0.2;
    const leftBaseX = panelLeftX + baseWidth / 2 + 36;
    const rightBaseX = panelRightX - baseWidth / 2 - 36;

    const unitSize = Math.max(32, Math.min(64, width * 0.055));

    const buttonSize = Math.min(132, panelHeight * 0.65);
    const upgradeButtonX = panelLeftX + buttonSize / 2 + 16;
    const upgradeButtonY = panelTopY + buttonSize / 2 + 22;

    const gridStartX = panelLeftX + 16;
    const gridEndX = panelRightX - 16;
    const availableWidth = Math.max(220, gridEndX - gridStartX);
    const gridHeight = panelHeight - 24;
    const desiredGap = 12;
    const maxSlotByWidth = (availableWidth - desiredGap * (MAX_UNIT_SLOTS - 1)) / MAX_UNIT_SLOTS;
    const slotSize = Math.max(44, Math.min(buttonSize, gridHeight, maxSlotByWidth));
    const slotGapX = MAX_UNIT_SLOTS > 1 ? Math.max(6, (availableWidth - slotSize * MAX_UNIT_SLOTS) / (MAX_UNIT_SLOTS - 1)) : 0;
    const slotGapY = 0;
    const rowWidth = slotSize * MAX_UNIT_SLOTS + slotGapX * (MAX_UNIT_SLOTS - 1);
    const gridLeftX = gridStartX + Math.max(0, (availableWidth - rowWidth) / 2);
    const rowCenterY = panelTopY + panelHeight * 0.7;
    const gridTopY = rowCenterY - slotSize / 2;
    const trayPadding = 10;
    const unitTrayWidth = rowWidth + trayPadding * 2;
    const unitTrayHeight = slotSize + trayPadding * 2;
    const unitTrayX = gridLeftX + rowWidth / 2;
    const unitTrayY = gridTopY + slotSize / 2;

    const goldTextX = panelLeftX + 12;
    const goldTextY = panelTopY + 6;
    const goldBarX = goldTextX;
    const goldBarY = goldTextY + 20;
    const goldBarWidth = Math.max(170, panelRightX - panelLeftX - 40);

    const musicButtonX = width - 44;
    const musicButtonY = 40;

    return {
      width,
      height,
      panelHeight,
      panelTopY,
      panelCenterY,
      panelLeftX,
      panelRightX,
      unitTrayX,
      unitTrayY,
      unitTrayWidth,
      unitTrayHeight,
      laneY,
      baseWidth,
      baseHeight,
      leftBaseX,
      rightBaseX,
      baseY,
      unitSize,
      upgradeButtonX,
      upgradeButtonY,
      unitGridLeftX: gridLeftX,
      unitGridTopY: gridTopY,
      unitSlotSize: slotSize,
      unitSlotGapX: slotGapX,
      unitSlotGapY: slotGapY,
      goldTextX,
      goldTextY,
      goldBarX,
      goldBarY,
      goldBarWidth,
      musicButtonX,
      musicButtonY
    };
  }

  private applyLayout(): void {
    this.layout = this.computeLayout();
    const layout = this.layout;

    this.panelBg.setPosition(layout.width / 2, layout.panelCenterY);
    this.panelBg.width = layout.panelRightX - layout.panelLeftX;
    this.panelBg.height = layout.panelHeight;
    this.unitTrayBg.setPosition(layout.unitTrayX, layout.unitTrayY);
    this.unitTrayBg.width = layout.unitTrayWidth;
    this.unitTrayBg.height = layout.unitTrayHeight;

    this.drawBackground();

    this.playerBase.setPosition(layout.leftBaseX, layout.baseY);
    this.enemyBase.setPosition(layout.rightBaseX, layout.baseY);
    this.playerBase.setSize(layout.baseWidth, layout.baseHeight);
    this.enemyBase.setSize(layout.baseWidth, layout.baseHeight);

    this.goldText.setPosition(layout.goldTextX, layout.goldTextY);
    this.goldBarBg.setPosition(layout.goldBarX, layout.goldBarY);
    this.goldBarBg.width = layout.goldBarWidth;
    this.goldBarFill.setPosition(layout.goldBarX, layout.goldBarY);
    this.activeUnitsText.setPosition(layout.goldTextX, layout.goldBarY + 12);
    this.timerText.setPosition(layout.width - 16, 18);

    this.layoutUpgradeButton();
    this.layoutUnitButtons();
    this.layoutMusicButton();

    this.playerUnits.forEach((unit) => {
      unit.y = layout.laneY;
    });
    this.enemyUnits.forEach((unit) => {
      unit.y = layout.laneY;
    });

    if (this.resultsOverlay) {
      this.layoutResultsOverlay();
    }
  }

  private drawBackground(): void {
    const layout = this.layout;
    this.background.clear();

    this.background.fillStyle(0x0a1b2f, 1);
    this.background.fillRect(0, 0, layout.width, layout.panelTopY);

    this.background.fillStyle(0x12344a, 1);
    this.background.fillRect(0, 0, layout.width, layout.panelTopY * 0.45);

    this.background.fillStyle(0x173a52, 1);
    this.background.fillRect(0, layout.panelTopY * 0.45, layout.width, layout.panelTopY * 0.2);

    this.background.fillStyle(0x1c3e2a, 1);
    this.background.fillRect(0, layout.panelTopY - 120, layout.width, 70);

    this.background.fillStyle(0x2e4a2b, 1);
    this.background.fillRect(0, layout.panelTopY - 70, layout.width, 50);

    this.background.fillStyle(0x1f2937, 1);
    this.background.fillRect(0, layout.panelTopY - 20, layout.width, 20);

    this.background.fillStyle(0x2b3340, 1);
    for (let i = 0; i < 7; i += 1) {
      const peakX = (i / 6) * layout.width;
      const baseY = layout.panelTopY - 120;
      this.background.fillTriangle(peakX - 140, baseY, peakX + 140, baseY, peakX, baseY - 110);
    }

    this.background.fillStyle(0x294355, 0.6);
    for (let i = 0; i < 7; i += 1) {
      const cx = 70 + i * 170;
      const cy = 70 + (i % 2) * 30;
      this.background.fillCircle(cx, cy, 28);
      this.background.fillCircle(cx + 28, cy + 8, 22);
      this.background.fillCircle(cx - 28, cy + 10, 22);
    }

    this.background.fillStyle(0x1f3a2b, 0.35);
    for (let i = 0; i < 10; i += 1) {
      const stripeY = layout.panelTopY - 110 + i * 6;
      this.background.fillRect(0, stripeY, layout.width, 2);
    }
  }

  private createGoldUI(): void {
    this.goldText = this.add.text(0, 0, "", {
      color: "#fde68a",
      fontSize: "16px",
      fontStyle: "bold",
      fontFamily: "Trebuchet MS"
    }).setDepth(12).setOrigin(0, 0);

    this.goldBarBg = this.add.rectangle(0, 0, 160, 8, 0x1f2937).setOrigin(0, 0.5).setDepth(12);
    this.goldBarFill = this.add.rectangle(0, 0, 160, 8, 0xf59e0b).setOrigin(0, 0.5).setDepth(13);
    this.activeUnitsText = this.add.text(0, 0, "", {
      color: "#cbd5f5",
      fontSize: "12px",
      fontFamily: "Trebuchet MS"
    }).setDepth(12).setOrigin(0, 0);
  }

  private createTimerUI(): void {
    this.timerText = this.add.text(0, 0, "00:00", {
      color: "#e2e8f0",
      fontSize: "13px",
      fontStyle: "bold",
      fontFamily: "Trebuchet MS"
    }).setDepth(12).setOrigin(1, 0.5);
  }

  private createUpgradeButton(): UpgradeButton {
    const container = this.add.container(0, 0).setDepth(12);
    const bg = this.add.rectangle(0, 0, 80, 80, 0x1f2937).setStrokeStyle(2, 0x475569);
    bg.setInteractive({ useHandCursor: true });

    const progressBg = this.add.rectangle(0, 0, 64, 6, 0x0b1220).setOrigin(0.5, 0.5);
    const progressFill = this.add.rectangle(-32, 0, 0, 6, 0x22c55e).setOrigin(0, 0.5);

    const icon = this.add.circle(0, -8, 12, 0xfbbf24).setStrokeStyle(2, 0xf59e0b);
    const label = this.add.text(0, 18, t("ui.upgrade"), {
      color: "#e2e8f0",
      fontSize: "13px",
      fontStyle: "bold",
      fontFamily: "Trebuchet MS"
    }).setOrigin(0.5, 0.5);
    const costText = this.add.text(0, 34, "", {
      color: "#fef3c7",
      fontSize: "12px",
      fontFamily: "Trebuchet MS"
    }).setOrigin(0.5, 0.5);
    const levelText = this.add.text(0, -30, "", {
      color: "#94a3b8",
      fontSize: "11px",
      fontFamily: "Trebuchet MS"
    }).setOrigin(0.5, 0.5);

    container.add([bg, progressBg, progressFill, icon, label, costText, levelText]);

    bg.on("pointerdown", () => {
      this.handleUpgrade();
    });

    return {
      container,
      bg,
      progressBg,
      progressFill,
      icon,
      label,
      costText,
      levelText,
      enabled: true,
      progressWidth: 64
    };
  }

  private createUnitButtons(): UnitButton[] {
    const buttons: UnitButton[] = [];
    for (let i = 0; i < MAX_UNIT_SLOTS; i += 1) {
      const def = UNIT_REGISTRY[i];
      const container = this.add.container(0, 0).setDepth(12);
      const bg = this.add.rectangle(0, 0, 80, 80, 0x111827).setStrokeStyle(2, 0x334155);
      bg.setInteractive({ useHandCursor: true });

      const icon = def ? this.createUnitIcon(def, 42) : this.add.rectangle(0, -6, 28, 28, 0x334155);
      const nameText = this.add.text(0, 22, def ? t(`unit.${def.id}`) : "", {
        color: "#f8fafc",
        fontSize: "14px",
        fontStyle: "bold",
        fontFamily: "Trebuchet MS"
      }).setOrigin(0.5, 0.5);
      const costText = this.add.text(0, 38, def ? t("ui.cost", { value: def.cost }) : "", {
        color: "#e2e8f0",
        fontSize: "12px",
        fontFamily: "Trebuchet MS"
      }).setOrigin(0.5, 0.5);
      const lockText = this.add.text(0, 0, t("ui.locked"), {
        color: "#e2e8f0",
        fontSize: "12px",
        fontStyle: "bold"
      }).setOrigin(0.5, 0.5);
      lockText.setVisible(false);

      const overlay = this.add.graphics();

      container.add([bg, icon, nameText, costText, overlay, lockText]);

      const button: UnitButton = {
        slotIndex: i,
        def,
        container,
        bg,
        icon,
        nameText,
        costText,
        lockText,
        overlay,
        cooldownRemaining: 0,
        cooldownDuration: def?.cooldown ?? 0,
        overlayRadius: 40,
        enabled: true
      };

    bg.on("pointerdown", () => {
      this.handleUnitButton(button);
    });
    bg.on("pointerover", () => {
      if (button.enabled) {
        button.bg.setFillStyle(0x1f2a44);
      }
    });
    bg.on("pointerout", () => {
      button.bg.setFillStyle(button.enabled ? 0x1f2937 : 0x111827);
    });

    buttons.push(button);
  }
  return buttons;
}

  private createMusicButton(): void {
    this.musicButton = this.add.container(0, 0).setDepth(12);
    const bg = this.add.rectangle(0, 0, 90, 28, 0x0f172a).setStrokeStyle(1, 0x334155);
    const label = this.add.text(0, 0, t("ui.music_on"), {
      color: "#e2e8f0",
      fontSize: "12px"
    }).setOrigin(0.5, 0.5);
    bg.setInteractive({ useHandCursor: true });
    this.musicButton.add([bg, label]);

    bg.on("pointerdown", () => {
      const enabled = this.soundFX.toggleMusic();
      label.setText(enabled ? t("ui.music_on") : t("ui.music_off"));
    });
  }

  private layoutUpgradeButton(): void {
    const layout = this.layout;
    const size = layout.unitSlotSize;
    this.upgradeButton.container.setPosition(layout.upgradeButtonX, layout.upgradeButtonY);
    this.upgradeButton.bg.width = size;
    this.upgradeButton.bg.height = size;
    this.upgradeButton.icon.setPosition(0, -size * 0.18);
    this.upgradeButton.label.setPosition(0, size * 0.16);
    this.upgradeButton.costText.setPosition(0, size * 0.36);
    this.upgradeButton.levelText.setPosition(0, -size * 0.4);
    this.upgradeButton.progressBg.setPosition(0, size * 0.45);
    this.upgradeButton.progressBg.width = size * 0.72;
    this.upgradeButton.progressFill.setPosition(-size * 0.36, size * 0.45);
    this.upgradeButton.progressWidth = size * 0.72;
  }

  private layoutUnitButtons(): void {
    const layout = this.layout;
    for (const button of this.unitButtons) {
      const slotIndex = button.slotIndex;
      const col = slotIndex % UNIT_COLUMNS;
      const row = Math.floor(slotIndex / UNIT_COLUMNS);
      const x = layout.unitGridLeftX + col * (layout.unitSlotSize + layout.unitSlotGapX) + layout.unitSlotSize / 2;
      const y = layout.unitGridTopY + row * (layout.unitSlotSize + layout.unitSlotGapY) + layout.unitSlotSize / 2;

      button.container.setVisible(true);
      button.container.setPosition(x, y);
      button.bg.width = layout.unitSlotSize;
      button.bg.height = layout.unitSlotSize;
      button.overlayRadius = layout.unitSlotSize / 2;

      if (button.icon instanceof Phaser.GameObjects.Sprite) {
        button.icon.setDisplaySize(layout.unitSlotSize * 0.45, layout.unitSlotSize * 0.45);
      } else if (button.icon instanceof Phaser.GameObjects.Rectangle) {
        button.icon.width = layout.unitSlotSize * 0.4;
        button.icon.height = layout.unitSlotSize * 0.4;
      }

      button.icon.setPosition(0, -layout.unitSlotSize * 0.18);
      button.nameText.setPosition(0, layout.unitSlotSize * 0.26);
      button.costText.setPosition(0, layout.unitSlotSize * 0.42);
      button.lockText.setPosition(0, 0);
    }
  }

  private layoutMusicButton(): void {
    this.musicButton.setPosition(this.layout.musicButtonX, this.layout.musicButtonY);
  }

  private updateGold(delta: number): void {
    if (this.gameOver) {
      return;
    }

    if (this.gold < this.maxGold) {
      this.gold = Math.min(this.maxGold, this.gold + this.goldRate * (delta / 1000));
    }

    this.updateGoldUI();
  }

  private updateTimer(delta: number): void {
    if (this.gameOver) {
      return;
    }

    this.battleTime += delta / 1000;
    const seconds = Math.floor(this.battleTime);
    this.timerText.setText(t("ui.time", { value: this.formatTime(seconds) }));

    if (seconds >= 180) {
      this.endGame(false, t("result.time_over"));
    }
  }

  private updateGoldUI(): void {
    const goldValue = Math.floor(this.gold);
    this.goldText.setText(t("ui.gold", { value: goldValue, max: this.maxGold }));
    const ratio = this.maxGold === 0 ? 0 : Phaser.Math.Clamp(this.gold / this.maxGold, 0, 1);
    this.goldBarFill.width = this.layout.goldBarWidth * ratio;

    if (this.upgradeLevel >= GOLD_MAX_LEVEL) {
    this.upgradeButton.label.setText(t("ui.max_level"));
    this.upgradeButton.costText.setText("");
    this.upgradeButton.levelText.setText(t("ui.level", { value: `${GOLD_MAX_LEVEL}/${GOLD_MAX_LEVEL}` }));
  } else {
    this.upgradeButton.label.setText(t("ui.upgrade"));
    this.upgradeButton.costText.setText(t("ui.cost", { value: this.upgradeCost }));
    this.upgradeButton.levelText.setText(t("ui.level", { value: `${this.upgradeLevel + 1}/${GOLD_MAX_LEVEL}` }));
  }

    const upgradeRatio = this.upgradeLevel >= GOLD_MAX_LEVEL ? 1 : Phaser.Math.Clamp(this.gold / this.upgradeCost, 0, 1);
    this.upgradeButton.progressFill.width = this.upgradeButton.progressWidth * upgradeRatio;

    const activeUnits = this.countActiveUnits();
    this.activeUnitsText.setText(t("ui.active_units", { value: activeUnits }));
  }

  private countActiveUnits(): number {
    const alivePlayer = this.playerUnits.filter((unit) => unit.isAlive()).length;
    const aliveEnemy = this.enemyUnits.filter((unit) => unit.isAlive()).length;
    return alivePlayer + aliveEnemy;
  }

  private formatTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  private updateUnitButtonCooldowns(delta: number): void {
    for (const button of this.unitButtons) {
      if (button.cooldownRemaining > 0) {
        button.cooldownRemaining = Math.max(0, button.cooldownRemaining - delta);
      }
    }
  }

  private refreshButtons(): void {
    const canUpgrade = !this.gameOver && this.upgradeLevel < GOLD_MAX_LEVEL && this.gold >= this.upgradeCost;
    this.upgradeButton.enabled = canUpgrade;
    this.upgradeButton.bg.setFillStyle(canUpgrade ? 0x1f2937 : 0x111827);
    if (canUpgrade) {
      this.upgradeButton.bg.setInteractive({ useHandCursor: true });
    } else {
      this.upgradeButton.bg.disableInteractive();
    }

    for (const button of this.unitButtons) {
      if (!button.container.visible) {
        continue;
      }

      const def = button.def;
      if (!def) {
        button.enabled = false;
        button.bg.disableInteractive();
        button.overlay.clear();
        continue;
      }

      const locked = this.isUnitLocked(def);
      const affordable = this.gold >= def.cost;
      const cooldownActive = button.cooldownRemaining > 0;
      const enabled = !this.gameOver && !locked && affordable && !cooldownActive;

      button.enabled = enabled;
      button.lockText.setVisible(locked);
      button.bg.setFillStyle(enabled ? 0x1f2937 : 0x111827);
      button.nameText.setColor(locked ? "#94a3b8" : "#e2e8f0");
      if (locked) {
        button.costText.setText(t("ui.unlock_cost"));
        button.costText.setColor("#fbbf24");
      } else {
        button.costText.setText(t("ui.cost", { value: def.cost }));
        button.costText.setColor(affordable ? "#f1f5f9" : "#f87171");
      }

      if (locked) {
        button.container.setAlpha(0.55);
      } else if (!affordable || cooldownActive) {
        button.container.setAlpha(0.75);
      } else {
        button.container.setAlpha(1);
      }

      if (enabled) {
        button.bg.setInteractive({ useHandCursor: true });
      } else {
        button.bg.disableInteractive();
      }

      this.drawCooldownOverlay(button);
    }
  }

  private drawCooldownOverlay(button: UnitButton): void {
    const progress = button.cooldownDuration > 0 ? button.cooldownRemaining / button.cooldownDuration : 0;
    button.overlay.clear();
    if (progress <= 0) {
      return;
    }

    const radius = button.overlayRadius;
    button.overlay.fillStyle(0x0f172a, 0.65);
    button.overlay.beginPath();
    button.overlay.moveTo(0, 0);
    button.overlay.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress, false);
    button.overlay.closePath();
    button.overlay.fillPath();
  }

  private handleUnitButton(button: UnitButton): void {
    if (!button.def || this.isUnitLocked(button.def)) {
      return;
    }

    if (this.gameOver || button.cooldownRemaining > 0) {
      return;
    }

    if (this.gold < button.def.cost) {
      return;
    }

    this.gold -= button.def.cost;
    this.spawnUnit(button.def, "left", true);
    button.cooldownRemaining = button.def.cooldown;
    this.updateGoldUI();
  }

  private handleUpgrade(): void {
    if (this.gameOver) {
      return;
    }

    if (this.upgradeLevel >= GOLD_MAX_LEVEL) {
      return;
    }

    if (this.gold < this.upgradeCost) {
      return;
    }

    this.gold -= this.upgradeCost;
    this.upgradeLevel += 1;
    this.goldRate += GOLD_UPGRADE_BONUS;
    this.maxGold += GOLD_CAP_BONUS;
    this.upgradeCost = Math.round(this.upgradeCost * 1.35 + 25);
    this.soundFX.playDing();
    this.updateGoldUI();
  }

  private createUnitIcon(def: UnitDefinition, size: number): Visual {
    const svgKey = UNIT_SVG_KEYS[def.id];
    if (this.textures.exists(svgKey)) {
      const sprite = this.add.sprite(0, 0, svgKey);
      sprite.setDisplaySize(size, size);
      return sprite;
    }

    const rect = this.add.rectangle(0, 0, size, size, UNIT_COLORS[def.id] ?? 0x94a3b8);
    rect.setStrokeStyle(1, 0x0f172a);
    return rect;
  }

  private createCastle(team: Team): Visual {
    const key = team === "left" ? BASE_SVG_KEYS.player : BASE_SVG_KEYS.enemy;
    if (this.textures.exists(key)) {
      const sprite = this.add.sprite(0, 0, key);
      return sprite;
    }

    const rect = this.add.rectangle(0, 0, 140, 140, team === "left" ? 0x475569 : 0x7f1d1d);
    rect.setStrokeStyle(3, 0x1f2937);
    return rect;
  }

  private createUnitVisual(def: UnitDefinition, team: Team): { visual: Visual; spine?: SpineController } {
    const size = this.layout.unitSize;
    const spineAssets = SPINE_ASSETS[def.id];
    if (spineAssets) {
      const spineObject = this.spineManager.createSpine(spineAssets.data, spineAssets.atlas, size, size);
      if (spineObject) {
        if (team === "right") {
          spineObject.visual.setFlipX(true);
        }
        return { visual: spineObject.visual, spine: spineObject.controller };
      }
    }

    const svgKey = UNIT_SVG_KEYS[def.id];
    if (this.textures.exists(svgKey)) {
      const sprite = this.add.sprite(0, 0, svgKey);
      sprite.setDisplaySize(size, size);
      sprite.setOrigin(0.5, 0.5);
      if (team === "right") {
        sprite.setFlipX(true);
      }
      return { visual: sprite };
    }

    const rect = this.add.rectangle(0, 0, size, size, team === "left" ? UNIT_COLORS[def.id] : ENEMY_COLORS[def.id]);
    rect.setStrokeStyle(2, 0x0f172a);
    return { visual: rect };
  }

  private isUnitLocked(def: UnitDefinition): boolean {
    const key = def.id as UnitKey;
    return !this.playerStats.unlockedUnits[key];
  }

  private spawnUnit(def: UnitDefinition, team: Team, playSound: boolean): void {
    const layout = this.layout;
    const spawnX = team === "left" ? this.playerBase.rightEdge + 20 : this.enemyBase.leftEdge - 20;
    const spawnY = layout.laneY;
    const { visual, spine } = this.createUnitVisual(def, team);
    visual.setDepth(5);
    visual.setPosition(spawnX, spawnY);

    const unit = new BattleUnit(this, team, def, visual, this.applyHit.bind(this), spine);
    spine?.setEventCallback((eventName) => unit.handleSpineEvent(eventName));
    unit.x = spawnX;
    unit.y = spawnY;
    if (team === "left") {
      this.playerUnits.push(unit);
    } else {
      this.enemyUnits.push(unit);
    }

    if (playSound) {
      this.soundFX.playPop(this.getUnitPitch(def));
    }
  }

  private getUnitPitch(def: UnitDefinition): number {
    switch (def.id) {
      case "armored_knight":
        return 0.6;
      case "longbowman":
        return 1.45;
      case "cavalry":
        return 1.2;
      case "musketeer":
        return 0.55;
      default:
        return 1;
    }
  }

  private getAttackDamage(unit: BattleUnit): number {
    let damage = unit.def.attackPower;
    if (unit.team === "left") {
      const level = getUnitLevel(this.playerStats, unit.def.id as UnitKey);
      damage *= 1 + level * 0.1;
    }
    if (unit.def.id === "cavalry" && !unit.chargeUsed) {
      damage += 20;
      unit.chargeUsed = true;
    }
    return Math.round(damage);
  }

  private applyHit(context: HitContext): void {
    if (context.targetUnit) {
      context.targetUnit.takeDamage(context.damage);
      this.soundFX.playCrunch(context.pitch);
      return;
    }

    if (context.targetBase) {
      this.damageBase(context.targetBase, context.damage, context.pitch);
    }
  }

  private computeStackOffset(unit: BattleUnit, units: BattleUnit[], targetX: number): number {
    const sameType = units.filter(
      (member) =>
        member.def.id === unit.def.id &&
        member.isAlive() &&
        Math.abs(member.x - targetX) < 10
    );

    if (sameType.length <= 1) {
      return 0;
    }

    if (unit.stackOffsetY !== 0) {
      return unit.stackOffsetY;
    }

    const offset = Phaser.Math.Between(-10, 10);
    return offset === 0 ? 6 : offset;
  }

  private spawnArrowArc(startX: number, startY: number, endX: number, endY: number, color: number): void {
    const controlX = (startX + endX) / 2;
    const controlY = Math.min(startY, endY) - 40;
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(startX, startY),
      new Phaser.Math.Vector2(controlX, controlY),
      new Phaser.Math.Vector2(endX, endY)
    );
    const marker = this.add.circle(startX, startY, 3, color).setDepth(9);
    const payload = { t: 0 };

    this.tweens.add({
      targets: payload,
      t: 1,
      duration: 320,
      onUpdate: () => {
        const point = curve.getPoint(payload.t);
        marker.setPosition(point.x, point.y);
      },
      onComplete: () => {
        marker.destroy();
      }
    });
  }

  private spawnBulletLine(startX: number, startY: number, endX: number, endY: number, color: number): void {
    const bullet = this.add.circle(startX, startY, 2.5, color).setDepth(10);
    this.spawnMuzzleSmoke(startX, startY, color);
    this.tweens.add({
      targets: bullet,
      x: endX,
      y: endY,
      duration: 160,
      onComplete: () => {
        bullet.destroy();
      }
    });
  }

  private spawnMuzzleSmoke(x: number, y: number, color: number): void {
    for (let i = 0; i < 3; i += 1) {
      const puff = this.add.circle(x, y, 4, color).setDepth(9).setAlpha(0.5);
      this.tweens.add({
        targets: puff,
        x: x + Phaser.Math.Between(-6, 6),
        y: y + Phaser.Math.Between(-8, -2),
        alpha: 0,
        scale: 1.6,
        duration: 240,
        onComplete: () => puff.destroy()
      });
    }
  }

  private updateCombat(time: number, delta: number): void {
    this.updateTeam(this.playerUnits, this.enemyUnits, this.enemyBase, time, delta);
    this.updateTeam(this.enemyUnits, this.playerUnits, this.playerBase, time, delta);

    this.playerUnits = this.playerUnits.filter((unit) => !unit.isExpired());
    this.enemyUnits = this.enemyUnits.filter((unit) => !unit.isExpired());
  }

  private updateUnitsVisualOnly(time: number, delta: number): void {
    for (const unit of [...this.playerUnits, ...this.enemyUnits]) {
      unit.updateVisual(time, delta);
    }
  }

  private isRanged(def: UnitDefinition): boolean {
    return def.id === "longbowman" || def.id === "musketeer";
  }

  private getEnemyEngageRange(unit: BattleUnit): number {
    if (this.isRanged(unit.def)) {
      return unit.def.attackRange;
    }
    return 40;
  }

  private getBaseEngageRange(unit: BattleUnit): number {
    return Math.max(unit.def.attackRange, SIEGE_OFFSET);
  }

  private getStopX(unit: BattleUnit, enemyBase: BaseStructure): number {
    if (unit.team === "left") {
      const edge = enemyBase.leftEdge;
      if (this.isRanged(unit.def)) {
        return edge - Math.max(unit.def.attackRange, SIEGE_OFFSET);
      }
      return edge - SIEGE_OFFSET;
    }

    const edge = enemyBase.rightEdge;
    if (this.isRanged(unit.def)) {
      return edge + Math.max(unit.def.attackRange, SIEGE_OFFSET);
    }
    return edge + SIEGE_OFFSET;
  }

  private calculateResults(victory: boolean, elapsed: number, reason: string): BattleResults {
    if (!victory) {
      return {
      victory: false,
      reason,
        timeSeconds: elapsed,
        stars: 0,
        goldReward: 0,
        diamondReward: 0
      };
    }

    if (elapsed < 60) {
      return {
        victory: true,
        reason,
        timeSeconds: elapsed,
        stars: 3,
        goldReward: 1000,
        diamondReward: 50
      };
    }

    if (elapsed < 120) {
      return {
        victory: true,
        reason,
        timeSeconds: elapsed,
        stars: 2,
        goldReward: 500,
        diamondReward: 20
      };
    }

    if (elapsed < 180) {
      return {
        victory: true,
        reason,
        timeSeconds: elapsed,
        stars: 1,
        goldReward: 200,
        diamondReward: 5
      };
    }

    return {
      victory: false,
      reason: t("result.time_over"),
      timeSeconds: elapsed,
      stars: 0,
      goldReward: 0,
      diamondReward: 0
    };
  }

  private showResultsOverlay(results: BattleResults): void {
    const layout = this.layout;
    const panelWidth = Math.min(520, layout.width * 0.86);
    const panelHeight = Math.min(360, layout.height * 0.72);

    this.dimOverlay?.destroy();
    this.resultsOverlay?.destroy();
    this.upgradeOverlay?.setVisible(false);

    this.dimOverlay = this.add
      .rectangle(0, 0, layout.width, layout.height, 0x0b1120, 0.7)
      .setOrigin(0, 0)
      .setDepth(30);

    const container = this.add.container(layout.width / 2, layout.height / 2).setDepth(31);
    const panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x0f172a).setStrokeStyle(2, 0x334155);

    const title = this.add.text(0, -panelHeight / 2 + 34, results.victory ? t("result.victory") : t("result.defeat"), {
      color: results.victory ? "#34d399" : "#f87171",
      fontSize: "36px",
      fontStyle: "bold",
      fontFamily: "Trebuchet MS"
    }).setOrigin(0.5, 0.5);

    const reasonText = this.add.text(0, -panelHeight / 2 + 66, results.reason ? results.reason : "", {
      color: "#94a3b8",
      fontSize: "14px",
      fontFamily: "Trebuchet MS"
    }).setOrigin(0.5, 0.5);

    const timeText = this.add.text(
      0,
      -panelHeight / 2 + 92,
      t("result.time", { value: this.formatTime(results.timeSeconds) }),
      {
        color: "#e2e8f0",
        fontSize: "14px",
        fontFamily: "Trebuchet MS"
      }
    ).setOrigin(0.5, 0.5);

    const stars: Phaser.GameObjects.GameObject[] = [];
    const starSpacing = 46;
    for (let i = 0; i < 3; i += 1) {
      const star = this.createStarSprite(i < results.stars);
      star.setPosition((i - 1) * starSpacing, -10);
      stars.push(star);
    }

    const rewardText = this.add.text(
      0,
      70,
      results.victory
        ? t("result.rewards", { gold: results.goldReward, diamonds: results.diamondReward })
        : t("result.no_rewards"),
      {
        color: results.victory ? "#fcd34d" : "#94a3b8",
        fontSize: "14px",
        fontFamily: "Trebuchet MS"
      }
    ).setOrigin(0.5, 0.5);

    const backButton = this.createOverlayButton(-110, panelHeight / 2 - 44, t("ui.back_menu"), () => {
      this.scene.start("Menu");
    });
    const upgradeButton = this.createOverlayButton(110, panelHeight / 2 - 44, t("ui.upgrade"), () => {
      this.showUpgradeOverlay();
    });

    container.add([panel, title, reasonText, timeText, rewardText, ...stars, backButton, upgradeButton]);
    this.resultsOverlay = container;
  }

  private layoutResultsOverlay(): void {
    if (!this.resultsOverlay || !this.dimOverlay) {
      return;
    }
    this.dimOverlay.setSize(this.layout.width, this.layout.height);
    this.resultsOverlay.setPosition(this.layout.width / 2, this.layout.height / 2);
    if (this.upgradeOverlay) {
      this.upgradeOverlay.setPosition(this.layout.width / 2, this.layout.height / 2);
    }
  }

  private createStarSprite(active: boolean): Phaser.GameObjects.Sprite {
    if (this.textures.exists("star")) {
      const sprite = this.add.sprite(0, 0, "star");
      sprite.setDisplaySize(36, 36);
      sprite.setTint(active ? 0xfacc15 : 0x475569);
      return sprite;
    }

    const fallback = this.add.star(0, 0, 5, 8, 16, active ? 0xfacc15 : 0x475569);
    return fallback as unknown as Phaser.GameObjects.Sprite;
  }

  private createOverlayButton(
    x: number,
    y: number,
    label: string,
    handler: () => void,
    width = 170
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, width, 44, 0x1e293b).setStrokeStyle(2, 0x475569);
    const text = this.add.text(0, 0, label, {
      color: "#f8fafc",
      fontSize: "14px",
      fontStyle: "bold",
      fontFamily: "Trebuchet MS"
    }).setOrigin(0.5, 0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on("pointerdown", handler);
    bg.on("pointerover", () => bg.setFillStyle(0x273449));
    bg.on("pointerout", () => bg.setFillStyle(0x1e293b));
    container.add([bg, text]);
    return container;
  }

  private showUpgradeOverlay(): void {
    if (this.resultsOverlay) {
      this.resultsOverlay.setVisible(false);
    }

    if (this.upgradeOverlay) {
      this.upgradeOverlay.setVisible(true);
      this.updateUpgradeOverlay();
      return;
    }

    const layout = this.layout;
    const panelWidth = Math.min(620, layout.width * 0.92);
    const panelHeight = Math.min(420, layout.height * 0.8);
    const container = this.add.container(layout.width / 2, layout.height / 2).setDepth(32);

    const panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x0f172a).setStrokeStyle(2, 0x334155);
    const title = this.add.text(0, -panelHeight / 2 + 28, t("ui.upgrade_title"), {
      color: "#f8fafc",
      fontSize: "22px",
      fontStyle: "bold",
      fontFamily: "Trebuchet MS"
    }).setOrigin(0.5, 0.5);

    this.upgradeCurrencyText = this.add.text(0, -panelHeight / 2 + 60, "", {
      color: "#fde68a",
      fontSize: "14px",
      fontFamily: "Trebuchet MS"
    }).setOrigin(0.5, 0.5);

    const rows: UpgradeRow[] = [];
    const rowStartY = -panelHeight / 2 + 100;
    const rowGap = 48;

    UNIT_REGISTRY.forEach((def, index) => {
      if (!def) {
        return;
      }

      const rowY = rowStartY + index * rowGap;
      const nameText = this.add.text(-panelWidth / 2 + 24, rowY, t(`unit.${def.id}`), {
        color: "#e2e8f0",
        fontSize: "14px",
        fontFamily: "Trebuchet MS"
      }).setOrigin(0, 0.5);

      const levelText = this.add.text(-40, rowY, t("ui.level", { value: 1 }), {
        color: "#cbd5f5",
        fontSize: "13px",
        fontFamily: "Trebuchet MS"
      }).setOrigin(0.5, 0.5);

      const costText = this.add.text(60, rowY, "", {
        color: "#94a3b8",
        fontSize: "12px",
        fontFamily: "Trebuchet MS"
      }).setOrigin(0.5, 0.5);

      const buttonBg = this.add.rectangle(panelWidth / 2 - 90, rowY, 140, 32, 0x1e293b).setStrokeStyle(1, 0x475569);
      const buttonLabel = this.add.text(panelWidth / 2 - 90, rowY, t("ui.upgrade"), {
        color: "#f8fafc",
        fontSize: "12px",
        fontStyle: "bold",
        fontFamily: "Trebuchet MS"
      }).setOrigin(0.5, 0.5);
      const lockText = this.add.text(panelWidth / 2 - 90, rowY, t("ui.locked"), {
        color: "#fbbf24",
        fontSize: "12px",
        fontStyle: "bold",
        fontFamily: "Trebuchet MS"
      }).setOrigin(0.5, 0.5);
      lockText.setVisible(false);

      buttonBg.setInteractive({ useHandCursor: true });
      buttonBg.on("pointerdown", () => {
        this.handleUpgradeRow(def);
      });
      buttonBg.on("pointerover", () => buttonBg.setFillStyle(0x273449));
      buttonBg.on("pointerout", () => buttonBg.setFillStyle(0x1e293b));

      container.add([nameText, levelText, costText, buttonBg, buttonLabel, lockText]);
      rows.push({
        def,
        levelText,
        costText,
        buttonBg,
        buttonLabel,
        lockText
      });
    });

    const exchangeButton = this.createOverlayButton(0, panelHeight / 2 - 92, t("ui.exchange"), () => {
      exchangeDiamondsToGold(this.playerStats, 100);
      this.updateUpgradeOverlay();
    }, 280);

    const closeButton = this.createOverlayButton(0, panelHeight / 2 - 40, t("ui.back"), () => {
      this.upgradeOverlay?.setVisible(false);
      this.resultsOverlay?.setVisible(true);
      this.updateUpgradeOverlay();
    });

    container.add([panel, title, this.upgradeCurrencyText, exchangeButton, closeButton]);
    this.upgradeOverlay = container;
    this.upgradeRows = rows;
    this.updateUpgradeOverlay();
  }

  private updateUpgradeOverlay(): void {
    if (!this.upgradeOverlay || !this.upgradeCurrencyText) {
      return;
    }

    this.upgradeCurrencyText.setText(
      `${t("ui.total_gold", { value: this.playerStats.totalGold })} • ${t("ui.diamonds", { value: this.playerStats.totalDiamonds })}`
    );

    for (const row of this.upgradeRows) {
      const key = row.def.id as UnitKey;
      const unlocked = this.playerStats.unlockedUnits[key];
      const level = getUnitLevel(this.playerStats, key);
      const upgradeCost = row.def.cost * level;

      row.levelText.setText(t("ui.level", { value: level }));

      if (!unlocked) {
        row.costText.setText(t("ui.unlock_cost"));
        row.buttonLabel.setText(t("ui.unlock"));
        row.lockText.setVisible(true);
        const canUnlock = this.playerStats.totalDiamonds >= 100;
        row.buttonBg.setFillStyle(canUnlock ? 0x1e293b : 0x0f172a);
        if (canUnlock) {
          row.buttonBg.setInteractive({ useHandCursor: true });
        } else {
          row.buttonBg.disableInteractive();
        }
      } else {
        row.costText.setText(t("ui.cost", { value: upgradeCost }));
        row.buttonLabel.setText(t("ui.upgrade"));
        row.lockText.setVisible(false);
        const canUpgrade = this.playerStats.totalGold >= upgradeCost;
        row.buttonBg.setFillStyle(canUpgrade ? 0x1e293b : 0x0f172a);
        if (canUpgrade) {
          row.buttonBg.setInteractive({ useHandCursor: true });
        } else {
          row.buttonBg.disableInteractive();
        }
      }
    }
  }

  private handleUpgradeRow(def: UnitDefinition): void {
    const key = def.id as UnitKey;
    const unlocked = this.playerStats.unlockedUnits[key];

    if (!unlocked) {
      unlockUnit(this.playerStats, key, 100);
      this.updateUpgradeOverlay();
      this.refreshButtons();
      return;
    }

    const level = getUnitLevel(this.playerStats, key);
    const cost = def.cost * level;
    upgradeUnitLevel(this.playerStats, key, cost);
    this.updateUpgradeOverlay();
  }

  private updateTeam(units: BattleUnit[], enemies: BattleUnit[], enemyBase: BaseStructure, time: number, delta: number): void {
    const moveDelta = delta / 1000;

    for (const unit of units) {
      if (!unit.isAlive()) {
        unit.updateVisual(time, delta);
        continue;
      }

      const enemyRange = this.getEnemyEngageRange(unit);
      const enemyTarget = this.findEnemyInRange(unit, enemies, enemyRange);
      if (enemyTarget) {
        unit.stackOffsetY = this.computeStackOffset(unit, units, enemyTarget.x);
        unit.setState("IDLE");
        if (unit.canAttack(time)) {
          const damage = this.getAttackDamage(unit);
          const pitch = this.getUnitPitch(unit.def);
          unit.recordAttack(time, { targetUnit: enemyTarget, damage, pitch });
          if (unit.def.id === "longbowman") {
            this.spawnArrowArc(
              unit.x,
              unit.y + unit.stackOffsetY,
              enemyTarget.x,
              enemyTarget.y + enemyTarget.stackOffsetY - 8,
              0xe2e8f0
            );
          } else if (unit.def.id === "musketeer") {
            this.spawnBulletLine(
              unit.x,
              unit.y + unit.stackOffsetY - 6,
              enemyTarget.x,
              enemyTarget.y + enemyTarget.stackOffsetY - 6,
              0xf8fafc
            );
          }
        }
        unit.updateVisual(time, delta);
        continue;
      }

      const baseDistance = this.distanceToBase(unit, enemyBase);
      const baseAttackRange = this.getBaseEngageRange(unit);
      if (baseDistance <= baseAttackRange) {
        const stopX = this.getStopX(unit, enemyBase);
        unit.stackOffsetY = this.computeStackOffset(unit, units, stopX);
        unit.setState("IDLE");
        if (unit.canAttack(time)) {
          const damage = this.getAttackDamage(unit);
          const pitch = this.getUnitPitch(unit.def);
          unit.recordAttack(time, { targetBase: enemyBase, damage, pitch });
          if (unit.def.id === "longbowman") {
            this.spawnArrowArc(unit.x, unit.y + unit.stackOffsetY, stopX, unit.y - 20, 0xe2e8f0);
          } else if (unit.def.id === "musketeer") {
            this.spawnBulletLine(unit.x, unit.y + unit.stackOffsetY - 6, stopX, unit.y - 18, 0xf8fafc);
          }
        }
        unit.updateVisual(time, delta);
        continue;
      }

      const dir = unit.team === "left" ? 1 : -1;
      const stopX = this.getStopX(unit, enemyBase);
      const nextX = unit.x + dir * unit.def.moveSpeed * moveDelta;

      if (dir === 1) {
        unit.x = Math.min(nextX, stopX);
      } else {
        unit.x = Math.max(nextX, stopX);
      }

      unit.stackOffsetY = 0;
      unit.setState("WALK");
      unit.updateVisual(time, delta);
    }
  }

  private findEnemyInRange(unit: BattleUnit, enemies: BattleUnit[], range: number): BattleUnit | null {
    let closest: BattleUnit | null = null;
    let closestDist = Number.POSITIVE_INFINITY;

    for (const enemy of enemies) {
      if (!enemy.isAlive()) {
        continue;
      }

      const distance = Math.abs(enemy.x - unit.x);
      if (distance <= range && distance < closestDist) {
        closest = enemy;
        closestDist = distance;
      }
    }

    return closest;
  }

  private distanceToBase(unit: BattleUnit, base: BaseStructure): number {
    return unit.team === "left" ? base.leftEdge - unit.x : unit.x - base.rightEdge;
  }

  private damageBase(base: BaseStructure, amount: number, pitch = 1): void {
    base.takeDamage(amount);
    this.soundFX.playCrunch(pitch);

    if (base.hp <= 0) {
      const victory = base === this.enemyBase;
      this.endGame(victory);
      return;
    }

    this.cameras.main.shake(60, 0.002);
  }

  private scheduleEnemySpawn(): void {
    if (this.enemySpawnTimer) {
      this.enemySpawnTimer.remove(false);
    }

    const delay = Phaser.Math.Between(ENEMY_SPAWN_MIN, ENEMY_SPAWN_MAX);
    this.enemySpawnTimer = this.time.delayedCall(delay, () => {
      if (!this.gameOver) {
        const enemyDefs = UNIT_REGISTRY.filter((def): def is UnitDefinition => !!def);
        const def = Phaser.Utils.Array.GetRandom(enemyDefs);
        this.spawnUnit(def, "right", true);
      }
      this.scheduleEnemySpawn();
    });
  }

  private endGame(victory: boolean, reason = ""): void {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    if (this.enemySpawnTimer) {
      this.enemySpawnTimer.remove(false);
    }

    const elapsed = Math.floor(this.battleTime);
    const results = this.calculateResults(victory, elapsed, reason);

    if (results.victory) {
      awardRewards(this.playerStats, results.goldReward, results.diamondReward);
    }

    this.soundFX.playOutcome(results.victory);
    this.cameras.main.shake(200, 0.004);

    this.showResultsOverlay(results);
  }

  private handleResize(): void {
    this.applyLayout();
  }
}
