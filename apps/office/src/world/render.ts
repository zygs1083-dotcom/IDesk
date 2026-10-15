import type { OfficeLayout } from "@idesk/shared/office-layout";
import { type Container, Sprite } from "pixi.js";
import type { WorldAssets } from "./assets.ts";
import { zIndexOf } from "./sort.ts";

export function renderWorld(
  layout: OfficeLayout,
  assets: WorldAssets,
  world: Container,
  objects: Container,
) {
  world.addChildAt(new Sprite(assets.background), 0);
  for (const item of layout.occluders) {
    const texture = assets.occluders.textures[item.id];
    const data = assets.occluders.data.frames[item.id];
    if (!texture || !data) throw new Error(`Missing occluder: ${item.id}`);
    const point = (data as typeof data & { background: { x: number; y: number } }).background;
    const sprite = new Sprite(texture);
    sprite.position.copyFrom(point);
    sprite.label = item.id;
    sprite.zIndex = zIndexOf(item.baseline, 0);
    objects.addChild(sprite);
  }
}
