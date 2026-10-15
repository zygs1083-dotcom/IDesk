import { Container, Graphics, Text } from "pixi.js";
import { setGlyphText } from "./glyphs.ts";

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
  private shown = 0;

  constructor() {
    super({ visible: false });
    this.text.anchor.set(0.5, 1);
    this.text.y = -16;
    this.addChild(this.background, this.text);
    this.on("destroyed", () => clearTimeout(this.timer));
  }

  show(text: string, ms: number) {
    clearTimeout(this.timer);
    // 新字形要等字体分片下载完才能画；在此之前不显示，免得闪出上一条气泡。
    const shown = ++this.shown;
    void setGlyphText(this.text, text, () => {
      if (shown !== this.shown) return;
      this.draw();
      this.visible = true;
    });
    if (Number.isFinite(ms)) this.timer = setTimeout(() => this.hide(), ms);
  }

  private draw() {
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
  }

  hide() {
    clearTimeout(this.timer);
    this.shown++;
    this.visible = false;
  }
}
