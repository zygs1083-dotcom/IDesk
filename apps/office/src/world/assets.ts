import { Assets, type Spritesheet, type Texture } from "pixi.js";
import { officeUrl } from "../office-url.ts";
import { daylightWeights, officeNow } from "../stage/daylight-time.ts";
import { characterFrames, loadCharacters, loadOutfitIndex } from "./characters.ts";

export type LightScene = "day" | "dusk" | "night";
export type SceneAssets = { background: Texture; occluders: Spritesheet };

export async function loadScene(scene: LightScene): Promise<SceneAssets> {
  const suffix = scene === "day" ? "" : `-${scene}`;
  const [background, occluders] = await Promise.all([
    Assets.load<Texture>(officeUrl(`background${suffix}.webp`)),
    Assets.load<Spritesheet>(officeUrl(`occluders${suffix}.json`)),
  ]);
  for (const texture of [background, ...Object.values(occluders.textures)])
    texture.source.scaleMode = "nearest";
  return { background, occluders };
}

export async function loadWorldAssets(at?: number) {
  const weights = daylightWeights(at === undefined ? officeNow() : new Date(at));
  const initial = (Object.entries(weights) as [LightScene, number][]).reduce((best, entry) =>
    entry[1] > best[1] ? entry : best,
  )[0];
  const [scene] = await Promise.all([
    loadScene(initial),
    loadCharacters(["receptionist"]),
    loadOutfitIndex(),
  ]);
  return {
    initial,
    scenes: new Map<LightScene, SceneAssets>([[initial, scene]]),
    sprites: characterFrames,
  };
}
export type WorldAssets = Awaited<ReturnType<typeof loadWorldAssets>>;
