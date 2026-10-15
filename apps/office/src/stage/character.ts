import { ColorMatrixFilter, Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import { reducedMotion, tween } from "../engine/tween.ts";
import type { Point } from "../world/path.ts";
import { type Direction, seats } from "../world/seats.ts";
import { zIndexOf } from "../world/sort.ts";
import type { Stage } from "../world/stage.ts";
import { Bubble } from "./bubble.ts";
import { hueOffset } from "./hue.ts";
import { characterPose } from "./pose.ts";
import type { OfficeAgent } from "./textures.ts";

export const WALK_SPEED = 140;

export type CharacterState = "idle" | "walk" | "sit" | "typing" | "talk" | "coffee" | "away";

export class Character extends Container {
  state: CharacterState = "idle";
  facing: Direction = "down";
  private sprite: Sprite;
  private cup = new Graphics()
    .rect(12, -42, 10, 9)
    .fill(0xfff0ce)
    .stroke({ color: 0x302a2a, width: 2 })
    .rect(22, -40, 4, 5)
    .stroke({ color: 0x302a2a, width: 2 });
  readonly bubble = new Bubble();
  private elapsed = 0;
  private nodTimers = new Map<ReturnType<typeof setTimeout>, () => void>();
  private nodVersion = 0;
  private bounce = { x: 1, y: 1 };

  constructor(
    private stage: Stage,
    private agent: OfficeAgent,
    private frames: Record<string, Texture>,
  ) {
    super();
    const fallback = frames[`${agent.kind}/walk/down/0`];
    if (!fallback) throw new Error(`Missing sprite frames for ${agent.kind}`);
    this.sprite = new Sprite(fallback);
    const tint = new ColorMatrixFilter();
    if (agent.kind !== "receptionist") tint.hue(hueOffset(agent.id), false);
    this.sprite.filters = [tint];
    this.sprite.anchor.set(0.5, 1);
    const label = new Text({
      text: agent.name,
      style: {
        fontFamily: "Fusion Pixel",
        fontSize: 12,
        fill: 0xfff0ce,
        stroke: { color: 0x302a2a, width: 4 },
      },
    });
    label.anchor.set(0.5, 1);
    label.y = -102;
    label.visible = false;
    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointertap", () =>
      window.dispatchEvent(
        new CustomEvent("office:select", {
          detail: { type: "agent", id: agent.id },
        }),
      ),
    );
    this.on("pointerover", () => {
      label.visible = true;
    });
    this.on("pointerout", () => {
      label.visible = false;
    });
    stage.effects.addChild(this.bubble);
    this.cup.visible = false;
    this.addChild(this.sprite, this.cup, label);
    stage.app.ticker.add(this.animate, undefined, -1);
    this.on("destroyed", () => {
      stage.app.ticker.remove(this.animate);
      this.stopNod();
      tint.destroy();
      this.bubble.destroy({ children: true });
    });
  }

  setState(state: CharacterState) {
    if (state === "away" || (this.state === "talk" && state !== "talk")) this.bubble.hide();
    this.state = state;
    this.visible = state !== "away";
    this.cup.visible = state === "coffee";
    if (state === "talk") this.bubble.show("…", Number.POSITIVE_INFINITY);
    this.animate();
  }

  private animate = () => {
    this.zIndex = zIndexOf(this.y, 0);
    this.bubble.position.set(this.x, this.y - 104);
    if (!reducedMotion.matches) this.elapsed += this.stage.app.ticker.deltaMS;
    const state =
      this.state === "coffee" &&
      seats(this.stage.layout, this.stage.catalog).some(
        (seat) => seat.x === this.x && seat.y === this.y,
      )
        ? "sit"
        : this.state;
    const pose = characterPose(state, this.facing, this.elapsed);
    const frame = this.frames[`${this.agent.kind}/${pose.frame}`];
    if (!frame) throw new Error(`Missing frame: ${this.agent.kind}/${pose.frame}`);
    this.sprite.texture = frame;
    this.sprite.scale.set((pose.mirror ? -1 : 1) * this.bounce.x, this.bounce.y);
  };

  async walkTo(points: Point[], speed = WALK_SPEED) {
    this.setState("walk");
    for (const target of points) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      this.facing =
        Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
      await tween(
        this.stage.app.ticker,
        this.position,
        target,
        (Math.hypot(dx, dy) / speed) * 1000,
        (t) => t,
      );
      if (this.destroyed) return;
    }
    this.setState("idle");
    if (!reducedMotion.matches) {
      this.bounce = { x: 1.1, y: 0.9 };
      await tween(this.stage.app.ticker, this.bounce, { x: 1, y: 1 }, 120);
    }
  }

  stopNod() {
    this.nodVersion++;
    this.sprite.y = 0;
    for (const [timer, resolve] of this.nodTimers) {
      clearTimeout(timer);
      resolve();
    }
    this.nodTimers.clear();
  }

  async nod(ms = 150, count = 2) {
    const version = this.nodVersion;
    const wait = () =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          this.nodTimers.delete(timer);
          resolve();
        }, ms);
        this.nodTimers.set(timer, resolve);
      });
    for (let index = 0; index < count; index++) {
      this.sprite.y = -1;
      await wait();
      if (this.destroyed || version !== this.nodVersion) return;
      this.sprite.y = 0;
      await wait();
      if (this.destroyed || version !== this.nodVersion) return;
    }
  }
}
