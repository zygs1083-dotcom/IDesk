import { Assets, type Spritesheet, type Texture } from "pixi.js";
import { officeUrl } from "../office-url.ts";

export async function loadWorldAssets() {
  const [background, occluders, characters] = await Promise.all([
    Assets.load<Texture>(officeUrl("background.webp")),
    Assets.load<Spritesheet>(officeUrl("occluders.json")),
    Assets.load<Spritesheet>(officeUrl("characters.json")),
  ]);
  for (const texture of [
    background,
    ...Object.values(occluders.textures),
    ...Object.values(characters.textures),
  ])
    texture.source.scaleMode = "nearest";
  return { background, occluders, sprites: characters.textures };
}
export type WorldAssets = Awaited<ReturnType<typeof loadWorldAssets>>;
