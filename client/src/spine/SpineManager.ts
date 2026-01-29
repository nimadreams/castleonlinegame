import Phaser from "phaser";

export type SpineState = "IDLE" | "WALK" | "ATTACK" | "DYING";
export type SpineEventCallback = (eventName: string) => void;

const HIT_EVENT_NAMES = ["hit", "damage", "attack", "impact", "slash", "shoot", "fire"];
const DEFAULT_MIX = 0.2;

export class SpineController {
  private animationNames: Record<SpineState, string | null> = {
    IDLE: null,
    WALK: null,
    ATTACK: null,
    DYING: null
  };
  private lastLoopState: SpineState | null = null;
  private eventCallback?: SpineEventCallback;
  private usesHitEvents = false;

  constructor(private spine: SpineGameObject | null, eventCallback?: SpineEventCallback) {
    this.eventCallback = eventCallback;
    if (spine) {
      try {
        this.mapAnimations();
        this.configureMixing();
        this.detectHitEvents();
        this.bindEvents();
        this.setState("IDLE");
      } catch {
        // If runtime APIs don't match, we'll fall back to SVG rendering.
      }
    }
  }

  setEventCallback(callback?: SpineEventCallback): void {
    this.eventCallback = callback;
  }

  setState(state: SpineState): void {
    if (!this.spine || state === "ATTACK") {
      return;
    }

    const animationName = this.animationNames[state];
    if (!animationName) {
      return;
    }

    const loop = state === "IDLE" || state === "WALK";
    if (loop && this.lastLoopState === state) {
      return;
    }

    this.setAnimation(0, animationName, loop);
    this.lastLoopState = state;
  }

  playAttack(): void {
    if (!this.spine) {
      return;
    }

    const animationName = this.animationNames.ATTACK;
    if (!animationName) {
      return;
    }

    this.setAnimation(0, animationName, false);
  }

  setAnimation(trackIndex: number, animationName: string, loop: boolean, ignoreIfPlaying = false): spine.TrackEntry | null {
    if (!this.spine) {
      return null;
    }

    const state = (this.spine as unknown as { animationState?: spine.AnimationState }).animationState;
    if (!state) {
      return null;
    }

    if (ignoreIfPlaying) {
      const current = state.getCurrent(trackIndex);
      if (current?.animation?.name === animationName) {
        return current;
      }
    }

    return state.setAnimation(trackIndex, animationName, loop);
  }

  addAnimation(trackIndex: number, animationName: string, loop: boolean, delay = 0): spine.TrackEntry | null {
    if (!this.spine) {
      return null;
    }

    const state = (this.spine as unknown as { animationState?: spine.AnimationState }).animationState;
    if (!state) {
      return null;
    }

    return state.addAnimation(trackIndex, animationName, loop, delay);
  }

  setMix(fromName: string, toName: string, duration = DEFAULT_MIX): void {
    if (!this.spine) {
      return;
    }

    const data = (this.spine as unknown as { animationStateData?: spine.AnimationStateData }).animationStateData;
    if (data?.setMix) {
      data.setMix(fromName, toName, duration);
    }
  }

  isHitEvent(name: string): boolean {
    return HIT_EVENT_NAMES.includes(name.toLowerCase());
  }

  usesHitEventTimings(): boolean {
    return this.usesHitEvents;
  }

  private mapAnimations(): void {
    if (!this.spine) {
      return;
    }

    const available = this.getAnimationNames();
    const defaultName = available[0] ?? null;

    this.animationNames.IDLE = this.findAnimationName(["idle", "stand", "default"], defaultName);
    this.animationNames.WALK = this.findAnimationName(["run", "walk", "move"], this.animationNames.IDLE ?? defaultName);
    this.animationNames.ATTACK = this.findAnimationName(["attack", "hit", "strike", "shoot", "fire"], null);
    this.animationNames.DYING = this.findAnimationName(["death", "die", "dying", "defeat"], null);
  }

  private findAnimationName(candidates: string[], fallback: string | null): string | null {
    if (!this.spine) {
      return fallback;
    }

    const available = this.getAnimationNames();
    if (available.length === 0) {
      return fallback;
    }

    const nameMap = new Map<string, string>();
    for (const name of available) {
      nameMap.set(name.toLowerCase(), name);
    }

    for (const candidate of candidates) {
      const match = nameMap.get(candidate.toLowerCase());
      if (match) {
        return match;
      }
    }

    return fallback;
  }

