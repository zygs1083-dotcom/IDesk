import { CanvasTextMetrics, Container, Text } from "pixi.js";
import type { Point } from "../scene/scene.ts";
import type { Stage } from "./stage.ts";

export const PLAQUE_WIDTH = 110;
export const PLAQUE_HEIGHT = 28;
const LETTERING = "#3B2A1A";

export function fitSignText(
  text: string,
  worldScale: number,
  measure: (text: string, px: number) => number,
  measureHeight: (text: string, px: number) => number = (_text, px) => px,
) {
  const fits = (text: string, px: number) =>
    measure(text, px) <= PLAQUE_WIDTH * worldScale &&
    measureHeight(text, px) <= PLAQUE_HEIGHT * worldScale;
  for (const screenPx of [12, 11, 10, 9]) {
    if (fits(text, screenPx)) return { text, screenPx };
  }
  const letters = Array.from(text);
  while (letters.length > 0) {
    letters.pop();
    const shortened = `${letters.join("")}…`;
    if (fits(shortened, 9)) return { text: shortened, screenPx: 9 };
  }
  return { text: "", screenPx: 9 };
}

export class ZoneSign extends Container {
  private title = new Text({
    text: "",
    style: { fontFamily: "Fusion Pixel", fontSize: 12, fill: LETTERING },
  });
  private fullText = "";
  private hover: HTMLDivElement | undefined;

  constructor(
    private stage: Stage,
    position: Point,
  ) {
    super();
    this.position.copyFrom(position);
    this.title.anchor.set(0.5);
    this.addChild(this.title);
    const resize = () => this.update();
    stage.app.renderer.on("resize", resize);
    this.on("destroyed", () => {
      stage.app.renderer.off("resize", resize);
      this.hover?.remove();
    });
    this.visible = false;
    stage.world.addChild(this);
  }

  setText(text: string) {
    this.fullText = text;
    this.visible = text.length > 0;
    this.update();
  }

  private update() {
    const { stage } = this;
    const worldScale = stage.world.scale.x;
    const metrics = (text: string, px: number) => {
      this.title.style.fontSize = px / worldScale;
      return CanvasTextMetrics.measureText(text, this.title.style);
    };
    const fitted = fitSignText(
      this.fullText,
      worldScale,
      (text, px) => metrics(text, px).width * worldScale,
      (text, px) => metrics(text, px).height * worldScale,
    );
    this.title.style.fontSize = fitted.screenPx / worldScale;
    this.title.text = fitted.text;
    if (fitted.text === this.fullText) {
      this.hover?.remove();
      this.hover = undefined;
      return;
    }
    const canvas = stage.app.canvas;
    const host = canvas.parentElement as HTMLElement;
    if (!this.hover) {
      this.hover = document.createElement("div");
      this.hover.style.position = "absolute";
      host.appendChild(this.hover);
    }
    const point = stage.world.toGlobal(this.position);
    const canvasRect = canvas.getBoundingClientRect();
    const parent = this.hover.offsetParent as HTMLElement;
    const parentRect = parent.getBoundingClientRect();
    const width = PLAQUE_WIDTH * worldScale;
    const height = PLAQUE_HEIGHT * worldScale;
    this.hover.title = this.fullText;
    Object.assign(this.hover.style, {
      left: `${canvasRect.left - parentRect.left - parent.clientLeft + point.x - width / 2}px`,
      top: `${canvasRect.top - parentRect.top - parent.clientTop + point.y - height / 2}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
  }
}
