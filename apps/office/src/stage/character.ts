import { Container, Graphics, Sprite, Text, type Texture } from "pixi.js";
import { tween } from "../engine/tween.ts";
import type { Direction, Point } from "../scene/scene.ts";
import type { Stage } from "./stage.ts";
import { type Agent, placeholderFrames } from "./textures.ts";

export type CharacterState = "idle" | "walk" | "sit" | "typing" | "talk" | "coffee" | "away";

export class Character extends Container {
  state: CharacterState = "idle";
  facing: Direction = "down";
  private sprite: Sprite;
  private arrow = new Graphics().poly([0, -7, -6, 4, 6, 4]).fill(0x302a2a);
  private badge = new Text({ text: "", style: { fontSize: 18, fill: 0xfff0ce } });
  private frames: Record<string, Texture>;
  private elapsed = 0;
  private reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  private enter: Record<CharacterState, () => void> = {
    idle: () => {
      this.badge.text = "";
    },
    walk: () => {
      this.badge.text = "";
    },
    sit: () => {
      this.badge.text = "";
    },
    typing: () => {
      this.badge.text = "⌨";
    },
    talk: () => {
      this.badge.text = "…";
    },
    coffee: () => {
      this.badge.text = "☕";
    },
    away: () => {
      this.visible = false;
    },
  };

  constructor(
    private stage: Stage,
    private agent: Agent,
  ) {
    super();
    this.frames = placeholderFrames(stage.app, agent);
    this.sprite = new Sprite(this.frames[`${agent.kind}/walk/down/0`]!);
    this.sprite.anchor.set(0.5, 1);
    const label = new Text({
      text: agent.name,
      style: {
        fontFamily: "monospace",
        fontSize: 14,
        fill: 0xfff0ce,
        stroke: { color: 0x302a2a, width: 4 },
      },
    });
    label.anchor.set(0.5, 1);
    label.y = -102;
    this.arrow.y = -56;
    this.badge.position.set(30, -110);
    this.addChild(this.sprite, this.arrow, label, this.badge);
    stage.app.ticker.add(this.animate, undefined, -1);
    this.on("destroyed", () => {
      stage.app.ticker.remove(this.animate);
      for (const texture of Object.values(this.frames)) texture.destroy(true);
    });
  }

  setState(state: CharacterState) {
    this.state = state;
    this.visible = true;
    this.enter[state]();
  }

  private animate = () => {
    this.zIndex = this.y;
    if (!this.reducedMotion.matches) this.elapsed += this.stage.app.ticker.deltaMS;
    const walk = `walk/${this.facing}/0`;
    const poses: Record<CharacterState, string> = {
      idle: walk,
      walk: `walk/${this.facing}/${Math.floor(this.elapsed / 150) % 4}`,
      sit: "sit/0",
      typing: `typing/${Math.floor(this.elapsed / 300) % 2}`,
      talk: "sit/0",
      coffee: walk,
      away: walk,
    };
    this.sprite.texture = this.frames[`${this.agent.kind}/${poses[this.state]}`]!;
    this.arrow.rotation = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[
      this.facing
    ];
  };

  async walkTo(points: Point[]) {
    this.setState("walk");
    for (const target of points) {
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      this.facing =
        Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
      if (this.reducedMotion.matches) this.position.copyFrom(target);
      else
        await tween(
          this.stage.app.ticker,
          this.position,
          target,
          (Math.hypot(dx, dy) / 90) * 1000,
          (t) => t,
        );
      if (this.destroyed) return;
    }
    this.setState("idle");
  }
}
