import { Assets, Rectangle, Texture } from "pixi.js";
import { z } from "zod";
import { officeUrl } from "../office-url.ts";

const frame = z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() });
const tileSchema = z.object({
  tile: z.literal(32),
  codes: z.record(z.string(), z.string()),
  frames: z.record(z.string(), frame),
});
const furnitureSchema = z.object({ frames: z.record(z.string(), z.object({ frame })) });

export async function loadWorldAssets() {
  const [tilesResponse, furnitureResponse, sprites] = await Promise.all([
    fetch(officeUrl("tiles.json")),
    fetch(officeUrl("furniture.json")),
    Assets.load(officeUrl("sprites.json")),
  ]);
  const tiles = tileSchema.parse(await tilesResponse.json());
  const furniture = furnitureSchema.parse(await furnitureResponse.json());
  const textures: Record<string, Texture> = {};
  for (const [name, data] of [
    ["tiles", tiles],
    ["furniture", furniture],
  ] as const) {
    const response = await fetch(officeUrl(`${name}.png`));
    const bitmap = await createImageBitmap(await response.blob());
    const source = Texture.from(bitmap).source;
    source.scaleMode = "nearest";
    for (const [id, value] of Object.entries(data.frames)) {
      const rect = "frame" in value ? value.frame : value;
      textures[id] = new Texture({ source, frame: new Rectangle(rect.x, rect.y, rect.w, rect.h) });
    }
  }
  return {
    textures,
    codes: tiles.codes,
    sprites: sprites.textures as Record<string, Texture>,
  };
}
export type WorldAssets = Awaited<ReturnType<typeof loadWorldAssets>>;
