import { CanvasTextMetrics, Container, Graphics, Text } from "pixi.js";
import type { Point } from "../world/path.ts";
import { BubbleClock } from "./bubble-clock.ts";
import type { BubbleInput, BubblePlacement } from "./bubble-layout.ts";
import { setGlyphText } from "./glyphs.ts";

let sequence = 0;
type Message = { id: number; text: string; clock: BubbleClock };

export class Bubble extends Container {
  readonly tail = new Graphics();
  anchor: Point = { x: 0, y: 0 };
  tailPath: BubblePlacement["tail"] = [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ];
  private background = new Graphics();
  private text = new Text({
    text: "",
    resolution: globalThis.devicePixelRatio,
    style: {
      fontFamily: "Fusion Pixel",
      fontSize: 14,
      fill: 0x302a2a,
      wordWrap: true,
      wordWrapWidth: 180,
    },
  });
  private messages: Message[] = [];
  private ready = false;
  private fullText = "";
  private compactText = "";
  private size = { width: 0, height: 0 };
  private compact = { width: 0, height: 0 };

  constructor() {
    super({ visible: false });
    this.addChild(this.background, this.text);
    this.on("destroyed", () => this.tail.destroy());
  }

  show(text: string, ms: number) {
    const message = { id: ++sequence, text, clock: new BubbleClock(ms) };
    if (this.messages[0]?.clock.remaining === Infinity) this.hide();
    this.messages.push(message);
    if (this.messages.length === 1) this.prepare();
  }

  private prepare() {
    this.ready = false;
    this.visible = false;
    this.tail.visible = false;
    const message = this.messages[0];
    if (!message) return;
    void setGlyphText(this.text, `${message.text}…`, () => {
      if (this.messages[0] !== message) return;
      this.text.text = message.text;
      this.fullText = message.text;
      this.size = {
        width: Math.ceil(this.text.width / 2) * 2 + 22,
        height: Math.ceil(this.text.height) + 18,
      };
      const line = message.text.split(/\r?\n/, 1).join("");
      let shortened = Array.from(line);
      const style = this.text.style;
      while (
        shortened.length &&
        CanvasTextMetrics.measureText(`${shortened.join("")}…`, style).width > 180
      )
        shortened = shortened.slice(0, -1);
      this.compactText = `${shortened.join("")}…`;
      const metrics = CanvasTextMetrics.measureText(this.compactText, style);
      this.compact = {
        width: Math.ceil(metrics.width / 2) * 2 + 22,
        height: Math.ceil(metrics.height) + 18,
      };
      this.ready = true;
    });
  }

  input(): BubbleInput | undefined {
    const message = this.messages[0];
    if (!this.ready || !message) return;
    return { id: message.id, anchor: this.anchor, ...this.size, compact: this.compact };
  }

  advance(elapsed: number) {
    if (!this.messages[0]?.clock.advance(elapsed, this.visible)) return;
    this.messages.shift();
    this.prepare();
  }

  draw(placement: BubblePlacement) {
    this.visible = !placement.deferred;
    this.tail.visible = this.visible;
    if (!this.visible) return;
    this.position.set(placement.rect.x, placement.rect.y);
    const { width, height } = placement.rect;
    this.text.text = placement.truncated ? this.compactText : this.fullText;
    this.text.position.set(11, 9);
    this.tailPath = placement.tail;
    const [start, ...points] = placement.tail;
    this.tail.clear().moveTo(start.x, start.y);
    for (const point of points) this.tail.lineTo(point.x, point.y);
    this.tail.stroke({ color: 0x302a2a, width: 2, cap: "butt", join: "bevel" });
    this.background
      .clear()
      .rect(1, 1, width - 2, height - 2)
      .fill(0xfff0ce)
      .stroke({ color: 0x302a2a, width: 2 });
  }

  hide() {
    this.messages = [];
    this.tail.visible = false;
    this.ready = false;
    this.visible = false;
  }
}
