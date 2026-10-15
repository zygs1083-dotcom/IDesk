import { type Catalog, type Layout, TILE } from "@idesk/shared/office-schemas";
import { Application, Container } from "pixi.js";
import type { WorldAssets } from "./assets.ts";
import { renderWorld } from "./render.ts";
import { worldScale } from "./scale.ts";

export async function createStage(
  host: HTMLElement,
  layout: Layout,
  catalog: Catalog,
  assets: WorldAssets,
) {
  const app = new Application();
  await app.init({ resizeTo: host, background: "#6c5745", antialias: false, preference: "webgl" });
  host.appendChild(app.canvas);
  const world = app.stage.addChild(new Container());
  const wall = world.addChild(new Container());
  const board = world.addChild(new Container());
  const objects = world.addChild(new Container({ sortableChildren: true }));
  const effects = world.addChild(new Container());
  const lights = world.addChild(new Container());
  renderWorld(app, layout, catalog, assets, world, wall, objects);
  const resize = () => {
    const width = layout.size.w * TILE;
    const height = layout.size.h * TILE;
    const scale = worldScale(app.screen.width, app.screen.height, width, height);
    world.scale.set(scale);
    world.position.set(
      Math.floor((app.screen.width - width * scale) / 2),
      Math.floor((app.screen.height - height * scale) / 2),
    );
  };
  app.renderer.on("resize", resize);
  resize();
  return { app, world, wall, board, objects, effects, lights, layout, catalog, assets };
}
export type Stage = Awaited<ReturnType<typeof createStage>>;
