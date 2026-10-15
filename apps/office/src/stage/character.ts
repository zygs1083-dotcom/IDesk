import { ColorMatrixFilter, Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import { reducedMotion, tween } from "../engine/tween.ts";
import type { Direction, Point } from "../scene/scene.ts";
import { Bubble } from "./bubble.ts";
import { hueOffset } from "./hue.ts";
import { characterPose } from "./pose.ts";
import type { Stage } from "./stage.ts";
import type { Agent } from "./textures.ts";

const WALK_SPEED = 140;

export type CharacterState = "idle" | "walk" | "sit" | "typing" | "talk" | "coffee" | "away";

export class Character extends Container {
  state: CharacterState = "idle";
  facing: Direction = "down";
  mirrored = false;
  private sprite: Sprite;
  private cup = new Graphics()
    .rect(12, -42, 10, 9)
    .fill(0xfff0ce)
    .stroke({ color: 0x302a2a, width: 2 })
    .rect(22, -40, 4, 5)
    .stroke({ color: 0x302a2a, width: 2 });
  readonly bubble = new Bubble();
  private fallback: Texture;
  private elapsed = 0;

  constructor(
    private stage: Stage,
    private agent: Agent,
    private frames: Record<string, Texture>,
  ) {
    super();
    const fallback = frames[`${agent.kind}/walk/down/0`];
    if (!fallback) throw new Error(`Missing sprite frames for ${agent.kind}`);
    this.fallback = fallback;
    this.sprite = new Sprite(fallback);
    const tint = new ColorMatrixFilter();
    tint.hue(hueOffset(agent.id), false);
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
    this.bubble.y = -104;
    this.cup.visible = false;
    this.addChild(this.sprite, this.cup, label, this.bubble);
    stage.app.ticker.add(this.animate, undefined, -1);
    this.on("destroyed", () => {
      stage.app.ticker.remove(this.animate);
      tint.destroy();
    });
  }

  setState(state: CharacterState) {
    if (state === "away" || (this.state === "talk" && state !== "talk")) this.bubble.hide();
    this.state = state;
    this.visible = state !== "away";
    this.cup.visible = state === "coffee";
    if (state === "talk") this.bubble.show("…", Number.POSITIVE_INFINITY);
  }

  private animate = () => {
    this.zIndex = this.y;
    if (!reducedMotion.matches) this.elapsed += this.stage.app.ticker.deltaMS;
    const pose = characterPose(this.state, this.facing, this.elapsed, this.mirrored);
    this.sprite.texture = this.frames[`${this.agent.kind}/${pose.frame}`] ?? this.fallback;
    this.sprite.scale.x = pose.mirror ? -1 : 1;
  };

  async walkTo(points: Point[]) {
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
        (Math.hypot(dx, dy) / WALK_SPEED) * 1000,
        (t) => t,
      );
      if (this.destroyed) return;
    }
    this.setState("idle");
  }
}