  private configureMixing(): void {
    if (!this.spine) {
      return;
    }

    const data = (this.spine as unknown as { animationStateData?: spine.AnimationStateData }).animationStateData;
    if (data) {
      data.defaultMix = DEFAULT_MIX;
    }

    const pairs: Array<[SpineState, SpineState]> = [
      ["IDLE", "WALK"],
      ["WALK", "IDLE"],
      ["IDLE", "ATTACK"],
      ["WALK", "ATTACK"],
      ["ATTACK", "IDLE"],
      ["ATTACK", "WALK"],
      ["IDLE", "DYING"],
      ["WALK", "DYING"],
      ["ATTACK", "DYING"]
    ];

    for (const [fromState, toState] of pairs) {
      const from = this.animationNames[fromState];
      const to = this.animationNames[toState];
      if (from && to) {
        if (data?.setMix) {
          data.setMix(from, to, DEFAULT_MIX);
        }
      }
    }
  }

  private detectHitEvents(): void {
    if (!this.spine) {
      return;
    }

    const events = this.spine.skeleton?.data?.events ?? [];
    this.usesHitEvents = events.some((event) => this.isHitEvent(event.name));
  }

  private bindEvents(): void {
    if (!this.spine) {
      return;
    }

    const state = (this.spine as unknown as { animationState?: spine.AnimationState }).animationState;
    if (!state?.addListener) {
      return;
    }

    state.addListener({
      event: (_entry, event) => {
        const name = event?.data?.name ?? event?.name;
        if (!name || !this.eventCallback) {
          return;
        }

        this.eventCallback(name);
      }
    });
  }

  private getAnimationNames(): string[] {
    if (!this.spine) {
      return [];
    }

    const anySpine = this.spine as unknown as { getAnimationList?: () => string[] };
    if (typeof anySpine.getAnimationList === "function") {
      return anySpine.getAnimationList() ?? [];
    }

    const animations = this.spine.skeleton?.data?.animations ?? [];
    return animations.map((anim) => anim?.name).filter((name): name is string => !!name);
  }
}

export class SpineManager {
  private disabled = false;

  constructor(private scene: Phaser.Scene) {}

  createSpine(
    dataKey: string,
    atlasKey: string,
    width: number,
    height: number,
    eventCallback?: SpineEventCallback
  ): { visual: SpineGameObject; controller: SpineController } | null {
    if (this.disabled) {
      return null;
    }

    const version = this.getSkeletonVersion(dataKey, atlasKey);
    if (version?.startsWith("3.8")) {
      console.warn(`[Spine] Skeleton ${dataKey} is Spine ${version}. Attempting load with current runtime.`);
    }

    const factory = this.scene.add as unknown as { spine?: (...args: unknown[]) => SpineGameObject };
    if (!factory.spine) {
      return null;
    }

    let spineObject: SpineGameObject | null = null;
    try {
      spineObject = factory.spine(0, 0, dataKey, atlasKey);
    } catch {
      this.disabled = true;
      console.warn("[Spine] Failed to load skeleton. Falling back to SVG rendering.");
      return null;
    }

    if (!spineObject) {
      return null;
    }

    spineObject.setDisplaySize(width, height);
    let controller: SpineController | null = null;
    try {
      controller = new SpineController(spineObject, eventCallback);
    } catch {
      this.disabled = true;
      spineObject.destroy();
      console.warn("[Spine] Failed to initialize controller. Falling back to SVG rendering.");
      return null;
    }
    return { visual: spineObject, controller };
  }

  private getSkeletonVersion(dataKey: string, atlasKey: string): string | null {
    const plugin = (this.scene as unknown as { spine?: { getSkeletonData?: (data: string, atlas: string) => unknown } }).spine;
    if (!plugin?.getSkeletonData) {
      return null;
    }

    try {
      const skeletonData = plugin.getSkeletonData(dataKey, atlasKey) as { version?: string } | undefined;
      return skeletonData?.version ?? null;
    } catch {
      return null;
    }
  }
}
