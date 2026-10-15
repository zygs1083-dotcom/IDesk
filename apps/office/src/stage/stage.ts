import { Application, Assets, Container, Sprite, type Texture } from "pixi.js";

export async function createStage(host: HTMLElement) {
  const app = new Application();
  // 像素画用 WebGL 就够了；固定它，避免 Pixi 在部分 Chrome 上自动选 WebGPU 时初始化失败而画布空白
  await app.init({
    resizeTo: window,
    background: "#6c5745",
    antialias: false,
    preference: "webgl",
  });
  host.appendChild(app.canvas);
  const background = await Assets.load<Texture>("/office/background.webp");
  background.source.scaleMode = "nearest";
  const world = new Container();
  world.addChild(new Sprite(background));
  const characters = new Container({ sortableChildren: true });
  world.addChild(characters);
  app.stage.addChild(world);
  const resize = () => {
    const scale = Math.min(
      app.screen.width / background.width,
      app.screen.height / background.height,
    );
    world.scale.set(scale);
    world.position.set(
      (app.screen.width - background.width * scale) / 2,
      (app.screen.height - background.height * scale) / 2,
    );
  };
  app.renderer.on("resize", resize);
  resize();
  return { app, world, characters };
}

export type Stage = Awaited<ReturnType<typeof createStage>>;
