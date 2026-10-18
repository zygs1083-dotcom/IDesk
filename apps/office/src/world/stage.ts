import type { OfficeLayout } from "@idesk/shared/office-layout";
import { Application, BlurFilter, Container, Sprite } from "pixi.js";
import { screenBubbles } from "../stage/screen-bubbles.ts";
import type { LightScene, SceneAssets, WorldAssets } from "./assets.ts";
import { renderWorld } from "./render.ts";
import { requiredBounds, worldScale } from "./scale.ts";

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
  const blurred = app.stage.addChild(new Container({ sortableChildren: true, eventMode: "none" }));
  const blurredSprites = new Map<LightScene, Sprite>();
  const fitBlurred = (sprite: Sprite) => {
    const width = layout.size.w;
    const height = layout.size.h;
    const scale = Math.max(app.screen.width / width, app.screen.height / height) * 1.05;
    sprite.scale.set(scale);
    sprite.position.set(
      (app.screen.width - width * scale) / 2,
      (app.screen.height - height * scale) / 2,
    );
  };
  const addBlurred = (name: LightScene, scene: SceneAssets) => {
    const sprite = blurred.addChild(new Sprite({ texture: scene.background, eventMode: "none" }));
    sprite.zIndex = ["day", "dusk", "night"].indexOf(name);
    sprite.tint = 0xb3b3b3;
    sprite.filters = [new BlurFilter({ strength: 20 })];
    fitBlurred(sprite);
    blurredSprites.set(name, sprite);
    return sprite;
  };
  const world = app.stage.addChild(new Container());
  const board = world.addChild(new Container());
  const objects = world.addChild(new Container({ sortableChildren: true }));
  const effects = world.addChild(new Container());
  const lights = world.addChild(new Container({ eventMode: "none" }));
  const screen = app.stage.addChild(new Container());
  const bubbles = screenBubbles(screen, app.screen);
  app.ticker.add((ticker) => bubbles(ticker.deltaMS), undefined, -2);
  const scenes = renderWorld(layout, assets, world, objects);
  for (const [name, scene] of assets.scenes)
    scenes.sprites.get(name)?.push(addBlurred(name, scene));
  const renderScene = scenes.addScene;
  scenes.addScene = (name, scene) => {
    renderScene(name, scene);
    scenes.sprites.get(name)?.push(addBlurred(name, scene));
  };
  const required = requiredBounds(layout);
  const resize = () => {
    const width = layout.size.w;
    const height = layout.size.h;
    const { scale, x, y } = worldScale(
      app.screen.width,
      app.screen.height,
      width,
      height,
      required,
    );
    world.scale.set(scale);
    world.position.set(Math.floor(x), Math.floor(y));
    for (const sprite of blurredSprites.values()) fitBlurred(sprite);
  };
  app.renderer.on("resize", resize);
  resize();
  return { app, world, board, objects, effects, lights, screen, layout, assets, scenes };
}
export type Stage = Awaited<ReturnType<typeof createStage>>;
