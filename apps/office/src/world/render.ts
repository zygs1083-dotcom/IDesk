import type { OfficeLayout } from "@idesk/shared/office-layout";
import { Container, Sprite } from "pixi.js";
import type { LightScene, SceneAssets, WorldAssets } from "./assets.ts";
import { zIndexOf } from "./sort.ts";

export function renderWorld(
  layout: OfficeLayout,
  assets: WorldAssets,
  world: Container,
  objects: Container,
) {
  const backgrounds = new Container({ sortableChildren: true, eventMode: "none" });
  world.addChildAt(backgrounds, 0);
  const occluderLayers = new Map<string, Container>();
  for (const item of layout.occluders) {
    const layer = new Container({ sortableChildren: true, eventMode: "none" });
    layer.label = item.id;
    layer.zIndex = zIndexOf(item.baseline, 0);
    objects.addChild(layer);
    occluderLayers.set(item.id, layer);
  }
  const sprites = new Map<LightScene, Sprite[]>();
  const order: LightScene[] = ["day", "dusk", "night"];
  const addScene = (name: LightScene, scene: SceneAssets) => {
    const background = new Sprite({ texture: scene.background, eventMode: "none" });
    background.zIndex = order.indexOf(name);
    backgrounds.addChild(background);
    const layers = [background];
    for (const item of layout.occluders) {
      const texture = scene.occluders.textures[item.id];
      const data = scene.occluders.data.frames[item.id];
      if (!texture || !data) throw new Error(`Missing occluder: ${item.id}`);
      const point = (data as typeof data & { background: { x: number; y: number } }).background;
      const sprite = new Sprite({ texture, eventMode: "none" });
      sprite.position.copyFrom(point);
      sprite.zIndex = order.indexOf(name);
      (occluderLayers.get(item.id) as Container).addChild(sprite);
      layers.push(sprite);
    }
    sprites.set(name, layers);
  };
  for (const [name, scene] of assets.scenes) addScene(name, scene);
  return { sprites, addScene };
}
