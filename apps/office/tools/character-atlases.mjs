import { PNG } from "pngjs";
import { readJson, readPng, root } from "./image.mjs";

export const outfitIndex = readJson(`${root}public/characters/index.json`);
export const outfitIds = [
  ...Object.entries(outfitIndex).flatMap(([kind, outfits]) =>
    outfits.map((outfit) => `${kind}-${outfit}`),
  ),
  "receptionist",
];
export const atlas = { frames: {}, animations: {} };
export const sprites = new PNG({ width: 1600, height: 96 * outfitIds.length });
for (const [row, id] of outfitIds.entries()) {
  const sheet = readJson(`${root}public/characters/${id}.json`);
  const png = readPng(`${root}public/characters/${id}.png`);
  PNG.bitblt(png, sprites, 0, 0, png.width, png.height, 0, row * 96);
  for (const [name, data] of Object.entries(sheet.frames)) {
    atlas.frames[name] = { ...data, frame: { ...data.frame, y: data.frame.y + row * 96 } };
  }
  Object.assign(atlas.animations, sheet.animations);
}
