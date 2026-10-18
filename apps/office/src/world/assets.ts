import { Assets, type Spritesheet, type Texture } from "pixi.js";
import { officeUrl } from "../office-url.ts";
import { characterFrames, loadCharacters, loadOutfitIndex } from "./characters.ts";

export async function loadWorldAssets() {
  const [background, occluders] = await Promise.all([
    Assets.load<Texture>(officeUrl("background.webp")),
    Assets.load<Spritesheet>(officeUrl("occluders.json")),
    loadCharacters(["receptionist"]),
    loadOutfitIndex(),
  ]);
  for (const texture of [background, ...Object.values(occluders.textures)])
    texture.source.scaleMode = "nearest";
  return { background, occluders, sprites: characterFrames };
}
export type WorldAssets = Awaited<ReturnType<typeof loadWorldAssets>>;
