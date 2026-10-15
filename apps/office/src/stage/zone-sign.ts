import { Container, Graphics, Text } from "pixi.js";
import type { Point } from "../scene/scene.ts";
import type { Stage } from "./stage.ts";

const FACE = 0xe7c4a0;
const FRAME = 0x6b4a2b;
const HIGHLIGHT = 0xf3dcbf;
const LETTERING = 0x3b2a1a;
const SIGN_WIDTH = 132;
const SIGN_HEIGHT = 52;

export function signScale(worldScale: number) {
  return Math.max(1, 1 / worldScale);
}

export function signWidth(scaledTextWidth: number) {
  return Math.max(SIGN_WIDTH, scaledTextWidth + 12);
}

export class ZoneSign extends Container {
  private panel = new Graphics();
  private title = new Text({
    text: "",
    style: { fontFamily: "Fusion Pixel", fontSize: 12, fill: LETTERING },
  });

  constructor(stage: Stage, position: Point) {
    super();
    this.position.copyFrom(position);
    this.title.anchor.set(0.5);
    this.addChild(this.panel, this.title);
    const resize = () => {
      this.title.scale.set(signScale(stage.world.scale.x));
      this.draw();
    };
    stage.app.renderer.on("resize", resize);
    this.on("destroyed", () => stage.app.renderer.off("resize", resize));
    resize();
    this.visible = false;
    stage.world.addChild(this);
  }

  setText(text: string) {
    this.visible = text.length > 0;
    this.title.text = text;
    this.draw();
  }

  private draw() {
    const width = signWidth(this.title.width);
    this.panel
      .clear()
      .rect(-width / 2, -SIGN_HEIGHT / 2, width, SIGN_HEIGHT)
      .fill(FACE)
      .stroke({ color: FRAME, width: 1 });
    this.panel
      .moveTo(-width / 2 + 1, -SIGN_HEIGHT / 2 + 1)
      .lineTo(width / 2 - 1, -SIGN_HEIGHT / 2 + 1)
      .stroke({ color: HIGHLIGHT, width: 1 });
  }
}
