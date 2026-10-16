import type { OfficeLayout } from "@idesk/shared/office-layout";
import { Application, Container } from "pixi.js";
import { screenBubbles } from "../stage/screen-bubbles.ts";
import type { WorldAssets } from "./assets.ts";
import { renderWorld } from "./render.ts";
import { worldScale } from "./scale.ts";

export async function createStage(host: HTMLElement, layout: OfficeLayout, assets: WorldAssets) {
  const app = new Application();
  await app.init({
    resizeTo: host,
    background: "#6c5745",
    antialias: false,
    preference: "webgl",
    resolution: window.devicePixelRatio,
    autoDensity: true,
  });
  host.appendChild(app.canvas);
  const world = app.stage.addChild(new Container());
  const board = world.addChild(new Container());
  const objects = world.addChild(new Container({ sortableChildren: true }));
  const effects = world.addChild(new Container());
  const lights = world.addChild(new Container({ eventMode: "none" }));
  const screen = app.stage.addChild(new Container());
  const bubbles = screenBubbles(screen, app.screen);
  app.ticker.add((ticker) => bubbles(ticker.deltaMS), undefined, -2);
  renderWorld(layout, assets, world, objects);
  const resize = () => {
    const width = layout.size.w;
    const height = layout.size.h;
    const scale = worldScale(app.screen.width, app.screen.height, width, height);
    world.scale.set(scale);
    world.position.set(
      Math.floor((app.screen.width - width * scale) / 2),
      Math.floor((app.screen.height - height * scale) / 2),
    );
  };
  app.renderer.on("resize", resize);
  resize();
  return { app, world, board, objects, effects, lights, screen, layout, assets };
}
export type Stage = Awaited<ReturnType<typeof createStage>>;
