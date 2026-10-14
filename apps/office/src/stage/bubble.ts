import { Container, Graphics, Text } from "pixi.js";

export class Bubble extends Container {
  private background = new Graphics();
  private text = new Text({
    text: "",
    style: {
      fontFamily: "Fusion Pixel",
      fontSize: 12,
      fill: 0x302a2a,
      wordWrap: true,
      wordWrapWidth: 180,
    },
  });
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    super({ visible: false });
    this.text.anchor.set(0.5, 1);
    this.text.y = -16;
    this.addChild(this.background, this.text);
    this.on("destroyed", () => clearTimeout(this.timer));
  }

  show(text: string, ms: number) {
    clearTimeout(this.timer);
    this.text.text = text;
    const width = Math.ceil(this.text.width / 2) * 2 + 20;
    const height = this.text.height + 16;
    this.background
      .clear()
      .poly([
        -width / 2,
        -height - 8,
        width / 2,
        -height - 8,
        width / 2,
        -8,
        6,
        -8,
        6,
        -4,
        2,
        -4,
        2,
        0,
        -2,
        0,
        -2,
        -4,
        -6,
        -4,
        -6,
        -8,
        -width / 2,
        -8,
      ])
      .fill(0xfff0ce)
      .stroke({ color: 0x302a2a, width: 2 });
    this.visible = true;
    if (Number.isFinite(ms)) this.timer = setTimeout(() => this.hide(), ms);
  }

  hide() {
    clearTimeout(this.timer);
    this.visible = false;
  }
}
