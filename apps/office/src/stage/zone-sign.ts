import { Container, Graphics, Text } from "pixi.js";
import type { Point } from "../scene/scene.ts";
import type { Stage } from "./stage.ts";

const PAPER = 0xfff0ce;
const INK = 0x302a2a;

export function signScale(worldScale: number) {
  return Math.max(1, 1 / worldScale);
}

export class ZoneSign extends Container {
  private panel = new Graphics();
  private title = new Text({
    text: "",
    style: { fontFamily: "Fusion Pixel", fontSize: 12, fill: INK },
  });

  constructor(stage: Stage, position: Point) {
    super();
    this.position.copyFrom(position);
    this.title.anchor.set(0.5);
    this.addChild(this.panel, this.title);
    const resize = () => this.scale.set(signScale(stage.world.scale.x));
    stage.app.renderer.on("resize", resize);
    this.on("destroyed", () => stage.app.renderer.off("resize", resize));
    resize();
    this.visible = false;
    stage.world.addChild(this);
  }

  setText(text: string) {
    this.visible = text.length > 0;
    this.title.text = text;
    const width = this.title.width + 12;
    const height = this.title.height + 8;
    this.panel
      .clear()
      .rect(-width / 2, -height / 2, width, height)
      .fill(PAPER);
    this.panel.stroke({ color: INK, width: 2 });
  }
}
