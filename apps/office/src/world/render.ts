import { type Application, Container, Graphics, RenderTexture, Sprite } from "pixi.js";
import type { WorldAssets } from "./assets.ts";
import { type Catalog, type Furniture, TILE } from "./catalog.ts";
import type { Layout } from "./layout.ts";
import { PLACEHOLDER_DARK, PLACEHOLDER_FILL, PLACEHOLDER_GROUND } from "./placeholder.ts";
import { seats } from "./seats.ts";
import { sortDrawables } from "./sort.ts";

function block(w: number, h: number, color: number) {
  return new Graphics()
    .rect(0.5, 0.5, w - 1, h - 1)
    .fill(color)
    .stroke({ color: PLACEHOLDER_DARK, width: 1 });
}

export function renderWorld(
  app: Application,
  layout: Layout,
  catalog: Catalog,
  assets: WorldAssets,
) {
  const world = new Container();
  const ground = new Container();
  layout.ground.forEach((row, y) => {
    [...row].forEach((code, x) => {
      const texture = assets.textures[assets.codes[code] ?? ""];
      const tile = texture
        ? new Sprite(texture)
        : block(
            TILE,
            TILE,
            code === "U" || code === "L"
              ? PLACEHOLDER_DARK
              : code === "c"
                ? PLACEHOLDER_FILL
                : PLACEHOLDER_GROUND,
          );
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
  world.addChild(new Sprite(texture));
  const wall = world.addChild(new Container());
  const objects = world.addChild(new Container());
  const drawables = [];
  for (const object of layout.objects) {
    const item = catalog.items[object.item] as Furniture;
    for (const part of item.parts) {
      const frame = assets.textures[part.frame];
      const sprite = frame
        ? new Sprite(frame)
        : block(item.footprint.w * TILE, item.footprint.h * TILE, PLACEHOLDER_FILL);
      sprite.position.set(
        object.x * TILE + (frame ? part.dx : 0),
        object.y * TILE + (frame ? part.dy : 0),
      );
      sprite.label = `${object.id}/${part.frame}`;
      if (item.layer === "wall") wall.addChild(sprite);
      else drawables.push({ sprite, sortY: object.y * TILE + part.sortY, bias: part.bias });
    }
  }
  seats(layout, catalog).forEach((seat, i) => {
    const kind = seat.zone ? ["codex", "claude-code", "n8n", "script"][i % 4] : "receptionist";
    const sprite = new Sprite(assets.sprites[`${kind}/walk/${seat.facing}/0`]);
    sprite.texture.source.scaleMode = "nearest";
    sprite.anchor.set(0.5, 1);
    sprite.position.set(seat.x, seat.y);
    sprite.label = seat.id;
    drawables.push({ sprite, sortY: seat.y, bias: 0 });
  });
  for (const drawable of sortDrawables(drawables)) objects.addChild(drawable.sprite);
  return world;
}
