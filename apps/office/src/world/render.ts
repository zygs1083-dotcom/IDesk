import { type Catalog, type Layout, TILE } from "@idesk/shared/office-schemas";
import { type Application, Container, RenderTexture, Sprite } from "pixi.js";
import type { WorldAssets } from "./assets.ts";
import { zIndexOf } from "./sort.ts";

export function renderWorld(
  app: Application,
  layout: Layout,
  catalog: Catalog,
  assets: WorldAssets,
  world: Container,
  wall: Container,
  objects: Container,
) {
  const ground = new Container();
  layout.ground.forEach((row, y) => {
    [...row].forEach((code, x) => {
      const texture = assets.textures[assets.codes[code] ?? ""];
      if (!texture) throw new Error(`Missing tile: ${code}`);
      const tile = new Sprite(texture);
      tile.position.set(x * TILE, y * TILE);
      ground.addChild(tile);
    });
  });
  const texture = RenderTexture.create({
    width: layout.size.w * TILE,
    height: layout.size.h * TILE,
  });
  texture.source.scaleMode = "nearest";
  app.renderer.render({ container: ground, target: texture });
  ground.destroy({ children: true });
  world.addChildAt(new Sprite(texture), 0);
  world.on("destroyed", () => texture.destroy(true));
  for (const object of layout.objects) {
    const item = catalog.items[object.item];
    if (!item) throw new Error(`Missing item: ${object.item}`);
    for (const part of item.parts) {
      const frame = assets.textures[part.frame];
      if (!frame) throw new Error(`Missing frame: ${part.frame}`);
      const sprite = new Sprite(frame);
      sprite.position.set(object.x * TILE + part.dx, object.y * TILE + part.dy);
      sprite.label = `${object.id}/${part.frame}`;
      sprite.zIndex = zIndexOf(object.y * TILE + part.sortY, part.bias);
      (item.layer === "wall" ? wall : objects).addChild(sprite);
    }
  }
}
